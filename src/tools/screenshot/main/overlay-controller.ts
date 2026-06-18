// src/tools/screenshot/main/overlay-controller.ts
import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { captureAllDisplays, type CapturedDisplay } from './capture'
import { detectWindowsOnDisplay } from './window-detect'
import { cropImage } from './crop'
import { SS_IPC, type OverlayInitPayload, type OverlaySelectedPayload } from '@shared/types/screenshot-ipc'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.overlay')

let activeOverlays: BrowserWindow[] = []

function buildOverlayWindow(captured: CapturedDisplay): BrowserWindow {
  const { display } = captured
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../../../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  return win
}

export interface ShowOverlayResult {
  cancelled: boolean
  croppedPath?: string
  width?: number
  height?: number
  region?: { x: number; y: number; w: number; h: number }
  displayBounds?: { x: number; y: number; width: number; height: number }
}

export async function showOverlays(): Promise<ShowOverlayResult> {
  const captured = await captureAllDisplays()
  if (captured.length === 0) return { cancelled: true }

  return new Promise((resolve) => {
    let settled = false
    const settle = (r: ShowOverlayResult) => {
      if (settled) return
      settled = true
      closeAll()
      cleanupIpc()
      resolve(r)
    }

    const closeAll = () => {
      for (const w of activeOverlays) {
        if (!w.isDestroyed()) w.destroy()
      }
      activeOverlays = []
    }

    const onSelected = async (_e: Electron.IpcMainEvent, payload: OverlaySelectedPayload) => {
      const cap = captured[payload.displayId]
      if (!cap) { log.error('selected unknown displayId', payload.displayId); return }
      try {
        const cropped = await cropImage(
          cap.imagePath,
          payload.regionInImagePixels,
          cap.pixelWidth,
          cap.pixelHeight,
        )
        settle({
          cancelled: false,
          croppedPath: cropped.outputPath,
          width: payload.regionInImagePixels.w,
          height: payload.regionInImagePixels.h,
          region: payload.regionInImagePixels,
          displayBounds: cap.display.bounds,
        })
      } catch (err) {
        log.error('crop failed', err)
        settle({ cancelled: true })
      }
    }
    const onCancelled = () => settle({ cancelled: true })

    ipcMain.on(SS_IPC.OverlaySelected, onSelected)
    ipcMain.on(SS_IPC.OverlayCancelled, onCancelled)

    const cleanupIpc = () => {
      ipcMain.off(SS_IPC.OverlaySelected, onSelected)
      ipcMain.off(SS_IPC.OverlayCancelled, onCancelled)
    }

    // 为每块屏创建叠层
    captured.forEach((cap, idx) => {
      const win = buildOverlayWindow(cap)
      activeOverlays.push(win)
      win.on('closed', () => {
        if (!settled) settle({ cancelled: true })
      })
      win.webContents.on('before-input-event', (_event, input) => {
        if (win.isDestroyed()) return
        if (input.type === 'keyDown' && input.key === 'Escape') {
          settle({ cancelled: true })
        }
      })

      const url = process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/src/tools/screenshot/renderer/overlay/index.html`
        : null
      if (url) {
        win.loadURL(url)
      } else {
        win.loadFile(join(__dirname, '../../../renderer/src/tools/screenshot/renderer/overlay/index.html'))
      }

      win.webContents.once('did-finish-load', () => {
        if (win.isDestroyed() || win.webContents.isDestroyed()) return
        const payload: OverlayInitPayload = {
          imagePath: cap.imagePath,
          displayBounds: cap.display.bounds,
          pixelWidth: cap.pixelWidth,
          pixelHeight: cap.pixelHeight,
          devicePixelRatio: cap.display.scaleFactor,
          windowsOnThisDisplay: detectWindowsOnDisplay(cap.display),
        }
        // 渲染层用 displayId = 数组索引
        win.webContents.send(SS_IPC.OverlayInit, { ...payload, displayId: idx })
        if (win.isDestroyed()) return
        // 确保窗口可见并获得键盘焦点（macOS 透明 + 全屏置顶有时不自动给焦点）
        win.show()
        win.focus()
        win.moveTop()
      })
    })
  })
}
