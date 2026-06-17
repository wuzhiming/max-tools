// src/tools/screenshot/renderer/editor/canvas/CanvasView.tsx
import React, { useEffect, useRef } from 'react'
import { drawScene } from './draw'
import type { Layer } from '../layers/types'

interface Props {
  baseImage: HTMLImageElement | null
  layers: Layer[]
  width: number
  height: number
  onMouseDown?: (x: number, y: number, e: React.MouseEvent) => void
  onMouseMove?: (x: number, y: number, e: React.MouseEvent) => void
  onMouseUp?: (x: number, y: number, e: React.MouseEvent) => void
  onDblClick?: (x: number, y: number) => void
}

export function CanvasView({ baseImage, layers, width, height, onMouseDown, onMouseMove, onMouseUp, onDblClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    drawScene({ ctx, width, height, baseImage }, layers)
  }, [baseImage, layers, width, height])

  function pos(e: React.MouseEvent): [number, number] {
    const r = canvasRef.current!.getBoundingClientRect()
    return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]
  }

  return (
    <canvas
      ref={canvasRef}
      className="editor-canvas"
      width={width}
      height={height}
      style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%', maxHeight: '100%' }}
      onMouseDown={(e) => { const [x, y] = pos(e); onMouseDown?.(x, y, e) }}
      onMouseMove={(e) => { const [x, y] = pos(e); onMouseMove?.(x, y, e) }}
      onMouseUp={(e) => { const [x, y] = pos(e); onMouseUp?.(x, y, e) }}
      onDoubleClick={(e) => { const [x, y] = pos(e); onDblClick?.(x, y) }}
    />
  )
}
