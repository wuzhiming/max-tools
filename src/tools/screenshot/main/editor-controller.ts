// src/tools/screenshot/main/editor-controller.ts
import { BrowserWindow, ipcMain, clipboard, nativeImage, screen } from 'electron'
import { join, dirname } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import {
  SS_IPC,
  type EditorStatusPayload,
  type ToolbarActionPayload,
} from '@shared/types/screenshot-ipc'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.editor')

let activeEditor: BrowserWindow | null = null
let activeToolbar: BrowserWindow | null = null

export interface OpenEditorArgs {
  imagePath: string
  pixelWidth: number
  pixelHeight: number
  /** 编辑器窗口希望放在屏幕上的位置（视觉无缝接管原选区） */
  windowBounds: { x: number; y: number; width: number; height: number }
  /** 默认保存目录与文件名模板（用于另存为） */
  saveDir: string
  filenameTemplate: string
}

const TOOLBAR_W = 560
const TOOLBAR_H = 64
const TOOLBAR_GAP = 8

function computeToolbarPosition(editorBounds: Electron.Rectangle): { x: number; y: number } {
  const display = screen.getDisplayMatching(editorBounds)
  const db = display.bounds
  let tx = editorBounds.x + Math.round(editorBounds.width / 2 - TOOLBAR_W / 2)
  let ty = editorBounds.y + editorBounds.height + TOOLBAR_GAP
  // flip above if off-screen-bottom
  if (ty + TOOLBAR_H > db.y + db.height) {
    ty = editorBounds.y - TOOLBAR_H - TOOLBAR_GAP
  }
  // clamp y to screen too (very tall editor that already spans the display)
  if (ty < db.y + 4) ty = db.y + 4
  // clamp x
  tx = Math.max(db.x + 4, Math.min(tx, db.x + db.width - TOOLBAR_W - 4))
  return { x: tx, y: ty }
}

export async function openEditor(args: OpenEditorArgs): Promise<void> {
  if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()
  if (activeToolbar && !activeToolbar.isDestroyed()) activeToolbar.close()

  const PADDING = 4

  const win = new BrowserWindow({
    x: Math.max(0, args.windowBounds.x - PADDING),
    y: Math.max(0, args.windowBounds.y - PADDING),
    width: args.windowBounds.width + PADDING * 2,
    height: args.windowBounds.height + PADDING * 2,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#1c1c1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  })
  activeEditor = win

  const editorUrl = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/src/tools/screenshot/renderer/editor/index.html`
    : null
  const editorFile = editorUrl
    ? null
    : join(__dirname, '../renderer/src/tools/screenshot/renderer/editor/index.html')
  log.info('creating editor window, url=', editorUrl ?? editorFile)
  if (editorUrl) win.loadURL(editorUrl)
  else win.loadFile(editorFile!)

  win.webContents.on('console-message', (_e, _level, message, line, sourceId) => {
    log.info(`[editor-renderer] ${message}`, sourceId ? `(${sourceId}:${line})` : '')
  })
  win.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
    log.error(`editor did-fail-load: ${errorDesc} (${errorCode}) url=${validatedURL}`)
  })

  win.webContents.once('did-finish-load', () => {
    log.info('editor window did-finish-load, destroyed=', win.isDestroyed())
    win.webContents.send(SS_IPC.EditorInit, {
      imagePath: args.imagePath,
      pixelWidth: args.pixelWidth,
      pixelHeight: args.pixelHeight,
      saveDir: args.saveDir,
      filenameTemplate: args.filenameTemplate,
    })
  })

  // --- toolbar window ------------------------------------------------------
  const editorBox = win.getBounds()
  const { x: tx, y: ty } = computeToolbarPosition(editorBox)

  const toolbarWin = new BrowserWindow({
    x: tx,
    y: ty,
    width: TOOLBAR_W,
    height: TOOLBAR_H,
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
  activeToolbar = toolbarWin
  toolbarWin.setAlwaysOnTop(true, 'screen-saver')

  const toolbarUrl = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/src/tools/screenshot/renderer/toolbar/index.html`
    : null
  const toolbarFile = toolbarUrl
    ? null
    : join(__dirname, '../renderer/src/tools/screenshot/renderer/toolbar/index.html')
  log.info('creating toolbar window, url=', toolbarUrl ?? toolbarFile)
  if (toolbarUrl) toolbarWin.loadURL(toolbarUrl)
  else toolbarWin.loadFile(toolbarFile!)

  toolbarWin.webContents.on('console-message', (_e, _level, message, line, sourceId) => {
    log.info(`[toolbar-renderer] ${message}`, sourceId ? `(${sourceId}:${line})` : '')
  })
  toolbarWin.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
    log.error(`toolbar did-fail-load: ${errorDesc} (${errorCode}) url=${validatedURL}`)
  })

  // keep toolbar parked relative to editor if user drags the editor
  const reposition = () => {
    if (!activeEditor || activeEditor.isDestroyed()) return
    if (!activeToolbar || activeToolbar.isDestroyed()) return
    const p = computeToolbarPosition(activeEditor.getBounds())
    activeToolbar.setPosition(p.x, p.y, false)
  }
  win.on('move', reposition)
  win.on('resize', reposition)

  // --- IPC bridge ----------------------------------------------------------
  const onComplete = async (_e: Electron.IpcMainEvent, payload: { dataUrl: string }) => {
    try {
      const img = nativeImage.createFromDataURL(payload.dataUrl)
      clipboard.writeImage(img)
      log.info('editor result copied to clipboard')
    } catch (err) {
      log.error('clipboard write failed', err)
    }
    closeEditor()
  }
  const onSaveAs = async (
    _e: Electron.IpcMainEvent,
    payload: { dataUrl: string; suggestedPath: string },
  ) => {
    try {
      const { dialog } = await import('electron')
      const r = await dialog.showSaveDialog(win, {
        defaultPath: payload.suggestedPath,
        filters: [
          { name: 'PNG', extensions: ['png'] },
          { name: 'JPEG', extensions: ['jpg'] },
        ],
      })
      if (r.canceled || !r.filePath) return
      await mkdir(dirname(r.filePath), { recursive: true })
      const buf = Buffer.from(payload.dataUrl.split(',')[1], 'base64')
      await writeFile(r.filePath, buf)
      log.info('editor result saved to', r.filePath)
    } catch (err) {
      log.error('save-as failed', err)
    }
  }
  const onCancel = () => closeEditor()

  const onToolbarReady = () => {
    // initial status: nothing to undo or redo yet
    if (activeEditor && !activeEditor.isDestroyed()) {
      activeEditor.webContents.send(SS_IPC.EditorStatus, {
        canUndo: false,
        canRedo: false,
      } satisfies EditorStatusPayload)
    }
    if (activeToolbar && !activeToolbar.isDestroyed()) {
      activeToolbar.webContents.send(SS_IPC.EditorStatus, {
        canUndo: false,
        canRedo: false,
      } satisfies EditorStatusPayload)
    }
  }
  const onToolbarAction = (_e: Electron.IpcMainEvent, action: ToolbarActionPayload) => {
    if (!activeEditor || activeEditor.isDestroyed()) return
    activeEditor.webContents.send(SS_IPC.ToolbarAction, action)
  }
  const onEditorStatus = (_e: Electron.IpcMainEvent, status: EditorStatusPayload) => {
    if (!activeToolbar || activeToolbar.isDestroyed()) return
    activeToolbar.webContents.send(SS_IPC.EditorStatus, status)
  }

  ipcMain.on(SS_IPC.EditorComplete, onComplete)
  ipcMain.on(SS_IPC.EditorSaveAs, onSaveAs)
  ipcMain.on(SS_IPC.EditorCancel, onCancel)
  ipcMain.on(SS_IPC.ToolbarReady, onToolbarReady)
  ipcMain.on(SS_IPC.ToolbarAction, onToolbarAction)
  ipcMain.on(SS_IPC.EditorStatus, onEditorStatus)

  const closeEditor = () => {
    if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()
    if (activeToolbar && !activeToolbar.isDestroyed()) activeToolbar.close()
    activeEditor = null
    activeToolbar = null
    ipcMain.off(SS_IPC.EditorComplete, onComplete)
    ipcMain.off(SS_IPC.EditorSaveAs, onSaveAs)
    ipcMain.off(SS_IPC.EditorCancel, onCancel)
    ipcMain.off(SS_IPC.ToolbarReady, onToolbarReady)
    ipcMain.off(SS_IPC.ToolbarAction, onToolbarAction)
    ipcMain.off(SS_IPC.EditorStatus, onEditorStatus)
  }

  win.on('closed', closeEditor)
  toolbarWin.on('closed', () => {
    // if user somehow closes toolbar window, also kill editor for consistency
    if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()
    activeToolbar = null
  })
}
