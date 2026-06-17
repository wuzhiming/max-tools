import sharp from 'sharp'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Rect } from './dpi'

export function validateCropRegion(r: Rect, imgW: number, imgH: number): void {
  if (r.w <= 0 || r.h <= 0) throw new Error(`invalid crop: zero size (${r.w}x${r.h})`)
  if (r.x < 0 || r.y < 0) throw new Error(`invalid crop: negative origin (${r.x},${r.y})`)
  if (r.x + r.w > imgW || r.y + r.h > imgH) {
    throw new Error(`invalid crop: out of bounds (${r.x + r.w},${r.y + r.h} vs ${imgW}x${imgH})`)
  }
}

export interface CropResult {
  outputPath: string
  width: number
  height: number
}

export async function cropImage(
  inputPath: string,
  regionInImagePixels: Rect,
  imgW: number,
  imgH: number,
): Promise<CropResult> {
  validateCropRegion(regionInImagePixels, imgW, imgH)
  const out = join(tmpdir(), `maxtools-crop-${Date.now()}.png`)
  await sharp(inputPath)
    .extract({
      left: Math.round(regionInImagePixels.x),
      top: Math.round(regionInImagePixels.y),
      width: Math.round(regionInImagePixels.w),
      height: Math.round(regionInImagePixels.h),
    })
    .png()
    .toFile(out)
  return { outputPath: out, width: regionInImagePixels.w, height: regionInImagePixels.h }
}
