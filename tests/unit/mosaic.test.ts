// tests/unit/mosaic.test.ts
import { describe, it, expect } from 'vitest'
import { computeMosaicGrid } from '@tools/screenshot/renderer/editor/layers/mosaic'

describe('computeMosaicGrid', () => {
  it('returns aligned grid covering the region', () => {
    const cells = computeMosaicGrid({ x: 10, y: 20, w: 30, h: 24 }, 8)
    expect(cells.length).toBeGreaterThan(0)
    cells.forEach((c) => {
      expect(c.size).toBe(8)
    })
    const first = cells[0]
    expect(first.x % 8).toBe(0)
    expect(first.y % 8).toBe(0)
  })
  it('clamps tiny region to at least one cell', () => {
    const cells = computeMosaicGrid({ x: 0, y: 0, w: 1, h: 1 }, 16)
    expect(cells.length).toBe(1)
  })
})
