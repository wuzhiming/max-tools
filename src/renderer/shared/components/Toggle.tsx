// src/renderer/shared/components/Toggle.tsx
import React from 'react'
import { Switch } from '@mantine/core'

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: Props) {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.currentTarget.checked)}
    />
  )
}
