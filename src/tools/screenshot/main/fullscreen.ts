// src/tools/screenshot/main/fullscreen.ts
import { screen } from 'electron'
import { captureSingleDisplay } from './capture'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.fullscreen')

export interface FullscreenResult {
  imagePath: string
  width: number
  height: number
  displayBounds: { x: number; y: number; width: number; height: number }
}

export async function captureFullscreenAtCursor(): Promise<FullscreenResult | null> {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const idx = screen.getAllDisplays().indexOf(display)
  if (idx < 0) {
    log.error('cannot resolve display index for cursor')
    return null
  }
  const cap = await captureSingleDisplay(idx)
  return {
    imagePath: cap.imagePath,
    width: cap.pixelWidth,
    height: cap.pixelHeight,
    displayBounds: display.bounds,
  }
}
