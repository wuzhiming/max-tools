// src/tools/screenshot/renderer/editor/Editor.tsx
import React, { useEffect, useRef, useState } from 'react'
import { CanvasView } from './canvas/CanvasView'
import { useEditorStore } from './state/store'
import { newLayerId, type Rect } from './layers/types'
import './layers/rect'

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
  const { state, dispatch } = useEditorStore()
  const dragRef = useRef<{ startX: number; startY: number; tempId: string } | null>(null)

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

  function onDown(x: number, y: number) {
    if (state.activeTool === 'rect') {
      const id = newLayerId()
      dragRef.current = { startX: x, startY: y, tempId: id }
      dispatch({
        type: 'ADD_LAYER',
        layer: {
          id,
          type: 'rect',
          bounds: { x, y, w: 0, h: 0 },
          stroke: state.style.color,
          strokeWidth: state.style.strokeWidth,
        },
      })
    }
  }

  function onMove(x: number, y: number) {
    if (!dragRef.current) return
    const s = dragRef.current
    if (state.activeTool === 'rect') {
      const bounds: Rect = { x: s.startX, y: s.startY, w: x - s.startX, h: y - s.startY }
      dispatch({ type: 'UPDATE_LAYER', id: s.tempId, patch: { bounds } })
    }
  }

  function onUp() {
    dragRef.current = null
  }

  if (!init) return null

  return (
    <div className="editor-root">
      <div className="editor-canvas-wrap">
        <CanvasView
          baseImage={baseImage}
          layers={state.history.current}
          width={init.pixelWidth}
          height={init.pixelHeight}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
        />
      </div>
      <div className="editor-toolbar">
        <span>编辑器：当前工具 = {state.activeTool}（工具栏 Task 36 完整实现）</span>
      </div>
    </div>
  )
}
