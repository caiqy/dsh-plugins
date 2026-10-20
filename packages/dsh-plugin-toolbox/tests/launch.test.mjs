import assert from 'node:assert/strict'
import childProcess, { spawn as esmSpawn } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import * as plugin from '../lib/index.js'
import { installVsCodeLaunchFix } from '../lib/launch.js'

// Real module interception, with a fake process boundary so the test never launches an editor.
test('cleans only VS Code GUI launches and restores interception on disposal', async () => {
  const original = childProcess.spawn
  const env = { ELECTRON_RUN_AS_NODE: '1', PATH: 'keep', DSH_TEST: 'keep' }
  const options = { detached: true, stdio: 'ignore', env }
  const directory = tmpdir()
  const command = join(directory, 'Microsoft VS Code', 'Code.exe')
  const calls = []
  const sentinel = {}
  const fake = (...args) => { calls.push(args); return sentinel }
  childProcess.spawn = fake
  syncBuiltinESMExports()
  let dispose = () => {}
  const parentFlag = process.env.ELECTRON_RUN_AS_NODE
  let enabled = true
  try {
    dispose = installVsCodeLaunchFix(() => enabled)
    assert.equal(esmSpawn, childProcess.spawn, 'already-imported ESM bindings must see the fix')
    assert.equal(esmSpawn(command, [directory], options), sentinel)
    assert.deepEqual(calls.at(-1)[2].env, { PATH: 'keep', DSH_TEST: 'keep' })
    assert.deepEqual(env, { ELECTRON_RUN_AS_NODE: '1', PATH: 'keep', DSH_TEST: 'keep' })
    assert.equal(process.env.ELECTRON_RUN_AS_NODE, parentFlag)
    enabled = false
    esmSpawn(command, [directory], options)
    assert.equal(calls.at(-1)[2], options, 'disabled live switch must preserve the original launch')
    enabled = true
    esmSpawn(command, [directory], options)
    assert.equal(calls.at(-1)[2].env.ELECTRON_RUN_AS_NODE, undefined)

    esmSpawn(command, [directory], { ...options, env: { electron_run_as_node: '1', PATH: 'keep' } })
    assert.deepEqual(calls.at(-1)[2].env, { PATH: 'keep' })

    for (const args of [
      [command, ['resources/app/out/cli.js', directory], options],
      [command, [join(directory, 'missing-toolbox-path')], options],
      [command, [directory], { ...options, detached: false }],
      [command, [directory], { ...options, stdio: 'pipe' }],
      [command, [directory], { ...options, env: { ELECTRON_RUN_AS_NODE: '0' } }],
      [join(directory, 'DeepSeek Harness.exe'), [directory], options],
      [process.execPath, ['-e', '0'], options],
      ['echo', { stdio: 'inherit' }],
    ]) {
      esmSpawn(...args)
      assert.deepEqual(calls.at(-1), args, 'unrelated calls must retain all arguments')
      assert.equal(calls.at(-1)[2], args[2])
    }

    dispose()
    assert.equal(childProcess.spawn, fake)
    assert.equal(esmSpawn, fake)

    // An independently installed later wrapper must survive our disposal.
    dispose = installVsCodeLaunchFix()
    const ours = childProcess.spawn
    const later = (...args) => ours(...args)
    childProcess.spawn = later
    syncBuiltinESMExports()
    dispose()
    assert.equal(childProcess.spawn, later)
    esmSpawn(command, [directory], options)
    assert.equal(calls.at(-1)[2], options, 'disposed fix must stop even beneath another wrapper')
  } finally {
    dispose()
    childProcess.spawn = original
    syncBuiltinESMExports()
  }
})

test('Cordis plugin disposal removes the fix', async () => {
  const ctx = new Context()
  const original = childProcess.spawn
  try {
    const fiber = await ctx.plugin(plugin)
    assert.equal(plugin.name, 'toolbox')
    if (process.platform === 'win32') assert.notEqual(childProcess.spawn, original)
    else assert.equal(childProcess.spawn, original)
    fiber.update({ fixVsCodeLaunch: false })
    await fiber.await()
    assert.equal(fiber.config.fixVsCodeLaunch.get(), false)
    fiber.update({ fixVsCodeLaunch: true })
    await fiber.await()
    assert.equal(fiber.config.fixVsCodeLaunch.get(), true)
    if (process.platform === 'win32') assert.notEqual(childProcess.spawn, original)
    await fiber.dispose()
    assert.equal(childProcess.spawn, original)
  } finally {
    await ctx.fiber.dispose()
  }
})
