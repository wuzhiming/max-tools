// src/tools/screenshot/renderer/overlay/useImagePixels.ts
import { useEffect, useState } from 'react'

export interface ImagePixels {
  width: number
  height: number
  data: Uint8ClampedArray // RGBA
}

export function useImagePixels(filePath: string | null): ImagePixels | null {
  const [pixels, setPixels] = useState<ImagePixels | null>(null)
  useEffect(() => {
    if (!filePath) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setPixels({ width: d.width, height: d.height, data: d.data })
    }
    img.src = `file://${filePath}`
  }, [filePath])
  return pixels
}

export function pickColor(p: ImagePixels, xImg: number, yImg: number): { r: number; g: number; b: number; hex: string } | null {
  const x = Math.max(0, Math.min(p.width - 1, Math.round(xImg)))
  const y = Math.max(0, Math.min(p.height - 1, Math.round(yImg)))
  const i = (y * p.width + x) * 4
  const r = p.data[i], g = p.data[i + 1], b = p.data[i + 2]
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
  return { r, g, b, hex }
}
