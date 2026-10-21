import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import * as restart from '../lib/restart.js'

test('the shipped Restart Manager declarations compile under Windows PowerShell 5.1', { skip: process.platform !== 'win32' }, async () => {
  const worker = await readFile(restart.DEFAULT_WORKER_PATH, 'utf8')
  const source = worker.match(/Add-Type @'\r?\n([\s\S]*?)\r?\n'@/)[1]
  const encoded = Buffer.from(source, 'utf8').toString('base64')
  // Compile the exact shipped declarations without running any shutdown or relaunch code.
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `$ErrorActionPreference='Stop'; Add-Type ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')))`],
  { windowsHide: true, timeout: 10000 })
})

test('the real worker reaches readiness in validation mode without arming a shutdown', { skip: process.platform !== 'win32' }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'toolbox-worker-test-'))
  const quote = value => `'${value.replaceAll("'", "''")}'`
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      `$ErrorActionPreference='Stop'; $p=Get-Process -Id ${process.pid}; & ${quote(restart.DEFAULT_WORKER_PATH)} -RunDirectory ${quote(directory)} -TargetProcessId $p.Id -ExpectedTicks $p.StartTime.ToUniversalTime().Ticks.ToString() -TargetExecutable $p.Path -ValidateOnly; exit $LASTEXITCODE`],
    { windowsHide: true, timeout: 10000 })
    await restart.waitForWorkerReady(directory, 500)
    const events = await readFile(join(directory, 'events.jsonl'), 'utf8')
    assert.match(events, /validation-passed/)
    assert.doesNotMatch(events, /shutdown-requesting|relaunch-starting/)
    await assert.rejects(readFile(join(directory, 'arm')), { code: 'ENOENT' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('readiness reports PowerShell BOM errors instead of timing out; ready and timeout stay distinct', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'toolbox-ready-test-'))
  try {
    await writeFile(join(directory, 'result.json'), '\uFEFF' + JSON.stringify({ pass: false, error: 'FILETIME compile failed' }))
    assert.equal(typeof restart.waitForWorkerReady, 'function')
    await assert.rejects(restart.waitForWorkerReady(directory, 500), /FILETIME compile failed/)
    await rm(join(directory, 'result.json'))
    await writeFile(join(directory, 'ready'), '123')
    await restart.waitForWorkerReady(directory, 500)
    await rm(join(directory, 'ready'))
    await assert.rejects(restart.waitForWorkerReady(directory, 100), /准备超时/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
