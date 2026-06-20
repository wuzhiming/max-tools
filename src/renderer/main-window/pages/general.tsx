// src/renderer/main-window/pages/general.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Group, Stack, Switch, Text, Title } from '@mantine/core'
import { IconExternalLink, IconRefresh } from '@tabler/icons-react'
import { SettingRow } from '@renderer/shared/components/SettingRow'

type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

interface Permissions {
  screen: PermissionStatus
  accessibility: PermissionStatus
}

const PERMISSION_LABELS: Array<{
  kind: 'screen' | 'accessibility'
  label: string
  hint: string
}> = [
  {
    kind: 'screen',
    label: '屏幕录制',
    hint: '截图工具捕获屏幕内容时需要',
  },
  {
    kind: 'accessibility',
    label: '辅助功能',
    hint: '剪切板选择器粘贴 + 截图窗口几何识别需要',
  },
]

function statusBadge(s: PermissionStatus): React.ReactNode {
  if (s === 'granted') return <Badge color="green" variant="light" size="sm">已授权</Badge>
  if (s === 'denied') return <Badge color="red" variant="light" size="sm">未授权</Badge>
  if (s === 'not-determined') return <Badge color="gray" variant="light" size="sm">未询问</Badge>
  if (s === 'restricted') return <Badge color="orange" variant="light" size="sm">受限</Badge>
  return <Badge color="gray" variant="light" size="sm">未知</Badge>
}

export function GeneralPage() {
  const [autoLaunch, setAutoLaunch] = useState<boolean>(false)
  const [busy, setBusy] = useState(false)
  const [perms, setPerms] = useState<Permissions | null>(null)

  const refreshPerms = useCallback(async () => {
    const p = (await window.mt.invoke(window.mt.IPC.GetPermissions)) as Permissions
    setPerms(p)
  }, [])

  useEffect(() => {
    window.mt.invoke(window.mt.IPC.GetAutoLaunch).then((v) => setAutoLaunch(Boolean(v)))
    void refreshPerms()
    // Re-check when the window regains focus — handles the common flow of
    // "user clicks 打开系统设置 → toggles permission → comes back here".
    const onFocus = (): void => { void refreshPerms() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshPerms])

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
    <Stack gap="lg">
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

      <Group justify="space-between" mt="md">
        <Title order={4}>系统权限</Title>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={() => { void refreshPerms() }}
        >
          重新检查
        </Button>
      </Group>
      {PERMISSION_LABELS.map(({ kind, label, hint }) => {
        const status = perms?.[kind] ?? 'unknown'
        const granted = status === 'granted'
        return (
          <SettingRow key={kind} label={label} hint={hint}>
            <Group gap="sm">
              {statusBadge(status)}
              {!granted && (
                <Button
                  variant="default"
                  size="xs"
                  rightSection={<IconExternalLink size={12} />}
                  onClick={() => { void window.mt.invoke(window.mt.IPC.OpenPermissionPane, kind) }}
                >
                  打开系统设置
                </Button>
              )}
            </Group>
          </SettingRow>
        )
      })}
    </Stack>
  )
}
