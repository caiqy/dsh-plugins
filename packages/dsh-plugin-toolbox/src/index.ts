import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installVsCodeLaunchFix } from './launch.js'

export const name = 'toolbox'
export const Config: z<{ fixVsCodeLaunch?: boolean }, { fixVsCodeLaunch: Volatile<boolean> }> =
  z.object({ fixVsCodeLaunch: z.boolean().default(true).volatile() })

/** Host settings update the stable reference without restarting this fiber. */
export function apply(ctx: Context, config: ReturnType<typeof Config>): void {
  if (process.platform === 'win32') {
    ctx.effect(() => installVsCodeLaunchFix(() => config.fixVsCodeLaunch.get()), 'toolbox: VS Code launch environment')
  }
}
