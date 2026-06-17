export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function cssToImage(r: Rect, dpr: number): Rect {
  return { x: r.x * dpr, y: r.y * dpr, w: r.w * dpr, h: r.h * dpr }
}

export function imageToCss(r: Rect, dpr: number): Rect {
  return {
    x: Math.round(r.x / dpr),
    y: Math.round(r.y / dpr),
    w: Math.round(r.w / dpr),
    h: Math.round(r.h / dpr),
  }
}

export function clampRectInBounds(r: Rect, maxW: number, maxH: number): Rect {
  // 先归一化负宽高
  let { x, y, w, h } = r
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  // 再裁到边界
  if (x < 0) { w += x; x = 0 }
  if (y < 0) { h += y; y = 0 }
  if (x + w > maxW) w = maxW - x
  if (y + h > maxH) h = maxH - y
  if (w < 0) w = 0
  if (h < 0) h = 0
  return { x, y, w, h }
}
