// src/tools/screenshot/main/window-detect.ts
import { execFileSync } from 'node:child_process'
import type { Display } from 'electron'
import { createLogger } from '@main/logger'
import type { WindowGeometry } from '@shared/types/screenshot-ipc'

const log = createLogger('screenshot.window-detect')

const APPLESCRIPT = `
use framework "AppKit"
use scripting additions

set output to ""
set windowList to (current application's CGWindowListCopyWindowInfo(((current application's kCGWindowListOptionOnScreenOnly) as integer) + ((current application's kCGWindowListExcludeDesktopElements) as integer), (current application's kCGNullWindowID) as integer)) as list

repeat with w in windowList
  try
    set theOwner to (w's |kCGWindowOwnerName|) as text
    set theBounds to w's |kCGWindowBounds|
    set theLayer to (w's |kCGWindowLayer|) as integer
    if theLayer is 0 then
      set X to (theBounds's |X|) as integer
      set Y to (theBounds's |Y|) as integer
      set W to (theBounds's |Width|) as integer
      set H to (theBounds's |Height|) as integer
      set output to output & theOwner & "|" & X & "|" & Y & "|" & W & "|" & H & linefeed
    end if
  end try
end repeat

return output
`

export function detectWindowsOnDisplay(display: Display): WindowGeometry[] {
  if (process.platform !== 'darwin') return []
  try {
    const out = execFileSync('/usr/bin/osascript', ['-e', APPLESCRIPT], {
      timeout: 1500,
      encoding: 'utf8',
    })
    const lines = out.split('\n').filter((l) => l.trim().length > 0)
    const result: WindowGeometry[] = []
    let z = 0
    for (const line of lines) {
      const parts = line.split('|')
      if (parts.length !== 5) continue
      const [owner, xs, ys, ws, hs] = parts
      const x = Number(xs), y = Number(ys), w = Number(ws), h = Number(hs)
      // 只保留与该 display 相交的窗口（坐标是全局桌面坐标）
      const dx = display.bounds.x, dy = display.bounds.y
      const dw = display.bounds.width, dh = display.bounds.height
      const intersect =
        x < dx + dw && x + w > dx && y < dy + dh && y + h > dy
      if (!intersect) continue
      result.push({
        ownerName: owner,
        // 转换到该 display 局部坐标
        bounds: { x: x - dx, y: y - dy, width: w, height: h },
        zOrder: z++,
      })
    }
    return result
  } catch (err) {
    log.warn('window detect failed (Accessibility 权限可能未授予):', err)
    return []
  }
}
