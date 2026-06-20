// src/renderer/main-window/pages/general.tsx
import React from 'react'
import { Stack, Switch, Text, Title } from '@mantine/core'
import { SettingRow } from '@renderer/shared/components/SettingRow'

export function GeneralPage() {
  return (
    <Stack gap="md">
      <Title order={3}>通用设置</Title>
      <SettingRow label="开机启动" hint="待实现">
        <Switch disabled checked={false} onChange={() => {}} />
      </SettingRow>
      <SettingRow label="主题">
        <Text size="sm">跟随系统</Text>
      </SettingRow>
    </Stack>
  )
}
