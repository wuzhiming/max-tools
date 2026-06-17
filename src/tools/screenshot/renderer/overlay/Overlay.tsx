// src/tools/screenshot/renderer/overlay/Overlay.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { OverlayInitPayload } from '@shared/types/screenshot-ipc'
import type { Rect } from '@tools/screenshot/main/dpi'
import { SelectionRect } from './SelectionRect'
import { cssToImage, clampRectInBounds } from '@tools/screenshot/main/dpi'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const drag = useRef<{ startX: number; startY: number } | null>(null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    return () => { off() }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      else if ((e.key === 'Enter' || e.key === 'Return') && rect && init) {
        confirm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, init])

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY }
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return
    const s = drag.current
    setRect({ x: s.startX, y: s.startY, w: e.clientX - s.startX, h: e.clientY - s.startY })
  }
  function onMouseUp() {
    drag.current = null
    if (rect && Math.abs(rect.w) > 4 && Math.abs(rect.h) > 4) {
      // 仅当宽高有意义时立即确认（行为同 macOS 系统截图）
      confirm()
    }
  }

  function confirm() {
    if (!rect || !init) return
    // CSS px → image px
    const inImg = cssToImage(
      { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
      init.devicePixelRatio,
    )
    const clamped = clampRectInBounds(inImg, init.pixelWidth, init.pixelHeight)
    window.mt.send(window.mt.SS_IPC.OverlaySelected, {
      displayId: init.displayId,
      regionInImagePixels: clamped,
    })
  }

  if (!init) return null
  return (
    <div
      className="overlay-root"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ pointerEvents: 'auto' }}
    >
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      {!rect && <div className="overlay-dim" />}
      <SelectionRect rect={rect} />
    </div>
  )
}
