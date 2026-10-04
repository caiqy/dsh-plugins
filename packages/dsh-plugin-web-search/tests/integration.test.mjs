import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { applyEntryPatches } from '@deepseek-ai/cordis-plugin-include'
import { Context, Service } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import * as toolWeb from '@deepseek-ai/dsh-tool-web'
import * as plugin from '../lib/index.js'

class TestCredentials extends Service {
  key = 'test-key'
  constructor(ctx) { super(ctx, 'credentials') }
  async resolve(ref) {
    assert.equal(ref, 'DSH_WEB_SEARCH_OPENAI_API_KEY')
    return this.key ? { value: this.key, source: 'test' } : undefined
  }
}

async function context(t, endpoint, selected = plugin.name) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt, { includeRuntimeContext: false })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(WebRuntime, { searchProvider: selected, fetchProvider: 'http' })
  await ctx.plugin(TestCredentials)
  const fiber = await ctx.plugin(plugin, { providers: { openai: { endpoint, model: 'model-one' } } })
  await ctx.plugin(toolWeb, { searchMaxResults: 2, fetch: true })
  t.after(() => ctx.fiber.dispose())
  return { ctx, fiber }
}

async function server(t, calls) {
  const instance = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    const parsed = JSON.parse(body)
    calls.push({ auth: request.headers.authorization, body: parsed, path: request.url })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ output: `Answer for ${parsed.commands.search_query[0].q}`, results: [
      { url: 'https://example.com/shared', title: 'Shared' },
      { url: `https://example.com/${encodeURIComponent(parsed.commands.search_query[0].q)}` },
      { url: 'https://example.com/extra' },
    ] }))
  })
  instance.listen(0, '127.0.0.1'); await once(instance, 'listening')
  t.after(() => new Promise(resolve => { instance.closeAllConnections(); instance.close(resolve) }))
  return `http://127.0.0.1:${instance.address().port}`
}

test('the real host tool routes through the provider, merges queries and preserves presentation', async t => {
  const calls = []
  const endpoint = await server(t, calls)
  const { ctx, fiber } = await context(t, `${endpoint}/v1/alpha/search`)
  assert.deepEqual(ctx.tools.schemas().map(tool => tool.name), ['web_search', 'web_fetch'])
  const tool = ctx.tools.get('web_search')
  assert.ok(tool)
  assert.deepEqual(Object.keys(tool.parameters.properties), ['queries'])
  const args = { queries: ['one', 'two', 'one'] }
  const value = await tool.execute(args, { signal: new AbortController().signal })
  assert.equal(calls.length, 2)
  assert.equal(value.sources.length, 2)
  assert.equal(new Set(value.sources.map(source => source.url)).size, 2)
  assert.equal(value.truncated, true)
  assert.ok(value.content.includes('Answer for one') && value.content.includes('Answer for two'))
  const rendered = tool.output.render(args, value)[0].text
  assert.ok(rendered.includes('[Shared](https://example.com/shared)'))
  assert.ok(rendered.includes('Cite the relevant URLs'))
  const result = { content: tool.output.render(args, value), meta: tool.output.presentationMeta(args, value) }
  assert.equal(tool.presentResult(args, result).card, 'web')

  let fetched = false
  ctx.web.registerFetchProvider({ id: 'http', available: () => true, fetch: async request => {
    fetched = true
    return { url: request.url, statusCode: 200, body: { kind: 'text', content: 'ok' }, truncated: false }
  } })
  assert.equal((await ctx.web.fetch({ url: 'https://example.com' })).statusCode, 200)
  assert.equal(fetched, true)
  await fiber.dispose()
  await assert.rejects(ctx.web.search({ query: 'disposed' }), error => error.code === 'WEB_PROVIDER_CONFIGURED_MISSING')
  assert.ok(ctx.tools.get('web_search'), 'The plugin must not unregister the host-owned tool.')
})

test('next requests resolve changed credentials and updated provider-only config', async t => {
  const calls = []
  const endpoint = await server(t, calls)
  const { ctx, fiber } = await context(t, `${endpoint}/first`)
  await ctx.web.search({ query: 'one' })
  ctx.credentials.key = 'rotated-test-key'
  fiber.update({ providers: { openai: { endpoint: `${endpoint}/next`, model: 'model-two' } } })
  await fiber.await()
  await ctx.web.search({ query: 'two' })
  assert.equal(calls[1].auth, 'Bearer rotated-test-key')
  assert.equal(calls[1].path, '/next')
  assert.equal(calls[1].body.model, 'model-two')
  assert.ok(!JSON.stringify(fiber.config).includes('rotated-test-key'))
})

test('the bundle patch selects only search and does not carry a tool replacement', async () => {
  const patch = parse(await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))
  assert.deepEqual(patch[0], { id: 'web', config: { searchProvider: plugin.name, fetchProvider: 'http' } })
  assert.deepEqual(patch[1].insert, [{ id: plugin.name, name: 'dsh-plugin-web-search' }])
  assert.equal('default' in plugin, false)
  const base = [{ id: 'web', name: '@deepseek-ai/dsh-web', config: { searchProvider: 'deepseek-official', fetchProvider: 'http' } }]
  const warn = message => assert.fail(message)
  const enabled = applyEntryPatches(base, patch, warn)
  assert.equal(enabled.find(row => row.id === 'web').config.searchProvider, plugin.name)
  assert.equal(enabled.find(row => row.id === plugin.name).name, 'dsh-plugin-web-search')
  const disabled = applyEntryPatches(base, [], warn)
  assert.equal(disabled[0].config.searchProvider, 'deepseek-official')
  assert.equal(disabled.some(row => row.id === plugin.name), false)
  const userOverride = { id: 'web', config: { searchProvider: 'custom', fetchProvider: 'custom-fetch' } }
  const overridden = applyEntryPatches(base, [...patch, userOverride], warn)
  assert.deepEqual(overridden[0].config, userOverride.config)
  assert.equal(base[0].config.searchProvider, 'deepseek-official', 'Enabling must not mutate cached base composition.')
})
