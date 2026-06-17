// src/main/logger.ts
import log from 'electron-log/main'
import { app } from 'electron'
import { join } from 'path'

let initialized = false

export function initLogger(): void {
  if (initialized) return
  initialized = true

  log.initialize()

  const isDev = !app.isPackaged
  log.transports.file.level = 'info'
  log.transports.console.level = isDev ? 'debug' : 'info'
  log.transports.file.resolvePathFn = () =>
    join(app.getPath('logs'), 'max-tools.log')
}

export type ScopedLogger = ReturnType<typeof log.scope>

export function createLogger(scope: string): ScopedLogger {
  return log.scope(scope)
}

export const mainLog = log.scope('main')
