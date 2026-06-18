// src/tools/screenshot/main/editor-controller.ts
import { BrowserWindow, ipcMain, clipboard, nativeImage } from 'electron'
import { join, dirname } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { SS_IPC } from '@shared/types/screenshot-ipc'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.editor')

let activeEditor: BrowserWindow | null = null

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

export async function openEditor(args: OpenEditorArgs): Promise<void> {
  if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()

  const TOOLBAR_HEIGHT = 48
  const PADDING = 4

  const win = new BrowserWindow({
    x: Math.max(0, args.windowBounds.x - PADDING),
    y: Math.max(0, args.windowBounds.y - PADDING),
    width: args.windowBounds.width + PADDING * 2,
    height: args.windowBounds.height + PADDING * 2 + TOOLBAR_HEIGHT,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#1c1c1e',
    webPreferences: {
      preload: join(__dirname, '../../../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  })
  activeEditor = win

  const url = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/src/tools/screenshot/renderer/editor/index.html`
    : null
  const loadFilePath = url
    ? null
    : join(__dirname, '../../../renderer/src/tools/screenshot/renderer/editor/index.html')
  log.info('creating editor window, url=', url ?? loadFilePath)
  if (url) win.loadURL(url)
  else win.loadFile(loadFilePath!)
  // Always open DevTools detached so we can see renderer errors
  win.webContents.openDevTools({ mode: 'detach' })

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

  ipcMain.on(SS_IPC.EditorComplete, onComplete)
  ipcMain.on(SS_IPC.EditorSaveAs, onSaveAs)
  ipcMain.on(SS_IPC.EditorCancel, onCancel)

  const closeEditor = () => {
    if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()
    activeEditor = null
    ipcMain.off(SS_IPC.EditorComplete, onComplete)
    ipcMain.off(SS_IPC.EditorSaveAs, onSaveAs)
    ipcMain.off(SS_IPC.EditorCancel, onCancel)
  }

  win.on('closed', closeEditor)
}
