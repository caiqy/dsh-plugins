import childProcess from 'node:child_process'
import { statSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { isAbsolute } from 'node:path'

function isDirectory(path: string): boolean {
  try { return statSync(path).isDirectory() } catch { return false }
}

/** Patch only the host's detached Code.exe directory launch, preserving Node/CLI launches. */
export function installVsCodeLaunchFix(enabled: () => boolean = () => true): () => void {
  const original = childProcess.spawn
  let active = true
  const patched = new Proxy(original, {
    apply(target, receiver, parameters: unknown[]) {
      const [command, argv, options] = parameters
      if (active && enabled() && typeof command === 'string' && /(?:^|[\\/])Code(?: - Insiders)?\.exe$/i.test(command)
        && Array.isArray(argv) && argv.length === 1 && typeof argv[0] === 'string' && isAbsolute(argv[0])
        && typeof options === 'object' && options !== null
        && 'detached' in options && options.detached === true && 'stdio' in options && options.stdio === 'ignore'
        && 'env' in options && typeof options.env === 'object' && options.env !== null
        && Object.entries(options.env).some(([key, value]) => key.toUpperCase() === 'ELECTRON_RUN_AS_NODE' && value === '1')
        && isDirectory(argv[0])) {
        parameters = [...parameters]
        parameters[2] = { ...options, env: Object.fromEntries(Object.entries(options.env)
          .filter(([key]) => key.toUpperCase() !== 'ELECTRON_RUN_AS_NODE')) }
      }
      return Reflect.apply(target, receiver, parameters)
    },
  })
  childProcess.spawn = patched
  // The host has already imported the named ESM binding before plugins activate.
  syncBuiltinESMExports()
  return () => {
    active = false
    // Preserve wrappers installed by other plugins after ours.
    if (childProcess.spawn !== patched) return
    childProcess.spawn = original
    syncBuiltinESMExports()
  }
}
