import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installVsCodeLaunchFix } from './launch.js'
import { initiateRestart } from './restart.js'
import { installReasoningEffortFix } from './reasoning.js'

export const name = 'toolbox'

export const Config: z<
  { fixVsCodeLaunch?: boolean; allowForceRestart?: boolean; fixReasoningEffort?: boolean },
  { fixVsCodeLaunch: Volatile<boolean>; allowForceRestart: Volatile<boolean>; fixReasoningEffort: Volatile<boolean> }
> = z.object({
  fixVsCodeLaunch: z.boolean().default(true).volatile(),
  allowForceRestart: z.boolean().default(false).volatile(),
  fixReasoningEffort: z.boolean().default(false).volatile(),
})

export { installVsCodeLaunchFix } from './launch.js'
export { initiateRestart, getDesktopProcessInfo } from './restart.js'

interface ConnectionService {
  fetch?: {
    register: (route: {
      path: string
      methods: string[]
      requestBody: string
      fetch: (request: Request) => Promise<Response>
    }) => () => void
  }
}

/** Host settings update the stable reference without restarting this fiber. */
export function apply(ctx: Context, config: ReturnType<typeof Config>): void {
  ctx.effect(() => installReasoningEffortFix(() => config.fixReasoningEffort.get(), value => {
    ctx.logger.info(`toolbox reasoning: ${value.protocol} ${value.action} (${value.reason})`)
  }), 'toolbox: reasoning effort compatibility')
  if (process.platform === 'win32') {
    ctx.effect(() => installVsCodeLaunchFix(() => config.fixVsCodeLaunch.get()), 'toolbox: VS Code launch environment')
  }

  // Register the restart API endpoint once the connection service becomes available
  ctx.inject?.(['connection'], (connCtx: Context) => {
    const connection = (connCtx as any).connection as ConnectionService | undefined
    if (connection?.fetch?.register) {
      connCtx.effect(() => {
        return connection.fetch!.register({
          path: '/api/toolbox/restart',
          methods: ['POST'],
          requestBody: 'buffered',
          async fetch(request: Request): Promise<Response> {
            let allowForce = config.allowForceRestart.get()
            try {
              const body = (await request.json()) as { allowForce?: boolean }
              if (typeof body?.allowForce === 'boolean') {
                allowForce = body.allowForce
              }
            } catch {}

            const result = await initiateRestart({ allowForce })
            return Response.json(result)
          },
        })
      }, 'toolbox: restart API endpoint')
    }
  })
}
