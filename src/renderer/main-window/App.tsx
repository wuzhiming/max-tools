// src/renderer/main-window/App.tsx
import React, { useEffect, useState } from 'react'
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
        <div className="sidebar-section">工具</div>
        {tools.length === 0 && <div className="sidebar-item disabled">（暂无）</div>}
        {tools.map((t) => (
          <div
            key={t.id}
            className={`sidebar-item ${route.kind === 'tool' && route.id === t.id ? 'active' : ''} ${!t.loaded ? 'disabled' : ''}`}
            onClick={() => t.loaded && setRoute({ kind: 'tool', id: t.id })}
            title={t.loadError ?? ''}
          >
            {t.name}
          </div>
        ))}

        <div className="sidebar-section">设置</div>
        <div
          className={`sidebar-item ${route.kind === 'general' ? 'active' : ''}`}
          onClick={() => setRoute({ kind: 'general' })}
        >
          通用
        </div>
        <div
          className={`sidebar-item ${route.kind === 'about' ? 'active' : ''}`}
          onClick={() => setRoute({ kind: 'about' })}
        >
          关于
        </div>
      </aside>
      <main className="content">
        {perms.screen !== 'granted' && (
          <div className="error-banner">
            截图功能需要"屏幕录制"权限 —
            <button onClick={() => window.mt.invoke(window.mt.IPC.OpenPermissionPane, 'screen')}>
              去授权
            </button>
          </div>
        )}
        {perms.accessibility !== 'granted' && (
          <div className="error-banner">
            "窗口自动识别"需要"辅助功能"权限 —
            <button
              onClick={() => window.mt.invoke(window.mt.IPC.OpenPermissionPane, 'accessibility')}
            >
              去授权
            </button>
          </div>
        )}
        {route.kind === 'tool' && <ToolHostPage toolId={route.id} />}
        {route.kind === 'general' && <GeneralPage />}
        {route.kind === 'about' && <AboutPage />}
      </main>
    </div>
  )
}
