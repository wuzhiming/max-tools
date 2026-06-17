// src/main/permissions.ts
import { systemPreferences, shell, desktopCapturer } from 'electron'
import { mainLog } from './logger'

export type PermissionKind = 'screen' | 'accessibility'
export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

export function getPermissionStatus(kind: PermissionKind): PermissionStatus {
  if (process.platform !== 'darwin') return 'granted'
  if (kind === 'screen') {
    return systemPreferences.getMediaAccessStatus('screen') as PermissionStatus
  }
  if (kind === 'accessibility') {
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied'
  }
  return 'unknown'
}

export async function ensureScreenRecording(): Promise<boolean> {
  if (process.platform !== 'darwin') return true
  const status = getPermissionStatus('screen')
  if (status === 'granted') return true
  mainLog.warn('screen recording not granted, status=', status)
  // Trigger macOS TCC: the act of calling desktopCapturer.getSources() with
  // types: ['screen'] is what registers our bundle in System Settings →
  // Privacy → Screen Recording. The first call also shows the system prompt.
  // Attach .catch synchronously to avoid Node's UnhandledPromiseRejectionWarning.
  await desktopCapturer
    .getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
    .catch((err) => mainLog.warn('desktopCapturer.getSources to trigger TCC failed:', err))
  // Re-check; usually still 'not-determined' or 'denied' until user grants in System Settings + restarts.
  const after = getPermissionStatus('screen')
  return after === 'granted'
}

export function openPermissionPane(kind: PermissionKind): void {
  if (process.platform !== 'darwin') return
  const url =
    kind === 'screen'
      ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  shell.openExternal(url).catch((err) => mainLog.error('openPermissionPane', err))
}
