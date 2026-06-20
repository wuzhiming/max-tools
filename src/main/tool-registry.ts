// src/main/tool-registry.ts
import { BrowserWindow, ipcMain } from 'electron'
import { mainLog, createLogger } from './logger'
import { appStore, getScopedStore } from './settings-store'
import {
  listShortcuts,
  registerShortcut as smRegister,
  unregisterAllForTool,
} from './shortcut-manager'
import type { ToolManifest, ToolContext, ToolSummary, RegisterResult } from '@shared/types/tool-manifest'

interface LoadedTool {
  manifest: ToolManifest
  loaded: boolean
  error?: string
}

const tools = new Map<string, LoadedTool>()
/** All shortcuts a tool tried to register (toolId:key → handler), regardless
 *  of whether they were live at the OS level. We need this so we can re-arm
 *  every shortcut a tool owns when it gets re-enabled. */
const shortcutHandlers = new Map<string, () => void>()

export function rememberShortcutHandler(toolId: string, key: string, handler: () => void): void {
  shortcutHandlers.set(`${toolId}:${key}`, handler)
}

// --- Enable/disable -------------------------------------------------------

function enabledStoreKey(toolId: string): string {
  return `toolEnabled.${toolId}`
}

/** Source of truth for whether a tool is currently enabled. Defaults true. */
export function isToolEnabled(toolId: string): boolean {
  return appStore.get<boolean>(enabledStoreKey(toolId), true)
}

/** Switch a tool on/off at runtime. Disabled tools have all their globalShortcuts
 *  removed; re-enabling pulls their stored combos out of the per-tool store and
 *  re-registers via the shortcut-manager. */
export function setToolEnabled(toolId: string, enabled: boolean): { ok: boolean; reason?: string } {
  const t = tools.get(toolId)
  if (!t) return { ok: false, reason: `unknown tool ${toolId}` }
  appStore.set(enabledStoreKey(toolId), enabled)

  if (!enabled) {
    unregisterAllForTool(toolId)
    mainLog.info(`tool ${toolId} disabled — shortcuts cleared`)
    return { ok: true }
  }

  // Re-enable: walk the manifest's defaultShortcuts (the keys a tool may own)
  // and re-register each one with the user's stored combo (or the manifest
  // default if none stored). Skip keys the tool never wired a handler for.
  const store = getScopedStore(`tool.${toolId}`)
  let firstError: string | null = null
  for (const key of Object.keys(t.manifest.defaultShortcuts)) {
    const handler = shortcutHandlers.get(`${toolId}:${key}`)
    if (!handler) continue
    const combo = store.get<string>(`shortcuts.${key}`, t.manifest.defaultShortcuts[key] ?? '')
    const r = smRegister({ toolId, key, combo, handler })
    if (!r.ok && !firstError) firstError = r.reason ?? 'shortcut registration failed'
  }
  mainLog.info(`tool ${toolId} enabled — shortcuts re-armed`)
  if (firstError) return { ok: true, reason: firstError } // enabled successfully but some combo failed
  return { ok: true }
}

// --- Tool loading ---------------------------------------------------------

export interface LoadOptions {
  manifestLoaders: Array<() => Promise<ToolManifest>>
}

export async function loadTools(opts: LoadOptions): Promise<void> {
  for (const loader of opts.manifestLoaders) {
    let manifest: ToolManifest | undefined
    try {
      manifest = await loader()
    } catch (err) {
      mainLog.error('failed to load a manifest', err)
      continue
    }
    if (!manifest?.id) {
      mainLog.error('manifest missing id, skipping')
      continue
    }
    if (tools.has(manifest.id)) {
      mainLog.error(`duplicate tool id "${manifest.id}", skipping`)
      continue
    }

    const ctx = createContext(manifest)
    try {
      await manifest.init(ctx)
      tools.set(manifest.id, { manifest, loaded: true })
      mainLog.info(`tool loaded: ${manifest.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      tools.set(manifest.id, { manifest, loaded: false, error: msg })
      mainLog.error(`tool init failed: ${manifest.id}`, err)
      continue
    }
    // After init has had a chance to register every shortcut, immediately
    // tear them down if the tool is persisted as disabled. We still let
    // init() run so the tool's internal state (settings, IPC handlers,
    // background timers) is available — disable only blocks user entry
    // points (hotkeys / tray actions).
    if (!isToolEnabled(manifest.id)) {
      unregisterAllForTool(manifest.id)
      mainLog.info(`tool ${manifest.id} stored-disabled — shortcuts cleared after init`)
    }
  }
}

function createContext(manifest: ToolManifest): ToolContext {
  const log = createLogger(manifest.id)
  const store = getScopedStore(`tool.${manifest.id}`)
  const ipcHandlers = new Set<string>()

  const ctx: ToolContext = {
    id: manifest.id,
    store,
    log,
    registerShortcut: async (key, combo, handler) => {
      // Always remember the handler so re-enable can re-arm it.
      rememberShortcutHandler(manifest.id, key, handler)
      const stored = store.get<string>(`shortcuts.${key}`, manifest.defaultShortcuts[key] ?? '')
      const finalCombo = combo || stored
      const r: RegisterResult = smRegister({
        toolId: manifest.id,
        key,
        combo: finalCombo,
        handler,
      })
      return r
    },
    onIPC: (channel, handler) => {
      const full = `tool/${manifest.id}/${channel}`
      if (ipcHandlers.has(full)) {
        ipcMain.removeHandler(full)
      }
      ipcMain.handle(full, async (_e, payload) => handler(payload as never))
      ipcHandlers.add(full)
    },
    sendToWindow: (win, channel, payload) => {
      if (!win.isDestroyed()) {
        win.webContents.send(`tool/${manifest.id}/${channel}`, payload)
      }
    },
  }
  return ctx
}

// --- Public read API ------------------------------------------------------

export function listToolSummaries(): ToolSummary[] {
  return [...tools.values()].map((t) => ({
    id: t.manifest.id,
    name: t.manifest.name,
    icon: t.manifest.icon,
    loaded: t.loaded,
    loadError: t.error,
    enabled: isToolEnabled(t.manifest.id),
  }))
}

export function getManifest(id: string): ToolManifest | undefined {
  return tools.get(id)?.manifest
}

export function getToolShortcuts(toolId: string): { key: string; combo: string }[] {
  const m = tools.get(toolId)?.manifest
  if (!m) return []
  const all = listShortcuts(toolId)
  const result: { key: string; combo: string }[] = []
  const seen = new Set<string>()
  for (const r of all) {
    result.push({ key: r.key, combo: r.combo })
    seen.add(r.key)
  }
  for (const key of Object.keys(m.defaultShortcuts)) {
    if (!seen.has(key)) result.push({ key, combo: '' })
  }
  return result
}

export function setToolShortcut(toolId: string, key: string, combo: string): RegisterResult {
  const m = tools.get(toolId)?.manifest
  if (!m) return { ok: false, reason: 'unknown tool' }
  const store = getScopedStore(`tool.${toolId}`)
  store.set(`shortcuts.${key}`, combo)
  const handler = shortcutHandlers.get(`${toolId}:${key}`)
  if (!handler) return { ok: false, reason: 'no handler registered yet, restart needed' }
  if (!isToolEnabled(toolId)) {
    // Persisted, will be picked up next time the tool is enabled. Don't
    // actually arm the OS shortcut while disabled.
    return { ok: true }
  }
  return smRegister({ toolId, key, combo, handler })
}

/** Trigger a tool action by id+key. Returns true if a handler ran. Used by
 *  the tray menu so the user can hit the same actions a shortcut would. */
export function invokeToolAction(toolId: string, key: string): boolean {
  if (!isToolEnabled(toolId)) {
    mainLog.warn(`invokeToolAction: tool ${toolId} is disabled`)
    return false
  }
  const handler = shortcutHandlers.get(`${toolId}:${key}`)
  if (!handler) {
    mainLog.warn(`invokeToolAction: no handler for ${toolId}:${key}`)
    return false
  }
  try { handler() } catch (err) { mainLog.error('action handler threw', err) }
  return true
}

export function _resetForTest(): void {
  tools.clear()
  shortcutHandlers.clear()
}
