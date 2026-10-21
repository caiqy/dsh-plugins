param(
  [Parameter(Mandatory=$true)][string]$RunDirectory,
  [Parameter(Mandatory=$true)][int]$TargetProcessId,
  [Parameter(Mandatory=$true)][string]$ExpectedTicks,
  [Parameter(Mandatory=$true)][string]$TargetExecutable,
  [switch]$AllowForce,
  [switch]$ValidateOnly,
  [int]$GracefulTimeoutSeconds = 10
)

$ErrorActionPreference = 'Stop'
$eventsPath = Join-Path $RunDirectory 'events.jsonl'
$resultPath = Join-Path $RunDirectory 'result.json'

function Record([string]$Name, $Data) {
  try {
    [ordered]@{
      time = [DateTime]::UtcNow.ToString('o')
      event = $Name
      workerPid = $PID
      data = $Data
    } | ConvertTo-Json -Depth 6 -Compress | Add-Content -LiteralPath $eventsPath -Encoding UTF8
  } catch {}
}

$sessionStarted = $false
[uint32]$closeSession = 0

try {
  Record 'worker-started' @{
    targetPid = $TargetProcessId
    expectedTicks = $ExpectedTicks
    targetExecutable = $TargetExecutable
    allowForce = [bool]$AllowForce
    gracefulTimeout = $GracefulTimeoutSeconds
  }

  $target = Get-Process -Id $TargetProcessId -ErrorAction Stop
  if ($target.StartTime.ToUniversalTime().Ticks.ToString() -ne $ExpectedTicks) {
    throw "Target process identity mismatch (expected ticks: $ExpectedTicks, actual: $($target.StartTime.ToUniversalTime().Ticks.ToString()))"
  }

  $workerSession = (Get-Process -Id $PID).SessionId
  if ($workerSession -ne $target.SessionId) {
    throw "Worker is in Windows session $workerSession, but target is in session $($target.SessionId)"
  }

  # Ensure handle is retained
  $null = $target.Handle

  # Collect children handles
  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$TargetProcessId" | ForEach-Object {
    $child = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
    if ($null -ne $child) {
      $null = $child.Handle
      [pscustomobject]@{ process = $child; pid = $child.Id }
    }
  })

  # Define Restart Manager P/Invoke
  Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

public static class DshRestartManager {
  [StructLayout(LayoutKind.Sequential)]
  public struct UniqueProcess {
    public uint pid;
    public System.Runtime.InteropServices.ComTypes.FILETIME start;
  }

  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct ProcessInfo {
    public UniqueProcess process;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string name;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=64)] public string service;
    public int type;
    public uint status;
    public uint session;
    [MarshalAs(UnmanagedType.Bool)] public bool restartable;
  }

  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)]
  public static extern uint RmStartSession(out uint session, uint flags, StringBuilder key);

  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)]
  public static extern uint RmRegisterResources(uint session, uint files, string[] fileNames, uint apps, UniqueProcess[] processes, uint services, string[] serviceNames);

  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)]
  public static extern uint RmGetList(uint session, out uint needed, ref uint count, [In,Out] ProcessInfo[] info, out uint reasons);

  [DllImport("rstrtmgr.dll")]
  public static extern uint RmShutdown(uint session, uint flags, IntPtr callback);

  [DllImport("rstrtmgr.dll")]
  public static extern uint RmEndSession(uint session);
}
'@

  function Assert-Code([uint32]$Code, [string]$Op) {
    if ($Code -ne 0) { throw "$Op failed with Win32 error code $Code" }
  }

  Assert-Code ([DshRestartManager]::RmStartSession([ref]$closeSession, 0, (New-Object System.Text.StringBuilder 33))) 'RmStartSession'
  $sessionStarted = $true

  $filetime = $target.StartTime.ToUniversalTime().ToFileTimeUtc()
  $registered = New-Object DshRestartManager+UniqueProcess
  $registered.pid = [uint32]$TargetProcessId
  $registered.start.dwLowDateTime = [int32]($filetime -band 0x7FFFFFFF)
  if (($filetime -band 0x80000000L) -ne 0) {
    $registered.start.dwLowDateTime = [int32]($registered.start.dwLowDateTime - 2147483648L)
  }
  $registered.start.dwHighDateTime = [int32]($filetime -shr 32)

  Assert-Code ([DshRestartManager]::RmRegisterResources($closeSession, 0, $null, 1, @($registered), 0, $null)) 'RmRegisterResources'

  [uint32]$needed = 0; [uint32]$count = 0; [uint32]$reasons = 0
  $listCode = [DshRestartManager]::RmGetList($closeSession, [ref]$needed, [ref]$count, $null, [ref]$reasons)
  if ($listCode -ne 234 -and $listCode -ne 0) { throw "RmGetList query failed with code $listCode" }

  $list = New-Object 'DshRestartManager+ProcessInfo[]' $needed
  $count = $needed
  Assert-Code ([DshRestartManager]::RmGetList($closeSession, [ref]$needed, [ref]$count, $list, [ref]$reasons)) 'RmGetList'
  if ($count -ne 1 -or $list[0].process.pid -ne $TargetProcessId) {
    throw "RmGetList returned unexpected process count ($count) or PID"
  }

  Record 'ready' @{
    targetPid = $TargetProcessId
    childPids = @($children.pid)
  }
  Set-Content -LiteralPath (Join-Path $RunDirectory 'ready') -Value $PID -Encoding UTF8
  if ($ValidateOnly) {
    Record 'validation-passed' @{ shutdownRequested = $false; launchedDsh = $false }
    return
  }

  # Wait for caller arming signal
  $armingDeadline = [DateTime]::UtcNow.AddSeconds(30)
  while (-not (Test-Path -LiteralPath (Join-Path $RunDirectory 'arm'))) {
    if ([DateTime]::UtcNow -gt $armingDeadline) {
      throw 'Worker arming signal timed out after 30 seconds'
    }
    Start-Sleep -Milliseconds 100
  }

  # Allow caller HTTP response to flush and complete
  Start-Sleep -Milliseconds 1500

  $target.Refresh()
  if ($target.HasExited) {
    Record 'target-already-exited' @{}
  } else {
    Record 'shutdown-requesting' @{ force = $false }
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $shutdownCode = [DshRestartManager]::RmShutdown($closeSession, 0, [IntPtr]::Zero)
    Record 'shutdown-returned' @{ code = $shutdownCode; elapsedMs = $timer.ElapsedMilliseconds }

    $desktopExited = $target.WaitForExit($GracefulTimeoutSeconds * 1000)
    if (-not $desktopExited) {
      Record 'graceful-timeout' @{ elapsedMs = $timer.ElapsedMilliseconds }
      if ($AllowForce) {
        Record 'force-shutdown-initiating' @{}
        $forceCode = [DshRestartManager]::RmShutdown($closeSession, 1, [IntPtr]::Zero) # 1 = RmForceShutdown
        Record 'force-shutdown-returned' @{ code = $forceCode }
        $desktopExited = $target.WaitForExit(3000)
        if (-not $desktopExited) {
          Record 'kill-process-fallback' @{}
          Stop-Process -Id $TargetProcessId -Force -ErrorAction SilentlyContinue
          $desktopExited = $target.WaitForExit(3000)
        }
      } else {
        throw "Desktop did not exit within $GracefulTimeoutSeconds seconds and force shutdown is disabled"
      }
    }
  }

  # Wait for child processes to terminate
  $childDeadline = [DateTime]::UtcNow.AddSeconds(6)
  do {
    $alive = @($children | Where-Object { -not $_.process.HasExited })
    if ($alive.Count -eq 0 -or [DateTime]::UtcNow -gt $childDeadline) { break }
    Start-Sleep -Milliseconds 200
  } while ($true)

  if ($alive.Count -gt 0 -and $AllowForce) {
    Record 'force-stopping-lingering-children' @{ pids = @($alive.pid) }
    foreach ($item in $alive) {
      Stop-Process -Id $item.pid -Force -ErrorAction SilentlyContinue
    }
  }

  if ($sessionStarted) {
    [void][DshRestartManager]::RmEndSession($closeSession)
    $sessionStarted = $false
  }

  # Release delay for file locks / single-instance mutex
  Start-Sleep -Milliseconds 600

  # Clean environment for relaunch
  $env:ELECTRON_RUN_AS_NODE = $null

  Record 'relaunch-starting' @{ executable = $TargetExecutable }
  $workDir = [System.IO.Path]::GetDirectoryName($TargetExecutable)
  $launched = Start-Process -FilePath $TargetExecutable -WorkingDirectory $workDir -PassThru

  Start-Sleep -Seconds 2
  $launched.Refresh()
  if ($launched.HasExited) {
    Record 'relaunch-retrying' @{ exitCode = $launched.ExitCode }
    Start-Sleep -Seconds 1
    $launched = Start-Process -FilePath $TargetExecutable -WorkingDirectory $workDir -PassThru
    Start-Sleep -Seconds 2
    $launched.Refresh()
  }

  if ($launched.HasExited) {
    throw "Target process exited prematurely after relaunch (exit code: $($launched.ExitCode))"
  }

  Record 'relaunch-success' @{ newPid = $launched.Id }

  $successResult = [ordered]@{
    pass = $true
    targetPid = $TargetProcessId
    newPid = $launched.Id
    time = [DateTime]::UtcNow.ToString('o')
  }
  $successResult | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultPath -Encoding UTF8
  Record 'finished' $successResult

} catch {
  $failureResult = [ordered]@{
    pass = $false
    error = $_.Exception.Message
    time = [DateTime]::UtcNow.ToString('o')
  }
  $failureResult | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultPath -Encoding UTF8
  Record 'failed' $failureResult
  exit 1
} finally {
  if ($sessionStarted) {
    [void][DshRestartManager]::RmEndSession($closeSession)
  }
}
