// src/shared/types/screenshot-ipc.ts
import type { Rect } from '@tools/screenshot/main/dpi'

export const SS_IPC = {
  /** main → overlay 渲染层：推送底图与几何 */
  OverlayInit: 'overlay/init',
  /** overlay → main：用户确认选区 */
  OverlaySelected: 'overlay/selected',
  /** overlay → main：用户取消（Esc） */
  OverlayCancelled: 'overlay/cancelled',
  /** main → overlay：要求关闭 */
  OverlayClose: 'overlay/close',
  /** main → editor：推送裁剪后图 */
  EditorInit: 'editor/init',
  /** editor → main：完成（写剪贴板） */
  EditorComplete: 'editor/complete',
  /** editor → main：另存为 */
  EditorSaveAs: 'editor/save-as',
  /** editor → main：取消 */
  EditorCancel: 'editor/cancel',
  /** toolbar → main：toolbar 渲染层加载完成 */
  ToolbarReady: 'toolbar/ready',
  /** toolbar → main → editor：用户在 toolbar 上触发的动作 */
  ToolbarAction: 'toolbar/action',
  /** editor → main → toolbar：editor 状态广播（撤销/重做可用性） */
  EditorStatus: 'editor/status',
} as const

export interface OverlayInitPayload {
  imagePath: string
  displayBounds: { x: number; y: number; width: number; height: number } // CSS px
  pixelWidth: number   // 位图物理像素
  pixelHeight: number
  devicePixelRatio: number
  windowsOnThisDisplay: WindowGeometry[]
}

export interface WindowGeometry {
  ownerName: string
  bounds: { x: number; y: number; width: number; height: number } // CSS px in display-local coords
  zOrder: number
}

export interface OverlaySelectedPayload {
  displayId: number
  regionInImagePixels: Rect
  pickedColor?: { hex: string; r: number; g: number; b: number }
}

export interface ToolbarActionPayload {
  kind: 'SET_TOOL' | 'SET_STYLE' | 'UNDO' | 'REDO' | 'SAVE_AS' | 'COMPLETE' | 'CANCEL'
  payload?: unknown
}

export interface EditorStatusPayload {
  canUndo: boolean
  canRedo: boolean
}
