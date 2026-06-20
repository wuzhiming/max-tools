// src/renderer/shared/components/FilePathPicker.tsx
import React from 'react'
import { Button, Group, TextInput } from '@mantine/core'
import { IconFolderOpen } from '@tabler/icons-react'

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
    <Group gap="xs" wrap="nowrap">
      <TextInput
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        size="xs"
        style={{ flex: 1 }}
      />
      <Button
        variant="default"
        size="xs"
        leftSection={<IconFolderOpen size={14} />}
        onClick={handlePick}
      >
        选择…
      </Button>
    </Group>
  )
}
