import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Exercise the shipped browser artifact against public host contracts without restarting DSH.
test('Settings and More share confirmation, restart state, and the persisted force option', async () => {
  const require = createRequire(import.meta.url)
  let loaded, dictionaries
  const registrations = new Map()
  const switchCalls = [], buttonCalls = [], menuCalls = [], frames = [], requests = []
  let respond = async () => Response.json({ ok: true })

  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: entry => { loaded = entry } } },
    requestAnimationFrame: callback => frames.push(callback),
    fetch: (...args) => { requests.push(args); return respond(...args) },
    Error,
  })
  assert.equal(loaded.id, '@caiqy/dsh-plugin-toolbox')
  const client = loaded.factory(id => {
    // The host supplies this shared observable engine; its npm SDK is not a standalone runtime.
    if (id === '@deepseek-ai/dsh-client-store') return {
      createSnapshotStore: initial => {
        let snapshot = initial
        return { getSnapshot: () => snapshot, set: next => { snapshot = next } }
      },
    }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return {
      Switch: props => {
        switchCalls.push(props)
        return React.createElement('button', { role: 'switch', 'aria-checked': props.checked, 'aria-label': props.label, disabled: props.disabled })
      },
      Button: props => {
        buttonCalls.push(props)
        return React.createElement('button', { type: 'button', disabled: props.disabled, onClick: props.onClick }, props.children)
      },
      MenuItemButton: props => {
        menuCalls.push(props)
        return React.createElement('button', { role: 'menuitem', disabled: props.disabled }, props.children)
      },
      Modal: props => props.open ? React.createElement('div', { role: 'dialog', 'aria-label': props.title }, props.children, props.footer) : null,
      IconRefreshOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
    }
    assert.ok(['react', 'react/jsx-runtime'].includes(id), `unexpected module: ${id}`)
    return require(id)
  })
  assert.deepEqual(Array.from(client.inject), ['slots', 'configForms', 'locale'])

  const writes = []
  let snapshot = { status: 'ready', value: { fixVsCodeLaunch: true, allowForceRestart: false }, writable: true, revision: 1 }
  const form = {
    getSnapshot: () => snapshot,
    set: async (key, value) => { writes.push([key, value]); return true },
  }
  const disposers = []
  client.apply({
    effect: callback => { disposers.push(callback()) },
    locale: {
      register: (ns, dicts) => { assert.equal(ns, 'dsh-toolbox'); dictionaries = dicts; return () => {} },
      bind: () => key => dictionaries.zh[key],
    },
    configForms: { get: ns => { assert.equal(ns, 'toolbox'); return form } },
    slots: {
      inject: (name, callback) => { disposers.push(callback()) },
      register: (entry, component) => {
        registrations.set(entry.name, { entry, component })
        return () => registrations.delete(entry.name)
      },
    },
  })
  const settings = registrations.get('settings.section')
  assert.equal(settings.entry.id, 'dsh-toolbox')
  assert.equal(settings.entry.label(), 'DSH 工具箱')
  const face = settings.entry.inject()
  assert.equal(face.hooks.toolbox, form)
  for (const { entry } of registrations.values()) {
    assert.equal(entry.locale, 'dsh-toolbox')
    assert.equal(entry.inject(), face, 'all entry points share one controller')
  }
  assert.equal(await face.setEnabled('fixVsCodeLaunch', false), true)
  assert.equal(await face.setEnabled('allowForceRestart', true), true)
  assert.deepEqual(writes, [['fixVsCodeLaunch', false], ['allowForceRestart', true]])

  const render = (slot = 'settings.section', extra = {}) => {
    switchCalls.length = buttonCalls.length = menuCalls.length = 0
    return renderToStaticMarkup(React.createElement(registrations.get(slot).component, {
      ...face,
      useToolbox: selector => selector(snapshot),
      useRestart: selector => selector(face.hooks.restart.getSnapshot()),
      t: key => dictionaries.zh[key],
      ...extra,
    }))
  }
  const html = render()
  assert.match(html, /DSH 工具箱/)
  assert.match(html, /修复 VS Code 打开失败/)
  assert.match(html, /重启 DSH Desktop/)
  assert.equal(switchCalls.length, 2)
  assert.equal(switchCalls[0].checked, true)
  assert.equal(switchCalls[1].checked, false)
  assert.equal(buttonCalls.length, 1)

  // Settings and More open the same dialog; neither requests a restart until confirmed.
  buttonCalls[0].onClick()
  assert.match(render('shell.overlay'), /确认重启/)
  buttonCalls.find(button => button.children === '取消').onClick()
  assert.equal(face.hooks.restart.getSnapshot().open, false)
  let dismissed = false
  assert.match(render('sidebar.panellist.actions', { onDismiss: () => { dismissed = true } }), /重启 DSH Desktop/)
  menuCalls[0].onSelect()
  assert.equal(dismissed, true)
  assert.equal(face.hooks.restart.getSnapshot().open, false, 'menu returns focus before opening modal')
  frames.shift()()
  assert.match(render('shell.overlay'), /临时任务可能会被中断/)
  assert.equal(requests.length, 0)
  face.closeRestart()
  await face.confirmRestart()
  assert.equal(requests.length, 0, 'cancelled confirmation cannot trigger HTTP')

  // Pending state blocks repeat requests through either entry; a server failure permits retry.
  let release
  respond = () => new Promise(resolve => { release = resolve })
  face.requestRestart()
  const pending = face.confirmRestart()
  await face.confirmRestart()
  assert.equal(requests.length, 1)
  assert.equal(requests[0][0], '/api/toolbox/restart')
  assert.equal(requests[0][1].method, 'POST')
  assert.deepEqual(JSON.parse(requests[0][1].body), { allowForce: false })
  render('sidebar.panellist.actions')
  assert.equal(menuCalls[0].disabled, true)
  render()
  assert.equal(buttonCalls[0].disabled, true)
  release(Response.json({ ok: false, error: 'helper not ready' }))
  await pending
  assert.match(render('shell.overlay'), /helper not ready/)
  assert.equal(face.hooks.restart.getSnapshot().busy, false)

  respond = async () => { throw new Error('connection lost') }
  await face.confirmRestart()
  assert.match(render('shell.overlay'), /connection lost/)
  snapshot = { ...snapshot, value: { ...snapshot.value, allowForceRestart: true } }
  respond = async () => Response.json({ ok: true, message: 'scheduled' })
  assert.match(render('shell.overlay'), /超过 10 秒/)
  await face.confirmRestart()
  assert.deepEqual(JSON.parse(requests.at(-1)[1].body), { allowForce: true }, 'confirmation reads the latest saved preference')
  assert.match(render('shell.overlay'), /scheduled/)
  assert.equal(face.hooks.restart.getSnapshot().busy, true)
  face.closeRestart()
  face.requestRestart()
  await face.confirmRestart()
  assert.equal(requests.length, 3, 'closing and reopening never repeats an accepted restart')

  snapshot = { ...snapshot, writable: false }
  assert.match(render(), /只读/)
  assert(switchCalls.every(item => item.disabled))
  snapshot = { ...snapshot, status: 'loading', value: undefined }
  assert.match(render(), /正在读取/)
  assert.equal(switchCalls.length, 0)
  render('sidebar.panellist.actions')
  assert.equal(menuCalls[0].disabled, true)
  snapshot = { ...snapshot, status: 'unavailable' }
  assert.match(render(), /配置暂不可用/)
  assert.equal(switchCalls.length, 0)
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), Object.keys(dictionaries.en).sort())
  for (const dispose of disposers.reverse()) dispose?.()
  assert.equal(registrations.size, 0, 'plugin disposal removes all entry points')
})
