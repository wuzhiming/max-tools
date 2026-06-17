import { app, BrowserWindow } from 'electron'
import { initLogger, mainLog } from './logger'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(() => {
  mainLog.info('app ready')
})

app.on('window-all-closed', (e: Electron.Event) => {
  if (process.platform === 'darwin') {
    e.preventDefault()
  } else {
    app.quit()
  }
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
