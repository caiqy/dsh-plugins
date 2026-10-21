import { useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Switch, Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { zh, en } from './labels.js'

export const inject = ['slots', 'configForms', 'locale']

interface ToolboxConfig {
  fixVsCodeLaunch: boolean
  allowForceRestart: boolean
}

interface RestartResponse {
  ok: boolean
  message?: string
  error?: string
}

interface ToolboxFace {
  hooks: { toolbox: ConfigForm<ToolboxConfig> }
  setEnabled(key: keyof ToolboxConfig, enabled: boolean): Promise<boolean>
  restartApp(allowForce: boolean): Promise<RestartResponse>
}

type PageProps = PropsRuntime<'settings.section'> & PropsLocale<'dsh-toolbox'> & InjectFace<ToolboxFace>

function ToolboxPage({ useToolbox, setEnabled, restartApp, t }: PageProps) {
  const host = useToolbox(value => value)
  const [savingKey, setSavingKey] = useState<keyof ToolboxConfig | null>(null)
  const [feedback, setFeedback] = useState<'failed' | 'saved'>()
  const [confirmingRestart, setConfirmingRestart] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [restartMessage, setRestartMessage] = useState<string | null>(null)
  const [restartError, setRestartError] = useState<string | null>(null)

  const available = host.status === 'ready' && host.value !== undefined
  const writable = available && host.writable

  const change = async (key: keyof ToolboxConfig, enabled: boolean) => {
    if (!writable || savingKey !== null) return
    setSavingKey(key)
    setFeedback(undefined)
    try {
      setFeedback((await setEnabled(key, enabled)) ? 'saved' : 'failed')
    } catch {
      setFeedback('failed')
    } finally {
      setSavingKey(null)
    }
  }

  const handleRestart = async () => {
    setRestarting(true)
    setRestartError(null)
    setRestartMessage(t('restartingNotice'))
    setConfirmingRestart(false)
    try {
      const res = await restartApp(Boolean(host.value?.allowForceRestart))
      if (!res.ok) {
        setRestartError(res.error || '未知错误')
        setRestarting(false)
        setRestartMessage(null)
      } else {
        setRestartMessage(res.message || t('restartingNotice'))
      }
    } catch (err) {
      setRestartError(err instanceof Error ? err.message : String(err))
      setRestarting(false)
      setRestartMessage(null)
    }
  }

  return (
    <section aria-labelledby="dsh-toolbox-title" aria-busy={savingKey !== null || restarting} style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2 id="dsh-toolbox-title" style={{ margin: '0 0 8px', fontSize: 'var(--dsw-font-size-lg, 18px)' }}>
          {t('title')}
        </h2>
        <p style={{ margin: 0, color: 'var(--dsw-alias-label-secondary)' }}>{t('description')}</p>
      </header>

      {available ? (
        <>
          {/* 1. VS Code Launch Fix */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ minWidth: 0 }}>
              <div>{t('fixTitle')}</div>
              <p style={{ margin: '8px 0 0', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.6 }}>
                {t('fixDescription')}
              </p>
            </div>
            <Switch
              checked={host.value?.fixVsCodeLaunch ?? false}
              label={t('fixTitle')}
              disabled={!writable || savingKey !== null}
              onChange={enabled => {
                void change('fixVsCodeLaunch', enabled)
              }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--dsw-alias-border-subtle, rgba(255,255,255,0.08))', margin: 0 }} />

          {/* 2. DSH Restart Section */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
              <div style={{ minWidth: 0 }}>
                <div>{t('restartTitle')}</div>
                <p style={{ margin: '8px 0 0', color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.6 }}>
                  {t('restartDescription')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {!confirmingRestart ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restarting}
                    onClick={() => setConfirmingRestart(true)}
                  >
                    {restarting ? t('restarting') : t('restartButton')}
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" size="sm" onClick={() => void handleRestart()}>
                      {t('confirm')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingRestart(false)}>
                      {t('cancel')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {confirmingRestart && (
              <p role="alert" style={{ margin: 0, fontSize: 'var(--dsw-font-size-sm, 13px)', color: 'var(--dsw-alias-fg-warning, #faad14)' }}>
                {t('restartConfirm')}
              </p>
            )}

            {restartMessage && (
              <p role="status" style={{ margin: 0, fontSize: 'var(--dsw-font-size-sm, 13px)', color: 'var(--dsw-alias-fg-info, #1890ff)' }}>
                {restartMessage}
              </p>
            )}

            {restartError && (
              <p role="alert" style={{ margin: 0, fontSize: 'var(--dsw-font-size-sm, 13px)', color: 'var(--dsw-alias-fg-error, #ff4d4f)' }}>
                {t('restartFailed')}
                {restartError}
              </p>
            )}

            {/* 3. Allow Force Restart Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginTop: 4 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--dsw-font-size-sm, 13px)' }}>{t('forceRestartTitle')}</div>
                <p style={{ margin: '4px 0 0', color: 'var(--dsw-alias-label-secondary)', fontSize: 'var(--dsw-font-size-xs, 12px)', lineHeight: 1.5 }}>
                  {t('forceRestartDescription')}
                </p>
              </div>
              <Switch
                checked={host.value?.allowForceRestart ?? false}
                label={t('forceRestartTitle')}
                disabled={!writable || savingKey !== null}
                onChange={enabled => {
                  void change('allowForceRestart', enabled)
                }}
              />
            </div>
          </div>

          {!writable && <p role="status">{t('readOnly')}</p>}
        </>
      ) : (
        <p role="status">{t(host.status === 'loading' ? 'loading' : 'unavailable')}</p>
      )}

      {savingKey !== null && <p role="status">{t('saving')}</p>}
      {savingKey === null && feedback && <p role={feedback === 'failed' ? 'alert' : 'status'}>{t(feedback)}</p>}
    </section>
  )
}

/** Add a Settings navigation item backed by the host's persisted plugin configuration. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('dsh-toolbox', { zh, en }), 'toolbox: dictionaries')
  const t = ctx.locale.bind('dsh-toolbox')
  const form = ctx.configForms.get<ToolboxConfig>('toolbox')

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-toolbox',
        order: 80,
        label: () => t('title'),
        locale: 'dsh-toolbox',
        inject: (): ToolboxFace => ({
          hooks: { toolbox: form },
          setEnabled: (key, enabled) => form.set(key, enabled),
          restartApp: async (allowForce: boolean) => {
            const resp = await globalThis.fetch('/api/toolbox/restart', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ allowForce }),
            })
            if (!resp.ok) {
              return { ok: false, error: `HTTP ${resp.status} ${resp.statusText}` }
            }
            return (await resp.json()) as RestartResponse
          },
        }),
      },
      ToolboxPage,
    ),
  )
}
