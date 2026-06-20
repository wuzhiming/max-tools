// src/tools/screenshot/main/index.ts
import { app } from 'electron'
import { dirname, join } from 'node:path'
import type { ToolContext } from '@shared/types/tool-manifest'
import { showOverlays } from './overlay-controller'
import { openEditor } from './editor-controller'
import { captureFullscreenAtCursor } from './fullscreen'
import { ensureScreenRecording, openPermissionPane } from '@main/permissions'
import { imageToCss } from './dpi'

export async function initScreenshotTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('screenshot tool init')

  const defaultSaveDir = join(app.getPath('pictures'), 'max-tools')
  const defaultTemplate = 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}'

  function getSaveDir(): string {
    // Prefer the directory the user last saved into, fall back to the
    // user-configured saveDir setting, then the built-in default.
    return (
      ctx.store.get<string>('lastSaveDir', '') ||
      ctx.store.get<string>('saveDir', '') ||
      defaultSaveDir
    )
  }
  function getTemplate(): string {
    return ctx.store.get<string>('filenameTemplate', '') || defaultTemplate
  }
  function rememberSaveDir(savedPath: string): void {
    ctx.store.set('lastSaveDir', dirname(savedPath))
  }

  async function checkPermissionWithUserPrompt(): Promise<boolean> {
    if (await ensureScreenRecording()) return true
    const { dialog, app } = await import('electron')
    const isDev = !app.isPackaged
    const r = await dialog.showMessageBox({
      type: 'info',
      title: '需要屏幕录制权限',
      message: '截图功能需要屏幕录制权限',
      detail: isDev
        ? '点击"打开系统设置"，在 "隐私与安全性 → 屏幕录制" 列表里找到 "Electron"（开发模式下显示为 Electron 而不是 Max Tools），打开开关，然后重启本应用。\n\n如果列表里没有 Electron 条目，请重试一次截图触发系统添加它。'
        : '点击"打开系统设置"，在 "隐私与安全性 → 屏幕录制" 列表里找到 "Max Tools"，打开开关，然后重启本应用。',
      buttons: ['打开系统设置', '取消'],
      defaultId: 0,
      cancelId: 1,
    })
    if (r.response === 0) openPermissionPane('screen')
    return false
  }

  async function runRegionFlow(): Promise<void> {
    ctx.log.info('runRegionFlow triggered')
    if (!(await checkPermissionWithUserPrompt())) return
    const r = await showOverlays()
    if (
      r.cancelled ||
      !r.croppedPath ||
      !r.region ||
      !r.displayBounds ||
      r.width == null ||
      r.height == null
    ) {
      return
    }
    const { screen } = await import('electron')
    const display = screen.getDisplayMatching(r.displayBounds)
    const dpr = display.scaleFactor
    const cssRegion = imageToCss(r.region, dpr)
    await openEditor({
      imagePath: r.croppedPath,
      pixelWidth: r.width,
      pixelHeight: r.height,
      windowBounds: {
        x: r.displayBounds.x + cssRegion.x,
        y: r.displayBounds.y + cssRegion.y,
        width: cssRegion.w,
        height: cssRegion.h,
      },
      saveDir: getSaveDir(),
      filenameTemplate: getTemplate(),
      onSaved: rememberSaveDir,
    })
  }

  async function runFullscreenFlow(): Promise<void> {
    ctx.log.info('runFullscreenFlow triggered')
    if (!(await checkPermissionWithUserPrompt())) return
    const r = await captureFullscreenAtCursor()
    if (!r) return
    await openEditor({
      imagePath: r.imagePath,
      pixelWidth: r.width,
      pixelHeight: r.height,
      windowBounds: r.displayBounds,
      saveDir: getSaveDir(),
      filenameTemplate: getTemplate(),
      onSaved: rememberSaveDir,
    })
  }

  // 注册快捷键（store 中已保存的优先，否则用默认）
  const regionCombo =
    ctx.store.get<string>('shortcuts.region', '') || 'CommandOrControl+Shift+A'
  const fullscreenCombo =
    ctx.store.get<string>('shortcuts.fullscreen', '') || 'CommandOrControl+Shift+F'

  const r1 = await ctx.registerShortcut('region', regionCombo, () => {
    runRegionFlow().catch((e) => ctx.log.error(e))
  })
  if (!r1.ok) ctx.log.warn('region shortcut registration failed:', r1.reason)

  const r2 = await ctx.registerShortcut('fullscreen', fullscreenCombo, () => {
    runFullscreenFlow().catch((e) => ctx.log.error(e))
  })
  if (!r2.ok) ctx.log.warn('fullscreen shortcut registration failed:', r2.reason)
}
