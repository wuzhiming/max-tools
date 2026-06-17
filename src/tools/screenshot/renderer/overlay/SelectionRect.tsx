// src/tools/screenshot/renderer/overlay/SelectionRect.tsx
import React from 'react'
import type { Rect } from '@tools/screenshot/main/dpi'

interface Props {
  rect: Rect | null
}

export function SelectionRect({ rect }: Props) {
  if (!rect) return null
  // 把可能为负的尺寸归一化只为展示
  const { x, y, w, h } = rect
  const left = w < 0 ? x + w : x
  const top = h < 0 ? y + h : y
  const width = Math.abs(w)
  const height = Math.abs(h)
  return (
    <div className="overlay-selection" style={{ left, top, width, height }} />
  )
}
