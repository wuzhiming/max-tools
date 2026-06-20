// src/renderer/main-window/pages/tool-host.tsx
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Alert, Divider, Loader, Stack, Switch, Text, Title } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import type { ToolSettingsProps, ShortcutBinding, RegisterResult } from '@shared/types/tool-manifest'

interface Props {
  toolId: string
}

const settingsViewLoaders: Record<
  string,
  () => Promise<{ default: React.ComponentType<ToolSettingsProps> }>
> = {
  screenshot: () => import('@tools/screenshot/renderer/settings/index'),
  clipboard: () => import('@tools/clipboard/renderer/settings/index'),
}

export function ToolHostPage({ toolId }: Props) {
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>([])
  const [enabled, setEnabled] = useState<boolean>(true)
  const [enableNotice, setEnableNotice] = useState<string | null>(null)

  const Loaded = useMemo(() => {
    const loader = settingsViewLoaders[toolId]
    if (!loader) return null
    return React.lazy(loader)
  }, [toolId])

  useEffect(() => {
    window.mt
      .invoke(window.mt.IPC.ToolGetShortcuts, toolId)
      .then((r) => setShortcuts(r as ShortcutBinding[]))
    window.mt
      .invoke(window.mt.IPC.ToolIsEnabled, toolId)
      .then((r) => setEnabled(Boolean(r)))
  }, [toolId])

  const setShortcut = async (key: string, combo: string): Promise<RegisterResult> => {
    const r = (await window.mt.invoke(window.mt.IPC.ToolSetShortcut, {
      toolId,
      key,
      combo,
    })) as RegisterResult
    if (r.ok) {
      setShortcuts((prev) => {
        const has = prev.some((s) => s.key === key)
        if (has) return prev.map((s) => (s.key === key ? { ...s, combo } : s))
        return [...prev, { key, combo }]
      })
    }
    return r
  }

  const toggleEnabled = async (next: boolean): Promise<void> => {
    // Optimistic flip; revert on backend failure.
    setEnabled(next)
    setEnableNotice(null)
    const r = (await window.mt.invoke(window.mt.IPC.ToolSetEnabled, {
      toolId,
      enabled: next,
    })) as { ok: boolean; reason?: string }
    if (!r.ok) {
      setEnabled(!next)
      setEnableNotice(r.reason ?? '切换失败')
      return
    }
    if (r.reason) {
      // Enabled successfully but a shortcut re-arm reported something —
      // typically "OS rejected" or a stale conflict. Surface non-blocking.
      setEnableNotice(r.reason)
    }
  }

  const baseHeader = (
    <Stack gap="xs">
      <Switch
        size="md"
        checked={enabled}
        label={enabled ? '已启用' : '已禁用'}
        description={
          enabled
            ? '快捷键 / 菜单项 / 后台任务都在运行'
            : '禁用后，工具的快捷键被解除注册，托盘菜单中也会灰显'
        }
        onChange={(e) => { void toggleEnabled(e.currentTarget.checked) }}
      />
      {enableNotice && (
        <Alert
          icon={<IconAlertTriangle />}
          color={enabled ? 'yellow' : 'red'}
          variant="light"
          py={6}
        >
          {enableNotice}
        </Alert>
      )}
    </Stack>
  )

  return (
    <Stack gap="md">
      {baseHeader}
      <Divider />
      {Loaded ? (
        <Suspense
          fallback={
            <Stack align="center" py="xl">
              <Loader size="sm" />
            </Stack>
          }
        >
          <div style={{ opacity: enabled ? 1 : 0.55, pointerEvents: enabled ? 'auto' : 'none' }}>
            <Loaded
              toolId={toolId}
              shortcuts={shortcuts}
              setShortcut={setShortcut}
              toast={(msg) => alert(msg)}
            />
          </div>
        </Suspense>
      ) : (
        <Stack gap={4}>
          <Title order={3}>{toolId}</Title>
          <Text c="dimmed">该工具没有设置页。</Text>
        </Stack>
      )}
    </Stack>
  )
}
