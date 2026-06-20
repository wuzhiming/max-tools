// src/tools/clipboard/main/picker-window.ts
//
// The picker is a single transparent floating BrowserWindow that opens
// when the user hits Cmd+Shift+V. It steals focus from the previous app
// (so it can accept keyboard input), and on close macOS returns focus
// to that app — letting the synthetic ⌘V land where the user expects.

import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { createLogger } from '@main/logger'
import { CB_IPC, type ClipboardEntry } from '@shared/types/clipboard-ipc'

const log = createLogger('clipboard.picker')

const PICKER_W = 480
const PICKER_H = 480

let activeWin: BrowserWindow | null = null

export interface ShowPickerOpts {
  entries: ClipboardEntry[]
}

export function isPickerOpen(): boolean {
  return !!activeWin && !activeWin.isDestroyed()
}

export function pushEntriesToPicker(entries: ClipboardEntry[]): void {
  if (!activeWin || activeWin.isDestroyed()) return
  activeWin.webContents.send(CB_IPC.PickerInit, { entries })
}

export function closePicker(): void {
  if (!activeWin || activeWin.isDestroyed()) {
    activeWin = null
    return
  }
  const w = activeWin
  activeWin = null
  w.close()
}

export function showPicker(opts: ShowPickerOpts): void {
  // If a picker is already up, refresh & focus instead of stacking.
  if (activeWin && !activeWin.isDestroyed()) {
    pushEntriesToPicker(opts.entries)
    activeWin.focus()
    return
  }

  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const wa = display.workArea
  const x = wa.x + Math.round((wa.width - PICKER_W) / 2)
  const y = wa.y + Math.round((wa.height - PICKER_H) / 2)

  const win = new BrowserWindow({
    x,
    y,
    width: PICKER_W,
    height: PICKER_H,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  })
  activeWin = win
  win.setAlwaysOnTop(true, 'screen-saver')

  const url = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/src/tools/clipboard/renderer/picker/index.html`
    : null
  const file = url
    ? null
    : join(__dirname, '../renderer/src/tools/clipboard/renderer/picker/index.html')
  log.info('creating picker window, url=', url ?? file)
  if (url) win.loadURL(url)
  else win.loadFile(file!)

  win.webContents.on('console-message', (_e, _l, message, line, sourceId) => {
    log.info(`[picker] ${message}`, sourceId ? `(${sourceId}:${line})` : '')
  })
  win.webContents.on('did-fail-load', (_e, code, desc, urlS) => {
    log.error(`picker did-fail-load: ${desc} (${code}) url=${urlS}`)
  })

  win.webContents.once('did-finish-load', () => {
    if (win.isDestroyed()) return
    win.webContents.send(CB_IPC.PickerInit, { entries: opts.entries })
  })

  // Cancel on blur — user clicked elsewhere, behave like Spotlight.
  win.on('blur', () => closePicker())
  win.on('closed', () => {
    if (activeWin === win) activeWin = null
  })
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') closePicker()
  })
}
