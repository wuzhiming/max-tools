// src/tools/clipboard/main/index.ts
//
// Owns the in-memory queue + the polling loop that watches the system
// clipboard. ⌘C never gets hijacked — we just observe the clipboard
// every POLL_MS and snapshot whenever the text changes.
//
// Cmd+Shift+V opens the picker; selecting an entry writes it back to
// the system clipboard and fires a synthetic ⌘V at the previously
// frontmost app.

import { clipboard, ipcMain } from 'electron'
import type { ToolContext } from '@shared/types/tool-manifest'
import {
  CB_IPC,
  type ClipboardEntry,
  type PickPayload,
} from '@shared/types/clipboard-ipc'
import {
  closePicker,
  isPickerOpen,
  pushEntriesToPicker,
  showPicker,
} from './picker-window'
import { simulatePasteCmdV } from './paste'

const POLL_MS = 500
const DEFAULT_MAX_QUEUE = 30
const MAX_TEXT_BYTES = 256 * 1024 // 256 KiB; anything bigger is almost certainly a file dump

const queue: ClipboardEntry[] = []
let lastSeenText = ''
let idCounter = 1

function nextId(): string {
  return String(idCounter++)
}

export async function initClipboardTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('clipboard tool init')

  const maxQueueSize = (): number => {
    const v = ctx.store.get<number>('maxQueueSize', DEFAULT_MAX_QUEUE) || DEFAULT_MAX_QUEUE
    return Math.max(5, Math.min(200, Math.round(v)))
  }

  // Seed lastSeenText with current clipboard contents so we don't
  // immediately push whatever the user happened to have copied.
  try { lastSeenText = clipboard.readText() } catch { /* ignore */ }

  const tick = (): void => {
    let t: string
    try { t = clipboard.readText() } catch { return }
    if (t === lastSeenText) return
    lastSeenText = t
    if (!t || !t.trim()) return
    if (t.length > MAX_TEXT_BYTES) return
    // Dedup vs the most-recent entry (e.g. user copied the same thing twice)
    if (queue.length > 0 && queue[0].text === t) return
    queue.unshift({ id: nextId(), kind: 'text', text: t, time: Date.now() })
    while (queue.length > maxQueueSize()) queue.pop()
    ctx.log.debug(`clipboard queue size = ${queue.length}`)
    // If the picker is up, push the refreshed queue
    if (isPickerOpen()) pushEntriesToPicker([...queue])
  }
  const intervalHandle = setInterval(tick, POLL_MS)
  ctx.log.info(`clipboard poll started, ${POLL_MS}ms`)

  // Picker → main
  const onPick = (_e: Electron.IpcMainEvent, payload: PickPayload): void => {
    const entry = queue.find((q) => q.id === payload.id)
    if (!entry) { closePicker(); return }
    // Skip the polling round trip for our own write.
    lastSeenText = entry.text
    clipboard.writeText(entry.text)
    // Bring the chosen entry to the front of the queue so it's also the
    // default ⌘V target afterwards.
    const i = queue.findIndex((q) => q.id === entry.id)
    if (i > 0) {
      queue.splice(i, 1)
      queue.unshift(entry)
    }
    closePicker()
    // Wait briefly for focus to return to the previously frontmost app
    // before slamming ⌘V at it.
    setTimeout(() => {
      simulatePasteCmdV().catch((err) => {
        ctx.log.warn('simulatePasteCmdV failed (Accessibility permission?)', err)
      })
    }, 100)
  }
  const onCancel = (): void => closePicker()
  ipcMain.on(CB_IPC.Pick, onPick)
  ipcMain.on(CB_IPC.Cancel, onCancel)

  // Hotkey
  const combo = ctx.store.get<string>('shortcuts.showPicker', '') || 'CommandOrControl+Shift+V'
  const r = await ctx.registerShortcut('showPicker', combo, () => {
    showPicker({ entries: [...queue] })
  })
  if (!r.ok) ctx.log.warn('showPicker shortcut registration failed:', r.reason)

  // Cleanup hook — not really invoked anywhere yet, but here so
  // future hot-reloading of tools can stop the timer cleanly.
  void intervalHandle
}
