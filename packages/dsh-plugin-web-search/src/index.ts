import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-web'
import z from '@deepseek-ai/schemastery'
import { searchOpenAI } from './openai.js'
import { PROVIDERS, validateOpenAIOptions } from './providers.js'

export const name = 'web-search-provider'
export const inject = ['web', 'credentials']

const openai = PROVIDERS[0]!
export const Config = z.object({
  provider: z.union(['openai'] as const).default('openai').volatile(),
  providers: z.object({
    openai: z.object({
      endpoint: z.string().default(openai.fields[0]!.defaultValue).volatile(),
      model: z.string().default(openai.fields[1]!.defaultValue).volatile(),
    }),
  }),
})

/** Contribute a provider, never a tool; each call sees current config and credentials. */
export function apply(ctx: Context, config: ReturnType<typeof Config>): void {
  const options = () => ({
    endpoint: config.providers.openai.endpoint.get(),
    model: config.providers.openai.model.get(),
  })
  ctx.web.registerSearchProvider({
    id: name,
    available: () => config.provider.get() === 'openai' && validateOpenAIOptions(options()) === undefined,
    async search(request, signal) {
      const current = options()
      const key = await ctx.credentials.resolve(credentialRef(openai.credentialRef!))
      return searchOpenAI(request, { ...current, apiKey: key?.value ?? '' }, signal)
    },
  })
}
