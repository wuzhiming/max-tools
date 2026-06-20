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

export interface ClipboardEntry {
  /** 队列内唯一 id（自增字符串），picker 选中时按 id 回传 */
  id: string
  kind: 'text'
  text: string
  /** 进入队列时的 unix ms */
  time: number
}

export interface PickerInitPayload {
  entries: ClipboardEntry[]
}

export interface PickPayload {
  id: string
}
