// src/renderer/shared/components/SettingRow.tsx
import React from 'react'
import { Group, Stack, Text } from '@mantine/core'

interface Props {
  label: string
  hint?: string
  children: React.ReactNode
}

export function SettingRow({ label, hint, children }: Props) {
  return (
    <Group align="flex-start" gap="md" wrap="nowrap" my={4}>
      <Text size="sm" w={160} c="gray.7" pt={6} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        {children}
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
    </Group>
  )
}
