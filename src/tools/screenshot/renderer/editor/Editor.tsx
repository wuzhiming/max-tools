// src/tools/screenshot/renderer/editor/Editor.tsx
import React, { useEffect, useRef, useState } from 'react'
import { CanvasView } from './canvas/CanvasView'
import { useEditorStore, type EditorState } from './state/store'
import { newLayerId, type Layer, type Rect, type ToolKind } from './layers/types'
import './layers/rect'
import './layers/ellipse'
import './layers/arrow'
import './layers/pen'
import './layers/text'
import './layers/mosaic'
import './layers/blur'
import { TextOverlay } from './TextOverlay'
import { SelectionOverlay, type CanvasDims } from './SelectionOverlay'
import { hitTest } from './canvas/hit'
import { renderFilenameTemplate } from '@tools/screenshot/main/filename'
import type { ToolbarActionPayload } from '@shared/types/screenshot-ipc'

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
  const [textPos, setTextPos] = useState<{ canvasX: number; canvasY: number; cssX: number; cssY: number } | null>(null)
  const [canvasDims, setCanvasDims] = useState<CanvasDims | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

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

  // Track canvas CSS dims + scale so overlays (selection handles, text editor)
  // can position themselves in CSS px while layer coords stay in canvas px.
  useEffect(() => {
    if (!init || !baseImage) return
    const wrap = wrapRef.current
    if (!wrap) return
    const update = () => {
      const c = wrap.querySelector('canvas.editor-canvas') as HTMLCanvasElement | null
      if (!c) return
      const wrapRect = wrap.getBoundingClientRect()
      const cRect = c.getBoundingClientRect()
      setCanvasDims({
        left: cRect.left - wrapRect.left,
        top: cRect.top - wrapRect.top,
        width: cRect.width,
        height: cRect.height,
        scaleX: cRect.width / init.pixelWidth,
        scaleY: cRect.height / init.pixelHeight,
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrap)
    const c = wrap.querySelector('canvas.editor-canvas')
    if (c) ro.observe(c)
    return () => ro.disconnect()
  }, [init, baseImage])

  function onDown(x: number, y: number, e: React.MouseEvent) {
    if (state.activeTool === 'select') {
      const hit = hitTest(state.history.current, x, y)
      dispatch({ type: 'SELECT_LAYER', id: hit?.id ?? null })
      if (hit) {
        selectDragRef.current = { id: hit.id, startX: x, startY: y, origin: hit }
        dispatch({ type: 'BEGIN_DRAG' })
      }
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
      setTextPos({ canvasX: x, canvasY: y, cssX: e.clientX, cssY: e.clientY })
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
      const id = o.id
      const translate = (patch: Partial<Layer>) =>
        dispatch({ type: 'UPDATE_LAYER_DRAFT', id, patch })
      if (o.type === 'rect' || o.type === 'ellipse') {
        translate({ bounds: { ...o.bounds, x: o.bounds.x + dx, y: o.bounds.y + dy } })
      } else if (o.type === 'text') {
        translate({ pos: { x: o.pos.x + dx, y: o.pos.y + dy } })
      } else if (o.type === 'arrow') {
        translate({
          from: { x: o.from.x + dx, y: o.from.y + dy },
          to: { x: o.to.x + dx, y: o.to.y + dy },
        })
      } else if (o.type === 'pen') {
        translate({ points: o.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) })
      } else if (o.type === 'mosaic' || o.type === 'blur') {
        if (o.region.kind === 'rect') {
          const b = o.region.bounds
          translate({
            region: { kind: 'rect', bounds: { ...b, x: b.x + dx, y: b.y + dy } },
          } as Partial<Layer>)
        } else {
          translate({
            region: {
              ...o.region,
              points: o.region.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            },
          } as Partial<Layer>)
        }
      }
      return
    }
    if (!dragRef.current) return
    const s = dragRef.current
    if (state.activeTool === 'rect' || state.activeTool === 'ellipse') {
      const bounds: Rect = { x: s.startX, y: s.startY, w: x - s.startX, h: y - s.startY }
      dispatch({ type: 'UPDATE_LAYER_DRAFT', id: s.tempId, patch: { bounds } })
      return
    }
    if (state.activeTool === 'arrow') {
      dispatch({ type: 'UPDATE_LAYER_DRAFT', id: s.tempId, patch: { to: { x, y } } })
      return
    }
    if (state.activeTool === 'pen') {
      const current = state.history.current.find((l) => l.id === s.tempId)
      if (current && current.type === 'pen') {
        dispatch({
          type: 'UPDATE_LAYER_DRAFT',
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
          type: 'UPDATE_LAYER_DRAFT',
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

  const completeRef = useRef(exportAndComplete)
  const saveAsRef = useRef(exportAndSaveAs)
  completeRef.current = exportAndComplete
  saveAsRef.current = exportAndSaveAs

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.ToolbarAction, (p) => {
      const a = p as ToolbarActionPayload
      switch (a.kind) {
        case 'SET_TOOL':
          dispatch({ type: 'SET_TOOL', tool: a.payload as ToolKind })
          break
        case 'SET_STYLE':
          dispatch({
            type: 'SET_STYLE',
            patch: a.payload as Partial<EditorState['style']>,
          })
          break
        case 'UNDO':
          dispatch({ type: 'UNDO' })
          break
        case 'REDO':
          dispatch({ type: 'REDO' })
          break
        case 'SAVE_AS':
          saveAsRef.current()
          break
        case 'COMPLETE':
          completeRef.current()
          break
        case 'CANCEL':
          window.mt.send(window.mt.SS_IPC.EditorCancel)
          break
      }
    })
    return () => { off() }
  }, [])

  useEffect(() => {
    window.mt.send(window.mt.SS_IPC.EditorStatus, {
      canUndo: state.history.past.length > 0,
      canRedo: state.history.future.length > 0,
    })
  }, [state.history.past.length, state.history.future.length])

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

  // CSS font-size used by the inline text input. `state.style.fontSize` is the
  // user-facing CSS size; we convert to canvas units only when persisting so
  // the on-canvas glyph matches the textarea pixel-for-pixel.
  const textScale = canvasDims?.scaleX ?? 1
  const selectedLayer = state.selectedLayerId
    ? state.history.current.find((l) => l.id === state.selectedLayerId) ?? null
    : null

  return (
    <div className="editor-root">
      <div className="editor-canvas-wrap" ref={wrapRef}>
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
            x={textPos.cssX}
            y={textPos.cssY}
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
                    pos: { x: textPos.canvasX, y: textPos.canvasY },
                    content: text,
                    fontSize: state.style.fontSize / textScale,
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
        {selectedLayer && canvasDims && (
          <SelectionOverlay
            layer={selectedLayer}
            canvasDims={canvasDims}
            onPatchBegin={() => dispatch({ type: 'BEGIN_DRAG' })}
            onPatch={(patch) =>
              dispatch({ type: 'UPDATE_LAYER_DRAFT', id: selectedLayer.id, patch })
            }
          />
        )}
      </div>
    </div>
  )
}
