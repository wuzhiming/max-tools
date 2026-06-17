// src/tools/screenshot/renderer/editor/layers/blur.ts
import { registerLayerRenderer } from '../canvas/draw'
import { normalizeRect } from './rect'

registerLayerRenderer('blur', (ctx, layer) => {
  if (layer.region.kind !== 'rect') return
  const region = normalizeRect(layer.region.bounds)
  if (region.w <= 0 || region.h <= 0) return
  const tmp = document.createElement('canvas')
  tmp.width = region.w
  tmp.height = region.h
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(ctx.canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)
  ctx.save()
  ctx.filter = `blur(${layer.blurRadius}px)`
  ctx.drawImage(tmp, region.x, region.y)
  ctx.restore()
})
