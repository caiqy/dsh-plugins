export interface ProviderField {
  readonly key: string
  readonly label: string
  readonly defaultValue: string
}

export interface ProviderDefinition {
  readonly id: string
  readonly label: string
  readonly credentialRef?: string
  readonly fields: readonly ProviderField[]
}

export const PROVIDERS: readonly ProviderDefinition[] = [{
  id: 'openai',
  label: 'OpenAI',
  credentialRef: 'DSH_WEB_SEARCH_OPENAI_API_KEY',
  fields: [
    { key: 'endpoint', label: '接口地址', defaultValue: 'https://api.openai.com/v1/alpha/search' },
    { key: 'model', label: '搜索模型', defaultValue: 'gpt-5.6-luna' },
  ],
}]

export interface SearchSettings {
  provider: string
  providers: Record<string, Record<string, string>>
}

export function validateOpenAIOptions(options: { endpoint?: string; model?: string }): string | undefined {
  try {
    const url = new URL(options.endpoint ?? '')
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
      return '请填写不含登录信息和片段的 HTTP(S) 接口地址。'
    }
  } catch {
    return '请填写完整的 HTTP(S) 接口地址。'
  }
  if (!options.model?.trim()) return '请填写搜索模型。'
  return undefined
}
