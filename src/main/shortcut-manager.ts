// src/main/shortcut-manager.ts
import { globalShortcut } from 'electron'
import { mainLog } from './logger'
import type { RegisterResult } from '@shared/types/tool-manifest'

interface Registration {
  toolId: string
  key: string
  combo: string
  handler: () => void
}

const byCombo = new Map<string, Registration>()
const byKey = new Map<string, Registration>() // key = `${toolId}:${key}`

function makeId(toolId: string, key: string): string {
  return `${toolId}:${key}`
}

export interface RegisterArgs {
  toolId: string
  key: string
  combo: string
  handler: () => void
}

export interface RegisterDeps {
  electronRegister?: (combo: string, handler: () => void) => boolean
  electronUnregister?: (combo: string) => void
}

export function registerShortcut(args: RegisterArgs, deps: RegisterDeps = {}): RegisterResult {
  const { toolId, key, combo, handler } = args
  const electronRegister = deps.electronRegister ?? ((c, h) => globalShortcut.register(c, h))
  const electronUnregister = deps.electronUnregister ?? ((c) => globalShortcut.unregister(c))

  if (!combo || combo.trim() === '') {
    // 空 combo 视为"清除该 key 的绑定"
    const id = makeId(toolId, key)
    const prev = byKey.get(id)
    if (prev) {
      electronUnregister(prev.combo)
      byCombo.delete(prev.combo)
      byKey.delete(id)
    }
    return { ok: true }
  }

  const existing = byCombo.get(combo)
  const id = makeId(toolId, key)
  if (existing && makeId(existing.toolId, existing.key) !== id) {
    return {
      ok: false,
      conflictWith: { toolId: existing.toolId, key: existing.key },
      reason: `combo ${combo} already used by ${existing.toolId}/${existing.key}`,
    }
  }

  // 替换原有绑定
  const prev = byKey.get(id)
  if (prev) {
    electronUnregister(prev.combo)
    byCombo.delete(prev.combo)
  }

  const ok = electronRegister(combo, handler)
  if (!ok) {
    return { ok: false, reason: `OS rejected registration of ${combo}` }
  }

  const reg: Registration = { toolId, key, combo, handler }
  byCombo.set(combo, reg)
  byKey.set(id, reg)
  mainLog.info(`shortcut registered ${id} -> ${combo}`)
  return { ok: true }
}

export function unregisterAllForTool(toolId: string): void {
  for (const [id, reg] of [...byKey.entries()]) {
    if (reg.toolId === toolId) {
      globalShortcut.unregister(reg.combo)
      byCombo.delete(reg.combo)
      byKey.delete(id)
    }
  }
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
  byCombo.clear()
  byKey.clear()
}

export function listShortcuts(toolId?: string): Registration[] {
  const all = [...byKey.values()]
  return toolId ? all.filter((r) => r.toolId === toolId) : all
}

// 仅用于测试
export function _resetForTest(): void {
  byCombo.clear()
  byKey.clear()
}
