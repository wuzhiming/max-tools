// src/tools/screenshot/renderer/editor/layers/pen.ts
import { registerLayerRenderer } from '../canvas/draw'

registerLayerRenderer('pen', (ctx, layer) => {
  if (layer.points.length === 0) return
  ctx.strokeStyle = layer.stroke
  ctx.lineWidth = layer.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(layer.points[0].x, layer.points[0].y)
  for (let i = 1; i < layer.points.length; i++) {
    ctx.lineTo(layer.points[i].x, layer.points[i].y)
  }
  ctx.stroke()
})
