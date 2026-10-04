import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mapAlphaSearchResponse, searchOpenAI } from '../lib/openai.js'
import { validateOpenAIOptions } from '../lib/providers.js'

async function serve(t, handler) {
  const server = createServer(handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }))
  return `http://127.0.0.1:${server.address().port}`
}
const options = endpoint => ({ endpoint, model: 'test-model', apiKey: 'test-secret' })
const json = (response, body) => {
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(body))
}

test('POST carries both query locations, configured model/auth, and independent ids', async t => {
  const calls = []
  const endpoint = await serve(t, async (request, response) => {
    let text = ''
    for await (const chunk of request) text += chunk
    calls.push({ url: request.url, method: request.method, auth: request.headers.authorization, body: JSON.parse(text) })
    json(response, { output: 'answer', results: [{ url: 'https://example.com', title: 'Example' }] })
  })
  await searchOpenAI({ query: 'query one', maxResults: 1 }, options(`${endpoint}/v1/alpha/search`))
  await searchOpenAI({ query: 'query two' }, options(`${endpoint}/v1/alpha/search`))
  assert.equal(calls[0].url, '/v1/alpha/search')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].auth, 'Bearer test-secret')
  const { id, ...body } = calls[0].body
  assert.equal(typeof id, 'string')
  assert.ok(id.length)
  assert.notEqual(id, calls[1].body.id)
  assert.deepEqual(body, {
    model: 'test-model',
    input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'query one' }] }],
    commands: { search_query: [{ q: 'query one' }] },
    settings: { allowed_callers: ['direct'], external_web_access: true },
    max_output_tokens: 2048,
  })
})

test('maps only observed sources and cleans private citation markers', () => {
  const result = mapAlphaSearchResponse({
    output: 'Answer\uE200cite\uE202turn0search0\uE201 [wordlim: 100] continues',
    encrypted_output: 'opaque',
    results: [
      { url: 'https://example.com', title: 'Example', snippet: 'unverified', ref_id: 'turn0search0' },
      { url: 'javascript:alert(1)' }, { url: 'https://user:password@example.com' },
      { url: 'not-a-url' }, null, { type: 'other' },
    ],
  })
  assert.deepEqual(result, { content: 'Answer continues', sources: [{ url: 'https://example.com', title: 'Example' }], truncated: false })
  assert.deepEqual(mapAlphaSearchResponse({ output: '', results: [] }).sources, [])
  assert.equal(mapAlphaSearchResponse({ output: 'body only' }).content, 'body only')
  for (const invalid of [null, [], {}, { output: 1 }, { output: 'ok', results: {} }]) {
    assert.throws(() => mapAlphaSearchResponse(invalid), error => error.code === 'WEB_PROVIDER_ERROR')
  }
})

test('HTTP and non-JSON failures remain failures and never echo a credential', async t => {
  const endpoint = await serve(t, (request, response) => {
    if (request.url === '/bad-json') return response.end('test-secret invalid JSON')
    if (request.url === '/wrong-fields') return json(response, { results: [] })
    response.statusCode = Number(request.url.slice(1))
    response.end('gateway reflected test-secret')
  })
  for (const path of ['/401', '/429', '/500', '/bad-json', '/wrong-fields']) {
    await assert.rejects(searchOpenAI({ query: 'q' }, options(`${endpoint}${path}`)), error => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR')
      assert.ok(!String(error.stack).includes('test-secret'))
      if (/^\/\d/.test(path)) assert.ok(error.message.includes(`HTTP ${path.slice(1)}`))
      return true
    })
  }
})

test('credentialed redirects never contact their target', async t => {
  let targetHits = 0
  const endpoint = await serve(t, (request, response) => {
    if (request.url === '/target') { targetHits++; return json(response, { output: 'unsafe' }) }
    response.writeHead(302, { location: '/target' }); response.end()
  })
  await assert.rejects(searchOpenAI({ query: 'q' }, options(endpoint)), error => error.code === 'WEB_PROVIDER_ERROR')
  assert.equal(targetHits, 0)
})

test('abort during headers or response body reports cancellation', async t => {
  let entered
  const bodyReady = new Promise(resolve => { entered = resolve })
  const endpoint = await serve(t, (request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.write('{"output":"')
    entered()
  })
  const before = new AbortController(); before.abort()
  await assert.rejects(searchOpenAI({ query: 'q' }, options(endpoint), before.signal), error => error.code === 'WEB_ABORTED')
  const during = new AbortController()
  const pending = searchOpenAI({ query: 'q' }, options(endpoint), during.signal)
  await bodyReady; during.abort()
  await assert.rejects(pending, error => error.code === 'WEB_ABORTED')
})

test('secret echoes in otherwise valid provider output are redacted', async t => {
  const endpoint = await serve(t, (_request, response) => json(response, {
    output: 'reflected test-secret',
    results: [{ url: 'https://example.com', title: 'test-secret' }, { url: 'https://example.com/?key=test-secret' }],
  }))
  const result = await searchOpenAI({ query: 'q' }, options(endpoint))
  assert.ok(!JSON.stringify(result).includes('test-secret'))
  assert.equal(result.sources.length, 1)
})

test('invalid endpoint, empty model and missing credentials are rejected before I/O', async () => {
  for (const endpoint of ['', 'file:///tmp', 'https://user:pass@example.com', 'https://example.com/#secret']) {
    assert.ok(validateOpenAIOptions({ endpoint, model: 'model' }))
  }
  assert.ok(validateOpenAIOptions({ endpoint: 'https://example.com', model: ' ' }))
  await assert.rejects(searchOpenAI({ query: 'q' }, { ...options('https://example.com'), apiKey: '' }), /API key is not configured/)
})
