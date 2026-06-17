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
  if (layer.region.kind !== 'rect') return
  const region = normalizeRect(layer.region.bounds)
  if (region.w <= 0 || region.h <= 0) return
  const block = layer.blockSize
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
})
