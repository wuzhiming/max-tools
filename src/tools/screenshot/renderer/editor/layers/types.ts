// src/tools/screenshot/renderer/editor/layers/types.ts
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export type Color = string

export type ToolKind = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'blur' | 'text'

export type MosaicRegion =
  | { kind: 'rect'; bounds: Rect }
  | { kind: 'pen'; points: Point[]; radius: number }

export type Layer =
  | { id: string; type: 'rect'; bounds: Rect; stroke: Color; strokeWidth: number; fill?: Color }
  | { id: string; type: 'ellipse'; bounds: Rect; stroke: Color; strokeWidth: number; fill?: Color }
  | { id: string; type: 'arrow'; from: Point; to: Point; stroke: Color; strokeWidth: number }
  | { id: string; type: 'pen'; points: Point[]; stroke: Color; strokeWidth: number }
  | { id: string; type: 'text'; pos: Point; content: string; fontSize: number; color: Color; fontFamily: string }
  | { id: string; type: 'mosaic'; region: MosaicRegion; blockSize: number }
  | { id: string; type: 'blur'; region: MosaicRegion; blurRadius: number }

export function newLayerId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
