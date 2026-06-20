// src/renderer/main-window/pages/about.tsx
import React, { useEffect, useState } from 'react'
import { Button, Stack, Text, Title } from '@mantine/core'
import { IconFolderOpen } from '@tabler/icons-react'
import { SettingRow } from '@renderer/shared/components/SettingRow'

export function AboutPage() {
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.mt.invoke(window.mt.IPC.GetVersion).then((v) => setVersion(v as string))
  }, [])
  return (
    <Stack gap="md">
      <Title order={3}>关于</Title>
      <SettingRow label="版本">
        <Text size="sm">{version}</Text>
      </SettingRow>
      <SettingRow label="日志">
        <Button
          variant="default"
          size="xs"
          leftSection={<IconFolderOpen size={14} />}
          onClick={() => window.mt.invoke(window.mt.IPC.OpenLogsFolder)}
        >
          打开日志目录
        </Button>
      </SettingRow>
    </Stack>
  )
}
