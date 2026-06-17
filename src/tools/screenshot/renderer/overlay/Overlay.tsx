// src/tools/screenshot/renderer/overlay/Overlay.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { OverlayInitPayload, WindowGeometry } from '@shared/types/screenshot-ipc'
import type { Rect } from '@tools/screenshot/main/dpi'
import { SelectionRect } from './SelectionRect'
import { Magnifier } from './Magnifier'
import { WindowHighlight, findHoveredWindow } from './WindowHighlight'
import { useImagePixels, pickColor } from './useImagePixels'
import { cssToImage, clampRectInBounds } from '@tools/screenshot/main/dpi'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [hoveredWin, setHoveredWin] = useState<WindowGeometry | null>(null)
  const drag = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)
  const pixels = useImagePixels(init?.imagePath ?? null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    return () => { off() }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      else if ((e.key === 'Enter' || e.key === 'Return') && rect && init) confirmRect(rect)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, init])

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY, moved: false }
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
  }
  function onMouseMove(e: React.MouseEvent) {
    setCursor({ x: e.clientX, y: e.clientY })
    if (drag.current) {
      const s = drag.current
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true
      setRect({ x: s.startX, y: s.startY, w: dx, h: dy })
    } else if (init) {
      setHoveredWin(findHoveredWindow(init.windowsOnThisDisplay, e.clientX, e.clientY))
    }
  }
  function onMouseUp(_e: React.MouseEvent) {
    const wasDragMove = drag.current?.moved
    drag.current = null
    if (rect && wasDragMove && Math.abs(rect.w) > 4 && Math.abs(rect.h) > 4) {
      confirmRect(rect)
    } else if (!wasDragMove && hoveredWin) {
      // 单击命中窗口 → 截整窗
      setRect(null)
      confirmRect({
        x: hoveredWin.bounds.x,
        y: hoveredWin.bounds.y,
        w: hoveredWin.bounds.width,
        h: hoveredWin.bounds.height,
      })
    } else {
      setRect(null)
    }
  }

  function confirmRect(r: Rect) {
    if (!init) return
    const inImg = cssToImage(r, init.devicePixelRatio)
    const clamped = clampRectInBounds(inImg, init.pixelWidth, init.pixelHeight)
    const color = pixels && cursor ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio) : null
    window.mt.send(window.mt.SS_IPC.OverlaySelected, {
      displayId: init.displayId,
      regionInImagePixels: clamped,
      pickedColor: color ?? undefined,
    })
  }

  if (!init) return null
  const color = pixels && cursor
    ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio)
    : null

  return (
    <div className="overlay-root" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{ pointerEvents: 'auto' }}>
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      {!rect && <div className="overlay-dim" />}
      {!rect && hoveredWin && <WindowHighlight win={hoveredWin} />}
      <SelectionRect rect={rect} />
      {cursor && !drag.current && (
        <Magnifier pixels={pixels} cssX={cursor.x} cssY={cursor.y} dpr={init.devicePixelRatio} color={color} />
      )}
    </div>
  )
}
