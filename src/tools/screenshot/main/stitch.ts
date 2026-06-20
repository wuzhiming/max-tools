// src/tools/screenshot/main/stitch.ts
//
// Glue a sequence of region screenshots (each the same width, captured as
// the user scrolls the underlying content) into one tall image.
//
// Algorithm v0:
//   1. Accumulate frames one at a time on top of an "accumulator" buffer
//      (raw RGBA + matching grayscale buffer used only for matching).
//   2. For each new frame, take the bottom `TEMPLATE_H` rows of the
//      accumulator's grayscale and slide that template down the new frame
//      looking for the lowest sum-of-squared-differences. The y where the
//      match wins tells us how much new content there is *below* it.
//   3. If the best match is "good enough" and there's any new content,
//      copy those new rows from the new frame onto the accumulator.
//
// This handles the common case (browsers / docs scrolled down). It does
// NOT yet detect sticky footers (they'd be duplicated every frame). v0
// shipping intentionally — iterate based on real failures.

import sharp from 'sharp'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.stitch')

/** How many rows we use as the matching template. Bigger = more robust
 *  match, slower; smaller = faster, easier to mis-align. 60 has worked
 *  fine in eyeballed testing. */
const TEMPLATE_H = 60

/** Best-match score threshold (per-pixel mean squared diff in 0-255²).
 *  Above this, the frame is considered too different — probably a layout
 *  shift, modal opening, lazy-load — and we skip it. */
const MAX_MEAN_SQ_DIFF = 600

/** Minimum new-content height to bother appending; below this is usually
 *  scroll noise / inertia / sub-pixel jitter. */
const MIN_APPEND_H = 4

interface ColorBuf {
  width: number
  height: number
  /** RGBA, width * height * 4 bytes */
  data: Buffer
}

interface GrayBuf {
  width: number
  height: number
  /** width * height bytes */
  data: Buffer
}

async function loadColor(path: string): Promise<ColorBuf> {
  const img = sharp(path).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height, data }
}

async function loadGray(path: string): Promise<GrayBuf> {
  const img = sharp(path).grayscale()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height, data }
}

/** Slide the bottom TEMPLATE_H rows of `acc` down through `next` and
 *  return the (y, score) of the best match. */
function findBestMatchY(acc: GrayBuf, next: GrayBuf): { y: number; meanSqDiff: number } {
  if (acc.width !== next.width) {
    throw new Error(`stitch: width mismatch ${acc.width} vs ${next.width}`)
  }
  const W = acc.width
  const K = Math.min(TEMPLATE_H, acc.height, next.height)
  const aData = acc.data
  const nData = next.data
  const aOffset = (acc.height - K) * W

  let bestY = 0
  let bestSum = Infinity
  const maxY = next.height - K
  for (let y = 0; y <= maxY; y++) {
    let sum = 0
    const nOffset = y * W
    // One bailout: if sum already exceeds bestSum, no point continuing.
    for (let i = 0; i < K; i++) {
      const rowA = aOffset + i * W
      const rowN = nOffset + i * W
      for (let j = 0; j < W; j++) {
        const d = aData[rowA + j] - nData[rowN + j]
        sum += d * d
      }
      if (sum >= bestSum) break
    }
    if (sum < bestSum) {
      bestSum = sum
      bestY = y
    }
  }
  return { y: bestY, meanSqDiff: bestSum / (K * W) }
}

/** Append rows [startRow, endRowExclusive) of `src` to the bottom of `dst`. */
function appendRows(dst: ColorBuf, src: ColorBuf, startRow: number, endRow: number): ColorBuf {
  const W = dst.width
  const newRows = endRow - startRow
  if (newRows <= 0) return dst
  const out = Buffer.allocUnsafe((dst.height + newRows) * W * 4)
  dst.data.copy(out, 0)
  src.data.copy(
    out,
    dst.height * W * 4,
    startRow * W * 4,
    endRow * W * 4,
  )
  return { width: W, height: dst.height + newRows, data: out }
}

function appendRowsGray(dst: GrayBuf, src: GrayBuf, startRow: number, endRow: number): GrayBuf {
  const W = dst.width
  const newRows = endRow - startRow
  if (newRows <= 0) return dst
  const out = Buffer.allocUnsafe((dst.height + newRows) * W)
  dst.data.copy(out, 0)
  src.data.copy(out, dst.height * W, startRow * W, endRow * W)
  return { width: W, height: dst.height + newRows, data: out }
}

export interface StitchResult {
  outputPath: string
  width: number
  height: number
  framesUsed: number
  framesSkipped: number
}

export async function stitchFrames(framePaths: string[]): Promise<StitchResult> {
  if (framePaths.length === 0) throw new Error('stitch: no frames')

  let accColor = await loadColor(framePaths[0])
  let accGray = await loadGray(framePaths[0])
  let used = 1
  let skipped = 0

  for (let i = 1; i < framePaths.length; i++) {
    const path = framePaths[i]
    const nextColor = await loadColor(path)
    const nextGray = await loadGray(path)
    if (nextGray.width !== accGray.width) {
      log.warn(`frame ${i}: width changed ${accGray.width}→${nextGray.width}, skipping`)
      skipped++
      continue
    }

    const { y, meanSqDiff } = findBestMatchY(accGray, nextGray)
    const appendStart = y + Math.min(TEMPLATE_H, accGray.height, nextGray.height)
    const appendCount = nextColor.height - appendStart

    if (meanSqDiff > MAX_MEAN_SQ_DIFF) {
      log.warn(`frame ${i}: bad match (mse=${meanSqDiff.toFixed(1)}), skipping`)
      skipped++
      continue
    }
    if (appendCount < MIN_APPEND_H) {
      log.info(`frame ${i}: no significant scroll (append=${appendCount}px), skipping`)
      skipped++
      continue
    }

    log.info(
      `frame ${i}: matched at y=${y} mse=${meanSqDiff.toFixed(1)}, appending ${appendCount} rows`,
    )
    accColor = appendRows(accColor, nextColor, appendStart, nextColor.height)
    accGray = appendRowsGray(accGray, nextGray, appendStart, nextGray.height)
    used++
  }

  const outputPath = join(tmpdir(), `maxtools-stitched-${Date.now()}.png`)
  await sharp(accColor.data, {
    raw: { width: accColor.width, height: accColor.height, channels: 4 },
  })
    .png()
    .toFile(outputPath)
  log.info(
    `stitched ${used} frames (${skipped} skipped) → ${accColor.width}x${accColor.height} ${outputPath}`,
  )
  return {
    outputPath,
    width: accColor.width,
    height: accColor.height,
    framesUsed: used,
    framesSkipped: skipped,
  }
}
