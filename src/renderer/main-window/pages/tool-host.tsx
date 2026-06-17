// src/renderer/main-window/pages/tool-host.tsx
import React from 'react'

interface Props {
  toolId: string
}

export function ToolHostPage({ toolId }: Props) {
  return (
    <div>
      <h1>工具：{toolId}</h1>
      <div>（settings view 待 Task 43 接入）</div>
    </div>
  )
}
