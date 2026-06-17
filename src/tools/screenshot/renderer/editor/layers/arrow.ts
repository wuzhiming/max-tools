// src/tools/screenshot/renderer/editor/layers/arrow.ts
import { registerLayerRenderer } from '../canvas/draw'

registerLayerRenderer('arrow', (ctx, layer) => {
  const { from, to, stroke, strokeWidth } = layer
  ctx.strokeStyle = stroke
  ctx.fillStyle = stroke
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const head = Math.max(12, strokeWidth * 3)
  const a1 = angle + Math.PI - Math.PI / 6
  const a2 = angle + Math.PI + Math.PI / 6
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x + head * Math.cos(a1), to.y + head * Math.sin(a1))
  ctx.lineTo(to.x + head * Math.cos(a2), to.y + head * Math.sin(a2))
  ctx.closePath()
  ctx.fill()
})
