// 冒烟测试：不启动 DSH 也能验证插件契约（模块形状 + apply 注册了工具 + 工具能跑）。
// 依赖 lib/ 产物，所以先 pnpm build。
import test from 'node:test'
import assert from 'node:assert/strict'

import * as plugin from '../lib/index.js'

test('example plugin registers the echo tool', async () => {
  assert.equal(plugin.name, 'example')
  assert.deepEqual(plugin.inject, ['tools'])

  let registered
  const disposers = []
  const ctx = {
    effect: (callback) => {
      disposers.push(callback())
      return () => {}
    },
    tools: {
      register: (definition) => {
        registered = definition
        return () => {
          registered = undefined
        }
      },
    },
  }

  plugin.apply(ctx)
  assert.equal(registered?.name, 'echo')
  assert.equal(await registered.execute({ text: 'hi' }, {}), 'hi')
  assert.equal(disposers.length, 1)
})
