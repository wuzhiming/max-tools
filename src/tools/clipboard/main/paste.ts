// src/tools/clipboard/main/paste.ts
//
// Send a synthetic ⌘V to whichever app is frontmost. Requires the user
// to have granted Accessibility permission to Max Tools — without it
// the keystroke event will be silently dropped by macOS.
//
// If this throws (most commonly because Accessibility is missing), the
// caller still leaves the picked text on the system clipboard, so the
// user can press ⌘V manually.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

export async function simulatePasteCmdV(): Promise<void> {
  await execFileP(
    'osascript',
    ['-e', 'tell application "System Events" to keystroke "v" using command down'],
    { timeout: 2000 },
  )
}
