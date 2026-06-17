// src/tools/screenshot/renderer/overlay/Magnifier.tsx
import React, { useEffect, useRef } from 'react'
import type { ImagePixels } from './useImagePixels'

interface Props {
  pixels: ImagePixels | null
  cssX: number
  cssY: number
  dpr: number
  color: { hex: string; r: number; g: number; b: number } | null
}

const BOX = 120
const GRID = 11 // 11x11 像素方块
const CELL = BOX / GRID

export function Magnifier({ pixels, cssX, cssY, dpr, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!pixels) return
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, BOX, BOX)
    const cx = Math.round(cssX * dpr)
    const cy = Math.round(cssY * dpr)
    const half = Math.floor(GRID / 2)
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = cx + dx
        const py = cy + dy
        if (px < 0 || py < 0 || px >= pixels.width || py >= pixels.height) {
          ctx.fillStyle = '#000'
        } else {
          const i = (py * pixels.width + px) * 4
          ctx.fillStyle = `rgb(${pixels.data[i]},${pixels.data[i+1]},${pixels.data[i+2]})`
        }
        ctx.fillRect((dx + half) * CELL, (dy + half) * CELL, CELL, CELL)
      }
    }
    // 中心十字标
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(half * CELL, half * CELL, CELL, CELL)
  }, [pixels, cssX, cssY, dpr])

  // 智能定位：避开边缘
  const off = 16
  const right = window.innerWidth - cssX - BOX - off
  const bottom = window.innerHeight - cssY - BOX - 60 - off
  const left = right > 0 ? cssX + off : cssX - BOX - off
  const top = bottom > 0 ? cssY + off : cssY - BOX - 60 - off

  return (
    <div style={{ position: 'fixed', left, top, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        width={BOX}
        height={BOX}
        style={{ background: '#222', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
      />
      <div className="overlay-info" style={{ position: 'static', marginTop: 4, textAlign: 'center', width: BOX }}>
        {color ? `${color.hex}  rgb(${color.r},${color.g},${color.b})` : ''}
      </div>
    </div>
  )
}
