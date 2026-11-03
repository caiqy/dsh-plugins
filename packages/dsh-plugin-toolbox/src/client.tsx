import { useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Switch, Button, MenuItemButton, Modal, IconRefreshOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
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

// Host slot contracts; the pinned settings SDK does not import their owners.
// Only the consumed sidebar prop is needed; inject waits for slots on older hosts.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'shell.overlay': { kind: 'list'; scope: 'root' }
    'sidebar.panellist.actions': { kind: 'list'; scope: 'root'; owner: { onDismiss: () => void } }
  }
}

interface RestartState {
  open: boolean
  busy: boolean
  message: string | null
  error: string | null
}

interface ToolboxFace {
  hooks: { toolbox: ConfigForm<ToolboxConfig>; restart: SnapshotStore<RestartState> }
  setEnabled(key: keyof ToolboxConfig, enabled: boolean): Promise<boolean>
  requestRestart(): void
  closeRestart(): void
  confirmRestart(): Promise<void>
}

type PageProps = PropsRuntime<'settings.section'> & PropsLocale<'dsh-toolbox'> & InjectFace<ToolboxFace>

function ToolboxPage({ useToolbox, useRestart, setEnabled, requestRestart, t }: PageProps) {
  const host = useToolbox(value => value)
  const restarting = useRestart(value => value.busy)
  const [savingKey, setSavingKey] = useState<keyof ToolboxConfig | null>(null)
  const [feedback, setFeedback] = useState<'failed' | 'saved'>()

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
                <Button variant="outline" size="sm" disabled={restarting} onClick={requestRestart}>
                  {restarting ? t('restarting') : t('restartButton')}
                </Button>
              </div>
            </div>

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

type RestartProps = PropsLocale<'dsh-toolbox'> & InjectFace<ToolboxFace>

function RestartMenuItem({ onDismiss, useToolbox, useRestart, requestRestart, t }: PropsRuntime<'sidebar.panellist.actions'> & RestartProps) {
  const available = useToolbox(value => value.status === 'ready' && value.value !== undefined)
  const busy = useRestart(value => value.busy)
  return (
    <MenuItemButton
      icon={<IconRefreshOutlineRegular size={16} aria-hidden="true" />}
      disabled={!available || busy}
      onSelect={() => {
        onDismiss()
        // Let the menu return focus to its trigger before the modal takes it.
        requestAnimationFrame(requestRestart)
      }}
    >
      {busy ? t('restarting') : t('restartTitle')}
    </MenuItemButton>
  )
}

function RestartDialog({ useToolbox, useRestart, closeRestart, confirmRestart, t }: RestartProps) {
  const host = useToolbox(value => value)
  const state = useRestart(value => value)
  const available = host.status === 'ready' && host.value !== undefined
  return (
    <Modal
      open={state.open}
      title={t('restartTitle')}
      closeLabel={t(state.busy ? 'close' : 'cancel')}
      onClose={closeRestart}
      footer={(
        <>
          <Button variant="ghost" onClick={closeRestart} data-modal-autofocus>{t(state.busy ? 'close' : 'cancel')}</Button>
          <Button variant="primary" disabled={!available || state.busy} onClick={() => void confirmRestart()}>
            {state.busy ? t('restarting') : t('confirm')}
          </Button>
        </>
      )}
    >
      <p>{t('restartConfirm')}</p>
      {host.value?.allowForceRestart && <p>{t('forceRestartDescription')}</p>}
      {!available && <p role="status">{t(host.status === 'loading' ? 'loading' : 'unavailable')}</p>}
      {state.message && <p role="status">{state.message}</p>}
      {state.error && <p role="alert">{t('restartFailed')}{state.error}</p>}
    </Modal>
  )
}

/** Add Settings and More entries using the same confirmation and restart state. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('dsh-toolbox', { zh, en }), 'toolbox: dictionaries')
  const t = ctx.locale.bind('dsh-toolbox')
  const form = ctx.configForms.get<ToolboxConfig>('toolbox')
  const restart = createSnapshotStore<RestartState>({ open: false, busy: false, message: null, error: null })
  const face: ToolboxFace = {
    hooks: { toolbox: form, restart },
    setEnabled: (key, enabled) => form.set(key, enabled),
    requestRestart: () => restart.set({ ...restart.getSnapshot(), open: true }),
    closeRestart: () => restart.set({ ...restart.getSnapshot(), open: false }),
    confirmRestart: async () => {
      const state = restart.getSnapshot()
      if (!state.open || state.busy) return
      const host = form.getSnapshot()
      if (host.status !== 'ready' || !host.value) return
      restart.set({ open: true, busy: true, message: t('restartingNotice'), error: null })
      try {
        const resp = await globalThis.fetch('/api/toolbox/restart', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ allowForce: host.value.allowForceRestart }),
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
        const result = (await resp.json()) as RestartResponse
        if (!result.ok) throw new Error(result.error || t('restartFailed'))
        restart.set({ ...restart.getSnapshot(), message: result.message || t('restartingNotice') })
      } catch (err) {
        restart.set({ ...restart.getSnapshot(), busy: false, message: null, error: err instanceof Error ? err.message : String(err) })
      }
    },
  }

  ctx.slots.inject('sidebar.panellist.actions', () =>
    ctx.slots.register({ name: 'sidebar.panellist.actions', id: 'toolbox.restart', order: 80, locale: 'dsh-toolbox', inject: () => face }, RestartMenuItem),
  )
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register({ name: 'shell.overlay', id: 'toolbox.restart', locale: 'dsh-toolbox', inject: () => face }, RestartDialog),
  )

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-toolbox',
        order: 80,
        label: () => t('title'),
        locale: 'dsh-toolbox',
        inject: () => face,
      },
      ToolboxPage,
    ),
  )
}
