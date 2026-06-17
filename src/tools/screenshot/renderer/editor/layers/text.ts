// src/tools/screenshot/renderer/editor/layers/text.ts
import { registerLayerRenderer } from '../canvas/draw'

registerLayerRenderer('text', (ctx, layer) => {
  ctx.font = `${layer.fontSize}px ${layer.fontFamily}`
  ctx.fillStyle = layer.color
  ctx.textBaseline = 'top'
  const lines = layer.content.split('\n')
  lines.forEach((line, i) => {
    ctx.fillText(line, layer.pos.x, layer.pos.y + i * layer.fontSize * 1.2)
  })
})
