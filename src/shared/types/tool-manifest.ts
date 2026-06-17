// src/shared/types/tool-manifest.ts
import type { BrowserWindow } from 'electron'
import type { ScopedStore } from '@main/settings-store'

export interface ToolManifest {
  id: string
  name: string
  icon?: string
  defaultShortcuts: Record<string, string>
  init: (ctx: ToolContext) => Promise<void> | void
  // settingsView is intentionally not declared here.
  // The renderer maps tool ids to settings components in tool-host.tsx,
  // so the main process never imports renderer-only code.
}

export interface ToolContext {
  id: string
  registerShortcut: (key: string, combo: string, handler: () => void) => Promise<RegisterResult>
  store: ScopedStore
  onIPC: <T = unknown, R = unknown>(channel: string, handler: (payload: T) => R | Promise<R>) => void
  sendToWindow: (win: BrowserWindow, channel: string, payload: unknown) => void
  log: {
    debug: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }
}

export interface ToolSettingsProps {
  toolId: string
  shortcuts: ShortcutBinding[]
  setShortcut: (key: string, combo: string) => Promise<RegisterResult>
  toast: (msg: string, type?: 'info' | 'error') => void
}

export interface ShortcutBinding {
  key: string
  combo: string
  description?: string
}

export interface RegisterResult {
  ok: boolean
  conflictWith?: { toolId: string; key: string }
  reason?: string
}

export interface ToolSummary {
  id: string
  name: string
  icon?: string
  loaded: boolean
  loadError?: string
}
