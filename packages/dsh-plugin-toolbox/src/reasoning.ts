type Protocol = 'responses' | 'messages' | 'chat-completions' | 'gemini' | 'unknown'
export interface ReasoningReport {
  protocol: Protocol
  action: 'rewritten' | 'unchanged' | 'skipped'
  reason: string
}

const EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
const ANTHROPIC_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function protocolOf(url: string): Protocol {
  let path: string
  try { path = new URL(url).pathname } catch { return 'unknown' }
  if (/\/responses\/?$/.test(path)) return 'responses'
  if (/\/messages\/?$/.test(path)) return 'messages'
  if (/\/chat\/completions\/?$/.test(path)) return 'chat-completions'
  if (/:(?:streamGenerateContent|generateContent)$/.test(path)) return 'gemini'
  return 'unknown'
}

/** Remove only the managed effort field; preserve other configuration and message data. */
function withoutEffort(item: Record<string, unknown>, field: 'reasoning' | 'output_config'): Record<string, unknown> | undefined {
  const { effort: _, ...remaining } = item[field] as Record<string, unknown>
  const next = { ...item }
  if (Object.keys(remaining).length) next[field] = remaining
  else delete next[field]
  const envelope = field === 'reasoning' ? ['type'] : ['role', 'content']
  return Object.keys(next).every(key => envelope.includes(key)) ? undefined : next
}

function normalize(body: Record<string, unknown>, protocol: Protocol): { body?: Record<string, unknown>; report: ReasoningReport } {
  const result = (action: ReasoningReport['action'], reason: string) => ({ report: { protocol, action, reason } })
  if (protocol === 'unknown') return result('skipped', 'unknown-protocol')
  // These serializers already put native levels/budgets on the request. Do not remap them.
  if (protocol === 'chat-completions' || protocol === 'gemini') return result('unchanged', 'native-parameters')
  const field = protocol === 'responses' ? 'reasoning' : 'output_config'
  const key = protocol === 'responses' ? 'input' : 'messages'
  const items = body[key]
  if (!Array.isArray(items) || !items.every(record)) return result('skipped', 'unknown-shape')
  if (body[field] !== undefined && !record(body[field])) return result('skipped', 'unknown-shape')
  const markers = items.filter(item => record(item[field]) && Object.hasOwn(item[field], 'effort')
    && (protocol === 'responses' ? item.type === 'configuration_update' : item.role === 'system'))
  if (!markers.length) return result('unchanged', 'native-parameters')
  // A historical marker alone does not establish this request's selected effort.
  if (markers.at(-1) !== items.at(-1)) return result('skipped', 'no-current-marker')
  const allowed = protocol === 'responses' ? EFFORTS : ANTHROPIC_EFFORTS
  if (markers.some(item => !allowed.has((item[field] as Record<string, unknown>).effort as string))) {
    return result('skipped', 'unknown-effort')
  }
  if (protocol === 'messages' && (markers.some(item => !Array.isArray(item.content) || item.content.length !== 0)
    || !record(body.thinking) || body.thinking.type !== 'adaptive')) {
    return result('skipped', 'unknown-shape')
  }
  const effort = (markers.at(-1)![field] as Record<string, unknown>).effort
  const selected = new Set(markers)
  const nextItems = items.flatMap(item => {
    const next = selected.has(item) ? withoutEffort(item, field) : item
    return next ? [next] : []
  })
  return {
    body: { ...body, [field]: { ...body[field] as Record<string, unknown>, effort }, [key]: nextItems },
    report: { protocol, action: 'rewritten', reason: 'managed-effort-promoted' },
  }
}

/** Install a reversible, domain-independent compatibility wrapper around buffered model requests. */
export function installReasoningEffortFix(enabled: () => boolean, report?: (value: ReasoningReport) => void): () => void {
  const original = globalThis.fetch
  let active = true
  const reported = new Set<string>()
  const notify = (value: ReasoningReport) => {
    const key = `${value.protocol}:${value.action}:${value.reason}`
    if (reported.has(key)) return
    reported.add(key)
    try { report?.(value) } catch { /* Diagnostics must not fail inference. */ }
  }
  const patched: typeof fetch = (input, init) => {
    if (!active || !enabled()) return original(input, init)
    const request = input instanceof Request ? input : undefined
    const method = init?.method ?? request?.method ?? 'GET'
    if (method.toUpperCase() !== 'POST') return original(input, init)
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const protocol = protocolOf(url)
    const skip = (reason: string) => {
      notify({ protocol, action: 'skipped', reason })
      return original(input, init)
    }
    const headers = new Headers(init?.headers ?? request?.headers)
    if (headers.has('content-encoding') && headers.get('content-encoding') !== 'identity') return skip('encoded-body')
    if (/^(?:AWS4|Signature)\b/i.test(headers.get('authorization') ?? '') || headers.has('x-amz-content-sha256')
      || ['content-md5', 'digest', 'content-digest', 'signature', 'signature-input'].some(key => headers.has(key))) return skip('signed-body')
    const contentType = headers.get('content-type')
    if (contentType && !/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(contentType)) return skip('non-json-body')
    const raw = init?.body
    // ponytail: buffered bodies up to 16 MiB; streaming support needs a provider payload hook.
    if (typeof raw !== 'string' && !(raw instanceof Uint8Array) && !(raw instanceof ArrayBuffer)) return skip('unbuffered-body')
    const bytes = typeof raw === 'string' ? Buffer.byteLength(raw) : raw.byteLength
    if (bytes > 16 * 1024 * 1024) return skip('body-too-large')
    let body: unknown
    try { body = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder('utf-8', { fatal: true }).decode(raw)) }
    catch { return skip('invalid-json') }
    if (!record(body)) return skip('unknown-shape')
    const result = normalize(body, protocol)
    notify(result.report)
    if (!result.body) return original(input, init)
    headers.delete('content-length')
    const json = JSON.stringify(result.body)
    return original(input, { ...init, headers, body: typeof raw === 'string' ? json : new TextEncoder().encode(json) })
  }
  globalThis.fetch = patched
  return () => {
    active = false
    // A compression plugin may adopt this function beneath its own fetch accessor.
    if (globalThis.fetch === patched) globalThis.fetch = original
  }
}
