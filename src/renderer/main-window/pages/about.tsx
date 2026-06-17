// src/renderer/main-window/pages/about.tsx
import React, { useEffect, useState } from 'react'

export function AboutPage() {
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.mt.invoke(window.mt.IPC.GetVersion).then((v) => setVersion(v as string))
  }, [])
  return (
    <div>
      <h1>关于</h1>
      <div className="row"><label>版本</label><span>{version}</span></div>
      <div className="row">
        <label>日志</label>
        <button onClick={() => window.mt.invoke(window.mt.IPC.OpenLogsFolder)}>打开日志目录</button>
      </div>
    </div>
  )
}
