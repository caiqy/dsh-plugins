import assert from 'node:assert/strict'
import test from 'node:test'
import { Config } from '../lib/index.js'

test('the host can expose every toolbox switch as an editable settings field', () => {
  const fields = Config.dict
  assert.ok(fields && Object.keys(fields).length)
  for (const [key, field] of Object.entries(fields)) {
    assert.equal(field.meta.volatile, true, `${key} is invisible to host settings without volatile metadata`)
  }
})
