import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** 条目 id，需与 cordis.patch.yml 里的 id 一致。 */
export const name = 'example'

/** 声明用到的宿主服务；没就绪前 apply 不会被调用。 */
export const inject = ['tools']

const echo = defineTool({
  name: 'echo',
  description: 'Echo back the given text. Minimal example tool from dsh-plugin-example.',
  parameters: {
    text: { type: 'string', required: true, description: 'The text to echo back.' },
  },
  output: {
    schema: { type: 'string' },
    render: (_args, value) => [{ type: 'text', text: value }],
  },
  async execute(args) {
    return args.text
  },
})

export function apply(ctx: Context) {
  ctx.effect(() => ctx.tools.register(echo), 'example: echo tool')
}
