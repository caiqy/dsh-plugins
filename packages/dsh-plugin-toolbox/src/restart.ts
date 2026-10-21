import { execFile, execFileSync } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface DesktopProcessInfo {
  pid: number
  ticks: string
  path: string
}

export interface RestartOptions {
  allowForce?: boolean
  targetPid?: number
  runDirectory?: string
  workerScriptPath?: string
  readyTimeoutMs?: number
  /** Validate the real worker handshake without arming shutdown or relaunch. */
  validateOnly?: boolean
}

export interface RestartResult {
  ok: boolean
  message?: string
  error?: string
  runDirectory?: string
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_WORKER_PATH = path.resolve(__dirname, '../res/restart-worker.ps1')

/**
 * Retrieve Desktop process identity (PID, start time ticks, and executable path).
 * On Windows Desktop, the Host process's parent (process.ppid) is the main Electron process.
 */
export function getDesktopProcessInfo(targetPid: number = process.ppid): DesktopProcessInfo {
  if (process.platform !== 'win32') {
    throw new Error('DSH 自动重启功能仅支持 Windows 平台')
  }

  const script = `
    $ErrorActionPreference = 'Stop'
    $p = Get-Process -Id ${targetPid}
    [PSCustomObject]@{
      pid = $p.Id
      ticks = $p.StartTime.ToUniversalTime().Ticks.ToString()
      path = $p.Path
    } | ConvertTo-Json -Compress
  `

  let stdout: string
  try {
    stdout = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
      { windowsHide: true, encoding: 'utf-8' },
    ).trim()
  } catch (err) {
    throw new Error(`获取目标进程信息失败 (PID: ${targetPid}): ${err instanceof Error ? err.message : String(err)}`)
  }

  const info = JSON.parse(stdout) as DesktopProcessInfo
  if (!info.path || !info.path.toLowerCase().endsWith('deepseek harness.exe')) {
    throw new Error(`目标进程 (PID: ${info.pid}, Path: ${info.path}) 不是有效的 DeepSeek Harness 客户端`)
  }

  return info
}

/** Read the PowerShell handshake, including its UTF-8 BOM failure report. */
export async function waitForWorkerReady(runDir: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    let failure: { pass?: boolean; error?: string } | undefined
    try {
      const raw = await fs.readFile(path.join(runDir, 'result.json'), 'utf8')
      failure = JSON.parse(raw.replace(/^\uFEFF/, ''))
    } catch (error) {
      // The file may not exist yet or may still be mid-write.
      if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (failure?.pass === false) {
      throw new Error(`重启辅助程序就绪前失败: ${failure.error ?? '未知错误'}`)
    }
    if (existsSync(path.join(runDir, 'ready'))) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('重启辅助程序准备超时，已取消本次重启以保护当前会话')
}

/**
 * Initiate an out-of-process graceful restart with fallback.
 * 1. Validates target process identity.
 * 2. Launches the hidden background worker via WMI with ShowWindow=0.
 * 3. Waits for the worker to report readiness.
 * 4. Arms the worker to execute the shutdown and relaunch cycle.
 */
export async function initiateRestart(options: RestartOptions = {}): Promise<RestartResult> {
  if (process.platform !== 'win32') {
    return { ok: false, error: '当前环境不支持自动重启（仅支持 Windows Desktop）' }
  }

  let info: DesktopProcessInfo
  try {
    info = getDesktopProcessInfo(options.targetPid)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const workerScript = options.workerScriptPath ?? DEFAULT_WORKER_PATH
  if (!existsSync(workerScript)) {
    return { ok: false, error: `未找到重启辅助脚本: ${workerScript}` }
  }

  const runDir = options.runDirectory ?? path.join(os.tmpdir(), `dsh-restart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  await fs.mkdir(runDir, { recursive: true })

  const launchCommand = `
    $ErrorActionPreference = 'Stop'
    $startup = [wmiclass]"Win32_ProcessStartup"
    $config = $startup.CreateInstance()
    $config.ShowWindow = [uint16]0
    $proc = [wmiclass]"Win32_Process"
    $cmd = 'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${workerScript}" -RunDirectory "${runDir}" -TargetProcessId ${info.pid} -ExpectedTicks "${info.ticks}" -TargetExecutable "${info.path}"${options.allowForce ? ' -AllowForce' : ''}${options.validateOnly ? ' -ValidateOnly' : ''}'
    $res = $proc.Create($cmd, $null, $config)
    if ($res.ReturnValue -ne 0) {
      throw "Win32_Process.Create 返回错误码: $($res.ReturnValue)"
    }
  `

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', launchCommand],
        { windowsHide: true },
        (err) => {
          if (err) reject(err)
          else resolve()
        },
      )
    })
  } catch (err) {
    return { ok: false, error: `启动独立重启辅助进程失败: ${err instanceof Error ? err.message : String(err)}`, runDirectory: runDir }
  }

  try {
    await waitForWorkerReady(runDir, options.readyTimeoutMs ?? 10000)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), runDirectory: runDir }
  }

  if (options.validateOnly) return { ok: true, message: '辅助程序就绪验证通过，未请求关闭或重新启动', runDirectory: runDir }

  // Arm the worker
  const armPath = path.join(runDir, 'arm')
  await fs.writeFile(armPath, 'restart', 'utf-8')

  return {
    ok: true,
    message: 'DSH 正在准备退出并重新启动，请稍候…',
    runDirectory: runDir,
  }
}
