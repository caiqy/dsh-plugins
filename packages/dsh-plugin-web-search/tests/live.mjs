import assert from 'node:assert/strict'
import { searchOpenAI } from '../lib/openai.js'

const { DSH_SEARCH_TEST_ENDPOINT: endpoint, DSH_SEARCH_TEST_KEY: apiKey, DSH_SEARCH_TEST_MODEL: model } = process.env
assert.ok(endpoint && apiKey && model, 'Supply DSH_SEARCH_TEST_ENDPOINT, DSH_SEARCH_TEST_KEY and DSH_SEARCH_TEST_MODEL.')
const started = Date.now()
try {
  const result = await searchOpenAI({ query: 'Python official documentation docs.python.org/3/' }, { endpoint, apiKey, model }, AbortSignal.timeout(90000))
  assert.ok(result.content?.length || result.sources.length, 'The real search returned no content or sources.')
  assert.ok(!JSON.stringify(result).includes(apiKey), 'A credential must not enter the result.')
  assert.ok(!result.content?.includes('\uE200cite'), 'Private citation markers must be cleaned.')
  console.log(JSON.stringify({
    result: 'passed', model, elapsedMs: Date.now() - started,
    contentCharacters: result.content?.length ?? 0,
    sources: result.sources.length,
    sourceHosts: [...new Set(result.sources.map(source => new URL(source.url).hostname))],
  }))
} catch (error) {
  console.error(JSON.stringify({ result: 'failed', code: error.code ?? 'TEST_FAILED', message: String(error.message).replaceAll(apiKey, '[REDACTED]') }))
  process.exitCode = 1
}
