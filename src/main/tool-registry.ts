// src/main/tool-registry.ts
import { BrowserWindow, ipcMain } from 'electron'
import { mainLog, createLogger } from './logger'
import { getScopedStore } from './settings-store'
import { registerShortcut as smRegister } from './shortcut-manager'
import type { ToolManifest, ToolContext, ToolSummary, RegisterResult } from '@shared/types/tool-manifest'

interface LoadedTool {
  manifest: ToolManifest
  loaded: boolean
  error?: string
}

const tools = new Map<string, LoadedTool>()

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

export function listToolSummaries(): ToolSummary[] {
  return [...tools.values()].map((t) => ({
    id: t.manifest.id,
    name: t.manifest.name,
    icon: t.manifest.icon,
    loaded: t.loaded,
    loadError: t.error,
  }))
}

export function getManifest(id: string): ToolManifest | undefined {
  return tools.get(id)?.manifest
}

export function _resetForTest(): void {
  tools.clear()
}
