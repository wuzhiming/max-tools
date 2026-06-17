// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from 'electron'
import sharp from 'sharp'
import { mainLog } from './logger'
import { listToolSummaries } from './tool-registry'
import { showMainWindow } from './main-window'

let tray: Tray | null = null

async function buildTrayIcon(): Promise<Electron.NativeImage> {
  // 16x16 black template (alpha for negative space). macOS will invert in dark mode.
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="2" y="4" width="12" height="9" rx="2" fill="black"/>
      <circle cx="8" cy="9" r="2.5" fill="white"/>
      <rect x="6" y="2.5" width="4" height="2" rx="0.5" fill="black"/>
    </svg>`,
  )
  const png = await sharp(svg).png().toBuffer()
  const img = nativeImage.createFromBuffer(png)
  img.setTemplateImage(true)
  return img
}

export async function createTray(): Promise<void> {
  const img = await buildTrayIcon()
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
    { type: 'separator' as const },
    { label: '打开主窗口', click: () => showMainWindow() },
    { label: '设置…', click: () => showMainWindow('/settings/general') },
    { type: 'separator' as const },
    { label: '关于', click: () => showMainWindow('/about') },
    { label: '退出', click: () => app.exit(0) },
  ]
  tray.setContextMenu(Menu.buildFromTemplate(items))
  mainLog.debug('tray menu refreshed')
}
