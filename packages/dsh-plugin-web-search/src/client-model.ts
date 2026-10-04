import type { ProviderDefinition, SearchSettings } from './providers.js'

/** A draft fences all edits with the revision at which editing began. */
export interface ClientDraft {
  settings: SearchSettings
  original: SearchSettings
  revision: number | undefined
  secrets: Record<string, string>
}

/** Seed only provider-defined fields; credentials never enter settings. */
export function createDraft(settings: SearchSettings | undefined, revision: number | undefined, providers: readonly ProviderDefinition[]): ClientDraft {
  const values = Object.fromEntries(providers.map(provider => [provider.id, Object.fromEntries(
    provider.fields.map(field => [field.key, settings?.providers[provider.id]?.[field.key] ?? field.defaultValue]),
  )]))
  const resolved = { provider: settings?.provider ?? providers[0]!.id, providers: values }
  return { settings: resolved, original: structuredClone(resolved), revision, secrets: {} }
}

/** Select metadata separately from values so providers can expose different fields. */
export function selectedProvider(draft: ClientDraft, providers: readonly ProviderDefinition[]): ProviderDefinition | undefined {
  return providers.find(provider => provider.id === draft.settings.provider)
}

/** Keep the other providers' drafts when switching or editing one field. */
export function editDraft(draft: ClientDraft, provider: string, field: string, value: string): ClientDraft {
  return { ...draft, settings: { ...draft.settings, providers: {
    ...draft.settings.providers, [provider]: { ...draft.settings.providers[provider], [field]: value },
  } } }
}

/** Path operations touch visible configuration keys without replacing unknown settings. */
export function draftOperations(draft: ClientDraft, providers: readonly ProviderDefinition[]) {
  const ops: { op: 'set'; path: string[]; value: string }[] = []
  if (draft.settings.provider !== draft.original.provider) ops.push({ op: 'set', path: ['provider'], value: draft.settings.provider })
  for (const provider of providers) {
    for (const field of provider.fields) {
      const value = draft.settings.providers[provider.id]![field.key]!
      if (value !== draft.original.providers[provider.id]?.[field.key]) {
        ops.push({ op: 'set', path: ['providers', provider.id, field.key], value })
      }
    }
  }
  return ops
}

export interface SaveOperations {
  mutate: (ops: ReturnType<typeof draftOperations>, revision: number | undefined) => Promise<boolean>
  revision: () => number | undefined
  storeCredential: (ref: string, value: string) => Promise<boolean>
}

export interface SaveOutcome {
  draft: ClientDraft
  settingsSaved: boolean
  credentialSaved: boolean
  failure?: 'settings' | 'credential'
}

/** Save settings before credentials; advance the retry baseline only for confirmed writes. */
export async function saveDraft(draft: ClientDraft, providers: readonly ProviderDefinition[], operations: SaveOperations): Promise<SaveOutcome> {
  let next = draft
  const ops = draftOperations(draft, providers)
  try {
    if (ops.length && !await operations.mutate(ops, draft.revision)) {
      return { draft, settingsSaved: false, credentialSaved: false, failure: 'settings' }
    }
  } catch {
    return { draft, settingsSaved: false, credentialSaved: false, failure: 'settings' }
  }
  next = { ...draft, original: structuredClone(draft.settings), revision: operations.revision(), secrets: { ...draft.secrets } }
  let credentialSaved = false
  for (const provider of providers) {
    const value = next.secrets[provider.id]?.trim()
    if (!value || !provider.credentialRef) continue
    try {
      if (!await operations.storeCredential(provider.credentialRef, value)) {
        return { draft: next, settingsSaved: true, credentialSaved, failure: 'credential' }
      }
    } catch {
      // Transport errors can contain request data; never display them beside a secret.
      return { draft: next, settingsSaved: true, credentialSaved, failure: 'credential' }
    }
    next.secrets[provider.id] = ''
    credentialSaved = true
  }
  return { draft: next, settingsSaved: true, credentialSaved }
}
