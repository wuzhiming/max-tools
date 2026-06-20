// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from 'electron'
import sharp from 'sharp'
import { mainLog } from './logger'
import { invokeToolAction, listToolSummaries } from './tool-registry'
import { listShortcuts } from './shortcut-manager'
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

/** Map a registered shortcut combo to macOS menu accelerator notation.
 *  Electron's "CommandOrControl+Shift+X" already matches what Menu wants
 *  (it will render as ⌘⇧X), so we mostly pass through. */
function comboToAccelerator(combo: string): string | undefined {
  return combo || undefined
}

/** Build the per-tool submenu. For now only the screenshot tool exposes
 *  actions (region/fullscreen/scroll); other tools just show their name.
 *  When we add more tools with actions we'll lift this into a tool
 *  manifest field. */
function toolSubmenu(toolId: string): Electron.MenuItemConstructorOptions[] | null {
  if (toolId !== 'screenshot') return null
  const shortcuts = Object.fromEntries(
    listShortcuts(toolId).map((s) => [s.key, s.combo] as const),
  )
  return [
    {
      label: '区域截图',
      accelerator: comboToAccelerator(shortcuts['region']),
      click: () => { invokeToolAction('screenshot', 'region') },
    },
    {
      label: '全屏截图',
      accelerator: comboToAccelerator(shortcuts['fullscreen']),
      click: () => { invokeToolAction('screenshot', 'fullscreen') },
    },
    // Long-screenshot is no longer a direct shortcut entry — it lives in
    // the floating toolbar that appears once a region is selected.
  ]
}

export function refreshTrayMenu(): void {
  if (!tray) return
  const tools = listToolSummaries()
  const items: Electron.MenuItemConstructorOptions[] = [
    ...tools.map((t) => {
      // Disabled or unloaded → flat label, no submenu, not clickable.
      if (!t.loaded || !t.enabled) {
        const suffix = !t.loaded ? '加载失败' : '已禁用'
        return {
          label: `${t.name}（${suffix}）`,
          enabled: false,
        } as Electron.MenuItemConstructorOptions
      }
      const sub = toolSubmenu(t.id)
      if (sub) {
        return {
          label: t.name,
          submenu: sub,
        } as Electron.MenuItemConstructorOptions
      }
      return {
        label: t.name,
        enabled: true,
      } as Electron.MenuItemConstructorOptions
    }),
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
