import { describe, it, expect } from 'vitest'
import { renderFilenameTemplate } from '@tools/screenshot/main/filename'

describe('renderFilenameTemplate', () => {
  const fixedDate = new Date('2026-06-17T21:30:45')

  it('substitutes yyyy/MM/dd/HH/mm/ss', () => {
    const r = renderFilenameTemplate('shot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}', fixedDate)
    expect(r).toBe('shot-2026-06-17-21-30-45')
  })

  it('pads single digits with leading zero', () => {
    const d = new Date('2026-01-02T03:04:05')
    const r = renderFilenameTemplate('{yyyy}-{MM}-{dd}T{HH}:{mm}:{ss}', d)
    expect(r).toBe('2026-01-02T03:04:05')
  })

  it('leaves unknown tokens intact', () => {
    expect(renderFilenameTemplate('foo-{bar}', fixedDate)).toBe('foo-{bar}')
  })

  it('falls back to a default when template empty', () => {
    expect(renderFilenameTemplate('', fixedDate)).toMatch(/^screenshot-\d{4}-\d{2}-\d{2}/)
  })

  it('sanitizes path separators', () => {
    expect(renderFilenameTemplate('foo/bar', fixedDate)).toBe('foo-bar')
  })
})
