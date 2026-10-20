import { useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { zh, en } from './labels.js'

export const inject = ['slots', 'configForms', 'locale']
interface ToolboxFace {
  hooks: { toolbox: ConfigForm<{ fixVsCodeLaunch: boolean }> }
  setEnabled(enabled: boolean): Promise<boolean>
}
type PageProps = PropsRuntime<'settings.section'> & PropsLocale<'dsh-toolbox'> & InjectFace<ToolboxFace>

function ToolboxPage({ useToolbox, setEnabled, t }: PageProps) {
  const host = useToolbox(value => value)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<'failed' | 'saved'>()
  const available = host.status === 'ready' && host.value !== undefined
  const writable = available && host.writable
  const change = async (enabled: boolean) => {
    if (!writable || saving) return
    setSaving(true)
    setFeedback(undefined)
    try { setFeedback(await setEnabled(enabled) ? 'saved' : 'failed') }
    catch { setFeedback('failed') }
    finally { setSaving(false) }
  }
  return <section aria-labelledby="dsh-toolbox-title" aria-busy={saving} style={{ display: 'grid', gap: 24 }}>
    <header>
      <h2 id="dsh-toolbox-title" style={{ margin: '0 0 8px', fontSize: 'var(--dsw-font-size-lg, 18px)' }}>{t('title')}</h2>
      <p style={{ margin: 0, color: 'var(--dsw-alias-label-secondary)' }}>{t('description')}</p>
    </header>
    {available ? <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div>{t('fixTitle')}</div>
          <p style={{ margin: '8px 0 0', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.6 }}>{t('fixDescription')}</p>
        </div>
        <Switch checked={host.value?.fixVsCodeLaunch ?? false} label={t('fixTitle')}
          disabled={!writable || saving} onChange={enabled => { void change(enabled) }} />
      </div>
      {!writable && <p role="status">{t('readOnly')}</p>}
    </> : <p role="status">{t(host.status === 'loading' ? 'loading' : 'unavailable')}</p>}
    {saving && <p role="status">{t('saving')}</p>}
    {!saving && feedback && <p role={feedback === 'failed' ? 'alert' : 'status'}>{t(feedback)}</p>}
  </section>
}

/** Add a Settings navigation item backed by the host's persisted plugin configuration. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('dsh-toolbox', { zh, en }), 'toolbox: dictionaries')
  const t = ctx.locale.bind('dsh-toolbox')
  const form = ctx.configForms.get<{ fixVsCodeLaunch: boolean }>('toolbox')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'dsh-toolbox', order: 80,
    label: () => t('title'), locale: 'dsh-toolbox',
    inject: (): ToolboxFace => ({ hooks: { toolbox: form }, setEnabled: enabled => form.set('fixVsCodeLaunch', enabled) }),
  }, ToolboxPage))
}
