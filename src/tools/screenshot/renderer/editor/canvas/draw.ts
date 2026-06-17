// src/tools/screenshot/renderer/editor/canvas/draw.ts
import type { Layer } from '../layers/types'

export interface DrawCtx {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  baseImage: HTMLImageElement | ImageBitmap | null
}

const layerRenderers: Record<string, (ctx: CanvasRenderingContext2D, layer: Layer) => void> = {}

export function registerLayerRenderer<T extends Layer['type']>(
  type: T,
  fn: (ctx: CanvasRenderingContext2D, layer: Extract<Layer, { type: T }>) => void,
): void {
  layerRenderers[type] = fn as never
}

export function drawScene(dc: DrawCtx, layers: Layer[]): void {
  const { ctx, width, height, baseImage } = dc
  ctx.clearRect(0, 0, width, height)
  if (baseImage) ctx.drawImage(baseImage, 0, 0, width, height)
  for (const layer of layers) {
    const r = layerRenderers[layer.type]
    if (r) r(ctx, layer)
  }
}
