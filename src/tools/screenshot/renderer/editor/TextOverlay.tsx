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
    const id = setTimeout(() => ref.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [])
  return (
    <textarea
      ref={ref}
      placeholder="输入文字，Cmd+Enter 提交，Esc 取消"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        minWidth: 160,
        minHeight: Math.max(28, fontSize * 1.6),
        padding: '4px 8px',
        fontSize,
        color,
        fontFamily,
        background: 'rgba(0, 0, 0, 0.65)',
        border: '1px dashed rgba(255,255,255,0.8)',
        borderRadius: 4,
        outline: 'none',
        resize: 'both',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
