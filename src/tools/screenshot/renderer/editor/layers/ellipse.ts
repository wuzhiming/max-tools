// src/tools/screenshot/renderer/editor/layers/ellipse.ts
import { registerLayerRenderer } from '../canvas/draw'
import { normalizeRect } from './rect'

registerLayerRenderer('ellipse', (ctx, layer) => {
  const r = normalizeRect(layer.bounds)
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  ctx.lineWidth = layer.strokeWidth
  ctx.strokeStyle = layer.stroke
  ctx.beginPath()
  ctx.ellipse(cx, cy, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
  if (layer.fill) {
    ctx.fillStyle = layer.fill
    ctx.fill()
  }
  ctx.stroke()
})
