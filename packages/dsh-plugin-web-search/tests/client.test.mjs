import assert from 'node:assert/strict'
import test from 'node:test'
import { createDraft, draftOperations, editDraft, saveDraft, selectedProvider } from '../lib/client-model.js'
import { PROVIDERS } from '../lib/providers.js'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const second = { id: 'catalog', label: 'Catalog', fields: [{ key: 'collection', label: 'Collection', defaultValue: 'public' }] }
const providers = [...PROVIDERS, second]
const settings = { provider: 'openai', providers: { openai: { endpoint: 'https://search.example/v1/alpha/search', model: 'saved-model' }, catalog: { collection: 'saved-collection' } } }

function operations(overrides = {}) {
  const calls = []
  let revision = 7
  return {
    calls,
    mutate: async (ops, expectedRevision) => { calls.push({ kind: 'settings', ops, revision: expectedRevision }); revision++; return true },
    revision: () => revision,
    storeCredential: async (ref, value) => { calls.push({ kind: 'credential', ref, value }); return true },
    ...overrides,
  }
}

test('provider-specific fields and independent drafts survive selection changes', () => {
  let draft = createDraft(settings, 7, providers)
  draft = editDraft(draft, 'openai', 'model', 'edited-model')
  draft = { ...draft, settings: { ...draft.settings, provider: 'catalog' } }
  assert.deepEqual(selectedProvider(draft, providers).fields.map(field => field.key), ['collection'])
  assert.equal(draft.settings.providers.catalog.collection, 'saved-collection')
  draft = editDraft(draft, 'catalog', 'collection', 'edited-collection')
  draft = { ...draft, settings: { ...draft.settings, provider: 'openai' } }
  assert.deepEqual(selectedProvider(draft, providers).fields.map(field => field.key), ['endpoint', 'model'])
  assert.equal(draft.settings.providers.openai.model, 'edited-model')
  assert.equal(draft.settings.providers.catalog.collection, 'edited-collection')
  assert.equal(draft.revision, 7)
  assert.equal(settings.providers.openai.model, 'saved-model')
})

test('reopening restores persisted values and discard uses latest Host values without returning secrets', () => {
  const draft = createDraft(settings, 7, providers)
  assert.equal(draft.settings.providers.openai.endpoint, settings.providers.openai.endpoint)
  assert.deepEqual(draft.secrets, {})
  const edited = editDraft(draft, 'openai', 'model', 'unsaved-model')
  edited.secrets.openai = 'unsaved-key'
  const fresh = createDraft({ ...settings, providers: { ...settings.providers, openai: { ...settings.providers.openai, model: 'other-editor-model' } } }, 8, providers)
  assert.equal(fresh.settings.providers.openai.model, 'other-editor-model')
  assert.equal(fresh.revision, 8)
  assert.deepEqual(fresh.secrets, {})
})

test('blank credential keeps the original key and only changed non-secret paths are saved', async () => {
  const draft = editDraft(createDraft(settings, 7, providers), 'openai', 'endpoint', 'https://new.example/full/search')
  draft.secrets.openai = '   '
  const ops = operations()
  const result = await saveDraft(draft, providers, ops)
  assert.equal(result.failure, undefined)
  assert.deepEqual(ops.calls, [{ kind: 'settings', revision: 7, ops: [{ op: 'set', path: ['providers', 'openai', 'endpoint'], value: 'https://new.example/full/search' }] }])
  assert.equal(result.credentialSaved, false)
  assert.deepEqual(draftOperations(result.draft, providers), [])
})

test('configuration conflicts keep all drafts and the original revision and do not write a key', async () => {
  const draft = editDraft(createDraft(settings, 7, providers), 'openai', 'model', 'next-model')
  draft.secrets.openai = 'new-key'
  const ops = operations({ mutate: async () => false, revision: () => 99 })
  const result = await saveDraft(draft, providers, ops)
  assert.equal(result.failure, 'settings')
  assert.equal(result.settingsSaved, false)
  assert.equal(result.draft, draft)
  assert.equal(result.draft.revision, 7)
  assert.equal(result.draft.secrets.openai, 'new-key')
  assert.deepEqual(ops.calls, [])
})

test('credential refusal reports partial success and retry does not repeat accepted settings', async () => {
  const draft = editDraft(createDraft(settings, 7, providers), 'openai', 'model', 'next-model')
  draft.secrets.openai = 'new-key'
  const ops = operations({ storeCredential: async () => false })
  const result = await saveDraft(draft, providers, ops)
  assert.equal(result.settingsSaved, true)
  assert.equal(result.credentialSaved, false)
  assert.equal(result.failure, 'credential')
  assert.equal(result.draft.secrets.openai, 'new-key')
  assert.equal(result.draft.settings.providers.openai.model, 'next-model')
  assert.equal(result.draft.revision, 8)
  assert.deepEqual(draftOperations(result.draft, providers), [])
  const retryOps = operations({ revision: () => 8 })
  const retried = await saveDraft(result.draft, providers, retryOps)
  assert.deepEqual(retryOps.calls, [{ kind: 'credential', ref: 'DSH_WEB_SEARCH_OPENAI_API_KEY', value: 'new-key' }])
  assert.equal(retried.failure, undefined)
  assert.equal(retried.draft.secrets.openai, '')
  assert.equal(result.draft.secrets.openai, 'new-key')
})

test('transport failures retain input without returning errors that may disclose a secret', async () => {
  const draft = editDraft(createDraft(settings, 7, providers), 'openai', 'model', 'next-model')
  draft.secrets.openai = 'secret-never-in-feedback'
  const rejected = await saveDraft(draft, providers, operations({ storeCredential: async () => { throw new Error('secret-never-in-feedback') } }))
  assert.equal(rejected.failure, 'credential')
  assert.equal(rejected.draft.secrets.openai, 'secret-never-in-feedback')
  assert.equal(rejected.message, undefined)
  assert.equal(JSON.stringify(rejected.draft.settings).includes('secret-never-in-feedback'), false)
  const failedSettings = await saveDraft(draft, providers, operations({ mutate: async () => { throw new Error('offline') } }))
  assert.equal(failedSettings.failure, 'settings')
  assert.equal(failedSettings.draft.settings.providers.openai.model, 'next-model')
  assert.equal(failedSettings.draft.secrets.openai, 'secret-never-in-feedback')
})

test('shipped client factory registers the bundle page and passes accessible states to Host primitives', async () => {
  const require = createRequire(import.meta.url)
  const rendered = []
  const primitives = Object.fromEntries(['Button', 'Menu', 'SettingsForm', 'SettingsSecretField', 'SettingsValueField'].map(name => [name,
    props => { rendered.push({ name, props }); return React.createElement(React.Fragment, null, props.children, props.anchor) },
  ]))
  let loaded
  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: entry => { loaded = entry } } }, structuredClone, URL,
  })
  assert.equal(loaded.id, 'dsh-plugin-web-search')
  const plugin = loaded.factory(id => {
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    assert.ok(['react', 'react/jsx-runtime'].includes(id), `unexpected runtime dependency: ${id}`)
    return require(id)
  })
  assert.ok(plugin.inject.includes('configForms'))
  assert.ok(plugin.inject.includes('remote.credentials'))
  let entry, Page, removed = false
  const disposers = []
  const credentialCalls = []
  let snapshot = { status: 'ready', value: settings, revision: 7, writable: true, mode: 'host' }
  const scope = { getSnapshot: () => snapshot, subscribe: () => () => {}, mutate: async () => true }
  plugin.apply({
    configForms: { get: namespace => { assert.equal(namespace, 'web-search-provider'); return scope } },
    remote: { credentials: {
      describe: async refs => { credentialCalls.push(refs); return { ok: true, value: { DSH_WEB_SEARCH_OPENAI_API_KEY: { configured: true, writable: false } } } },
      set: async () => ({ ok: false }),
    } },
    effect: callback => { disposers.push(callback()) },
    slots: {
      inject: (name, callback) => { assert.equal(name, 'plugins.bundle.config'); return callback() },
      register: (registration, component) => { entry = registration; Page = component; return () => { removed = true } },
    },
  })
  assert.equal(entry.key, 'dsh-plugin-web-search')
  const face = entry.inject()
  assert.equal(face.hooks.searchSettings, scope)
  const describe = await face.describeCredentials()
  assert.equal(describe.DSH_WEB_SEARCH_OPENAI_API_KEY.writable, false)
  assert.deepEqual(Array.from(credentialCalls[0]), ['DSH_WEB_SEARCH_OPENAI_API_KEY'])
  assert.equal(await face.operations.storeCredential('DSH_WEB_SEARCH_OPENAI_API_KEY', 'test-key'), false)
  const render = () => {
    rendered.length = 0
    renderToStaticMarkup(React.createElement(Page, { view: 'page', useSearchSettings: selector => selector(snapshot), ...face }))
  }
  render()
  const fields = rendered.filter(item => item.name === 'SettingsValueField').map(item => item.props)
  assert.deepEqual(fields.map(field => field.label), ['接口地址', '搜索模型'])
  assert.equal(fields[0].text, settings.providers.openai.endpoint)
  assert.equal(fields[1].text, 'saved-model')
  assert.equal(rendered.find(item => item.name === 'SettingsSecretField').props.text, '')
  assert.equal(rendered.find(item => item.name === 'SettingsSecretField').props.stateLabel, '正在读取')
  assert.equal(rendered.find(item => item.name === 'Menu').props.selectedId, 'openai')
  assert.ok(rendered.find(item => item.name === 'Menu').props.anchor.props['aria-labelledby'])
  snapshot = { ...snapshot, value: { ...settings, providers: { ...settings.providers, openai: { endpoint: 'ftp://invalid.example', model: '' } } } }
  render()
  assert.equal(rendered.find(item => item.name === 'SettingsForm').props.state.invalid, true)
  assert.ok(rendered.filter(item => item.name === 'SettingsValueField').every(item => item.props.invalid && item.props.invalidLabel))
  snapshot = { ...snapshot, writable: false }
  render()
  assert.equal(rendered.find(item => item.name === 'SettingsForm').props.state.writable, false)
  assert.equal(rendered.find(item => item.name === 'SettingsForm').props.state.dirty, false)
  assert.ok(rendered.filter(item => item.name === 'SettingsValueField').every(item => item.props.disabled))
  snapshot = { ...snapshot, status: 'unavailable' }
  render()
  assert.equal(rendered.find(item => item.name === 'SettingsForm').props.state.available, false)
  disposers.forEach(dispose => dispose())
  assert.equal(removed, true)
})
