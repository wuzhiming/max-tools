// src/tools/screenshot/renderer/editor/layers/blur.ts
import { registerLayerRenderer } from '../canvas/draw'
import { normalizeRect } from './rect'

registerLayerRenderer('blur', (ctx, layer) => {
  if (layer.region.kind === 'rect') {
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
  } else if (layer.region.kind === 'pen') {
    const points = layer.region.points
    if (points.length === 0) return
    const r = layer.region.radius
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of points) {
      if (p.x - r < minX) minX = p.x - r
      if (p.y - r < minY) minY = p.y - r
      if (p.x + r > maxX) maxX = p.x + r
      if (p.y + r > maxY) maxY = p.y + r
    }
    minX = Math.max(0, Math.floor(minX))
    minY = Math.max(0, Math.floor(minY))
    maxX = Math.min(ctx.canvas.width, Math.ceil(maxX))
    maxY = Math.min(ctx.canvas.height, Math.ceil(maxY))
    const w = maxX - minX
    const h = maxY - minY
    if (w <= 0 || h <= 0) return
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    const tctx = tmp.getContext('2d')!
    tctx.drawImage(ctx.canvas, minX, minY, w, h, 0, 0, w, h)
    const blurred = document.createElement('canvas')
    blurred.width = w
    blurred.height = h
    const bctx = blurred.getContext('2d')!
    bctx.filter = `blur(${layer.blurRadius}px)`
    bctx.drawImage(tmp, 0, 0)
    ctx.save()
    ctx.beginPath()
    for (const p of points) {
      ctx.moveTo(p.x + r, p.y)
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    }
    ctx.clip()
    ctx.drawImage(blurred, minX, minY)
    ctx.restore()
  }
})
