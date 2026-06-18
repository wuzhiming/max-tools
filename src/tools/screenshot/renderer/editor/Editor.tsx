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
import { Toolbar } from './toolbar/Toolbar'
import { hitTest } from './canvas/hit'
import { renderFilenameTemplate } from '@tools/screenshot/main/filename'

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
  const selectDragRef = useRef<{ id: string; startX: number; startY: number; origin: Layer } | null>(null)
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
    if (state.activeTool === 'select') {
      const hit = hitTest(state.history.current, x, y)
      dispatch({ type: 'SELECT_LAYER', id: hit?.id ?? null })
      if (hit) selectDragRef.current = { id: hit.id, startX: x, startY: y, origin: hit }
      return
    }
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
      const radius = state.style.blockSize * 2
      if (state.style.blurMode === 'gaussian') {
        dispatch({
          type: 'ADD_LAYER',
          layer: {
            id,
            type: 'blur',
            region: { kind: 'pen', points: [{ x, y }], radius },
            blurRadius: state.style.blurRadius,
          },
        })
      } else {
        dispatch({
          type: 'ADD_LAYER',
          layer: {
            id,
            type: 'mosaic',
            region: { kind: 'pen', points: [{ x, y }], radius },
            blockSize: state.style.blockSize,
          },
        })
      }
      return
    }
  }

  function onMove(x: number, y: number) {
    if (selectDragRef.current) {
      const dx = x - selectDragRef.current.startX
      const dy = y - selectDragRef.current.startY
      const o = selectDragRef.current.origin
      if (o.type === 'rect' || o.type === 'ellipse') {
        dispatch({
          type: 'UPDATE_LAYER',
          id: o.id,
          patch: { bounds: { ...o.bounds, x: o.bounds.x + dx, y: o.bounds.y + dy } },
        })
      } else if (o.type === 'text') {
        dispatch({
          type: 'UPDATE_LAYER',
          id: o.id,
          patch: { pos: { x: o.pos.x + dx, y: o.pos.y + dy } },
        })
      } else if ((o.type === 'mosaic' || o.type === 'blur') && o.region.kind === 'rect') {
        const b = o.region.bounds
        dispatch({
          type: 'UPDATE_LAYER',
          id: o.id,
          patch: { region: { kind: 'rect', bounds: { ...b, x: b.x + dx, y: b.y + dy } } } as Partial<Layer>,
        })
      }
      return
    }
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
      if (cur && (cur.type === 'mosaic' || cur.type === 'blur') && cur.region.kind === 'pen') {
        dispatch({
          type: 'UPDATE_LAYER',
          id: cur.id,
          patch: {
            region: { ...cur.region, points: [...cur.region.points, { x, y }] },
          } as Partial<Layer>,
        })
      }
      return
    }
  }

  function onUp() {
    dragRef.current = null
    selectDragRef.current = null
  }

  function exportCanvas(): string | null {
    const cvs = document.querySelector('canvas.editor-canvas') as HTMLCanvasElement | null
    if (!cvs) return null
    return cvs.toDataURL('image/png')
  }

  function exportAndComplete() {
    const dataUrl = exportCanvas()
    if (!dataUrl) return
    window.mt.send(window.mt.SS_IPC.EditorComplete, { dataUrl })
  }

  function exportAndSaveAs() {
    const dataUrl = exportCanvas()
    if (!dataUrl || !init) return
    const name = renderFilenameTemplate(init.filenameTemplate) + '.png'
    window.mt.send(window.mt.SS_IPC.EditorSaveAs, {
      dataUrl,
      suggestedPath: `${init.saveDir}/${name}`,
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textPos) return
      if (e.key === 'Escape') {
        e.preventDefault()
        window.mt.send(window.mt.SS_IPC.EditorCancel)
      } else if (e.key === 'Enter' || e.key === 'Return') {
        e.preventDefault()
        exportAndComplete()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedLayerId) {
        e.preventDefault()
        dispatch({ type: 'DELETE_LAYER', id: state.selectedLayerId })
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        exportAndSaveAs()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [textPos, state.selectedLayerId])

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
        {state.selectedLayerId &&
          (() => {
            const l = state.history.current.find((x) => x.id === state.selectedLayerId)
            if (!l) return null
            let r: { x: number; y: number; w: number; h: number } | null = null
            if (l.type === 'rect' || l.type === 'ellipse') r = l.bounds
            else if ((l.type === 'mosaic' || l.type === 'blur') && l.region.kind === 'rect') r = l.region.bounds
            if (!r) return null
            return (
              <div
                style={{
                  position: 'absolute',
                  left: r.x,
                  top: r.y,
                  width: Math.abs(r.w),
                  height: Math.abs(r.h),
                  border: '1px dashed #fff',
                  pointerEvents: 'none',
                }}
              />
            )
          })()}
      </div>
      <Toolbar
        activeTool={state.activeTool}
        setTool={(t) => dispatch({ type: 'SET_TOOL', tool: t })}
        color={state.style.color}
        setColor={(c) => dispatch({ type: 'SET_STYLE', patch: { color: c } })}
        strokeWidth={state.style.strokeWidth}
        setStrokeWidth={(n) => dispatch({ type: 'SET_STYLE', patch: { strokeWidth: n } })}
        blurMode={state.style.blurMode}
        setBlurMode={(m) => dispatch({ type: 'SET_STYLE', patch: { blurMode: m } })}
        canUndo={state.history.past.length > 0}
        canRedo={state.history.future.length > 0}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onSaveAs={() => exportAndSaveAs()}
        onComplete={() => exportAndComplete()}
      />
    </div>
  )
}
