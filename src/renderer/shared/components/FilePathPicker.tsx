// src/renderer/shared/components/FilePathPicker.tsx
import React from 'react'

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

export function FilePathPicker({ value, onChange, placeholder }: Props) {
  const handlePick = async () => {
    const r = (await window.mt.invoke(window.mt.IPC.DialogOpenDirectory, value)) as string | null
    if (r) onChange(r)
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d1d6', borderRadius: 4 }}
      />
      <button type="button" onClick={handlePick}>选择…</button>
    </div>
  )
}
