// src/main/index.ts
import { app, BrowserWindow } from 'electron'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(() => {
  // 后续 task 会在这里挂 tray / main window / tool registry
  console.log('[max-tools] app ready')
})

app.on('window-all-closed', (e: Electron.Event) => {
  // macOS 菜单栏应用：所有窗口关闭也不退出
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
