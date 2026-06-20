// src/tools/clipboard/main/index.ts
//
// Owns the in-memory queue + the polling loop that watches the system
// clipboard. ⌘C never gets hijacked — we just observe the clipboard
// every POLL_MS and snapshot whenever the content changes.
//
// Two content kinds: text and image. For images we keep the full
// NativeImage main-side (for paste-back) and only send a small base64
// thumbnail to the picker renderer over IPC.
//
// Cmd+Shift+V opens the picker. Selection: write entry back to the
// system clipboard, then re-activate the app that was frontmost when
// the hotkey fired (we cache its bundle id), then fire ⌘V at it.

import { clipboard, dialog, ipcMain, nativeImage, Notification, type NativeImage } from 'electron'
import { createHash } from 'node:crypto'
import type { ToolContext } from '@shared/types/tool-manifest'
import {
  CB_IPC,
  type ClipboardEntry,
  type ImageEntry,
  type PickPayload,
  type TextEntry,
} from '@shared/types/clipboard-ipc'
import {
  closePicker,
  isPickerOpen,
  pushEntriesToPicker,
  showPicker,
} from './picker-window'
import { activateAndPaste, getFrontmostBundleId } from './paste'
import { openPermissionPane } from '@main/permissions'
import { showMainWindow } from '@main/main-window'

const POLL_MS = 500
const DEFAULT_MAX_QUEUE = 30
const MAX_TEXT_BYTES = 256 * 1024
const THUMB_HEIGHT = 56
const PREVIEW_HEIGHT = 320

/** Throttle the "permission missing" prompt so a user who hits ⌘⇧V five
 *  times in a row doesn't get five stacked dialogs / notifications. */
let lastPermNotifyAt = 0
const PERM_NOTIFY_COOLDOWN_MS = 60_000

function showPermissionPrompt(): void {
  const now = Date.now()
  if (now - lastPermNotifyAt < PERM_NOTIFY_COOLDOWN_MS) return
  lastPermNotifyAt = now

  // Best-effort notification (banner in Notification Centre). May silently
  // fail if the user hasn't granted notification access to our binary —
  // that's why we ALSO open the main window + show a modal below.
  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'Max Tools 无法自动粘贴',
      body: '需要「辅助功能」权限来模拟 ⌘V。点此前往系统设置授权。',
    })
    n.on('click', () => openPermissionPane('accessibility'))
    n.show()
  }

  // Open the main window on the General page so the user can see the
  // permission self-check panel right next to the modal.
  showMainWindow('/settings/general')

  // Hard guarantee: a modal dialog the user can't miss.
  void dialog
    .showMessageBox({
      type: 'warning',
      title: 'Max Tools 无法自动粘贴',
      message: '需要「辅助功能」权限来模拟 ⌘V',
      detail:
        '在「系统设置 → 隐私与安全性 → 辅助功能」中勾选 Max Tools（开发模式下显示为 Electron）。授权后无需重启。',
      buttons: ['打开系统设置', '稍后'],
      defaultId: 0,
      cancelId: 1,
    })
    .then((r) => {
      if (r.response === 0) openPermissionPane('accessibility')
    })
}

interface InternalImageEntry extends ImageEntry {
  /** Kept main-side so we can paste it back without re-encoding. */
  fullImage: NativeImage
}

type InternalEntry = TextEntry | InternalImageEntry

const queue: InternalEntry[] = []
/** Last hash we observed on the clipboard — text or image. Used to
 *  short-circuit polling and to suppress re-adds when we ourselves
 *  write to the clipboard (paste-back). */
let lastHash = ''
let idCounter = 1

const nextId = (): string => String(idCounter++)
const sha1 = (b: Buffer | string): string => createHash('sha1').update(b).digest('hex')

function hashOfText(t: string): string { return 'text:' + sha1(t) }
function hashOfImage(buf: Buffer): string { return 'image:' + sha1(buf) }

/** Strip the heavy `fullImage` field before shipping entries over IPC. */
function toIpcEntries(): ClipboardEntry[] {
  return queue.map((e) => {
    if (e.kind === 'text') return e
    const { fullImage: _fullImage, ...rest } = e
    return rest
  })
}

export async function initClipboardTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('clipboard tool init')

  const maxQueueSize = (): number => {
    const v = ctx.store.get<number>('maxQueueSize', DEFAULT_MAX_QUEUE) || DEFAULT_MAX_QUEUE
    return Math.max(5, Math.min(200, Math.round(v)))
  }

  // Seed lastHash so we don't immediately push whatever the user happened
  // to have copied before the app started.
  try {
    const initialImg = clipboard.readImage()
    if (!initialImg.isEmpty()) {
      lastHash = hashOfImage(initialImg.toPNG())
    } else {
      lastHash = hashOfText(clipboard.readText() || '')
    }
  } catch { /* ignore */ }

  const tick = (): void => {
    let img: NativeImage
    let text: string
    try {
      img = clipboard.readImage()
      text = clipboard.readText() ?? ''
    } catch {
      return
    }

    // Prefer image when both are present (e.g. our screenshot tool puts an
    // image on the pasteboard; the text fallback would just be the image
    // filename or alt text).
    if (!img.isEmpty()) {
      const buf = img.toPNG()
      const h = hashOfImage(buf)
      if (h === lastHash) return
      lastHash = h
      const size = img.getSize()
      const thumb = img.resize({ height: THUMB_HEIGHT, quality: 'better' })
      // Don't upscale tiny images; clamp preview height to the source.
      const preview = size.height > PREVIEW_HEIGHT
        ? img.resize({ height: PREVIEW_HEIGHT, quality: 'better' })
        : img
      const entry: InternalImageEntry = {
        id: nextId(),
        kind: 'image',
        thumbDataUrl: thumb.toDataURL(),
        previewDataUrl: preview.toDataURL(),
        width: size.width,
        height: size.height,
        bytes: buf.length,
        time: Date.now(),
        fullImage: img,
      }
      if (queue.length > 0 && queue[0].kind === 'image' && queue[0].bytes === entry.bytes) {
        // Cheap heuristic dedupe — exact byte length match is rare for two
        // genuinely-different captures. Skip if it matches; otherwise add.
        return
      }
      queue.unshift(entry)
      while (queue.length > maxQueueSize()) queue.pop()
      ctx.log.info(`clipboard queue: image added (${size.width}×${size.height})`)
      if (isPickerOpen()) pushEntriesToPicker(toIpcEntries())
      return
    }

    if (text) {
      if (text.length > MAX_TEXT_BYTES) return
      const h = hashOfText(text)
      if (h === lastHash) return
      lastHash = h
      if (!text.trim()) return
      if (queue.length > 0 && queue[0].kind === 'text' && queue[0].text === text) return
      queue.unshift({ id: nextId(), kind: 'text', text, time: Date.now() })
      while (queue.length > maxQueueSize()) queue.pop()
      ctx.log.debug(`clipboard queue: text added (len=${text.length})`)
      if (isPickerOpen()) pushEntriesToPicker(toIpcEntries())
    }
  }
  setInterval(tick, POLL_MS)
  ctx.log.info(`clipboard poll started, ${POLL_MS}ms`)

  /** App that was frontmost when the hotkey fired. We grab it BEFORE the
   *  picker opens (which steals focus) and use it on pick to re-activate
   *  the right app for the synthetic ⌘V. */
  let frontBeforePicker: string | null = null

  const onPick = (_e: Electron.IpcMainEvent, payload: PickPayload): void => {
    const entry = queue.find((q) => q.id === payload.id)
    if (!entry) { closePicker(); return }
    // Write back to the system clipboard. Suppress the next poll-tick by
    // updating lastHash so we don't re-add what we just pasted.
    if (entry.kind === 'text') {
      lastHash = hashOfText(entry.text)
      clipboard.writeText(entry.text)
    } else {
      const buf = entry.fullImage.toPNG()
      lastHash = hashOfImage(buf)
      clipboard.writeImage(entry.fullImage)
    }
    // Move to front so the new ⌘V default also matches what was just pasted.
    const i = queue.findIndex((q) => q.id === entry.id)
    if (i > 0) { queue.splice(i, 1); queue.unshift(entry) }

    const target = frontBeforePicker
    closePicker()
    frontBeforePicker = null

    ctx.log.info(`pick: pasting back to ${target ?? '(no target — manual ⌘V required)'}`)
    activateAndPaste(target, 60).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      // macOS error code 1002 = "osascript is not allowed to send keystrokes"
      // = Accessibility permission not granted to our binary. This is by far
      // the most common failure mode; everything else (osascript missing,
      // sandbox weirdness) is rare enough that one generic notification is
      // fine.
      const isAccessibilityDenied = msg.includes('1002') || msg.includes('not allowed to send keystrokes')
      if (isAccessibilityDenied) {
        ctx.log.warn('paste blocked: Accessibility permission not granted')
        showPermissionPrompt()
      } else {
        ctx.log.warn('activateAndPaste failed', err)
      }
    })
  }
  const onCancel = (): void => {
    closePicker()
    frontBeforePicker = null
  }
  ipcMain.on(CB_IPC.Pick, onPick)
  ipcMain.on(CB_IPC.Cancel, onCancel)

  // Hotkey
  const combo = ctx.store.get<string>('shortcuts.showPicker', '') || 'CommandOrControl+Shift+V'
  const r = await ctx.registerShortcut('showPicker', combo, () => {
    // Capture frontmost BEFORE showPicker. showPicker creates a window
    // with alwaysOnTop('screen-saver') which steals focus immediately;
    // if we let osascript race against that, by the time it returns
    // (~100–500ms) the frontmost is already Max Tools itself, and the
    // synthetic ⌘V later lands in our own app (no-op).
    //
    // So: block on the lookup first, then open. The ~150ms latency is
    // imperceptible compared to the picker fade-in.
    void (async () => {
      frontBeforePicker = await getFrontmostBundleId().catch(() => null)
      ctx.log.info(`hotkey: frontmost before picker = ${frontBeforePicker ?? '(unknown)'}`)
      showPicker({ entries: toIpcEntries() })
    })()
  })
  if (!r.ok) ctx.log.warn('showPicker shortcut registration failed:', r.reason)
}
