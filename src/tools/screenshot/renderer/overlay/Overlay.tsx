// src/tools/screenshot/renderer/overlay/Overlay.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { OverlayInitPayload, WindowGeometry } from '@shared/types/screenshot-ipc'
import type { Rect } from '@tools/screenshot/main/dpi'
import { SelectionRect } from './SelectionRect'
import { Magnifier } from './Magnifier'
import { WindowHighlight, findHoveredWindow } from './WindowHighlight'
import { SelectionToolbar, type AnnotationTool } from './SelectionToolbar'
import { useImagePixels, pickColor } from './useImagePixels'
import { cssToImage, clampRectInBounds } from '@tools/screenshot/main/dpi'

type InitPayload = OverlayInitPayload & { displayId: number }

/** Normalize a rect that might have negative width/height (drag direction). */
function normalizeRect(r: Rect): Rect {
  let { x, y, w, h } = r
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  return { x, y, w, h }
}

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)
  /** The rect the user is *currently* dragging out (live). */
  const [rect, setRect] = useState<Rect | null>(null)
  /** A rect the user has released the mouse on; toolbar is anchored to it
   *  and the next click decides which capture mode to fire. */
  const [pendingRect, setPendingRect] = useState<Rect | null>(null)
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
      if (e.key === 'Escape') {
        if (pendingRect) {
          // Esc with a pending selection just clears it — lets the user
          // try again instead of bailing entirely.
          setPendingRect(null)
        } else {
          window.mt.send(window.mt.SS_IPC.OverlayCancelled)
        }
      } else if ((e.key === 'Enter' || e.key === 'Return') && init) {
        const target = pendingRect ?? rect
        if (target) confirmRect(target, 'normal')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, pendingRect, init])

  function onMouseDown(e: React.MouseEvent) {
    // Starting a new drag — abandon any pending selection.
    setPendingRect(null)
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
    } else if (init && !pendingRect) {
      setHoveredWin(findHoveredWindow(init.windowsOnThisDisplay, e.clientX, e.clientY))
    }
  }
  function onMouseUp(_e: React.MouseEvent) {
    const wasDragMove = drag.current?.moved
    drag.current = null
    if (rect && wasDragMove && Math.abs(rect.w) > 4 && Math.abs(rect.h) > 4) {
      // Park the rect as "pending" and show the action toolbar instead
      // of auto-committing — user picks mode (normal / scroll) next.
      setPendingRect(normalizeRect(rect))
      setRect(null)
    } else if (!wasDragMove && hoveredWin) {
      // Click on a hovered window → also park as pending so the toolbar
      // appears for window-snap selections too.
      setPendingRect({
        x: hoveredWin.bounds.x,
        y: hoveredWin.bounds.y,
        w: hoveredWin.bounds.width,
        h: hoveredWin.bounds.height,
      })
      setRect(null)
    } else {
      setRect(null)
    }
  }

  function confirmRect(r: Rect, mode: 'normal' | 'scroll', initialTool?: AnnotationTool) {
    if (!init) return
    const n = normalizeRect(r)
    const inImg = cssToImage(n, init.devicePixelRatio)
    const clamped = clampRectInBounds(inImg, init.pixelWidth, init.pixelHeight)
    const color = pixels && cursor ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio) : null
    window.mt.send(window.mt.SS_IPC.OverlaySelected, {
      displayId: init.displayId,
      regionInImagePixels: clamped,
      pickedColor: color ?? undefined,
      mode,
      initialTool,
    })
  }

  if (!init) return null
  const color = pixels && cursor
    ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio)
    : null

  // What rect to render (live drag, or pending selection)
  const shownRect = rect ?? pendingRect

  return (
    <div className="overlay-root" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{ pointerEvents: 'auto' }}>
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      {!shownRect && <div className="overlay-dim" />}
      {!shownRect && hoveredWin && <WindowHighlight win={hoveredWin} />}
      <SelectionRect rect={shownRect} />
      {cursor && !drag.current && !pendingRect && (
        <Magnifier pixels={pixels} cssX={cursor.x} cssY={cursor.y} dpr={init.devicePixelRatio} color={color} />
      )}
      {pendingRect && (
        <SelectionToolbar
          rect={pendingRect}
          viewport={{ width: window.innerWidth, height: window.innerHeight }}
          onAnnotate={(tool) => confirmRect(pendingRect, 'normal', tool)}
          onConfirm={() => confirmRect(pendingRect, 'normal')}
          onScroll={() => confirmRect(pendingRect, 'scroll')}
          onCancel={() => setPendingRect(null)}
        />
      )}
    </div>
  )
}
