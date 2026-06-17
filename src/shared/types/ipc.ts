// src/shared/types/ipc.ts
export const IPC = {
  ToolList: 'tools/list',
  ToolGetShortcuts: 'tools/get-shortcuts',
  ToolSetShortcut: 'tools/set-shortcut',
  ToolStoreGet: 'tools/store-get',
  ToolStoreSet: 'tools/store-set',
  OpenLogsFolder: 'app/open-logs',
  GetVersion: 'app/get-version',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
