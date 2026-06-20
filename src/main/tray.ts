// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from 'electron'
import sharp from 'sharp'
import { mainLog } from './logger'
import { invokeToolAction, listToolSummaries } from './tool-registry'
import { listShortcuts } from './shortcut-manager'
import { showMainWindow } from './main-window'

let tray: Tray | null = null

async function buildTrayIcon(): Promise<Electron.NativeImage> {
  // Black-on-transparent "M+" glyph — same mark as the app icon but
  // without the squircle. Marked as template so macOS auto-inverts for
  // dark/light menu bar themes. We supply 16px + @2x 32px reps so it
  // stays crisp on retina displays.
  //
  // Keep this in sync with build/icon.svg if the mark is redesigned.
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <g stroke="black" stroke-linecap="round" fill="none">
        <line x1="14" y1="16" x2="14" y2="48" stroke-width="10"/>
        <line x1="50" y1="16" x2="50" y2="48" stroke-width="10"/>
        <line x1="24" y1="32" x2="40" y2="32" stroke-width="8"/>
        <line x1="32" y1="24" x2="32" y2="40" stroke-width="8"/>
      </g>
    </svg>`,
  )
  const buf16 = await sharp(svg).resize(16, 16).png().toBuffer()
  const buf32 = await sharp(svg).resize(32, 32).png().toBuffer()
  const img = nativeImage.createFromBuffer(buf16, { scaleFactor: 1.0 })
  img.addRepresentation({ scaleFactor: 2.0, width: 32, height: 32, buffer: buf32 })
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
