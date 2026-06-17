import { describe, it, expect } from 'vitest'
import { createHistory, pushSnapshot, undo, redo } from '@tools/screenshot/renderer/editor/state/history'

describe('history', () => {
  it('starts empty (undo no-op)', () => {
    const h = createHistory<string[]>(['a'])
    expect(undo(h).current).toEqual(['a'])
  })
  it('push & undo', () => {
    let h = createHistory<string[]>(['a'])
    h = pushSnapshot(h, ['a', 'b'])
    h = pushSnapshot(h, ['a', 'b', 'c'])
    expect(undo(h).current).toEqual(['a', 'b'])
    expect(undo(undo(h)).current).toEqual(['a'])
  })
  it('redo restores forward', () => {
    let h = createHistory<string[]>(['a'])
    h = pushSnapshot(h, ['a', 'b'])
    h = undo(h)
    expect(redo(h).current).toEqual(['a', 'b'])
  })
  it('push after undo clears redo stack', () => {
    let h = createHistory<string[]>(['a'])
    h = pushSnapshot(h, ['a', 'b'])
    h = undo(h)
    h = pushSnapshot(h, ['a', 'x'])
    expect(redo(h).current).toEqual(['a', 'x']) // no redo possible after divergence
  })
})
