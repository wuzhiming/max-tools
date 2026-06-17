// src/renderer/shared/components/Toggle.tsx
import React from 'react'

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: checked ? '#34c759' : '#d1d1d6',
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 20 : 2, width: 18, height: 18,
        borderRadius: '50%', background: 'white', transition: 'left 0.15s',
      }} />
    </button>
  )
}
