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
 * Inline text editor. Visually mimics a snipping tool's text affordance:
 * a thin bordered box that shows exactly what will be drawn on the canvas
 * after commit (same fontSize, same color, no chrome that survives).
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
        minWidth: Math.max(40, fontSize * 2),
        minHeight: Math.max(fontSize * 1.4, 20),
        padding: '1px 3px',
        margin: 0,
        fontSize,
        lineHeight: 1.2,
        color,
        fontFamily,
        background: 'transparent',
        border: '1px dashed rgba(0, 122, 255, 0.85)',
        borderRadius: 2,
        outline: 'none',
        resize: 'both',
        caretColor: color,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
        whiteSpace: 'pre',
        overflow: 'hidden',
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
