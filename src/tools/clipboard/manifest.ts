// src/tools/clipboard/manifest.ts
import type { ToolManifest } from '@shared/types/tool-manifest'
import { initClipboardTool } from './main/index'

export const clipboardManifest: ToolManifest = {
  id: 'clipboard',
  name: '剪切板',
  defaultShortcuts: {
    showPicker: 'CommandOrControl+Shift+V',
  },
  init: initClipboardTool,
}
