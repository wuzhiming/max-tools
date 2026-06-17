// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from 'electron'
import { mainLog } from './logger'
import { listToolSummaries } from './tool-registry'
import { showMainWindow } from './main-window'

let tray: Tray | null = null

export function createTray(): void {
  // 临时用 16x16 纯色图（后续 task 替换为图标资源）
  const img = nativeImage.createEmpty()
  tray = new Tray(img)
  tray.setToolTip('Max Tools')
  refreshTrayMenu()
}

export function refreshTrayMenu(): void {
  if (!tray) return
  const tools = listToolSummaries()
  const items: Electron.MenuItemConstructorOptions[] = [
    ...tools.map((t) => ({
      label: t.loaded ? t.name : `${t.name} (加载失败)`,
      enabled: t.loaded,
    })),
    { type: 'separator' },
    { label: '打开主窗口', click: () => showMainWindow() },
    { label: '设置…', click: () => showMainWindow('/settings/general') },
    { type: 'separator' },
    { label: '关于', click: () => showMainWindow('/about') },
    { label: '退出', click: () => app.exit(0) },
  ]
  tray.setContextMenu(Menu.buildFromTemplate(items))
  mainLog.debug('tray menu refreshed')
}
