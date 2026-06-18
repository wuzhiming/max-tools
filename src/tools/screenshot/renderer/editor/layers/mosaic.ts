// src/tools/screenshot/renderer/editor/layers/mosaic.ts
import { registerLayerRenderer } from '../canvas/draw'
import type { Rect } from './types'
import { normalizeRect } from './rect'

export interface MosaicCell {
  x: number
  y: number
  size: number
}

export function computeMosaicGrid(region: Rect, block: number): MosaicCell[] {
  const cells: MosaicCell[] = []
  const startX = Math.floor(region.x / block) * block
  const startY = Math.floor(region.y / block) * block
  const endX = Math.max(startX + block, region.x + region.w)
  const endY = Math.max(startY + block, region.y + region.h)
  for (let y = startY; y < endY; y += block) {
    for (let x = startX; x < endX; x += block) {
      cells.push({ x, y, size: block })
    }
  }
  return cells.length === 0 ? [{ x: region.x, y: region.y, size: block }] : cells
}

registerLayerRenderer('mosaic', (ctx, layer) => {
  const block = layer.blockSize
  if (layer.region.kind === 'rect') {
    const region = normalizeRect(layer.region.bounds)
    if (region.w <= 0 || region.h <= 0) return
    const data = ctx.getImageData(region.x, region.y, region.w, region.h)
    const cells = computeMosaicGrid({ x: 0, y: 0, w: region.w, h: region.h }, block)
    for (const c of cells) {
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      const x2 = Math.min(c.x + c.size, region.w)
      const y2 = Math.min(c.y + c.size, region.h)
      for (let yy = c.y; yy < y2; yy++) {
        for (let xx = c.x; xx < x2; xx++) {
          const i = (yy * region.w + xx) * 4
          r += data.data[i]
          g += data.data[i + 1]
          b += data.data[i + 2]
          n++
        }
      }
      if (n === 0) continue
      ctx.fillStyle = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`
      ctx.fillRect(region.x + c.x, region.y + c.y, c.size, c.size)
    }
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
    if (maxX <= minX || maxY <= minY) return
    const w = maxX - minX
    const h = maxY - minY
    const data = ctx.getImageData(minX, minY, w, h)
    const r2 = r * r
    const startCellX = Math.floor(minX / block) * block
    const startCellY = Math.floor(minY / block) * block
    for (let cy = startCellY; cy < maxY; cy += block) {
      for (let cx = startCellX; cx < maxX; cx += block) {
        const ccx = cx + block / 2
        const ccy = cy + block / 2
        let inside = false
        for (const p of points) {
          const dx = ccx - p.x
          const dy = ccy - p.y
          if (dx * dx + dy * dy <= r2) {
            inside = true
            break
          }
        }
        if (!inside) continue
        let sumR = 0
        let sumG = 0
        let sumB = 0
        let n = 0
        const cellRight = Math.min(cx + block, maxX)
        const cellBot = Math.min(cy + block, maxY)
        for (let yy = Math.max(cy, minY); yy < cellBot; yy++) {
          for (let xx = Math.max(cx, minX); xx < cellRight; xx++) {
            const i = ((yy - minY) * w + (xx - minX)) * 4
            sumR += data.data[i]
            sumG += data.data[i + 1]
            sumB += data.data[i + 2]
            n++
          }
        }
        if (n === 0) continue
        ctx.fillStyle = `rgb(${Math.round(sumR / n)},${Math.round(sumG / n)},${Math.round(sumB / n)})`
        ctx.fillRect(cx, cy, block, block)
      }
    }
  }
})
