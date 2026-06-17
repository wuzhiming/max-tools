import { app, BrowserWindow } from 'electron'
import { initLogger, mainLog } from './logger'
import { createTray } from './tray'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(async () => {
  // macOS 隐藏 Dock 图标（菜单栏应用）
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }
  createTray()
  mainLog.info('app ready, tray created')
})

app.on('window-all-closed', () => {
  // macOS 菜单栏应用：所有窗口关闭也不退出。仅注册监听器即可阻止默认 quit 行为。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
