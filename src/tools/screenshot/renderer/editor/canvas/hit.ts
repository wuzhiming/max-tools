// src/tools/screenshot/renderer/editor/canvas/hit.ts
import type { Layer } from '../layers/types'
import { normalizeRect } from '../layers/rect'

export function hitTest(layers: Layer[], x: number, y: number): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (l.type === 'rect' || l.type === 'ellipse') {
      const r = normalizeRect(l.bounds)
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return l
    } else if ((l.type === 'mosaic' || l.type === 'blur') && l.region.kind === 'rect') {
      const r = normalizeRect(l.region.bounds)
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return l
    } else if (l.type === 'text') {
      const w = l.fontSize * l.content.length * 0.6
      const h = l.fontSize * l.content.split('\n').length * 1.2
      if (x >= l.pos.x && x <= l.pos.x + w && y >= l.pos.y && y <= l.pos.y + h) return l
    }
  }
  return null
}
