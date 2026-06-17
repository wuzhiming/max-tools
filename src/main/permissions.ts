// src/main/permissions.ts
import { systemPreferences, shell } from 'electron'
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
  const status = getPermissionStatus('screen')
  if (status === 'granted') return true
  mainLog.warn('screen recording not granted, status=', status)
  // 触发系统授权对话框（trigger 一次后 macOS 会记住）
  if (process.platform !== 'darwin') return false
  await systemPreferences.askForMediaAccess?.('camera').catch(() => {})
  return false
}

export function openPermissionPane(kind: PermissionKind): void {
  if (process.platform !== 'darwin') return
  const url =
    kind === 'screen'
      ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  shell.openExternal(url).catch((err) => mainLog.error('openPermissionPane', err))
}
