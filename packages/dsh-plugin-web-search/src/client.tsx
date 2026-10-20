import { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { CredentialInfo } from '@deepseek-ai/dsh-api-remotes/client'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Menu, SettingsForm, SettingsSecretField, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import { PROVIDERS, validateOpenAIOptions, type SearchSettings } from './providers.js'
import { createDraft, draftOperations, editDraft, saveDraft, selectedProvider, type ClientDraft, type SaveOperations } from './client-model.js'

export const name = 'web-search-provider-settings'
export const inject = ['slots', 'configForms', 'remote', 'remote.credentials']

interface ClientFace {
  hooks: { searchSettings: ConfigForm<SearchSettings> }
  operations: SaveOperations
  describeCredentials: () => Promise<Record<string, CredentialInfo> | undefined>
}

type PageProps = PropsRuntime<'plugins.bundle.config'> & InjectFace<ClientFace>

const labels = {
  unavailable: '搜索配置尚不可用，请确认插件后端已启用并使用可持久化的本机连接。',
  readOnly: '宿主配置为只读，无法保存搜索设置。',
  saveFailed: '保存未完成，未保存的输入已保留。',
  save: '保存', saving: '正在保存…',
}

/** The page stages provider-specific values while keeping credentials write-only. */
function SearchSettingsPage(props: PageProps) {
  const host = props.useSearchSettings(snapshot => snapshot)
  const [draft, setDraft] = useState<ClientDraft>()
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string }>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [credentials, setCredentials] = useState<Record<string, CredentialInfo>>()
  const [credentialLoading, setCredentialLoading] = useState(true)
  const [credentialFailed, setCredentialFailed] = useState(false)
  const value = host.value
  const current = draft ?? createDraft(value, host.revision, PROVIDERS)
  const provider = selectedProvider(current, PROVIDERS)
  const available = host.status === 'ready'
  const writable = available && host.writable && host.revision !== undefined
  const disabled = !writable || saving
  const changed = draftOperations(current, PROVIDERS).length > 0 || Object.values(current.secrets).some(text => text.trim())
  const errors: Record<string, Record<string, string | undefined>> = {}
  for (const definition of PROVIDERS) {
    if (definition.id !== 'openai') continue
    const options = current.settings.providers[definition.id]!
    errors[definition.id] = {
      endpoint: validateOpenAIOptions({ endpoint: options.endpoint, model: 'valid' }),
      model: validateOpenAIOptions({ endpoint: 'https://api.openai.com/v1/alpha/search', model: options.model }),
    }
  }
  const invalid = !provider || Object.values(errors).some(fields => Object.values(fields).some(Boolean))
  const credential = provider?.credentialRef ? credentials?.[provider.credentialRef] : undefined
  const secretBlocked = PROVIDERS.some(definition => current.secrets[definition.id]?.trim()
    && (!definition.credentialRef || !credentials?.[definition.credentialRef]?.writable))

  const clearFeedback = () => { setFeedback(undefined) }
  const discard = () => { if (!saving) { setDraft(undefined); clearFeedback() } }
  const refreshCredentials = async () => {
    setCredentialLoading(true)
    setCredentialFailed(false)
    try {
      const result = await props.describeCredentials()
      setCredentials(result)
      setCredentialFailed(result === undefined)
    } catch {
      setCredentials(undefined)
      setCredentialFailed(true)
    } finally { setCredentialLoading(false) }
  }
  useEffect(() => { void refreshCredentials() }, [props.describeCredentials])

  const save = async () => {
    if (saving || !writable || !changed || invalid || secretBlocked) return
    setSaving(true)
    clearFeedback()
    const result = await saveDraft(current, PROVIDERS, props.operations)
    setDraft(result.failure ? result.draft : undefined)
    setFeedback(result.failure === 'settings'
      ? { error: true, text: '搜索设置未确认保存，密钥未写入。宿主可能已修改配置；输入已保留，放弃修改可载入最新配置后重试。' }
      : result.failure === 'credential'
        ? { error: true, text: result.credentialSaved
          ? '搜索设置和部分密钥已保存；其余密钥未确认保存，输入已保留，请检查凭据写入权限后重试。'
          : '搜索设置已保存并会用于下一次请求；密钥未确认保存，输入已保留，请检查凭据写入权限后重试。' }
        : { error: false, text: '已保存，下一次搜索请求生效。' })
    setSaving(false)
    if (result.credentialSaved) void refreshCredentials()
  }

  if (props.view === 'summary') return '通过 OpenAI 或兼容接口执行网页搜索。'
  return (
    <SettingsForm labels={{ ...labels, unavailable: host.status === 'loading' ? '正在读取搜索配置…' : labels.unavailable }}
      state={{ available, writable, dirty: Boolean(changed) && writable && !secretBlocked, invalid, saving, failed: false }}
      onSave={() => { void save() }} onDiscard={discard}>
      <div data-slot="provider">
        <p id="web-search-provider-label">服务提供商</p>
        <Menu open={menuOpen} onClose={() => { setMenuOpen(false) }}
          items={PROVIDERS.map(definition => ({ id: definition.id, label: definition.label }))}
          selectedId={current.settings.provider}
          onSelect={id => { setDraft({ ...current, settings: { ...current.settings, provider: id } }); clearFeedback(); setMenuOpen(false) }}
          anchor={<Button variant="outline" disabled={disabled} aria-labelledby="web-search-provider-label web-search-provider-choice"
            aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen(!menuOpen) }}>
            <span id="web-search-provider-choice">{provider?.label ?? '请选择服务提供商'}</span>
          </Button>} />
      </div>
      {!provider ? <p role="alert">当前服务提供商不受支持，请选择可用服务。</p> : null}
      {provider?.fields.map(field => (
        <SettingsValueField key={`${provider.id}-${field.key}`} id={`web-search-${provider.id}-${field.key}`}
          label={field.label} text={current.settings.providers[provider.id]![field.key]!} placeholder={field.defaultValue}
          hint={field.key === 'endpoint' ? '填写完整操作 URL，直接请求该地址。' : field.key === 'model' ? '填写搜索服务支持的模型 ID，与聊天模型独立。' : undefined}
          overridden={current.settings.providers[provider.id]![field.key] !== field.defaultValue}
          overriddenLabel="自定义" resetLabel="使用默认值" invalid={Boolean(errors[provider.id]?.[field.key])}
          invalidLabel={errors[provider.id]?.[field.key] ?? ''} disabled={disabled}
          onEdit={text => { setDraft(editDraft(current, provider.id, field.key, text)); clearFeedback() }}
          onReset={() => { setDraft(editDraft(current, provider.id, field.key, field.defaultValue)); clearFeedback() }} />
      ))}
      {provider?.credentialRef ? <SettingsSecretField id={`web-search-${provider.id}-key`} label="API 密钥"
        text={current.secrets[provider.id] ?? ''} configured={credential?.configured ?? false}
        stateLabel={credentialLoading ? '正在读取' : credentialFailed ? '状态未知' : credential?.configured ? '已配置' : '未配置'}
        hint={credentialLoading ? '正在读取凭据状态…' : credentialFailed ? '读取凭据状态失败，可重试。留空保持现有密钥。'
          : credential && !credential.writable ? '此凭据来源不可写（如启动环境变量），请在该来源修改。'
            : '留空保持现有密钥。新密钥独立保存，已保存的密钥不会回填。'}
        disabled={disabled || !credential?.writable || credentialLoading}
        onEdit={text => { setDraft({ ...current, secrets: { ...current.secrets, [provider.id]: text } }); clearFeedback() }} /> : null}
      {credentialFailed ? <Button variant="ghost" disabled={credentialLoading || saving} onClick={() => { void refreshCredentials() }}>重试读取凭据状态</Button> : null}
      {feedback ? <p role={feedback.error ? 'alert' : 'status'} data-state={feedback.error ? 'error' : 'success'}>{feedback.text}</p> : null}
      {invalid && draft ? <p role="alert">请修正字段错误后保存；其他服务的草稿也会保留。</p> : null}
      <Button variant="ghost" disabled={!draft || saving} onClick={discard}>放弃修改</Button>
    </SettingsForm>
  )
}

/** Register the bundle configuration page with the Host row's reactive form. */
export function apply(ctx: Context): void {
  const scope = ctx.configForms.get<SearchSettings>('web-search-provider')
  const face = {
    hooks: { searchSettings: scope },
    operations: {
      mutate: (ops, revision) => scope.mutate(ops, revision),
      revision: () => scope.getSnapshot().revision,
      storeCredential: async (ref, value) => (await ctx.remote.credentials.set(ref, value)).ok,
    } satisfies SaveOperations,
    describeCredentials: async () => {
      const response = await ctx.remote.credentials.describe(PROVIDERS.flatMap(provider => provider.credentialRef ? [provider.credentialRef] : []))
      return response.ok ? response.value : undefined
    },
  }
  ctx.effect(() => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config', key: '@caiqy/dsh-plugin-web-search', inject: () => face,
  }, SearchSettingsPage)), 'web-search-provider: bundle settings')
}
