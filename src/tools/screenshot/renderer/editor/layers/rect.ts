// src/tools/screenshot/renderer/editor/layers/rect.ts
import { registerLayerRenderer } from '../canvas/draw'
import type { Rect } from './types'

export function normalizeRect(r: Rect): Rect {
  let { x, y, w, h } = r
  if (w < 0) {
    x += w
    w = -w
  }
  if (h < 0) {
    y += h
    h = -h
  }
  return { x, y, w, h }
}

registerLayerRenderer('rect', (ctx, layer) => {
  const r = normalizeRect(layer.bounds)
  ctx.lineWidth = layer.strokeWidth
  ctx.strokeStyle = layer.stroke
  if (layer.fill) {
    ctx.fillStyle = layer.fill
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }
  ctx.strokeRect(r.x, r.y, r.w, r.h)
})
