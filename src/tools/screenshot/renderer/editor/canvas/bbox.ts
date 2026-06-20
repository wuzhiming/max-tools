// src/tools/screenshot/renderer/editor/canvas/bbox.ts
import type { Layer, Point } from '../layers/types'
import { normalizeRect } from '../layers/rect'
import { measureTextLines } from './measure'

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export function normalizeBBox(b: BBox): BBox {
  let { x, y, w, h } = b
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  return { x, y, w, h }
}

function pointsBBox(pts: Point[], pad = 0): BBox {
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

export function getLayerBBox(l: Layer): BBox | null {
  if (l.type === 'rect' || l.type === 'ellipse') return normalizeRect(l.bounds)
  if (l.type === 'mosaic' || l.type === 'blur') {
    if (l.region.kind === 'rect') return normalizeRect(l.region.bounds)
    return pointsBBox(l.region.points, l.region.radius)
  }
  if (l.type === 'arrow') return pointsBBox([l.from, l.to], (l.strokeWidth ?? 0) / 2)
  if (l.type === 'pen') return pointsBBox(l.points, (l.strokeWidth ?? 0) / 2)
  if (l.type === 'text') {
    const { w, h } = measureTextLines(l.content, l.fontSize, l.fontFamily)
    return { x: l.pos.x, y: l.pos.y, w, h }
  }
  return null
}
