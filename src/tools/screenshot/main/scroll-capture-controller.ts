// src/tools/screenshot/main/scroll-capture-controller.ts
//
// Orchestrates a "scroll screenshot": after the user picks a region we
// keep grabbing that region from the live screen, dedupe in the
// stitcher, and finally hand the long composite to the editor.
//
// Flow:
//   1. caller hands us {region (CSS px), display, cssOffset}
//   2. we spawn a small floating control window OUTSIDE the region so
//      we don't capture our own UI in the frames
//   3. start a polling loop: every POLL_MS, screencapture -R the region
//      into /tmp, append to a frame list
//   4. on Done IPC: stop loop, stitch all frames, resolve with the
//      stitched PNG path + dims
//   5. on Cancel IPC: stop loop, clean up frames, resolve cancelled

import { BrowserWindow, ipcMain, screen, type Rectangle } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, unlinkSync } from 'node:fs'
import { SS_IPC, type ScrollStatusPayload } from '@shared/types/screenshot-ipc'
import { createLogger } from '@main/logger'
import { stitchFrames, type StitchResult } from './stitch'

const execFileP = promisify(execFile)
const log = createLogger('screenshot.scroll')

const POLL_MS = 500
const CONTROL_W = 260
const CONTROL_H = 56
const CONTROL_GAP = 12

export interface ScrollCaptureArgs {
  /** Region in CSS px, in global screen coordinates (display.bounds + offset). */
  cssRegion: Rectangle
  /** Display the region lives on (used for DPR + clamping the control window). */
  displayId: number
}

export interface ScrollCaptureResult {
  cancelled: boolean
  outputPath?: string
  pixelWidth?: number
  pixelHeight?: number
  cssRegion?: Rectangle
}

/** Place the control window directly below the region, or flip above if no room. */
function computeControlPosition(region: Rectangle, dispBounds: Rectangle): { x: number; y: number } {
  let x = region.x + Math.round(region.width / 2 - CONTROL_W / 2)
  let y = region.y + region.height + CONTROL_GAP
  if (y + CONTROL_H > dispBounds.y + dispBounds.height) {
    y = region.y - CONTROL_H - CONTROL_GAP
  }
  if (y < dispBounds.y + 4) y = dispBounds.y + 4
  const minX = dispBounds.x + 4
  const maxX = dispBounds.x + dispBounds.width - CONTROL_W - 4
  if (x < minX) x = minX
  if (x > maxX) x = maxX
  return { x, y }
}

export async function runScrollCapture(args: ScrollCaptureArgs): Promise<ScrollCaptureResult> {
  const displays = screen.getAllDisplays()
  const display = displays[args.displayId] ?? screen.getDisplayMatching(args.cssRegion)
  const { x: cx, y: cy } = computeControlPosition(args.cssRegion, display.bounds)

  // ---- spawn control window -------------------------------------------------
  const win = new BrowserWindow({
    x: cx,
    y: cy,
    width: CONTROL_W,
    height: CONTROL_H,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')

  const url = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/src/tools/screenshot/renderer/scroll-control/index.html`
    : null
  const file = url ? null : join(__dirname, '../renderer/src/tools/screenshot/renderer/scroll-control/index.html')
  log.info('creating scroll-control window, url=', url ?? file)
  if (url) win.loadURL(url)
  else win.loadFile(file!)

  win.webContents.on('console-message', (_e, _l, message, line, sourceId) => {
    log.info(`[scroll-control] ${message}`, sourceId ? `(${sourceId}:${line})` : '')
  })

  // ---- shared state ---------------------------------------------------------
  const framePaths: string[] = []
  let stopped = false
  const ts = Date.now()

  const broadcastStatus = (phase: 'capturing' | 'stitching') => {
    if (win.isDestroyed()) return
    const payload: ScrollStatusPayload = { framesCaptured: framePaths.length, phase }
    win.webContents.send(SS_IPC.ScrollStatus, payload)
  }

  // ---- capture loop ---------------------------------------------------------
  const captureOnce = async () => {
    if (stopped) return
    const path = join(tmpdir(), `maxtools-scroll-${ts}-${framePaths.length}.png`)
    try {
      await execFileP('/usr/sbin/screencapture', [
        '-x', // silent (no shutter sound). Cursor is omitted by default.
        '-R', `${args.cssRegion.x},${args.cssRegion.y},${args.cssRegion.width},${args.cssRegion.height}`,
        '-t', 'png',
        path,
      ], { timeout: 3000 })
    } catch (err) {
      log.error('screencapture in scroll-capture failed', err)
      return
    }
    if (!stopped && existsSync(path)) {
      framePaths.push(path)
      broadcastStatus('capturing')
    }
  }

  const cleanupFrames = () => {
    for (const p of framePaths) {
      try { if (existsSync(p)) unlinkSync(p) } catch { /* ignore */ }
    }
    framePaths.length = 0
  }

  // ---- IPC bridge -----------------------------------------------------------
  return new Promise<ScrollCaptureResult>((resolve) => {
    let pollHandle: NodeJS.Timeout | null = null

    const finish = async (action: 'done' | 'cancel') => {
      if (stopped) return
      stopped = true
      if (pollHandle) clearInterval(pollHandle)
      ipcMain.off(SS_IPC.ScrollDone, onDone)
      ipcMain.off(SS_IPC.ScrollCancel, onCancel)
      ipcMain.off(SS_IPC.ScrollReady, onReady)

      if (action === 'cancel') {
        cleanupFrames()
        if (!win.isDestroyed()) win.close()
        resolve({ cancelled: true })
        return
      }

      // action === 'done': stitch then close
      broadcastStatus('stitching')
      let stitched: StitchResult
      try {
        stitched = await stitchFrames(framePaths)
      } catch (err) {
        log.error('stitch failed', err)
        cleanupFrames()
        if (!win.isDestroyed()) win.close()
        resolve({ cancelled: true })
        return
      }
      // We can drop the raw frames now; the stitched PNG is the only artifact
      // we care about going forward.
      cleanupFrames()
      if (!win.isDestroyed()) win.close()
      resolve({
        cancelled: false,
        outputPath: stitched.outputPath,
        pixelWidth: stitched.width,
        pixelHeight: stitched.height,
        cssRegion: args.cssRegion,
      })
    }

    const onDone = () => finish('done')
    const onCancel = () => finish('cancel')
    const onReady = () => broadcastStatus('capturing')

    ipcMain.on(SS_IPC.ScrollDone, onDone)
    ipcMain.on(SS_IPC.ScrollCancel, onCancel)
    ipcMain.on(SS_IPC.ScrollReady, onReady)

    win.on('closed', () => {
      if (!stopped) finish('cancel')
    })

    // Esc closes the control window (interpreted as cancel)
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        finish('cancel')
      } else if (input.type === 'keyDown' && (input.key === 'Enter' || input.key === 'Return')) {
        finish('done')
      }
    })

    pollHandle = setInterval(() => { captureOnce().catch((e) => log.error(e)) }, POLL_MS)
    // Grab one immediately so the user sees the count tick up.
    captureOnce().catch((e) => log.error(e))
  })
}
