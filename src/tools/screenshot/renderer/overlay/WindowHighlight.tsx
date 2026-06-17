// src/tools/screenshot/renderer/overlay/WindowHighlight.tsx
import React from 'react'
import type { WindowGeometry } from '@shared/types/screenshot-ipc'

interface Props {
  win: WindowGeometry | null
}

export function WindowHighlight({ win }: Props) {
  if (!win) return null
  return (
    <div
      className="overlay-window-hilite"
      style={{
        left: win.bounds.x,
        top: win.bounds.y,
        width: win.bounds.width,
        height: win.bounds.height,
      }}
    />
  )
}

export function findHoveredWindow(windows: WindowGeometry[], x: number, y: number): WindowGeometry | null {
  // 取面积最小的命中窗口（典型"前置"判断的近似）
  const candidates = windows.filter(
    (w) => x >= w.bounds.x && x < w.bounds.x + w.bounds.width
        && y >= w.bounds.y && y < w.bounds.y + w.bounds.height,
  )
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height)
  return candidates[0]
}
