// src/tools/screenshot/renderer/overlay/Overlay.tsx
import React, { useEffect, useState } from 'react'
import type { OverlayInitPayload } from '@shared/types/screenshot-ipc'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { off(); window.removeEventListener('keydown', onKey) }
  }, [])

  if (!init) return null
  return (
    <div className="overlay-root">
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      <div className="overlay-dim" />
    </div>
  )
}
