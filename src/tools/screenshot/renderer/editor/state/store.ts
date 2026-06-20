// src/tools/screenshot/renderer/editor/state/store.ts
import { useReducer } from 'react'
import { createHistory, pushSnapshot, undo, redo, type History } from './history'
import type { Layer, ToolKind, Color } from '../layers/types'

export interface EditorState {
  history: History<Layer[]>
  selectedLayerId: string | null
  activeTool: ToolKind
  style: {
    color: Color
    strokeWidth: number
    fontSize: number
    blockSize: number
    blurRadius: number
    blurMode: 'mosaic' | 'gaussian'
  }
}

type Action =
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'UPDATE_LAYER_DRAFT'; id: string; patch: Partial<Layer> }
  | { type: 'UPDATE_LAYER'; id: string; patch: Partial<Layer> }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'SELECT_LAYER'; id: string | null }
  | { type: 'SET_TOOL'; tool: ToolKind }
  | { type: 'SET_STYLE'; patch: Partial<EditorState['style']> }
  | { type: 'BEGIN_DRAG' }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'ADD_LAYER':
      return {
        ...state,
        history: pushSnapshot(state.history, [...state.history.current, action.layer]),
        selectedLayerId: action.layer.id,
      }
    case 'UPDATE_LAYER_DRAFT':
      // Mutate current without snapshotting — used during drag operations
      return {
        ...state,
        history: {
          ...state.history,
          current: state.history.current.map((l) => (l.id === action.id ? ({ ...l, ...action.patch } as Layer) : l)),
        },
      }
    case 'UPDATE_LAYER':
      return {
        ...state,
        history: pushSnapshot(
          state.history,
          state.history.current.map((l) => (l.id === action.id ? ({ ...l, ...action.patch } as Layer) : l)),
        ),
      }
    case 'DELETE_LAYER':
      return {
        ...state,
        history: pushSnapshot(state.history, state.history.current.filter((l) => l.id !== action.id)),
        selectedLayerId: state.selectedLayerId === action.id ? null : state.selectedLayerId,
      }
    case 'SELECT_LAYER':
      return { ...state, selectedLayerId: action.id }
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, selectedLayerId: null }
    case 'SET_STYLE':
      return { ...state, style: { ...state.style, ...action.patch } }
    case 'BEGIN_DRAG':
      // Snapshot current layers before a drag mutation starts (used for selectDrag).
      // ADD_LAYER drags (rect/ellipse/etc.) don't need this — ADD_LAYER already snapshots.
      return { ...state, history: pushSnapshot(state.history, state.history.current) }
    case 'UNDO':
      return { ...state, history: undo(state.history), selectedLayerId: null }
    case 'REDO':
      return { ...state, history: redo(state.history), selectedLayerId: null }
  }
}

const initial: EditorState = {
  history: createHistory<Layer[]>([]),
  selectedLayerId: null,
  activeTool: 'rect',
  style: { color: '#FF3B30', strokeWidth: 5, fontSize: 24, blockSize: 12, blurRadius: 8, blurMode: 'mosaic' },
}

export function useEditorStore() {
  const [state, dispatch] = useReducer(reducer, initial)
  return { state, dispatch }
}
