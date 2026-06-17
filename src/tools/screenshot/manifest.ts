import type { ToolManifest } from '@shared/types/tool-manifest'
import { initScreenshotTool } from './main/index'

export const screenshotManifest: ToolManifest = {
  id: 'screenshot',
  name: '截图',
  defaultShortcuts: {
    region: 'CommandOrControl+Shift+A',
    fullscreen: 'CommandOrControl+Shift+F',
  },
  init: initScreenshotTool,
  settingsView: () => import('./renderer/settings/index'),
}
