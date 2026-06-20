// src/renderer/main-window/pages/general.tsx
import React, { useEffect, useState } from 'react'
import { Stack, Switch, Text, Title } from '@mantine/core'
import { SettingRow } from '@renderer/shared/components/SettingRow'

export function GeneralPage() {
  const [autoLaunch, setAutoLaunch] = useState<boolean>(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.mt.invoke(window.mt.IPC.GetAutoLaunch).then((v) => setAutoLaunch(Boolean(v)))
  }, [])

  const toggleAutoLaunch = async (next: boolean) => {
    setBusy(true)
    // Optimistic; the IPC returns the OS' authoritative value so we
    // correct ourselves if the call no-ops (e.g. unsigned dev binary).
    setAutoLaunch(next)
    const actual = await window.mt.invoke(window.mt.IPC.SetAutoLaunch, next)
    setAutoLaunch(Boolean(actual))
    setBusy(false)
  }

  return (
    <Stack gap="md">
      <Title order={3}>通用设置</Title>
      <SettingRow label="开机启动" hint="登录后自动在后台启动（托盘运行）">
        <Switch
          checked={autoLaunch}
          disabled={busy}
          onChange={(e) => { void toggleAutoLaunch(e.currentTarget.checked) }}
        />
      </SettingRow>
      <SettingRow label="主题">
        <Text size="sm">跟随系统</Text>
      </SettingRow>
    </Stack>
  )
}
