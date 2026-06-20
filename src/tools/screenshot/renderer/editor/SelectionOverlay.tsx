// src/tools/screenshot/renderer/editor/SelectionOverlay.tsx
import React from 'react'
import type { Layer, Point } from './layers/types'
import { getLayerBBox, normalizeBBox, type BBox } from './canvas/bbox'

export interface CanvasDims {
  /** Canvas left in CSS px, relative to .editor-canvas-wrap */
  left: number
  /** Canvas top in CSS px, relative to .editor-canvas-wrap */
  top: number
  /** Canvas displayed width in CSS px */
  width: number
  /** Canvas displayed height in CSS px */
  height: number
  /** Canvas-px → CSS-px multiplier */
  scaleX: number
  scaleY: number
}

type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface HandleDef {
  pos: HandlePos
  cursor: string
}

const BBOX_HANDLES: HandleDef[] = [
  { pos: 'nw', cursor: 'nwse-resize' },
  { pos: 'n', cursor: 'ns-resize' },
  { pos: 'ne', cursor: 'nesw-resize' },
  { pos: 'e', cursor: 'ew-resize' },
  { pos: 'se', cursor: 'nwse-resize' },
  { pos: 's', cursor: 'ns-resize' },
  { pos: 'sw', cursor: 'nesw-resize' },
  { pos: 'w', cursor: 'ew-resize' },
]

function handleAnchor(
  pos: HandlePos,
  rect: { left: number; top: number; width: number; height: number },
): [number, number] {
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  switch (pos) {
    case 'nw': return [rect.left, rect.top]
    case 'n': return [cx, rect.top]
    case 'ne': return [right, rect.top]
    case 'e': return [right, cy]
    case 'se': return [right, bottom]
    case 's': return [cx, bottom]
    case 'sw': return [rect.left, bottom]
    case 'w': return [rect.left, cy]
  }
}

function resizeBBox(orig: BBox, handle: HandlePos, dx: number, dy: number): BBox {
  let { x, y, w, h } = orig
  if (handle.includes('w')) { x += dx; w -= dx }
  if (handle.includes('e')) { w += dx }
  if (handle.includes('n')) { y += dy; h -= dy }
  if (handle.includes('s')) { h += dy }
  return { x, y, w, h }
}

function bboxToPatch(layer: Layer, nb: BBox): Partial<Layer> {
  if (layer.type === 'rect' || layer.type === 'ellipse') {
    return { bounds: nb } as Partial<Layer>
  }
  if ((layer.type === 'mosaic' || layer.type === 'blur') && layer.region.kind === 'rect') {
    return { region: { kind: 'rect', bounds: nb } } as Partial<Layer>
  }
  return {}
}

function supportsBBoxResize(layer: Layer): boolean {
  if (layer.type === 'rect' || layer.type === 'ellipse') return true
  if ((layer.type === 'mosaic' || layer.type === 'blur') && layer.region.kind === 'rect') return true
  return false
}

interface Props {
  layer: Layer
  canvasDims: CanvasDims
  onPatch: (patch: Partial<Layer>) => void
  onPatchBegin: () => void
}

export function SelectionOverlay({ layer, canvasDims, onPatch, onPatchBegin }: Props) {
  const rawBox = getLayerBBox(layer)
  if (!rawBox) return null
  const bbox = normalizeBBox(rawBox)

  const css = {
    left: canvasDims.left + bbox.x * canvasDims.scaleX,
    top: canvasDims.top + bbox.y * canvasDims.scaleY,
    width: bbox.w * canvasDims.scaleX,
    height: bbox.h * canvasDims.scaleY,
  }

  const startBBoxResize = (handle: HandlePos) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onPatchBegin()
    const startX = e.clientX
    const startY = e.clientY
    const origBBox: BBox = { ...bbox }
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / canvasDims.scaleX
      const dy = (ev.clientY - startY) / canvasDims.scaleY
      const nb = resizeBBox(origBBox, handle, dx, dy)
      onPatch(bboxToPatch(layer, nb))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const startArrowEndpointDrag = (which: 'from' | 'to') => (e: React.MouseEvent) => {
    if (layer.type !== 'arrow') return
    e.preventDefault()
    e.stopPropagation()
    onPatchBegin()
    const startX = e.clientX
    const startY = e.clientY
    const origPt = which === 'from' ? layer.from : layer.to
    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / canvasDims.scaleX
      const dy = (ev.clientY - startY) / canvasDims.scaleY
      const np: Point = { x: origPt.x + dx, y: origPt.y + dy }
      onPatch({ [which]: np } as Partial<Layer>)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleStyle = (cursor: string, cx: number, cy: number): React.CSSProperties => ({
    position: 'absolute',
    left: cx - 5,
    top: cy - 5,
    width: 10,
    height: 10,
    background: 'white',
    border: '2px solid #007AFF',
    borderRadius: 2,
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
    cursor,
    zIndex: 11,
    pointerEvents: 'auto',
  })

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: css.left,
          top: css.top,
          width: css.width,
          height: css.height,
          border: '1px dashed rgba(255,255,255,0.95)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4) inset',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      {supportsBBoxResize(layer) &&
        BBOX_HANDLES.map((h) => {
          const [hx, hy] = handleAnchor(h.pos, css)
          return (
            <div
              key={h.pos}
              onMouseDown={startBBoxResize(h.pos)}
              style={handleStyle(h.cursor, hx, hy)}
            />
          )
        })}
      {layer.type === 'arrow' && (
        <>
          <div
            key="arrow-from"
            onMouseDown={startArrowEndpointDrag('from')}
            style={handleStyle(
              'crosshair',
              canvasDims.left + layer.from.x * canvasDims.scaleX,
              canvasDims.top + layer.from.y * canvasDims.scaleY,
            )}
          />
          <div
            key="arrow-to"
            onMouseDown={startArrowEndpointDrag('to')}
            style={handleStyle(
              'crosshair',
              canvasDims.left + layer.to.x * canvasDims.scaleX,
              canvasDims.top + layer.to.y * canvasDims.scaleY,
            )}
          />
        </>
      )}
    </>
  )
}
