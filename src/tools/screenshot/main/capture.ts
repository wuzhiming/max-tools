import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { screen, type Display } from 'electron'
import { createLogger } from '@main/logger'

const execFileP = promisify(execFile)
const log = createLogger('screenshot.capture')

export interface CapturedDisplay {
  display: Display
  imagePath: string
  pixelWidth: number    // 物理像素
  pixelHeight: number
}

/**
 * 对每块显示器调用 macOS 自带的 `screencapture` CLI 抓屏。
 * `-x` 静音；`-D <displayId>` 指定显示器；`-t png` 输出 png。
 * `screencapture` 的 -D 参数从 1 开始，与 Electron Display 的顺序对应。
 * 我们直接按 screen.getAllDisplays() 顺序枚举并传 1..N。
 */
export async function captureAllDisplays(): Promise<CapturedDisplay[]> {
  const displays = screen.getAllDisplays()
  const ts = Date.now()

  const results = await Promise.all(
    displays.map(async (display, idx) => {
      const imagePath = join(tmpdir(), `maxtools-shot-${ts}-${idx}.png`)
      try {
        await execFileP('/usr/sbin/screencapture', [
          '-x',
          '-D', String(idx + 1),
          '-t', 'png',
          imagePath,
        ], { timeout: 5000 })
      } catch (err) {
        log.error('screencapture failed for display', idx, err)
        throw err
      }
      // 物理像素 = CSS 尺寸 * 缩放
      const { width, height } = display.size
      const dpr = display.scaleFactor
      return {
        display,
        imagePath,
        pixelWidth: Math.round(width * dpr),
        pixelHeight: Math.round(height * dpr),
      }
    }),
  )
  log.info(`captured ${results.length} displays in ${Date.now() - ts}ms`)
  return results
}

export async function captureSingleDisplay(displayIndex: number): Promise<CapturedDisplay> {
  const displays = screen.getAllDisplays()
  const d = displays[displayIndex]
  if (!d) throw new Error(`display index ${displayIndex} out of range`)
  const ts = Date.now()
  const imagePath = join(tmpdir(), `maxtools-fs-${ts}.png`)
  await execFileP('/usr/sbin/screencapture', [
    '-x', '-D', String(displayIndex + 1), '-t', 'png', imagePath,
  ], { timeout: 5000 })
  const { width, height } = d.size
  const dpr = d.scaleFactor
  return {
    display: d,
    imagePath,
    pixelWidth: Math.round(width * dpr),
    pixelHeight: Math.round(height * dpr),
  }
}
