import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import * as plugin from '../lib/index.js'
import { DEFAULT_WORKER_PATH } from '../lib/restart.js'

test('restart worker script exists in package resources', () => {
  assert.ok(existsSync(DEFAULT_WORKER_PATH), `Worker script missing at ${DEFAULT_WORKER_PATH}`)
})

test('getDesktopProcessInfo throws when target process is not DeepSeek Harness', () => {
  if (process.platform === 'win32') {
    // Current test process is node.exe, not DeepSeek Harness.exe
    assert.throws(
      () => plugin.getDesktopProcessInfo(process.pid),
      /不是有效的 DeepSeek Harness 客户端/,
    )
  }
})

test('registers /api/toolbox/restart route with connection service and cleans up on disposal', async () => {
  const ctx = new Context()
  const registeredRoutes = []

  ctx.provide('connection', {
    fetch: {
      register(route) {
        registeredRoutes.push(route)
        return () => {
          const idx = registeredRoutes.indexOf(route)
          if (idx !== -1) registeredRoutes.splice(idx, 1)
        }
      },
    },
  })

  const fiber = await ctx.plugin(plugin)
  assert.equal(registeredRoutes.length, 1)
  const route = registeredRoutes[0]
  assert.equal(route.path, '/api/toolbox/restart')
  assert.deepEqual(route.methods, ['POST'])
  assert.equal(route.requestBody, 'buffered')

  // When called with non-Desktop PID, should return graceful error
  const req = new Request('http://localhost/api/toolbox/restart', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ allowForce: false }),
  })

  const res = await route.fetch(req)
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.equal(typeof data.ok, 'boolean')
  if (!data.ok) {
    assert.ok(typeof data.error === 'string')
  }

  // Dispose should unregister the route
  await fiber.dispose()
  assert.equal(registeredRoutes.length, 0)
  await ctx.fiber.dispose()
})

test('registers route when connection service is provided after plugin load', async () => {
  const ctx = new Context()
  const registeredRoutes = []

  const fiber = await ctx.plugin(plugin)
  assert.equal(registeredRoutes.length, 0)

  ctx.provide('connection', {
    fetch: {
      register(route) {
        registeredRoutes.push(route)
        return () => {
          const idx = registeredRoutes.indexOf(route)
          if (idx !== -1) registeredRoutes.splice(idx, 1)
        }
      },
    },
  })

  await new Promise(r => setTimeout(r, 50))
  assert.equal(registeredRoutes.length, 1)
  assert.equal(registeredRoutes[0].path, '/api/toolbox/restart')

  await fiber.dispose()
  assert.equal(registeredRoutes.length, 0)
  await ctx.fiber.dispose()
})
