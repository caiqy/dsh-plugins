import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Exercise the shipped browser artifact and public slot/form contracts without a server.
test('the shipped client contributes its Settings menu and host-backed per-feature switch', async () => {
  const require = createRequire(import.meta.url)
  let loaded, registration, Page, switchProps
  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: entry => { loaded = entry } } },
  })
  assert.equal(loaded.id, '@caiqy/dsh-plugin-toolbox')
  const client = loaded.factory(id => {
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return { Switch: props => {
      switchProps = props
      return React.createElement('button', { role: 'switch', 'aria-checked': props.checked,
        'aria-label': props.label, disabled: props.disabled })
    } }
    assert.ok(['react', 'react/jsx-runtime'].includes(id), `unexpected module: ${id}`)
    return require(id)
  })
  assert.deepEqual(Array.from(client.inject), ['slots', 'configForms', 'locale'])
  const writes = []
  let snapshot = { status: 'ready', value: { fixVsCodeLaunch: true }, writable: true, revision: 1 }
  let dictionaries
  const form = { set: async (key, value) => { writes.push([key, value]); return true } }
  client.apply({
    effect: callback => callback(),
    locale: {
      register: (ns, dicts) => { assert.equal(ns, 'dsh-toolbox'); dictionaries = dicts; return () => {} },
      bind: () => key => dictionaries.zh[key],
    },
    configForms: { get: ns => { assert.equal(ns, 'toolbox'); return form } },
    slots: {
      inject: (name, callback) => { assert.equal(name, 'settings.section'); return callback() },
      register: (entry, component) => { registration = entry; Page = component; return () => {} },
    },
  })
  assert.equal(registration.id, 'dsh-toolbox')
  assert.equal(registration.label(), 'DSH 工具箱')
  assert.equal(registration.locale, 'dsh-toolbox')
  const face = registration.inject()
  assert.equal(face.hooks.toolbox, form)
  assert.equal(await face.setEnabled(false), true)
  assert.deepEqual(writes, [['fixVsCodeLaunch', false]])
  const render = () => {
    switchProps = undefined
    return renderToStaticMarkup(React.createElement(Page, {
      useToolbox: selector => selector(snapshot), setEnabled: face.setEnabled,
      t: key => dictionaries.zh[key], close: () => {},
    }))
  }
  assert.match(render(), /DSH 工具箱/)
  assert.equal(switchProps.checked, true)
  assert.equal(switchProps.disabled, false)
  assert.equal(switchProps.label, '修复 VS Code 打开失败')
  snapshot = { ...snapshot, value: { fixVsCodeLaunch: false }, writable: false }
  assert.match(render(), /只读/)
  assert.equal(switchProps.checked, false)
  assert.equal(switchProps.disabled, true)
  snapshot = { ...snapshot, status: 'loading', value: undefined }
  assert.match(render(), /正在读取/)
  assert.equal(switchProps, undefined)
  snapshot = { ...snapshot, status: 'unavailable' }
  assert.match(render(), /配置暂不可用/)
  assert.equal(switchProps, undefined)
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), Object.keys(dictionaries.en).sort())
})
