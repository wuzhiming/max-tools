// src/tools/clipboard/main/paste.ts
//
// macOS-only helpers for figuring out which app was frontmost before our
// picker stole focus, and for re-activating it before firing the
// synthetic ⌘V. Without the explicit re-activation our process tends to
// remain the focused app (Electron with hidden dock behaves oddly here)
// and the keystroke either gets eaten or lands inside our picker.
//
// All of these require the user to have granted Accessibility to Max
// Tools. If the OS denies the request, every call throws — callers
// should treat that as "fall back to manual ⌘V".

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

/** Bundle id of the frontmost (currently-focused) app, or null on failure.
 *  Bundle id beats name because `tell application "X" to activate` with a
 *  bundle id is more reliable for apps whose process name and app name
 *  differ (Chrome, IDEs). */
export async function getFrontmostBundleId(): Promise<string | null> {
  try {
    const { stdout } = await execFileP(
      'osascript',
      ['-e', 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'],
      { timeout: 1500 },
    )
    const id = stdout.trim()
    return id || null
  } catch {
    return null
  }
}

export async function activateAppByBundleId(bundleId: string): Promise<void> {
  await execFileP(
    'osascript',
    ['-e', `tell application id "${bundleId}" to activate`],
    { timeout: 1500 },
  )
}

export async function sendCmdV(): Promise<void> {
  await execFileP(
    'osascript',
    ['-e', 'tell application "System Events" to keystroke "v" using command down'],
    { timeout: 2000 },
  )
}

/** Convenience: activate `bundleId`, wait `delayMs`, then ⌘V. Tolerates
 *  null/missing bundle id (skips activation) and surfaces a single error
 *  if any step fails. */
export async function activateAndPaste(bundleId: string | null, delayMs = 60): Promise<void> {
  if (bundleId) {
    try { await activateAppByBundleId(bundleId) } catch { /* fall through to paste anyway */ }
  }
  await new Promise((r) => setTimeout(r, delayMs))
  await sendCmdV()
}
