import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Exercise the shipped browser artifact and public slot/form contracts without a server.
test('the shipped client contributes its Settings menu, per-feature switches, and restart button', async () => {
  const require = createRequire(import.meta.url)
  let loaded, registration, Page
  const switchCalls = []
  const buttonCalls = []

  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: entry => { loaded = entry } } },
  })
  assert.equal(loaded.id, '@caiqy/dsh-plugin-toolbox')

  const client = loaded.factory(id => {
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      return {
        Switch: props => {
          switchCalls.push(props)
          return React.createElement('button', {
            role: 'switch',
            'aria-checked': props.checked,
            'aria-label': props.label,
            disabled: props.disabled,
          })
        },
        Button: props => {
          buttonCalls.push(props)
          return React.createElement('button', {
            type: 'button',
            disabled: props.disabled,
            onClick: props.onClick,
          }, props.children)
        },
      }
    }
    assert.ok(['react', 'react/jsx-runtime'].includes(id), `unexpected module: ${id}`)
    return require(id)
  })

  assert.deepEqual(Array.from(client.inject), ['slots', 'configForms', 'locale'])
  const writes = []
  let snapshot = {
    status: 'ready',
    value: { fixVsCodeLaunch: true, allowForceRestart: false },
    writable: true,
    revision: 1,
  }
  let dictionaries
  const form = {
    set: async (key, value) => {
      writes.push([key, value])
      return true
    },
  }

  client.apply({
    effect: callback => callback(),
    locale: {
      register: (ns, dicts) => {
        assert.equal(ns, 'dsh-toolbox')
        dictionaries = dicts
        return () => {}
      },
      bind: () => key => dictionaries.zh[key],
    },
    configForms: {
      get: ns => {
        assert.equal(ns, 'toolbox')
        return form
      },
    },
    slots: {
      inject: (name, callback) => {
        assert.equal(name, 'settings.section')
        return callback()
      },
      register: (entry, component) => {
        registration = entry
        Page = component
        return () => {}
      },
    },
  })

  assert.equal(registration.id, 'dsh-toolbox')
  assert.equal(registration.label(), 'DSH 工具箱')
  assert.equal(registration.locale, 'dsh-toolbox')

  const face = registration.inject()
  assert.equal(face.hooks.toolbox, form)
  assert.equal(await face.setEnabled('fixVsCodeLaunch', false), true)
  assert.equal(await face.setEnabled('allowForceRestart', true), true)
  assert.deepEqual(writes, [
    ['fixVsCodeLaunch', false],
    ['allowForceRestart', true],
  ])

  const render = () => {
    switchCalls.length = 0
    buttonCalls.length = 0
    return renderToStaticMarkup(
      React.createElement(Page, {
        useToolbox: selector => selector(snapshot),
        setEnabled: face.setEnabled,
        restartApp: async () => ({ ok: true }),
        t: key => dictionaries.zh[key],
        close: () => {},
      }),
    )
  }

  const html = render()
  assert.match(html, /DSH 工具箱/)
  assert.match(html, /修复 VS Code 打开失败/)
  assert.match(html, /重启 DSH Desktop/)
  assert.match(html, /允许超时强制关闭/)

  // 2 switches rendered
  assert.equal(switchCalls.length, 2)
  assert.equal(switchCalls[0].checked, true)
  assert.equal(switchCalls[0].label, '修复 VS Code 打开失败')
  assert.equal(switchCalls[1].checked, false)
  assert.equal(switchCalls[1].label, '允许超时强制关闭')

  // Restart button rendered
  assert.equal(buttonCalls.length, 1)

  // Read-only state
  snapshot = { ...snapshot, writable: false }
  assert.match(render(), /只读/)
  assert.equal(switchCalls[0].disabled, true)
  assert.equal(switchCalls[1].disabled, true)

  // Loading state
  snapshot = { ...snapshot, status: 'loading', value: undefined }
  assert.match(render(), /正在读取/)
  assert.equal(switchCalls.length, 0)

  // Unavailable state
  snapshot = { ...snapshot, status: 'unavailable' }
  assert.match(render(), /配置暂不可用/)
  assert.equal(switchCalls.length, 0)

  // Dictionary completeness
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), Object.keys(dictionaries.en).sort())
})
