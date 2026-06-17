import { describe, it, expect } from 'vitest'
import { cssToImage, imageToCss, clampRectInBounds } from '@tools/screenshot/main/dpi'

describe('dpi', () => {
  it('cssToImage multiplies by dpr', () => {
    expect(cssToImage({ x: 100, y: 200, w: 50, h: 60 }, 2)).toEqual({ x: 200, y: 400, w: 100, h: 120 })
  })
  it('imageToCss divides by dpr (round)', () => {
    expect(imageToCss({ x: 201, y: 401, w: 101, h: 121 }, 2)).toEqual({ x: 101, y: 201, w: 51, h: 61 })
  })
  it('cssToImage at dpr=1 is identity', () => {
    const r = { x: 10, y: 20, w: 30, h: 40 }
    expect(cssToImage(r, 1)).toEqual(r)
  })
  it('clampRectInBounds keeps rect inside', () => {
    expect(clampRectInBounds({ x: -10, y: -5, w: 100, h: 50 }, 80, 40)).toEqual({ x: 0, y: 0, w: 80, h: 40 })
  })
  it('clampRectInBounds normalizes negative w/h (drag-up-left)', () => {
    expect(clampRectInBounds({ x: 50, y: 50, w: -30, h: -20 }, 100, 100)).toEqual({ x: 20, y: 30, w: 30, h: 20 })
  })
})
