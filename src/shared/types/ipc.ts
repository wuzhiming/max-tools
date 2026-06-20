// src/shared/types/ipc.ts
export const IPC = {
  ToolList: 'tools/list',
  ToolGetShortcuts: 'tools/get-shortcuts',
  ToolSetShortcut: 'tools/set-shortcut',
  ToolStoreGet: 'tools/store-get',
  ToolStoreSet: 'tools/store-set',
  ToolIsEnabled: 'tools/is-enabled',
  ToolSetEnabled: 'tools/set-enabled',
  OpenLogsFolder: 'app/open-logs',
  GetVersion: 'app/get-version',
  DialogOpenDirectory: 'app/dialog-open-directory',
  DialogSaveFile: 'app/dialog-save-file',
  GetPermissions: 'app/get-permissions',
  OpenPermissionPane: 'app/open-permission-pane',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
