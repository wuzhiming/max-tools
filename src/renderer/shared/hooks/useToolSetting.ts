// src/renderer/shared/hooks/useToolSetting.ts
import { useEffect, useState } from 'react'

export function useToolSetting<T>(
  toolId: string,
  key: string,
  defaultValue: T,
): [T, (next: T) => void] {
  const [val, setVal] = useState<T>(defaultValue)
  useEffect(() => {
    window.mt
      .invoke(window.mt.IPC.ToolStoreGet, { toolId, key, defaultValue })
      .then((v) => setVal(v as T))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId, key])
  return [
    val,
    (next: T) => {
      setVal(next)
      window.mt.invoke(window.mt.IPC.ToolStoreSet, { toolId, key, value: next })
    },
  ]
}
