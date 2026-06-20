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
  /** 文件名模板（用于另存为，每次 save 重新渲染） */
  filenameTemplate: string
  /** 另存为对话框默认目录的实时解析器 —— 每次 save 现场调用，
   *  保证用户上一次保存到的目录立刻成为这一次的默认目录 */
  resolveSaveDir: () => string
  /** 用户完成一次另存为后回调，参数是实际保存到的完整路径 */
  onSaved?: (savedPath: string) => void
}

// The toolbar window is much larger than the visible pill: extra transparent
// padding above and below gives Mantine popovers / menus / tooltips room to
// render without being clipped at the window edge. Click-through keeps the
// padding from blocking interaction with windows underneath.
const TOOLBAR_W = 600
const TOOLBAR_PILL_H = 48
const TOOLBAR_VPAD = 220
const TOOLBAR_H = TOOLBAR_PILL_H + TOOLBAR_VPAD * 2
const TOOLBAR_GAP = 8

function computeToolbarPosition(editorBounds: Electron.Rectangle): { x: number; y: number } {
  const display = screen.getDisplayMatching(editorBounds)
  const db = display.bounds
  let tx = editorBounds.x + Math.round(editorBounds.width / 2 - TOOLBAR_W / 2)
  // We want the *visible pill* (centered in the window) to sit `GAP` below the
  // editor. Window top therefore lifts up by TOOLBAR_VPAD.
  let ty = editorBounds.y + editorBounds.height + TOOLBAR_GAP - TOOLBAR_VPAD
  const pillBottom = ty + TOOLBAR_VPAD + TOOLBAR_PILL_H
  if (pillBottom > db.y + db.height) {
    // Flip so the pill sits `GAP` above the editor.
    ty = editorBounds.y - TOOLBAR_GAP - TOOLBAR_PILL_H - TOOLBAR_VPAD
  }
  // clamp x to display
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
    show: false,
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
    show: false,
    enableLargerThanScreen: true,
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
  // Start fully passthrough — renderer toggles this off when cursor enters the pill.
  toolbarWin.setIgnoreMouseEvents(true, { forward: true })

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
    payload: { dataUrl: string; filename: string },
  ) => {
    try {
      const { dialog } = await import('electron')
      // Resolve the directory at *save time* so the user's previous save
      // (this session or persisted from earlier ones) is reflected immediately.
      const dir = args.resolveSaveDir()
      const defaultPath = join(dir, payload.filename)
      const r = await dialog.showSaveDialog(win, {
        defaultPath,
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
      args.onSaved?.(r.filePath)
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
  const onToolbarSetPassthrough = (_e: Electron.IpcMainEvent, passthrough: boolean) => {
    if (!activeToolbar || activeToolbar.isDestroyed()) return
    activeToolbar.setIgnoreMouseEvents(!!passthrough, { forward: true })
  }

  // Hold both windows hidden until the editor renderer has painted the
  // captured image to its canvas — otherwise the user sees an empty dark
  // editor rectangle flash before the screenshot appears.
  let shown = false
  const showBoth = () => {
    if (shown) return
    shown = true
    if (activeEditor && !activeEditor.isDestroyed()) activeEditor.show()
    if (activeToolbar && !activeToolbar.isDestroyed()) activeToolbar.show()
  }
  const onEditorPainted = () => showBoth()
  const showFailsafe = setTimeout(showBoth, 1500)

  ipcMain.on(SS_IPC.EditorComplete, onComplete)
  ipcMain.on(SS_IPC.EditorSaveAs, onSaveAs)
  ipcMain.on(SS_IPC.EditorCancel, onCancel)
  ipcMain.on(SS_IPC.ToolbarReady, onToolbarReady)
  ipcMain.on(SS_IPC.ToolbarAction, onToolbarAction)
  ipcMain.on(SS_IPC.EditorStatus, onEditorStatus)
  ipcMain.on(SS_IPC.ToolbarSetPassthrough, onToolbarSetPassthrough)
  ipcMain.on(SS_IPC.EditorPainted, onEditorPainted)

  const closeEditor = () => {
    clearTimeout(showFailsafe)
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
    ipcMain.off(SS_IPC.ToolbarSetPassthrough, onToolbarSetPassthrough)
    ipcMain.off(SS_IPC.EditorPainted, onEditorPainted)
  }

  win.on('closed', closeEditor)
  toolbarWin.on('closed', () => {
    // if user somehow closes toolbar window, also kill editor for consistency
    if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()
    activeToolbar = null
  })
}
