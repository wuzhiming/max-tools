// src/renderer/shared/components/SettingRow.tsx
import React from 'react'

interface Props {
  label: string
  hint?: string
  children: React.ReactNode
}

export function SettingRow({ label, hint, children }: Props) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <label style={{ paddingTop: 4 }}>{label}</label>
      <div style={{ flex: 1 }}>
        {children}
        {hint && <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 4 }}>{hint}</div>}
      </div>
    </div>
  )
}
