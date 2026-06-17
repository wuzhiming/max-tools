// src/tools/screenshot/renderer/editor/Editor.tsx
import React, { useEffect, useState } from 'react'
import { CanvasView } from './canvas/CanvasView'
import type { Layer } from './layers/types'

interface InitPayload {
  imagePath: string
  pixelWidth: number
  pixelHeight: number
  saveDir: string
  filenameTemplate: string
}

export function Editor() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [baseImage, setBase] = useState<HTMLImageElement | null>(null)
  const [layers] = useState<Layer[]>([])

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.EditorInit, (p) => setInit(p as InitPayload))
    return () => { off() }
  }, [])

  useEffect(() => {
    if (!init) return
    const img = new Image()
    img.onload = () => setBase(img)
    img.src = `file://${init.imagePath}`
  }, [init])

  if (!init) return null

  return (
    <div className="editor-root">
      <div className="editor-canvas-wrap">
        <CanvasView baseImage={baseImage} layers={layers} width={init.pixelWidth} height={init.pixelHeight} />
      </div>
      <div className="editor-toolbar">
        <span>编辑器（工具栏 Task 36 实现）</span>
      </div>
    </div>
  )
}
