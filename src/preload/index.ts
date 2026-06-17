// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types/ipc'

const api = {
  invoke: (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload),
  on: (channel: string, listener: (payload: unknown) => void) => {
    const wrapped = (_e: unknown, payload: unknown) => listener(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
  IPC,
}

contextBridge.exposeInMainWorld('mt', api)

export type MtApi = typeof api
declare global {
  interface Window {
    mt: MtApi
  }
}
