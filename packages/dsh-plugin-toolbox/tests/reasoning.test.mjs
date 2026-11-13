import assert from 'node:assert/strict'
import test from 'node:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import { Context } from '@deepseek-ai/cordis'
import * as plugin from '../lib/index.js'
import { installReasoningEffortFix } from '../lib/reasoning.js'

const responses = effort => ({
  model: 'any-model', stream: true, reasoning: { effort: 'medium', summary: 'auto' },
  input: [
    { type: 'configuration_update', reasoning: { effort: 'low', summary: 'auto' }, custom: 'keep' },
    { type: 'reasoning', encrypted_content: 'signed-history' },
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'previous' }] },
    { role: 'user', content: 'continue' },
    { type: 'configuration_update', reasoning: { effort } },
  ],
})
const messages = effort => ({
  model: 'any-model', stream: true, output_config: { effort: 'high', format: { type: 'json_schema' } },
  thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
  betas: ['mid-conversation-output-config'],
  messages: [
    { role: 'system', content: [], output_config: { effort: 'low', custom: 'keep' } },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'previous', signature: 'signed' }, { type: 'redacted_thinking', data: 'redacted' }] },
    { role: 'user', content: [{ type: 'text', text: 'continue', cache_control: { type: 'ephemeral' } }] },
    { role: 'system', content: [], output_config: { effort } },
  ],
})

async function withFix(run) {
  const original = globalThis.fetch
  const calls = [], reports = []
  const response = new Response('data: sentinel\n\n', { headers: { 'content-type': 'text/event-stream' } })
  const fake = (...args) => { calls.push(args); return Promise.resolve(response) }
  globalThis.fetch = fake
  let enabled = true
  const dispose = installReasoningEffortFix(() => enabled, report => reports.push(report))
  try {
    await run({ calls, reports, response, fake, dispose, toggle: value => { enabled = value } })
  } finally {
    dispose()
    globalThis.fetch = original
  }
}

test('Responses: promote current mapped effort on direct and compatible endpoints without changing content', async () => {
  await withFix(async ({ calls, response }) => {
    for (const host of ['api.openai.com', 'compatible.example']) for (const effort of ['none', 'low', 'medium', 'high', 'xhigh', 'max']) {
      const body = responses(effort), snapshot = structuredClone(body)
      const signal = new AbortController().signal
      const init = { method: 'POST', signal, headers: { authorization: 'Bearer fake', 'content-type': 'application/json', 'content-length': '123' }, body: JSON.stringify(body) }
      const result = await fetch(`https://${host}/v1/responses`, init)
      const [url, sent] = calls.at(-1), wire = JSON.parse(sent.body)
      assert.equal(result, response, 'streaming response is not consumed or replaced')
      assert.equal(sent.signal, signal)
      assert.equal(sent.headers.get('authorization'), 'Bearer fake')
      assert.equal(sent.headers.has('content-length'), false, 'fetch recalculates the changed body length')
      assert.equal(url, `https://${host}/v1/responses`)
      assert.equal(wire.reasoning.effort, effort)
      assert.equal(wire.reasoning.summary, 'auto')
      assert.deepEqual(wire.input[0], { type: 'configuration_update', reasoning: { summary: 'auto' }, custom: 'keep' })
      assert.deepEqual(wire.input.slice(1), body.input.slice(1, -1))
      assert.deepEqual(body, snapshot)
      assert.equal(init.headers['content-length'], '123')
    }
  })
})

test('Messages: native effort mapping preserves thinking blocks, signatures, cache controls and other config', async () => {
  await withFix(async ({ calls }) => {
    for (const host of ['api.anthropic.com', 'compatible.example']) for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
      const body = messages(effort)
      await fetch(`https://${host}/v1/messages`, { method: 'POST', body: JSON.stringify(body) })
      const wire = JSON.parse(calls.at(-1)[1].body)
      assert.deepEqual(wire.output_config, { ...body.output_config, effort })
      assert.deepEqual(wire.thinking, body.thinking)
      assert.deepEqual(wire.betas, body.betas)
      assert.deepEqual(wire.messages, [{ role: 'system', content: [], output_config: { custom: 'keep' } }, ...body.messages.slice(1, -1)])
    }
  })
})

test('DeepSeek, Chat Completions and Gemini native parameters pass through byte-for-byte', async () => {
  await withFix(async ({ calls, reports }) => {
    for (const [url, body] of [
      ['https://api.deepseek.com/anthropic/v1/messages', { model: 'deepseek', messages: [], thinking: { type: 'enabled' }, output_config: { effort: 'max' } }],
      ['https://api.deepseek.com/chat/completions', { model: 'deepseek', messages: [], thinking: { type: 'enabled' }, reasoning_effort: 'high' }],
      ['https://api.anthropic.com/v1/messages', { messages: [], thinking: { type: 'enabled', budget_tokens: 4096 } }],
      ['https://api.anthropic.com/v1/messages', { messages: [], thinking: { type: 'disabled' } }],
      ['https://generativelanguage.googleapis.com/v1beta/models/gemini:streamGenerateContent?alt=sse', { contents: [], generationConfig: { thinkingConfig: { thinkingLevel: 'HIGH', includeThoughts: true } } }],
      ['https://vertex.example/v1/projects/p/locations/l/publishers/google/models/gemini:generateContent', { contents: [], generationConfig: { thinkingConfig: { thinkingBudget: 8192 } } }],
    ]) {
      const init = { method: 'POST', body: JSON.stringify(body) }
      await fetch(url, init)
      assert.equal(calls.at(-1)[1], init)
    }
    assert(reports.every(report => report.action === 'unchanged'))
    assert(reports.some(report => report.protocol === 'gemini'))
  })
})

test('ambiguous history, unknown formats, compressed and streaming bodies are never guessed or consumed', async () => {
  await withFix(async ({ calls, reports }) => {
    const noCurrent = responses('high'); noCurrent.input.pop()
    const malformed = messages('max'); malformed.messages.at(-1).content = 'not a control-only message'
    const unknownEffort = responses('future-effort')
    const disabled = messages('high'); disabled.thinking = { type: 'disabled' }
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify(responses('high')))); controller.close() } })
    const request = new Request('https://example.test/v1/responses', { method: 'POST', body: JSON.stringify(responses('high')) })
    for (const [input, init] of [
      ['https://example.test/v1/responses', { method: 'POST', body: JSON.stringify(noCurrent) }],
      ['https://example.test/v1/messages', { method: 'POST', body: JSON.stringify(malformed) }],
      ['https://example.test/v1/messages', { method: 'POST', body: JSON.stringify(disabled) }],
      ['https://example.test/v1/responses', { method: 'POST', body: JSON.stringify(unknownEffort) }],
      ['https://example.test/v1/responses', { method: 'POST', body: JSON.stringify(responses('high')), headers: { 'content-encoding': 'gzip' } }],
      ['https://example.test/v1/responses', { method: 'POST', body: JSON.stringify(responses('high')), headers: { 'content-digest': 'signed-payload' } }],
      ['https://example.test/v1/responses', { method: 'POST', body: JSON.stringify(responses('high')), headers: { authorization: 'AWS4-HMAC-SHA256 fake' } }],
      ['https://example.test/v1/responses', { method: 'POST', body: '{invalid' }],
      ['https://example.test/v1/responses', { method: 'POST', body: stream, duplex: 'half' }],
      ['https://example.test/unknown-protocol', { method: 'POST', body: JSON.stringify(responses('high')) }],
      ['https://example.test/v1/responses', { method: 'GET' }],
      [request, undefined],
    ]) {
      await fetch(input, init)
      assert.equal(calls.at(-1)[0], input)
      assert.equal(calls.at(-1)[1], init)
    }
    assert.equal(request.bodyUsed, false)
    assert.equal(stream.locked, false)
    assert(reports.some(report => report.reason === 'no-current-marker'))
    assert(reports.some(report => report.reason === 'unknown-effort'))
    assert(reports.some(report => report.reason === 'unbuffered-body'))
    assert(reports.every(report => !JSON.stringify(report).includes('signed-payload')))
  })
})

test('Request overrides, buffered bytes, live switch and later wrappers preserve fetch semantics', async () => {
  await withFix(async ({ calls, fake, toggle, dispose }) => {
    const request = new Request('https://example.test/v1/responses', { method: 'PUT', headers: { 'content-encoding': 'gzip' }, body: 'untouched' })
    const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: new TextEncoder().encode(JSON.stringify(responses('xhigh'))) }
    await fetch(request, init)
    assert.equal(JSON.parse(new TextDecoder().decode(calls.at(-1)[1].body)).reasoning.effort, 'xhigh')
    assert.equal(calls.at(-1)[0], request)
    assert.equal(request.bodyUsed, false)
    const ours = globalThis.fetch
    const later = (...args) => ours(...args)
    globalThis.fetch = later
    for (const enabled of [false, true, false, true]) {
      toggle(enabled)
      await fetch(request, init)
      assert.equal(globalThis.fetch, later, 'volatile toggles never reinstall a wrapper')
      if (enabled) assert.equal(JSON.parse(new TextDecoder().decode(calls.at(-1)[1].body)).reasoning.effort, 'xhigh')
      else assert.equal(calls.at(-1)[1], init)
    }
    await fetch('https://example.test/v1/responses', { method: 'POST', body: init.body })
    const sent = calls.at(-1)[1]
    assert.equal(new Request('https://example.test/v1/responses', sent).headers.get('content-type'), null, 'buffered bytes retain their implicit content type')
    dispose()
    assert.equal(globalThis.fetch, later)
    await fetch(request, init)
    assert.equal(calls.at(-1)[1], init)
    assert.notEqual(globalThis.fetch, fake)
  })
})

test('Cordis settings default off and reconfiguration/disposal clean up the fetch wrapper', async () => {
  const ctx = new Context(), original = globalThis.fetch
  try {
    const fiber = await ctx.plugin(plugin)
    assert.equal(fiber.config.fixReasoningEffort.get(), false)
    // Bare Cordis restarts on update; the host supplies the volatile-update hook.
    fiber.update({ fixReasoningEffort: true }); await fiber.await()
    assert.equal(fiber.config.fixReasoningEffort.get(), true)
    await fiber.dispose()
    assert.equal(globalThis.fetch, original)
  } finally { await ctx.fiber.dispose(); globalThis.fetch = original }
})

test('adopting compression fetch accessors coexist in both install orders without repeated dispatch', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
  for (const order of ['before-compression', 'after-compression']) {
    const calls = []
    const native = async (...args) => { calls.push(args); return new Response('mock stream') }
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: native })
    let dispose = () => {}, dispatches = 0
    try {
      const installCompression = () => {
        let downstream = globalThis.fetch
        const depth = new AsyncLocalStorage()
        const dispatch = (...args) => {
          if (depth.getStore()) return native(...args)
          dispatches++
          return depth.run(true, () => downstream(...args))
        }
        Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => dispatch, set: value => { downstream = value } })
      }
      if (order === 'before-compression') { dispose = installReasoningEffortFix(() => true); installCompression() }
      else { installCompression(); dispose = installReasoningEffortFix(() => true) }
      const init = { method: 'POST', body: JSON.stringify(responses('high')) }
      await fetch('https://example.test/v1/responses', init)
      assert.equal(calls.length, 1)
      assert.equal(dispatches, 1)
      assert.equal(JSON.parse(calls[0][1].body).reasoning.effort, 'high')
      dispose()
      await fetch('https://example.test/v1/responses', init)
      assert.equal(calls.length, 2)
      assert.equal(dispatches, 2)
      assert.equal(calls[1][1], init, 'disposed wrapper no longer changes the body beneath an accessor')
    } finally { dispose(); Object.defineProperty(globalThis, 'fetch', descriptor) }
  }
})
