import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { initLogger, mainLog } from './logger'
import { createTray } from './tray'
import { listToolSummaries } from './tool-registry'
import { IPC } from '@shared/types/ipc'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

function registerAppIpc(): void {
  ipcMain.handle(IPC.ToolList, () => listToolSummaries())
  ipcMain.handle(IPC.GetVersion, () => app.getVersion())
  ipcMain.handle(IPC.OpenLogsFolder, () => shell.openPath(app.getPath('logs')))
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }
  registerAppIpc()
  createTray()
  mainLog.info('app ready, tray created')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
