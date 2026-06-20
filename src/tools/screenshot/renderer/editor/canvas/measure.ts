// src/tools/screenshot/renderer/editor/canvas/measure.ts
//
// Shared, cached 2D context for text measurement. Built on demand the first
// time the renderer needs to size a text glyph (selection bbox / hit-test) so
// we don't pay the `document.createElement` cost on every render pass.

let cachedCtx: CanvasRenderingContext2D | null = null

function ctx(): CanvasRenderingContext2D {
  if (!cachedCtx) {
    const c = document.createElement('canvas')
    cachedCtx = c.getContext('2d')!
  }
  return cachedCtx
}

export function measureTextLines(
  content: string,
  fontSize: number,
  fontFamily: string,
): { w: number; h: number } {
  const c = ctx()
  c.font = `${fontSize}px ${fontFamily}`
  const lines = content.length > 0 ? content.split('\n') : ['']
  let maxW = 0
  for (const line of lines) {
    // Empty lines still need a small placeholder width so the bbox doesn't
    // collapse to zero — use one character of the font as a lower bound.
    const m = c.measureText(line.length > 0 ? line : ' ')
    if (m.width > maxW) maxW = m.width
  }
  const h = Math.max(1, lines.length) * fontSize * 1.2
  return { w: maxW, h }
}
