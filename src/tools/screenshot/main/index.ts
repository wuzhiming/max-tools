// src/tools/screenshot/main/index.ts
import { app, screen } from 'electron'
import { dirname, join } from 'node:path'
import type { ToolContext } from '@shared/types/tool-manifest'
import { showOverlays } from './overlay-controller'
import { openEditor } from './editor-controller'
import { captureFullscreenAtCursor } from './fullscreen'
import { runScrollCapture } from './scroll-capture-controller'
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
    const display = screen.getDisplayMatching(r.displayBounds)
    const dpr = display.scaleFactor
    const cssRegion = imageToCss(r.region, dpr)
    const reason = await openEditor({
      imagePath: r.croppedPath,
      pixelWidth: r.width,
      pixelHeight: r.height,
      windowBounds: {
        x: r.displayBounds.x + cssRegion.x,
        y: r.displayBounds.y + cssRegion.y,
        width: cssRegion.w,
        height: cssRegion.h,
      },
      filenameTemplate: getTemplate(),
      resolveSaveDir: getSaveDir,
      onSaved: rememberSaveDir,
    })
    // If the user hit the long-screenshot button on the editor toolbar the
    // editor closes and we kick off scroll capture on the same region, then
    // open a new editor on the stitched result.
    if (reason === 'scroll-requested') {
      await scrollCaptureFromSelection(r)
    }
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
      filenameTemplate: getTemplate(),
      resolveSaveDir: getSaveDir,
      onSaved: rememberSaveDir,
    })
  }

  /** Shared tail of both the dedicated scroll shortcut and the
   *  in-overlay scroll-mode button. Takes an already-resolved overlay
   *  selection and runs polling + stitch + editor. */
  async function scrollCaptureFromSelection(sel: {
    region?: { x: number; y: number; w: number; h: number }
    displayBounds?: { x: number; y: number; width: number; height: number }
    width?: number
    height?: number
  }): Promise<void> {
    if (!sel.region || !sel.displayBounds || sel.width == null || sel.height == null) return
    const display = screen.getDisplayMatching(sel.displayBounds)
    const dpr = display.scaleFactor
    const cssRegion = imageToCss(sel.region, dpr)
    const globalRegion = {
      x: sel.displayBounds.x + cssRegion.x,
      y: sel.displayBounds.y + cssRegion.y,
      width: cssRegion.w,
      height: cssRegion.h,
    }
    const allDisplays = screen.getAllDisplays()
    const displayId = allDisplays.findIndex((d) => d.id === display.id)
    const result = await runScrollCapture({
      cssRegion: globalRegion,
      displayId: displayId >= 0 ? displayId : 0,
    })
    if (result.cancelled || !result.outputPath || result.pixelWidth == null || result.pixelHeight == null) {
      return
    }
    const maxH = Math.round(display.workArea.height * 0.8)
    const cssW = Math.round(result.pixelWidth / dpr)
    const cssH = Math.round(result.pixelHeight / dpr)
    const windowH = Math.min(cssH, maxH)
    const windowBounds = {
      x: globalRegion.x,
      y: Math.max(display.workArea.y, globalRegion.y),
      width: cssW,
      height: windowH,
    }
    await openEditor({
      imagePath: result.outputPath,
      pixelWidth: result.pixelWidth,
      pixelHeight: result.pixelHeight,
      windowBounds,
      filenameTemplate: getTemplate(),
      resolveSaveDir: getSaveDir,
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
