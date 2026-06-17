// src/tools/screenshot/renderer/editor/Editor.tsx
import React, { useEffect, useRef, useState } from 'react'
import { CanvasView } from './canvas/CanvasView'
import { useEditorStore } from './state/store'
import { newLayerId, type Layer, type Rect } from './layers/types'
import './layers/rect'
import './layers/ellipse'
import './layers/arrow'
import './layers/pen'
import './layers/text'
import './layers/mosaic'
import './layers/blur'
import { TextOverlay } from './TextOverlay'

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
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)

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
    if (state.activeTool === 'rect' || state.activeTool === 'ellipse') {
      const id = newLayerId()
      dragRef.current = { startX: x, startY: y, tempId: id }
      const baseLayer =
        state.activeTool === 'rect'
          ? {
              id,
              type: 'rect' as const,
              bounds: { x, y, w: 0, h: 0 },
              stroke: state.style.color,
              strokeWidth: state.style.strokeWidth,
            }
          : {
              id,
              type: 'ellipse' as const,
              bounds: { x, y, w: 0, h: 0 },
              stroke: state.style.color,
              strokeWidth: state.style.strokeWidth,
            }
      dispatch({ type: 'ADD_LAYER', layer: baseLayer })
      return
    }
    if (state.activeTool === 'arrow') {
      const id = newLayerId()
      dragRef.current = { startX: x, startY: y, tempId: id }
      dispatch({
        type: 'ADD_LAYER',
        layer: {
          id,
          type: 'arrow',
          from: { x, y },
          to: { x, y },
          stroke: state.style.color,
          strokeWidth: state.style.strokeWidth,
        },
      })
      return
    }
    if (state.activeTool === 'pen') {
      const id = newLayerId()
      dragRef.current = { startX: x, startY: y, tempId: id }
      dispatch({
        type: 'ADD_LAYER',
        layer: {
          id,
          type: 'pen',
          points: [{ x, y }],
          stroke: state.style.color,
          strokeWidth: state.style.strokeWidth,
        },
      })
      return
    }
    if (state.activeTool === 'text') {
      setTextPos({ x, y })
      return
    }
    if (state.activeTool === 'blur') {
      const id = newLayerId()
      dragRef.current = { startX: x, startY: y, tempId: id }
      if (state.style.blurMode === 'gaussian') {
        dispatch({
          type: 'ADD_LAYER',
          layer: {
            id,
            type: 'blur',
            region: { kind: 'rect', bounds: { x, y, w: 0, h: 0 } },
            blurRadius: state.style.blurRadius,
          },
        })
      } else {
        dispatch({
          type: 'ADD_LAYER',
          layer: {
            id,
            type: 'mosaic',
            region: { kind: 'rect', bounds: { x, y, w: 0, h: 0 } },
            blockSize: state.style.blockSize,
          },
        })
      }
      return
    }
  }

  function onMove(x: number, y: number) {
    if (!dragRef.current) return
    const s = dragRef.current
    if (state.activeTool === 'rect' || state.activeTool === 'ellipse') {
      const bounds: Rect = { x: s.startX, y: s.startY, w: x - s.startX, h: y - s.startY }
      dispatch({ type: 'UPDATE_LAYER', id: s.tempId, patch: { bounds } })
      return
    }
    if (state.activeTool === 'arrow') {
      dispatch({ type: 'UPDATE_LAYER', id: s.tempId, patch: { to: { x, y } } })
      return
    }
    if (state.activeTool === 'pen') {
      const current = state.history.current.find((l) => l.id === s.tempId)
      if (current && current.type === 'pen') {
        dispatch({
          type: 'UPDATE_LAYER',
          id: current.id,
          patch: { points: [...current.points, { x, y }] },
        })
      }
      return
    }
    if (state.activeTool === 'blur') {
      const cur = state.history.current.find((l) => l.id === s.tempId)
      if (cur && (cur.type === 'mosaic' || cur.type === 'blur')) {
        const bounds: Rect = { x: s.startX, y: s.startY, w: x - s.startX, h: y - s.startY }
        dispatch({
          type: 'UPDATE_LAYER',
          id: cur.id,
          patch: { region: { kind: 'rect', bounds } } as Partial<Layer>,
        })
      }
      return
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
        {textPos && (
          <TextOverlay
            x={textPos.x}
            y={textPos.y}
            fontSize={state.style.fontSize}
            color={state.style.color}
            fontFamily="-apple-system, sans-serif"
            onCommit={(text) => {
              if (text.trim()) {
                dispatch({
                  type: 'ADD_LAYER',
                  layer: {
                    id: newLayerId(),
                    type: 'text',
                    pos: textPos,
                    content: text,
                    fontSize: state.style.fontSize,
                    color: state.style.color,
                    fontFamily: '-apple-system, sans-serif',
                  },
                })
              }
              setTextPos(null)
            }}
            onCancel={() => setTextPos(null)}
          />
        )}
      </div>
      <div className="editor-toolbar">
        <span>编辑器：当前工具 = {state.activeTool}（工具栏 Task 36 完整实现）</span>
      </div>
    </div>
  )
}
