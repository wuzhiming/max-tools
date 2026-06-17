import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { initLogger, mainLog } from './logger'
import { createTray, refreshTrayMenu } from './tray'
import { listToolSummaries, loadTools, getToolShortcuts, setToolShortcut } from './tool-registry'
import { getScopedStore } from './settings-store'
import { getPermissionStatus, openPermissionPane } from './permissions'
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
  ipcMain.handle(IPC.DialogOpenDirectory, async (_e, defaultPath?: string) => {
    const { dialog } = await import('electron')
    const r = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath,
    })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle(IPC.DialogSaveFile, async (_e, args: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const { dialog } = await import('electron')
    const r = await dialog.showSaveDialog({
      defaultPath: args.defaultPath,
      filters: args.filters,
    })
    return r.canceled ? null : r.filePath
  })
  ipcMain.handle(IPC.ToolGetShortcuts, (_e, toolId: string) => getToolShortcuts(toolId))
  ipcMain.handle(
    IPC.ToolSetShortcut,
    (_e, args: { toolId: string; key: string; combo: string }) =>
      setToolShortcut(args.toolId, args.key, args.combo),
  )
  ipcMain.handle(
    IPC.ToolStoreGet,
    (_e, args: { toolId: string; key: string; defaultValue?: unknown }) => {
      return getScopedStore(`tool.${args.toolId}`).get(args.key, args.defaultValue as never)
    },
  )
  ipcMain.handle(
    IPC.ToolStoreSet,
    (_e, args: { toolId: string; key: string; value: unknown }) => {
      getScopedStore(`tool.${args.toolId}`).set(args.key, args.value)
    },
  )
  ipcMain.handle(IPC.GetPermissions, () => ({
    screen: getPermissionStatus('screen'),
    accessibility: getPermissionStatus('accessibility'),
  }))
  ipcMain.handle(IPC.OpenPermissionPane, (_e, kind: 'screen' | 'accessibility') =>
    openPermissionPane(kind),
  )
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }
  registerAppIpc()
  await loadTools({
    manifestLoaders: [
      async () => (await import('@tools/screenshot/manifest')).screenshotManifest,
    ],
  })
  await createTray()
  refreshTrayMenu()
  mainLog.info('app fully started')
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
