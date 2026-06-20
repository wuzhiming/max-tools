// src/shared/types/clipboard-ipc.ts

export const CB_IPC = {
  /** main → picker：推送当前队列（picker 刚打开 / 队列更新） */
  PickerInit: 'clipboard/picker/init',
  /** picker → main：picker 加载完成，请求初始队列 */
  PickerReady: 'clipboard/picker/ready',
  /** picker → main：用户选了某一项，主进程负责写剪切板 + 模拟粘贴 */
  Pick: 'clipboard/pick',
  /** picker → main：用户取消（Esc / 失焦） */
  Cancel: 'clipboard/cancel',
} as const

/** Plain-text entry. */
export interface TextEntry {
  id: string
  kind: 'text'
  text: string
  time: number
}

/** Image entry. The full image is kept main-side (data URL kept in memory)
 *  and only base64 thumbnails/previews are shipped to the picker renderer
 *  to keep IPC payloads small. */
export interface ImageEntry {
  id: string
  kind: 'image'
  /** Base64 data URL of the row thumbnail (~56px tall). */
  thumbDataUrl: string
  /** Base64 data URL of the hover preview (~320px tall, or the original
   *  size if the source image is smaller — never upscaled). */
  previewDataUrl: string
  /** Pixel dims of the source image (for display only). */
  width: number
  height: number
  /** Approximate PNG byte size of the source image. */
  bytes: number
  time: number
}

export type ClipboardEntry = TextEntry | ImageEntry

export interface PickerInitPayload {
  entries: ClipboardEntry[]
}

export interface PickPayload {
  id: string
}
