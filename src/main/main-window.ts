// src/main/main-window.ts
import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { mainLog } from './logger'

let mainWindow: BrowserWindow | null = null

export function showMainWindow(route?: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    if (route) mainWindow.webContents.send('navigate', route)
    return
  }
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'Max Tools',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/main-window/`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/main-window/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (route) mainWindow?.webContents.send('navigate', route)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainLog.info('main window created')
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
