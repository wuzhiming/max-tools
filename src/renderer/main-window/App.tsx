// src/renderer/main-window/App.tsx
import React, { useEffect, useState } from 'react'
import { Alert, Button, NavLink, ScrollArea, Stack, Text } from '@mantine/core'
import {
  IconAlertTriangle,
  IconCamera,
  IconClipboard,
  IconInfoCircle,
  IconSettings,
  IconTool,
} from '@tabler/icons-react'
import { GeneralPage } from './pages/general'
import { AboutPage } from './pages/about'
import { ToolHostPage } from './pages/tool-host'

type ToolSummary = {
  id: string
  name: string
  icon?: string
  loaded: boolean
  loadError?: string
}

type Route =
  | { kind: 'tool'; id: string }
  | { kind: 'general' }
  | { kind: 'about' }

function parseRoute(path: string): Route {
  if (path.startsWith('/tool/')) return { kind: 'tool', id: path.slice('/tool/'.length) }
  if (path === '/about') return { kind: 'about' }
  return { kind: 'general' }
}

function toolIcon(id: string) {
  if (id === 'screenshot') return <IconCamera size={16} />
  if (id === 'clipboard') return <IconClipboard size={16} />
  return <IconTool size={16} />
}

export function App() {
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [route, setRoute] = useState<Route>({ kind: 'general' })
  const [perms, setPerms] = useState<{ screen: string; accessibility: string }>({
    screen: 'unknown',
    accessibility: 'unknown',
  })

  useEffect(() => {
    window.mt.invoke(window.mt.IPC.ToolList).then((t) => setTools(t as ToolSummary[]))
    const off = window.mt.on('navigate', (path) => setRoute(parseRoute(path as string)))
    return () => { off() }
  }, [])

  useEffect(() => {
    const refresh = () =>
      window.mt.invoke(window.mt.IPC.GetPermissions).then((p) => setPerms(p as never))
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <ScrollArea style={{ flex: 1 }} type="never">
          <Text size="xs" c="dimmed" tt="uppercase" px="sm" pt="md" pb={4} fw={600}>
            工具
          </Text>
          {tools.length === 0 && (
            <Text size="sm" c="dimmed" px="sm" py={6}>
              （暂无）
            </Text>
          )}
          {tools.map((t) => (
            <NavLink
              key={t.id}
              active={route.kind === 'tool' && route.id === t.id}
              label={t.name}
              leftSection={toolIcon(t.id)}
              disabled={!t.loaded}
              description={!t.loaded ? t.loadError : undefined}
              onClick={() => t.loaded && setRoute({ kind: 'tool', id: t.id })}
            />
          ))}

          <Text size="xs" c="dimmed" tt="uppercase" px="sm" pt="md" pb={4} fw={600}>
            设置
          </Text>
          <NavLink
            active={route.kind === 'general'}
            label="通用"
            leftSection={<IconSettings size={16} />}
            onClick={() => setRoute({ kind: 'general' })}
          />
          <NavLink
            active={route.kind === 'about'}
            label="关于"
            leftSection={<IconInfoCircle size={16} />}
            onClick={() => setRoute({ kind: 'about' })}
          />
        </ScrollArea>
      </aside>
      <main className="content">
        <Stack gap="sm">
          {perms.screen !== 'granted' && (
            <Alert
              variant="light"
              color="red"
              title="需要权限"
              icon={<IconAlertTriangle />}
            >
              截图功能需要"屏幕录制"权限{' '}
              <Button
                size="compact-xs"
                variant="white"
                color="red"
                onClick={() => window.mt.invoke(window.mt.IPC.OpenPermissionPane, 'screen')}
              >
                去授权
              </Button>
            </Alert>
          )}
          {perms.accessibility !== 'granted' && (
            <Alert
              variant="light"
              color="yellow"
              title="需要权限"
              icon={<IconAlertTriangle />}
            >
              "窗口自动识别"需要"辅助功能"权限{' '}
              <Button
                size="compact-xs"
                variant="white"
                color="yellow"
                onClick={() =>
                  window.mt.invoke(window.mt.IPC.OpenPermissionPane, 'accessibility')
                }
              >
                去授权
              </Button>
            </Alert>
          )}
          {route.kind === 'tool' && <ToolHostPage toolId={route.id} />}
          {route.kind === 'general' && <GeneralPage />}
          {route.kind === 'about' && <AboutPage />}
        </Stack>
      </main>
    </div>
  )
}
