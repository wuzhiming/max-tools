// src/renderer/main-window/pages/tool-host.tsx
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Loader, Stack, Text, Title } from '@mantine/core'
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

  const Loaded = useMemo(() => {
    const loader = settingsViewLoaders[toolId]
    if (!loader) return null
    return React.lazy(loader)
  }, [toolId])

  useEffect(() => {
    window.mt
      .invoke(window.mt.IPC.ToolGetShortcuts, toolId)
      .then((r) => setShortcuts(r as ShortcutBinding[]))
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

  if (!Loaded) {
    return (
      <Stack gap="md">
        <Title order={3}>{toolId}</Title>
        <Text c="dimmed">该工具没有设置页。</Text>
      </Stack>
    )
  }

  return (
    <Suspense
      fallback={
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      }
    >
      <Loaded
        toolId={toolId}
        shortcuts={shortcuts}
        setShortcut={setShortcut}
        toast={(msg) => alert(msg)}
      />
    </Suspense>
  )
}
