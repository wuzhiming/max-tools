import { describe, it, expect } from 'vitest'
import { validateCropRegion } from '@tools/screenshot/main/crop'

describe('validateCropRegion', () => {
  it('passes valid rect', () => {
    expect(() => validateCropRegion({ x: 0, y: 0, w: 10, h: 10 }, 100, 100)).not.toThrow()
  })
  it('throws when zero size', () => {
    expect(() => validateCropRegion({ x: 10, y: 10, w: 0, h: 5 }, 100, 100)).toThrow()
  })
  it('throws when out of bounds', () => {
    expect(() => validateCropRegion({ x: 90, y: 0, w: 20, h: 10 }, 100, 100)).toThrow()
  })
  it('throws on negative origin', () => {
    expect(() => validateCropRegion({ x: -1, y: 0, w: 10, h: 10 }, 100, 100)).toThrow()
  })
})
