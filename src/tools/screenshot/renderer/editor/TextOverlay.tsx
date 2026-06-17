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

export function TextOverlay({ x, y, fontSize, color, fontFamily, onCommit, onCancel }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <textarea
      ref={ref}
      className="text-edit-input"
      style={{ left: x, top: y, fontSize, color, fontFamily }}
      onKeyDown={(e) => {
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
