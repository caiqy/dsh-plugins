import { randomUUID } from 'node:crypto'
import { WebError } from '@deepseek-ai/dsh-web'
import type { WebSearchRequest, WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web'
import { validateOpenAIOptions } from './providers.js'

export interface OpenAIOptions {
  endpoint: string
  model: string
  apiKey: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Decode the observed alpha-search fields; opaque encrypted output stays private. */
export function mapAlphaSearchResponse(payload: unknown): WebSearchResult {
  if (!isRecord(payload) || typeof payload.output !== 'string'
    || (payload.results !== undefined && !Array.isArray(payload.results))) {
    throw new WebError('OpenAI search returned an invalid response.', 'WEB_PROVIDER_ERROR')
  }
  const sources: WebSearchSource[] = []
  for (const item of (payload.results ?? []) as unknown[]) {
    if (!isRecord(item) || typeof item.url !== 'string') continue
    try {
      const url = new URL(item.url)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue
    } catch {
      continue // Non-web results are not citeable sources.
    }
    sources.push({ url: item.url, ...(typeof item.title === 'string' ? { title: item.title } : {}) })
  }
  const content = payload.output.replace(/\uE200cite\uE202[^\uE201]*\uE201(?:\s*\[wordlim:\s*\d+\])?/gu, '').trim()
  return { content, sources, truncated: false }
}

/** One independent query; the host owns batching, result caps and the timeout budget. */
export async function searchOpenAI(
  request: WebSearchRequest,
  options: OpenAIOptions,
  signal?: AbortSignal,
): Promise<WebSearchResult> {
  const invalid = validateOpenAIOptions(options)
  if (invalid !== undefined) throw new WebError(invalid, 'WEB_PROVIDER_ERROR')
  if (!options.apiKey.trim()) throw new WebError('OpenAI search API key is not configured.', 'WEB_PROVIDER_ERROR')
  try {
    const response = await fetch(options.endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        id: randomUUID(),
        model: options.model,
        input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: request.query }] }],
        commands: { search_query: [{ q: request.query }] },
        settings: { allowed_callers: ['direct'], external_web_access: true },
        max_output_tokens: 2048,
      }),
      ...(signal !== undefined ? { signal } : {}),
    })
    if (!response.ok) {
      await response.body?.cancel()
      // Gateway errors may echo credentials; only the status is safe to forward.
      throw new WebError(`OpenAI search API error (HTTP ${response.status}).`, 'WEB_PROVIDER_ERROR')
    }
    const result = mapAlphaSearchResponse(await response.json())
    const redact = (text: string) => text.replaceAll(options.apiKey, '[REDACTED]')
    return {
      ...result,
      ...(result.content !== undefined ? { content: redact(result.content) } : {}),
      sources: result.sources.filter(source => !source.url.includes(options.apiKey)).map(source => ({
        ...source, ...(source.title !== undefined ? { title: redact(source.title) } : {}),
      })),
    }
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new WebError('OpenAI search aborted.', 'WEB_ABORTED')
    }
    if (error instanceof WebError) throw error
    // No raw cause: fetch and JSON errors can contain the request or response.
    throw new WebError('OpenAI search request failed or returned unreadable JSON.', 'WEB_PROVIDER_ERROR')
  }
}
