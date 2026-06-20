// src/tools/screenshot/renderer/editor/TextOverlay.tsx
import React, { useEffect, useRef } from 'react'

interface Props {
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  onCommit: (text: string) => void
  onCancel: () => void
}

/**
 * Inline text editor. Zero border + zero padding so the textarea's first
 * glyph lands at the exact pixel the user clicked — when the user hits
 * Enter, the canvas-side {@link layers/text.ts} drawer paints at the same
 * pos.x/pos.y, so the glyph doesn't visually jump on commit.
 *
 * The visible frame is an `outline` (painted outside the box, doesn't
 * affect layout) plus a faint white halo so the frame is legible against
 * any wallpaper colour.
 */
export function TextOverlay({ x, y, fontSize, color, fontFamily, onCommit, onCancel }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [])
  return (
    <textarea
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        minWidth: Math.max(20, fontSize * 1.2),
        minHeight: Math.max(fontSize * 1.2, 16),
        padding: 0,
        margin: 0,
        boxSizing: 'border-box',
        fontSize,
        lineHeight: 1.2,
        color,
        fontFamily,
        background: 'transparent',
        border: 'none',
        outline: '1px dashed rgba(0, 122, 255, 0.85)',
        outlineOffset: '1px',
        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.55)',
        caretColor: color,
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre',
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onCommit((e.target as HTMLTextAreaElement).value)
        }
      }}
      onBlur={(e) => onCommit(e.target.value)}
    />
  )
}
