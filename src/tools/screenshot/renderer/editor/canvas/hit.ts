// src/tools/screenshot/renderer/editor/canvas/hit.ts
import type { Layer, Point } from '../layers/types'
import { normalizeRect } from '../layers/rect'

const POINT_TOL = 6

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function distPointSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - a.x, py - a.y)
  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2
  if (t < 0) t = 0
  else if (t > 1) t = 1
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  return Math.hypot(px - cx, py - cy)
}

function hitPolyline(x: number, y: number, pts: Point[], halfWidth: number): boolean {
  const tol = halfWidth + POINT_TOL
  if (pts.length === 1) return Math.hypot(x - pts[0].x, y - pts[0].y) <= tol
  for (let i = 1; i < pts.length; i++) {
    if (distPointSegment(x, y, pts[i - 1], pts[i]) <= tol) return true
  }
  return false
}

export function hitTest(layers: Layer[], x: number, y: number): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (hitLayer(l, x, y)) return l
  }
  return null
}

function hitLayer(l: Layer, x: number, y: number): boolean {
  if (l.type === 'rect' || l.type === 'ellipse') {
    return inRect(x, y, normalizeRect(l.bounds))
  }
  if (l.type === 'mosaic' || l.type === 'blur') {
    if (l.region.kind === 'rect') return inRect(x, y, normalizeRect(l.region.bounds))
    return hitPolyline(x, y, l.region.points, l.region.radius)
  }
  if (l.type === 'arrow') {
    return distPointSegment(x, y, l.from, l.to) <= (l.strokeWidth ?? 0) / 2 + POINT_TOL
  }
  if (l.type === 'pen') {
    return hitPolyline(x, y, l.points, (l.strokeWidth ?? 0) / 2)
  }
  if (l.type === 'text') {
    const w = l.fontSize * Math.max(1, l.content.length) * 0.6
    const h = l.fontSize * Math.max(1, l.content.split('\n').length) * 1.2
    return x >= l.pos.x && x <= l.pos.x + w && y >= l.pos.y && y <= l.pos.y + h
  }
  return false
}
