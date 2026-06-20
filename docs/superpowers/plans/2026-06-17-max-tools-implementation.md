# Max Tools 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **状态（2026-06-20）**：本文是 2026-06-17 的初始实施计划，记录了项目从 0→1 的 TDD 步骤序列。**已全部执行完毕**，作为归档保留（不再回写后续变更）。完成之后又叠加了下列改动，**请以代码 / `README.md` 为准**：
>
> - **第二个工具**：`src/tools/clipboard/`（剪切板选择器），按本文 §基座（Task 5-9）建立的 `ToolManifest` 契约接入，无需改主程序。
> - **基座 enable/disable**：`src/main/tool-registry.ts` 新增 `isToolEnabled` / `setToolEnabled`，禁用时立即 `unregisterAllForTool` 并广播 `tools/changed`；侧栏与托盘据此渲染"（已禁用）"态。`ToolSummary` 加 `enabled: boolean`。
> - **开机启动**：Task 11 Step 4 的"待实现"占位已落实，IPC 通道 `app/get-auto-launch` / `app/set-auto-launch`，主进程调 `app.setLoginItemSettings({ openAtLogin, openAsHidden: true })`。
> - **UI 框架**：全栈迁移到 Mantine v7（参见 `dbe45d5..fc87c5d` 段提交）。本文 §Task 11-13 / 41 写的手写 CSS / 自制 Toggle 已被替换为 Mantine 等价组件。`ShortcutRecorder` 已重写为 `Group + Button + Kbd + ActionIcon`。
> - **签名 + 公证 DMG**：本文 Task 1 的 `package.json` 与最终版本差异较大（缺 `mantine` / `@tabler/icons-react` / `clsx` / `@electron/notarize`，缺 `package:dmg` script，缺 `mac.hardenedRuntime` / `mac.entitlements` / `mac.notarize: false` / `publish: null` / `afterSign`）。打包流程见 `scripts/build-dmg.js` + `scripts/notarize.js` + `build/entitlements.mac.plist`。
> - **测试 mock 漂移**：Task 8 的 `tests/unit/tool-registry.test.ts` mock 块比文中多出 `appStore` / `unregisterAllForTool` / `listShortcuts`，因为 `tool-registry` 现在用到这些。

---

**Goal:** 构建一个 macOS 菜单栏常驻的多工具桌面应用，首期实现可稳定截 macOS 右键菜单的截图工具（含编辑器、取色、马赛克、文字、形状、快捷键配置），架构层面留好可插拔工具的扩展点。

**Architecture:** Electron 主进程承担应用壳 / 工具注册 / 全局快捷键 / 权限协调；每个工具是 `src/tools/<id>/` 下的自治模块，实现统一的 `ToolManifest`，主进程的 `tool-registry` 启动时扫描并初始化；截图工具通过 shell out 到 macOS `screencapture` CLI 抓屏（避免 Electron `desktopCapturer` 截不到系统级浮层的问题），再用 transparent BrowserWindow 叠层让用户做选区/标注。

**Tech Stack:** Electron, React 18, TypeScript, electron-vite, electron-store, electron-log, sharp, vitest

**Spec:** [../specs/2026-06-17-max-tools-design.md](../specs/2026-06-17-max-tools-design.md)

---

## 任务全景

**Phase 1 - 项目基础设施** (Task 1-4)
- 1: 初始化项目（git、package.json、tsconfig、electron-vite、eslint/prettier）
- 2: 主进程骨架（生命周期、单实例锁）
- 3: 日志模块（electron-log 封装）
- 4: 设置存储封装（electron-store + 作用域）

**Phase 2 - 工具框架** (Task 5-9)
- 5: 共享类型（ToolManifest、ToolContext、IPC 协议）
- 6: 权限检测模块
- 7: 全局快捷键中央协调器 + 单测
- 8: 工具注册中心 + 单测
- 9: Tray 菜单栏 + 主窗口控制器

**Phase 3 - 主窗口（React 壳）** (Task 10-13)
- 10: Vite 主窗口 entry + React 启动
- 11: 主窗口布局（侧栏 + 路由）
- 12: 共享组件 1：Toggle / SettingRow / FilePathPicker
- 13: 共享组件 2：ShortcutRecorder（含冲突校验）

**Phase 4 - 截图工具：抓屏与裁剪** (Task 14-18)
- 14: 截图工具 manifest 骨架
- 15: 文件名模板模块 + 单测
- 16: DPI 换算工具 + 单测
- 17: screencapture 调用封装
- 18: sharp 裁剪模块 + 单测

**Phase 5 - 截图工具：叠层（Overlay）** (Task 19-25)
- 19: Overlay window 控制器（主进程）
- 20: CGWindowList 窗口几何抓取
- 21: Overlay React 骨架 + 底图渲染 + ImageData decode
- 22: Overlay - 拖拽矩形选区
- 23: Overlay - 放大镜 + 实时取色
- 24: Overlay - 窗口自动高亮 + 单击截整窗
- 25: 全屏快捷键路径（不出叠层）

**Phase 6 - 截图工具：编辑器** (Task 26-37)
- 26: Editor window 控制器（主进程）
- 27: Editor React 骨架 + Canvas 视图
- 28: 编辑器状态 + 历史栈（undo/redo）+ 单测
- 29: 图层：矩形
- 30: 图层：椭圆
- 31: 图层：箭头
- 32: 图层：画笔
- 33: 图层：文字（DOM input 浮层）
- 34: 图层：马赛克
- 35: 图层：高斯模糊
- 36: 工具栏 UI + 颜色 / 线宽
- 37: 选中已有图层、拖拽改大小、删除

**Phase 7 - 截图工具：出口** (Task 38-40)
- 38: Enter / 完成 → 复制到剪贴板
- 39: 另存为 → 系统 save dialog
- 40: Esc 取消 + 编辑器键盘快捷键全集

**Phase 8 - 截图工具：设置页 & 接入** (Task 41-43)
- 41: 截图工具 settings React 组件（路径、文件名、默认值、快捷键）
- 42: 截图工具完整 init 串联（快捷键 → 全流程）
- 43: 主窗口 lazy 加载 settingsView 接入

**Phase 9 - 收尾** (Task 44-46)
- 44: 权限引导 banner + 对话框
- 45: 手动验收清单文档
- 46: README + 开发说明

---

## Phase 1 - 项目基础设施

### Task 1: 初始化项目

**Files:**
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.prettierrc`
- Create: `.eslintrc.cjs`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: 在项目根目录初始化 git 仓库**

```bash
cd /Users/wzm/Documents/wzm/myself/projects/max-tools
git init
git branch -m main
```

- [ ] **Step 2: 创建 `.gitignore`**

```
node_modules
dist
out
.DS_Store
*.log
.env
.env.local
.vite
coverage
/release
```

- [ ] **Step 3: 创建 `.editorconfig`**

```
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 4: 创建 `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 5: 创建 `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'out', 'node_modules', '*.cjs'],
}
```

- [ ] **Step 6: 创建 `package.json`**

```json
{
  "name": "max-tools",
  "version": "0.1.0",
  "private": true,
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-vite build && electron-builder --mac",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "electron-log": "^5.1.0",
    "electron-store": "^8.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.0",
    "electron-vite": "^2.2.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 7: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"],
      "@preload/*": ["src/preload/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"],
      "@tools/*": ["src/tools/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", "out"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 8: 创建 `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["electron.vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 9: 创建 `electron.vite.config.ts`**

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared'),
        '@tools': resolve('src/tools'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
        '@tools': resolve('src/tools'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main_window: resolve('src/renderer/main-window/index.html'),
          screenshot_overlay: resolve('src/tools/screenshot/renderer/overlay/index.html'),
          screenshot_editor: resolve('src/tools/screenshot/renderer/editor/index.html'),
        },
      },
    },
  },
})
```

- [ ] **Step 10: 创建 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@shared': resolve('src/shared'),
      '@tools': resolve('src/tools'),
    },
  },
})
```

- [ ] **Step 11: 安装依赖**

Run: `npm install`
Expected: 成功安装，无 peer 警告以外的错误。sharp 可能需要 native 编译，等几十秒。

- [ ] **Step 12: 验证 typecheck 通过（空项目）**

Run: `npm run typecheck`
Expected: 退出码 0（虽然没源文件，但不应报配置错）

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: bootstrap electron + react + ts project"
```

---

### Task 2: 主进程骨架

**Files:**
- Create: `src/main/index.ts`

- [ ] **Step 1: 创建主进程入口**

```ts
// src/main/index.ts
import { app, BrowserWindow } from 'electron'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(() => {
  // 后续 task 会在这里挂 tray / main window / tool registry
  console.log('[max-tools] app ready')
})

app.on('window-all-closed', (e: Electron.Event) => {
  // macOS 菜单栏应用：所有窗口关闭也不退出
  if (process.platform === 'darwin') {
    e.preventDefault()
  } else {
    app.quit()
  }
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
```

- [ ] **Step 2: 启动并验证**

Run: `npm run dev`
Expected: 控制台输出 `[max-tools] app ready`；Electron 进程运行；Dock 上可能短暂出现图标（下一 task 会改）。`Ctrl+C` 退出。

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat(main): app entry with single-instance lock"
```

---

### Task 3: 日志模块

**Files:**
- Create: `src/main/logger.ts`

- [ ] **Step 1: 封装 electron-log**

```ts
// src/main/logger.ts
import log from 'electron-log/main'
import { app } from 'electron'
import { join } from 'path'

let initialized = false

export function initLogger(): void {
  if (initialized) return
  initialized = true

  log.initialize()

  const isDev = !app.isPackaged
  log.transports.file.level = 'info'
  log.transports.console.level = isDev ? 'debug' : 'info'
  log.transports.file.resolvePathFn = () =>
    join(app.getPath('logs'), 'max-tools.log')
}

export function createLogger(scope: string): log.LogFunctions {
  return log.scope(scope)
}

export const mainLog = log.scope('main')
```

- [ ] **Step 2: 在 main 入口初始化日志**

Modify: `src/main/index.ts`

```ts
import { app, BrowserWindow } from 'electron'
import { initLogger, mainLog } from './logger'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(() => {
  mainLog.info('app ready')
})

app.on('window-all-closed', (e: Electron.Event) => {
  if (process.platform === 'darwin') {
    e.preventDefault()
  } else {
    app.quit()
  }
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
```

- [ ] **Step 3: 验证**

Run: `npm run dev`
Expected: 控制台带 scope 前缀输出（如 `[2026-06-17 ...] [main] info: app ready`）；`~/Library/Logs/max-tools/max-tools.log` 文件存在并写入。

- [ ] **Step 4: Commit**

```bash
git add src/main/logger.ts src/main/index.ts
git commit -m "feat(main): scoped logging via electron-log"
```

---

### Task 4: 设置存储封装

**Files:**
- Create: `src/main/settings-store.ts`

- [ ] **Step 1: 实现作用域化的 Store**

```ts
// src/main/settings-store.ts
import Store from 'electron-store'

export interface ScopedStore {
  get<T = unknown>(key: string, defaultValue?: T): T
  set(key: string, value: unknown): void
  delete(key: string): void
  has(key: string): boolean
}

const root = new Store({ name: 'max-tools' })

export function getScopedStore(namespace: string): ScopedStore {
  const prefix = `${namespace}.`
  return {
    get: <T,>(key: string, defaultValue?: T): T =>
      (root.get(prefix + key, defaultValue) as T),
    set: (key, value) => root.set(prefix + key, value),
    delete: (key) => root.delete(prefix + key as never),
    has: (key) => root.has(prefix + key),
  }
}

export const appStore: ScopedStore = getScopedStore('app')
```

- [ ] **Step 2: 验证启动不报错**

Run: `npm run dev`
Expected: 启动成功，无错误。

- [ ] **Step 3: Commit**

```bash
git add src/main/settings-store.ts
git commit -m "feat(main): scoped settings store wrapper"
```

---

## Phase 2 - 工具框架

### Task 5: 共享类型

**Files:**
- Create: `src/shared/types/tool-manifest.ts`
- Create: `src/shared/types/ipc.ts`

- [ ] **Step 1: 定义 ToolManifest 与相关类型**

```ts
// src/shared/types/tool-manifest.ts
import type { BrowserWindow } from 'electron'
import type { ComponentType } from 'react'
import type { ScopedStore } from '@main/settings-store'

export interface ToolManifest {
  id: string
  name: string
  icon?: string
  defaultShortcuts: Record<string, string>
  init: (ctx: ToolContext) => Promise<void> | void
  settingsView: () => Promise<{ default: ComponentType<ToolSettingsProps> }>
}

export interface ToolContext {
  id: string
  registerShortcut: (key: string, combo: string, handler: () => void) => Promise<RegisterResult>
  store: ScopedStore
  onIPC: <T = unknown, R = unknown>(channel: string, handler: (payload: T) => R | Promise<R>) => void
  sendToWindow: (win: BrowserWindow, channel: string, payload: unknown) => void
  log: {
    debug: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }
}

export interface ToolSettingsProps {
  store: ScopedStore
  shortcuts: ShortcutBinding[]
  setShortcut: (key: string, combo: string) => Promise<RegisterResult>
  toast: (msg: string, type?: 'info' | 'error') => void
}

export interface ShortcutBinding {
  key: string
  combo: string
  description?: string
}

export interface RegisterResult {
  ok: boolean
  conflictWith?: { toolId: string; key: string }
  reason?: string
}

export interface ToolSummary {
  id: string
  name: string
  icon?: string
  loaded: boolean
  loadError?: string
}
```

- [ ] **Step 2: 定义 IPC 通道**

```ts
// src/shared/types/ipc.ts
export const IPC = {
  ToolList: 'tools/list',
  ToolGetShortcuts: 'tools/get-shortcuts',
  ToolSetShortcut: 'tools/set-shortcut',
  ToolStoreGet: 'tools/store-get',
  ToolStoreSet: 'tools/store-set',
  OpenLogsFolder: 'app/open-logs',
  GetVersion: 'app/get-version',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: 退出码 0

- [ ] **Step 4: Commit**

```bash
git add src/shared/
git commit -m "feat(shared): tool manifest and ipc channel types"
```

---

### Task 6: 权限检测模块

**Files:**
- Create: `src/main/permissions.ts`

- [ ] **Step 1: 实现权限检测**

```ts
// src/main/permissions.ts
import { systemPreferences, shell } from 'electron'
import { mainLog } from './logger'

export type PermissionKind = 'screen' | 'accessibility'
export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

export function getPermissionStatus(kind: PermissionKind): PermissionStatus {
  if (process.platform !== 'darwin') return 'granted'
  if (kind === 'screen') {
    return systemPreferences.getMediaAccessStatus('screen') as PermissionStatus
  }
  if (kind === 'accessibility') {
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied'
  }
  return 'unknown'
}

export async function ensureScreenRecording(): Promise<boolean> {
  const status = getPermissionStatus('screen')
  if (status === 'granted') return true
  mainLog.warn('screen recording not granted, status=', status)
  // 触发系统授权对话框（trigger 一次后 macOS 会记住）
  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess?.('camera').catch(() => {})
  }
  return false
}

export function openPermissionPane(kind: PermissionKind): void {
  if (process.platform !== 'darwin') return
  const url =
    kind === 'screen'
      ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  shell.openExternal(url).catch((err) => mainLog.error('openPermissionPane', err))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/permissions.ts
git commit -m "feat(main): macOS permission detection and guidance"
```

---

### Task 7: 全局快捷键中央协调器 + 单测

**Files:**
- Create: `src/main/shortcut-manager.ts`
- Create: `tests/unit/shortcut-manager.test.ts`

- [ ] **Step 1: 实现快捷键中央协调**

```ts
// src/main/shortcut-manager.ts
import { globalShortcut } from 'electron'
import { mainLog } from './logger'
import type { RegisterResult } from '@shared/types/tool-manifest'

interface Registration {
  toolId: string
  key: string
  combo: string
  handler: () => void
}

const byCombo = new Map<string, Registration>()
const byKey = new Map<string, Registration>() // key = `${toolId}:${key}`

function makeId(toolId: string, key: string): string {
  return `${toolId}:${key}`
}

export interface RegisterArgs {
  toolId: string
  key: string
  combo: string
  handler: () => void
}

export interface RegisterDeps {
  electronRegister?: (combo: string, handler: () => void) => boolean
  electronUnregister?: (combo: string) => void
}

export function registerShortcut(args: RegisterArgs, deps: RegisterDeps = {}): RegisterResult {
  const { toolId, key, combo, handler } = args
  const electronRegister = deps.electronRegister ?? ((c, h) => globalShortcut.register(c, h))
  const electronUnregister = deps.electronUnregister ?? ((c) => globalShortcut.unregister(c))

  if (!combo || combo.trim() === '') {
    // 空 combo 视为"清除该 key 的绑定"
    const id = makeId(toolId, key)
    const prev = byKey.get(id)
    if (prev) {
      electronUnregister(prev.combo)
      byCombo.delete(prev.combo)
      byKey.delete(id)
    }
    return { ok: true }
  }

  const existing = byCombo.get(combo)
  const id = makeId(toolId, key)
  if (existing && makeId(existing.toolId, existing.key) !== id) {
    return {
      ok: false,
      conflictWith: { toolId: existing.toolId, key: existing.key },
      reason: `combo ${combo} already used by ${existing.toolId}/${existing.key}`,
    }
  }

  // 替换原有绑定
  const prev = byKey.get(id)
  if (prev) {
    electronUnregister(prev.combo)
    byCombo.delete(prev.combo)
  }

  const ok = electronRegister(combo, handler)
  if (!ok) {
    return { ok: false, reason: `OS rejected registration of ${combo}` }
  }

  const reg: Registration = { toolId, key, combo, handler }
  byCombo.set(combo, reg)
  byKey.set(id, reg)
  mainLog.info(`shortcut registered ${id} -> ${combo}`)
  return { ok: true }
}

export function unregisterAllForTool(toolId: string): void {
  for (const [id, reg] of [...byKey.entries()]) {
    if (reg.toolId === toolId) {
      globalShortcut.unregister(reg.combo)
      byCombo.delete(reg.combo)
      byKey.delete(id)
    }
  }
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll()
  byCombo.clear()
  byKey.clear()
}

export function listShortcuts(toolId?: string): Registration[] {
  const all = [...byKey.values()]
  return toolId ? all.filter((r) => r.toolId === toolId) : all
}

// 仅用于测试
export function _resetForTest(): void {
  byCombo.clear()
  byKey.clear()
}
```

- [ ] **Step 2: 写单测**

```ts
// tests/unit/shortcut-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerShortcut, _resetForTest, listShortcuts } from '@main/shortcut-manager'

const deps = {
  electronRegister: vi.fn(() => true),
  electronUnregister: vi.fn(),
}

describe('shortcut-manager', () => {
  beforeEach(() => {
    _resetForTest()
    deps.electronRegister.mockClear()
    deps.electronUnregister.mockClear()
    deps.electronRegister.mockReturnValue(true)
  })

  it('registers a fresh combo', () => {
    const r = registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    expect(r.ok).toBe(true)
    expect(deps.electronRegister).toHaveBeenCalledOnce()
    expect(listShortcuts()).toHaveLength(1)
  })

  it('rejects combo conflict from another tool', () => {
    registerShortcut({ toolId: 'a', key: 'x', combo: 'Cmd+B', handler: () => {} }, deps)
    const r = registerShortcut({ toolId: 'b', key: 'y', combo: 'Cmd+B', handler: () => {} }, deps)
    expect(r.ok).toBe(false)
    expect(r.conflictWith).toEqual({ toolId: 'a', key: 'x' })
  })

  it('replaces same toolId/key when combo changes', () => {
    registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    const r = registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+C', handler: () => {} }, deps)
    expect(r.ok).toBe(true)
    expect(deps.electronUnregister).toHaveBeenCalledWith('Cmd+A')
    expect(listShortcuts()).toHaveLength(1)
    expect(listShortcuts()[0].combo).toBe('Cmd+C')
  })

  it('empty combo clears existing binding without registering', () => {
    registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    deps.electronRegister.mockClear()
    const r = registerShortcut({ toolId: 't', key: 'k', combo: '', handler: () => {} }, deps)
    expect(r.ok).toBe(true)
    expect(deps.electronRegister).not.toHaveBeenCalled()
    expect(deps.electronUnregister).toHaveBeenCalledWith('Cmd+A')
    expect(listShortcuts()).toHaveLength(0)
  })

  it('reports OS rejection', () => {
    deps.electronRegister.mockReturnValue(false)
    const r = registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/OS rejected/)
  })
})
```

- [ ] **Step 3: 运行单测**

Run: `npm test`
Expected: 5 个用例全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/main/shortcut-manager.ts tests/unit/shortcut-manager.test.ts
git commit -m "feat(main): central shortcut manager with conflict detection"
```

---

### Task 8: 工具注册中心 + 单测

**Files:**
- Create: `src/main/tool-registry.ts`
- Create: `tests/unit/tool-registry.test.ts`

- [ ] **Step 1: 实现 ToolRegistry**

```ts
// src/main/tool-registry.ts
import { BrowserWindow, ipcMain } from 'electron'
import { mainLog, createLogger } from './logger'
import { getScopedStore } from './settings-store'
import { registerShortcut as smRegister } from './shortcut-manager'
import type { ToolManifest, ToolContext, ToolSummary, RegisterResult } from '@shared/types/tool-manifest'

interface LoadedTool {
  manifest: ToolManifest
  loaded: boolean
  error?: string
}

const tools = new Map<string, LoadedTool>()

export interface LoadOptions {
  manifestLoaders: Array<() => Promise<ToolManifest>>
}

export async function loadTools(opts: LoadOptions): Promise<void> {
  for (const loader of opts.manifestLoaders) {
    let manifest: ToolManifest | undefined
    try {
      manifest = await loader()
    } catch (err) {
      mainLog.error('failed to load a manifest', err)
      continue
    }
    if (!manifest?.id) {
      mainLog.error('manifest missing id, skipping')
      continue
    }
    if (tools.has(manifest.id)) {
      mainLog.error(`duplicate tool id "${manifest.id}", skipping`)
      continue
    }

    const ctx = createContext(manifest)
    try {
      await manifest.init(ctx)
      tools.set(manifest.id, { manifest, loaded: true })
      mainLog.info(`tool loaded: ${manifest.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      tools.set(manifest.id, { manifest, loaded: false, error: msg })
      mainLog.error(`tool init failed: ${manifest.id}`, err)
    }
  }
}

function createContext(manifest: ToolManifest): ToolContext {
  const log = createLogger(manifest.id)
  const store = getScopedStore(`tool.${manifest.id}`)
  const ipcHandlers = new Set<string>()

  const ctx: ToolContext = {
    id: manifest.id,
    store,
    log,
    registerShortcut: async (key, combo, handler) => {
      const stored = store.get<string>(`shortcuts.${key}`, manifest.defaultShortcuts[key] ?? '')
      const finalCombo = combo || stored
      const r: RegisterResult = smRegister({
        toolId: manifest.id,
        key,
        combo: finalCombo,
        handler,
      })
      return r
    },
    onIPC: (channel, handler) => {
      const full = `tool/${manifest.id}/${channel}`
      if (ipcHandlers.has(full)) {
        ipcMain.removeHandler(full)
      }
      ipcMain.handle(full, async (_e, payload) => handler(payload as never))
      ipcHandlers.add(full)
    },
    sendToWindow: (win, channel, payload) => {
      if (!win.isDestroyed()) {
        win.webContents.send(`tool/${manifest.id}/${channel}`, payload)
      }
    },
  }
  return ctx
}

export function listToolSummaries(): ToolSummary[] {
  return [...tools.values()].map((t) => ({
    id: t.manifest.id,
    name: t.manifest.name,
    icon: t.manifest.icon,
    loaded: t.loaded,
    loadError: t.error,
  }))
}

export function getManifest(id: string): ToolManifest | undefined {
  return tools.get(id)?.manifest
}

export function _resetForTest(): void {
  tools.clear()
}
```

- [ ] **Step 2: 写单测**

```ts
// tests/unit/tool-registry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock electron APIs (registry doesn't actually call them in our test paths)
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  BrowserWindow: class {},
}))
vi.mock('@main/logger', () => ({
  mainLog: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@main/settings-store', () => ({
  getScopedStore: () => ({ get: () => '', set: () => {}, delete: () => {}, has: () => false }),
}))
vi.mock('@main/shortcut-manager', () => ({
  registerShortcut: vi.fn(() => ({ ok: true })),
}))

import { loadTools, listToolSummaries, _resetForTest } from '@main/tool-registry'
import type { ToolManifest } from '@shared/types/tool-manifest'

const makeManifest = (overrides: Partial<ToolManifest> = {}): ToolManifest => ({
  id: 'demo',
  name: 'Demo',
  defaultShortcuts: {},
  init: vi.fn(async () => {}),
  settingsView: async () => ({ default: () => null }),
  ...overrides,
})

describe('tool-registry', () => {
  beforeEach(() => _resetForTest())

  it('loads a valid tool', async () => {
    await loadTools({ manifestLoaders: [async () => makeManifest()] })
    const s = listToolSummaries()
    expect(s).toHaveLength(1)
    expect(s[0].loaded).toBe(true)
  })

  it('isolates init failure of one tool from others', async () => {
    const broken = makeManifest({ id: 'broken', init: async () => { throw new Error('boom') } })
    const ok = makeManifest({ id: 'ok' })
    await loadTools({ manifestLoaders: [async () => broken, async () => ok] })
    const s = listToolSummaries()
    expect(s).toHaveLength(2)
    expect(s.find((x) => x.id === 'broken')?.loaded).toBe(false)
    expect(s.find((x) => x.id === 'broken')?.loadError).toBe('boom')
    expect(s.find((x) => x.id === 'ok')?.loaded).toBe(true)
  })

  it('skips duplicate ids', async () => {
    await loadTools({
      manifestLoaders: [async () => makeManifest({ id: 'x' }), async () => makeManifest({ id: 'x' })],
    })
    expect(listToolSummaries()).toHaveLength(1)
  })

  it('skips manifest with missing id', async () => {
    await loadTools({ manifestLoaders: [async () => ({ ...makeManifest(), id: '' })] })
    expect(listToolSummaries()).toHaveLength(0)
  })

  it('swallows loader throw without crashing', async () => {
    await loadTools({
      manifestLoaders: [async () => { throw new Error('nope') }, async () => makeManifest({ id: 'ok' })],
    })
    expect(listToolSummaries()).toHaveLength(1)
  })
})
```

- [ ] **Step 3: 运行单测**

Run: `npm test`
Expected: shortcut-manager 5 个 + tool-registry 5 个，共 10 个用例通过。

- [ ] **Step 4: Commit**

```bash
git add src/main/tool-registry.ts tests/unit/tool-registry.test.ts
git commit -m "feat(main): tool registry with isolation and tests"
```

---

### Task 9: Tray + 主窗口控制器

**Files:**
- Create: `src/main/tray.ts`
- Create: `src/main/main-window.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: 实现 Tray**

```ts
// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from 'electron'
import { mainLog } from './logger'
import { listToolSummaries } from './tool-registry'
import { showMainWindow } from './main-window'

let tray: Tray | null = null

export function createTray(): void {
  // 临时用 16x16 纯色图（后续 task 替换为图标资源）
  const img = nativeImage.createEmpty()
  tray = new Tray(img)
  tray.setToolTip('Max Tools')
  refreshTrayMenu()
}

export function refreshTrayMenu(): void {
  if (!tray) return
  const tools = listToolSummaries()
  const items: Electron.MenuItemConstructorOptions[] = [
    ...tools.map((t) => ({
      label: t.loaded ? t.name : `${t.name} (加载失败)`,
      enabled: t.loaded,
    })),
    { type: 'separator' },
    { label: '打开主窗口', click: () => showMainWindow() },
    { label: '设置…', click: () => showMainWindow('/settings/general') },
    { type: 'separator' },
    { label: '关于', click: () => showMainWindow('/about') },
    { label: '退出', click: () => app.exit(0) },
  ]
  tray.setContextMenu(Menu.buildFromTemplate(items))
  mainLog.debug('tray menu refreshed')
}
```

- [ ] **Step 2: 实现主窗口控制器**

```ts
// src/main/main-window.ts
import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { mainLog } from './logger'

let mainWindow: BrowserWindow | null = null

export function showMainWindow(route?: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    if (route) mainWindow.webContents.send('navigate', route)
    return
  }
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'Max Tools',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/main-window/`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/main-window/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (route) mainWindow?.webContents.send('navigate', route)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainLog.info('main window created')
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
```

- [ ] **Step 3: 在 main 入口接入**

Modify `src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron'
import { initLogger, mainLog } from './logger'
import { createTray } from './tray'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(async () => {
  // macOS 隐藏 Dock 图标（菜单栏应用）
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }
  createTray()
  mainLog.info('app ready, tray created')
})

app.on('window-all-closed', (e: Electron.Event) => {
  if (process.platform === 'darwin') {
    e.preventDefault()
  } else {
    app.quit()
  }
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
```

- [ ] **Step 4: 验证（主窗口暂时会因为没 entry 加载失败，但 Tray 应可见）**

Run: `npm run dev`
Expected: 菜单栏出现一个空图标（因为 nativeImage.createEmpty()），右键能看到菜单项。点"打开主窗口"会失败（renderer 还没建），暂时正常。

- [ ] **Step 5: Commit**

```bash
git add src/main/tray.ts src/main/main-window.ts src/main/index.ts
git commit -m "feat(main): tray + main window controller skeleton"
```

---

## Phase 3 - 主窗口（React 壳）

### Task 10: 主窗口 entry + Preload

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/renderer/main-window/index.html`
- Create: `src/renderer/main-window/index.tsx`

- [ ] **Step 1: 创建 preload**

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types/ipc'

const api = {
  invoke: (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload),
  on: (channel: string, listener: (payload: unknown) => void) => {
    const wrapped = (_e: unknown, payload: unknown) => listener(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
  IPC,
}

contextBridge.exposeInMainWorld('mt', api)

export type MtApi = typeof api
declare global {
  interface Window {
    mt: MtApi
  }
}
```

- [ ] **Step 2: 创建 main-window HTML**

```html
<!-- src/renderer/main-window/index.html -->
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <title>Max Tools</title>
    <meta name="viewport" content="width=device-width" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 创建 React 启动文件（占位）**

```tsx
// src/renderer/main-window/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return <div style={{ padding: 24 }}>Max Tools — 主窗口（占位）</div>
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

- [ ] **Step 4: 验证主窗口加载**

Run: `npm run dev`
Expected: 启动后点 Tray 中"打开主窗口"，能看到"Max Tools — 主窗口（占位）"。

- [ ] **Step 5: Commit**

```bash
git add src/preload src/renderer
git commit -m "feat(renderer): main window entry with react skeleton"
```

---

### Task 11: 主窗口布局（侧栏 + 路由）

**Files:**
- Create: `src/renderer/main-window/App.tsx`
- Create: `src/renderer/main-window/pages/general.tsx`
- Create: `src/renderer/main-window/pages/about.tsx`
- Create: `src/renderer/main-window/pages/tool-host.tsx`
- Create: `src/renderer/main-window/styles.css`
- Modify: `src/renderer/main-window/index.tsx`
- Modify: `src/main/index.ts` (注册 IPC: ToolList、GetVersion、OpenLogsFolder)

- [ ] **Step 1: 在主进程注册 IPC**

Modify `src/main/index.ts`:

```ts
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { initLogger, mainLog } from './logger'
import { createTray } from './tray'
import { listToolSummaries } from './tool-registry'
import { IPC } from '@shared/types/ipc'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

function registerAppIpc(): void {
  ipcMain.handle(IPC.ToolList, () => listToolSummaries())
  ipcMain.handle(IPC.GetVersion, () => app.getVersion())
  ipcMain.handle(IPC.OpenLogsFolder, () => shell.openPath(app.getPath('logs')))
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }
  registerAppIpc()
  createTray()
  mainLog.info('app ready, tray created')
})

app.on('window-all-closed', (e: Electron.Event) => {
  if (process.platform === 'darwin') e.preventDefault()
  else app.quit()
})

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
```

- [ ] **Step 2: 写主样式（极简）**

```css
/* src/renderer/main-window/styles.css */
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  font-size: 13px;
  color: #1d1d1f;
  background: #f5f5f7;
}
.app {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 200px;
  background: #ececef;
  border-right: 1px solid #d1d1d6;
  display: flex;
  flex-direction: column;
  padding: 16px 8px;
  gap: 4px;
}
.sidebar-section {
  font-size: 11px;
  color: #6e6e73;
  text-transform: uppercase;
  padding: 12px 8px 4px;
  letter-spacing: 0.5px;
}
.sidebar-item {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-item:hover { background: rgba(0,0,0,0.05); }
.sidebar-item.active { background: #007aff; color: white; }
.sidebar-item.disabled { color: #8e8e93; cursor: not-allowed; }
.content {
  flex: 1;
  overflow: auto;
  padding: 24px 32px;
}
.content h1 { font-size: 18px; margin: 0 0 16px; }
.row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.row label { flex: 0 0 160px; color: #3a3a3c; }
.error-banner { background: #ffe4e4; color: #a40000; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
```

- [ ] **Step 3: 实现 App 与简易路由**

```tsx
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

  useEffect(() => {
    window.mt.invoke(window.mt.IPC.ToolList).then((t) => setTools(t as ToolSummary[]))
    const off = window.mt.on('navigate', (path) => setRoute(parseRoute(path as string)))
    return off
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
        {route.kind === 'tool' && <ToolHostPage toolId={route.id} />}
        {route.kind === 'general' && <GeneralPage />}
        {route.kind === 'about' && <AboutPage />}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: 实现通用页**

```tsx
// src/renderer/main-window/pages/general.tsx
import React from 'react'

export function GeneralPage() {
  return (
    <div>
      <h1>通用设置</h1>
      <div className="row">
        <label>开机启动</label>
        <span>（待实现）</span>
      </div>
      <div className="row">
        <label>主题</label>
        <span>跟随系统</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 实现关于页**

```tsx
// src/renderer/main-window/pages/about.tsx
import React, { useEffect, useState } from 'react'

export function AboutPage() {
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.mt.invoke(window.mt.IPC.GetVersion).then((v) => setVersion(v as string))
  }, [])
  return (
    <div>
      <h1>关于</h1>
      <div className="row"><label>版本</label><span>{version}</span></div>
      <div className="row">
        <label>日志</label>
        <button onClick={() => window.mt.invoke(window.mt.IPC.OpenLogsFolder)}>打开日志目录</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 实现工具宿主页（占位，下个 task 接 lazy load）**

```tsx
// src/renderer/main-window/pages/tool-host.tsx
import React from 'react'

interface Props {
  toolId: string
}

export function ToolHostPage({ toolId }: Props) {
  return (
    <div>
      <h1>工具：{toolId}</h1>
      <div>（settings view 待 Task 43 接入）</div>
    </div>
  )
}
```

- [ ] **Step 7: 修改 index.tsx 引入 App + 样式**

```tsx
// src/renderer/main-window/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

- [ ] **Step 8: 验证**

Run: `npm run dev`
Expected: 主窗口出现，左侧栏有"工具（暂无）"和"设置 / 通用 / 关于"。点"关于"看到版本号；点"打开日志目录"打开 Finder。

- [ ] **Step 9: Commit**

```bash
git add src/renderer src/main/index.ts
git commit -m "feat(renderer): main window with sidebar, general/about pages"
```

---

### Task 12: 共享组件 1 - Toggle / SettingRow / FilePathPicker

**Files:**
- Create: `src/renderer/shared/components/SettingRow.tsx`
- Create: `src/renderer/shared/components/Toggle.tsx`
- Create: `src/renderer/shared/components/FilePathPicker.tsx`
- Modify: `src/main/index.ts` (注册 dialog showOpenDialog 的 IPC)
- Create: `src/shared/types/dialog.ts`

- [ ] **Step 1: SettingRow（统一的"标签 + 控件"行）**

```tsx
// src/renderer/shared/components/SettingRow.tsx
import React from 'react'

interface Props {
  label: string
  hint?: string
  children: React.ReactNode
}

export function SettingRow({ label, hint, children }: Props) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <label style={{ paddingTop: 4 }}>{label}</label>
      <div style={{ flex: 1 }}>
        {children}
        {hint && <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 4 }}>{hint}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Toggle**

```tsx
// src/renderer/shared/components/Toggle.tsx
import React from 'react'

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: checked ? '#34c759' : '#d1d1d6',
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 20 : 2, width: 18, height: 18,
        borderRadius: '50%', background: 'white', transition: 'left 0.15s',
      }} />
    </button>
  )
}
```

- [ ] **Step 3: 注册 dialog IPC**

Add to `src/shared/types/ipc.ts`:

```ts
export const IPC = {
  ToolList: 'tools/list',
  ToolGetShortcuts: 'tools/get-shortcuts',
  ToolSetShortcut: 'tools/set-shortcut',
  ToolStoreGet: 'tools/store-get',
  ToolStoreSet: 'tools/store-set',
  OpenLogsFolder: 'app/open-logs',
  GetVersion: 'app/get-version',
  DialogOpenDirectory: 'app/dialog-open-directory',
  DialogSaveFile: 'app/dialog-save-file',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
```

Modify `src/main/index.ts` 的 `registerAppIpc` 函数：

```ts
function registerAppIpc(): void {
  ipcMain.handle(IPC.ToolList, () => listToolSummaries())
  ipcMain.handle(IPC.GetVersion, () => app.getVersion())
  ipcMain.handle(IPC.OpenLogsFolder, () => shell.openPath(app.getPath('logs')))
  ipcMain.handle(IPC.DialogOpenDirectory, async (_e, defaultPath?: string) => {
    const { dialog } = await import('electron')
    const r = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath,
    })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle(IPC.DialogSaveFile, async (_e, args: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const { dialog } = await import('electron')
    const r = await dialog.showSaveDialog({
      defaultPath: args.defaultPath,
      filters: args.filters,
    })
    return r.canceled ? null : r.filePath
  })
}
```

- [ ] **Step 4: FilePathPicker**

```tsx
// src/renderer/shared/components/FilePathPicker.tsx
import React from 'react'

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
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d1d6', borderRadius: 4 }}
      />
      <button type="button" onClick={handlePick}>选择…</button>
    </div>
  )
}
```

- [ ] **Step 5: 验证（手动）**

Run: `npm run dev`
Expected: 启动正常。组件还没接入页面，下一 task 会用。

- [ ] **Step 6: Commit**

```bash
git add src/renderer/shared/components/ src/main/index.ts src/shared/types/ipc.ts
git commit -m "feat(renderer): shared form components + dialog ipc"
```

---

### Task 13: 共享组件 2 - ShortcutRecorder

**Files:**
- Create: `src/renderer/shared/components/ShortcutRecorder.tsx`

- [ ] **Step 1: 实现 ShortcutRecorder**

```tsx
// src/renderer/shared/components/ShortcutRecorder.tsx
import React, { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (combo: string) => Promise<{ ok: boolean; conflictWith?: { toolId: string; key: string }; reason?: string }>
  placeholder?: string
}

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift'])

function eventToCombo(e: KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.metaKey) parts.push('Cmd')
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  // 主键
  if (MODIFIER_KEYS.has(e.key)) return null
  let main = e.key
  if (main === ' ') main = 'Space'
  else if (main.length === 1) main = main.toUpperCase()
  parts.push(main)
  if (parts.length < 2) return null // 至少要一个修饰键
  return parts.join('+')
}

export function ShortcutRecorder({ value, onChange, placeholder }: Props) {
  const [recording, setRecording] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!recording) return
    const onKey = async (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(false)
        setDraft(null)
        setError(null)
        return
      }
      const combo = eventToCombo(e)
      if (!combo) return
      setDraft(combo)
      const r = await onChange(combo)
      if (r.ok) {
        setRecording(false)
        setError(null)
      } else {
        setError(
          r.conflictWith
            ? `已被 ${r.conflictWith.toolId} / ${r.conflictWith.key} 占用`
            : r.reason ?? '注册失败',
        )
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, onChange])

  const display = draft ?? value ?? ''
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setRecording((r) => !r); setDraft(null); setError(null) }}
        style={{
          minWidth: 140, padding: '4px 12px',
          background: recording ? '#fff3cd' : 'white',
          border: '1px solid #d1d1d6', borderRadius: 4,
          fontFamily: 'monospace',
        }}
      >
        {recording ? '按下组合键…（Esc 取消）' : display || placeholder || '未设置'}
      </button>
      {value && !recording && (
        <button type="button" onClick={async () => { await onChange(''); setDraft(null) }}>清除</button>
      )}
      {error && <span style={{ color: '#a40000', fontSize: 11 }}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/shared/components/ShortcutRecorder.tsx
git commit -m "feat(renderer): shortcut recorder component"
```

---

## Phase 4 - 截图工具：抓屏与裁剪

### Task 14: 截图工具 manifest 骨架

**Files:**
- Create: `src/tools/screenshot/manifest.ts`
- Create: `src/tools/screenshot/main/index.ts`
- Create: `src/tools/screenshot/renderer/settings/index.tsx`
- Modify: `src/main/index.ts` (调 loadTools 加载 screenshot)

- [ ] **Step 1: 创建 manifest（仅注册一个 dummy 入口验证链路）**

```ts
// src/tools/screenshot/manifest.ts
import type { ToolManifest } from '@shared/types/tool-manifest'
import { initScreenshotTool } from './main/index'

export const screenshotManifest: ToolManifest = {
  id: 'screenshot',
  name: '截图',
  defaultShortcuts: {
    region: 'CommandOrControl+Shift+A',
    fullscreen: 'CommandOrControl+Shift+F',
  },
  init: initScreenshotTool,
  settingsView: () => import('../renderer/settings/index'),
}
```

- [ ] **Step 2: 主进程入口骨架**

```ts
// src/tools/screenshot/main/index.ts
import type { ToolContext } from '@shared/types/tool-manifest'

export async function initScreenshotTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('screenshot tool init (skeleton)')
  // 后续 task 在这里注册快捷键、IPC、窗口
}
```

- [ ] **Step 3: 设置页占位**

```tsx
// src/tools/screenshot/renderer/settings/index.tsx
import React from 'react'
import type { ToolSettingsProps } from '@shared/types/tool-manifest'

export default function ScreenshotSettings(_props: ToolSettingsProps) {
  return <div>截图设置（待 Task 41 实现）</div>
}
```

- [ ] **Step 4: 主进程加载该工具**

Modify `src/main/index.ts`:

```ts
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { initLogger, mainLog } from './logger'
import { createTray, refreshTrayMenu } from './tray'
import { listToolSummaries, loadTools } from './tool-registry'
import { IPC } from '@shared/types/ipc'

initLogger()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit(); process.exit(0) }

function registerAppIpc(): void {
  ipcMain.handle(IPC.ToolList, () => listToolSummaries())
  ipcMain.handle(IPC.GetVersion, () => app.getVersion())
  ipcMain.handle(IPC.OpenLogsFolder, () => shell.openPath(app.getPath('logs')))
  ipcMain.handle(IPC.DialogOpenDirectory, async (_e, defaultPath?: string) => {
    const { dialog } = await import('electron')
    const r = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath,
    })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle(IPC.DialogSaveFile, async (_e, args: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const { dialog } = await import('electron')
    const r = await dialog.showSaveDialog({
      defaultPath: args.defaultPath,
      filters: args.filters,
    })
    return r.canceled ? null : r.filePath
  })
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock?.hide()
  registerAppIpc()
  await loadTools({
    manifestLoaders: [
      async () => (await import('@tools/screenshot/manifest')).screenshotManifest,
    ],
  })
  createTray()
  refreshTrayMenu()
  mainLog.info('app fully started')
})

app.on('window-all-closed', (e: Electron.Event) => {
  if (process.platform === 'darwin') e.preventDefault()
  else app.quit()
})
app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) wins[0].show()
})
```

- [ ] **Step 5: 验证**

Run: `npm run dev`
Expected: 日志看到 `screenshot tool init (skeleton)` 和 `tool loaded: screenshot`。主窗口左侧栏出现"截图"。点进去看到占位文本。

- [ ] **Step 6: Commit**

```bash
git add src/tools/screenshot src/main/index.ts
git commit -m "feat(tools): screenshot manifest skeleton wired to registry"
```

---

### Task 15: 文件名模板模块 + 单测

**Files:**
- Create: `src/tools/screenshot/main/filename.ts`
- Create: `tests/unit/filename.test.ts`

- [ ] **Step 1: 写失败的单测先**

```ts
// tests/unit/filename.test.ts
import { describe, it, expect } from 'vitest'
import { renderFilenameTemplate } from '@tools/screenshot/main/filename'

describe('renderFilenameTemplate', () => {
  const fixedDate = new Date('2026-06-17T21:30:45')

  it('substitutes yyyy/MM/dd/HH/mm/ss', () => {
    const r = renderFilenameTemplate('shot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}', fixedDate)
    expect(r).toBe('shot-2026-06-17-21-30-45')
  })

  it('pads single digits with leading zero', () => {
    const d = new Date('2026-01-02T03:04:05')
    const r = renderFilenameTemplate('{yyyy}-{MM}-{dd}T{HH}:{mm}:{ss}', d)
    expect(r).toBe('2026-01-02T03:04:05')
  })

  it('leaves unknown tokens intact', () => {
    expect(renderFilenameTemplate('foo-{bar}', fixedDate)).toBe('foo-{bar}')
  })

  it('falls back to a default when template empty', () => {
    expect(renderFilenameTemplate('', fixedDate)).toMatch(/^screenshot-\d{4}-\d{2}-\d{2}/)
  })

  it('sanitizes path separators', () => {
    expect(renderFilenameTemplate('foo/bar', fixedDate)).toBe('foo-bar')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- filename`
Expected: 报错（找不到模块）

- [ ] **Step 3: 实现**

```ts
// src/tools/screenshot/main/filename.ts
const pad = (n: number) => String(n).padStart(2, '0')

const TOKENS = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss'] as const
type Token = (typeof TOKENS)[number]

function resolveToken(token: Token, d: Date): string {
  switch (token) {
    case 'yyyy': return String(d.getFullYear())
    case 'MM': return pad(d.getMonth() + 1)
    case 'dd': return pad(d.getDate())
    case 'HH': return pad(d.getHours())
    case 'mm': return pad(d.getMinutes())
    case 'ss': return pad(d.getSeconds())
  }
}

export function renderFilenameTemplate(template: string, when: Date = new Date()): string {
  const t = template && template.trim().length > 0
    ? template
    : 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}'
  const replaced = t.replace(/\{(\w+)\}/g, (m, key) => {
    return TOKENS.includes(key as Token) ? resolveToken(key as Token, when) : m
  })
  return replaced.replace(/[\/\\:*?"<>|]/g, '-')
}
```

- [ ] **Step 4: 跑测试通过**

Run: `npm test`
Expected: 全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/tools/screenshot/main/filename.ts tests/unit/filename.test.ts
git commit -m "feat(screenshot): filename template renderer with tests"
```

---

### Task 16: DPI 换算工具 + 单测

**Files:**
- Create: `src/tools/screenshot/main/dpi.ts`
- Create: `tests/unit/dpi.test.ts`

- [ ] **Step 1: 单测先行**

```ts
// tests/unit/dpi.test.ts
import { describe, it, expect } from 'vitest'
import { cssToImage, imageToCss, clampRectInBounds } from '@tools/screenshot/main/dpi'

describe('dpi', () => {
  it('cssToImage multiplies by dpr', () => {
    expect(cssToImage({ x: 100, y: 200, w: 50, h: 60 }, 2)).toEqual({ x: 200, y: 400, w: 100, h: 120 })
  })
  it('imageToCss divides by dpr (round)', () => {
    expect(imageToCss({ x: 201, y: 401, w: 101, h: 121 }, 2)).toEqual({ x: 101, y: 201, w: 51, h: 61 })
  })
  it('cssToImage at dpr=1 is identity', () => {
    const r = { x: 10, y: 20, w: 30, h: 40 }
    expect(cssToImage(r, 1)).toEqual(r)
  })
  it('clampRectInBounds keeps rect inside', () => {
    expect(clampRectInBounds({ x: -10, y: -5, w: 100, h: 50 }, 80, 40)).toEqual({ x: 0, y: 0, w: 80, h: 40 })
  })
  it('clampRectInBounds normalizes negative w/h (drag-up-left)', () => {
    expect(clampRectInBounds({ x: 50, y: 50, w: -30, h: -20 }, 100, 100)).toEqual({ x: 20, y: 30, w: 30, h: 20 })
  })
})
```

- [ ] **Step 2: 实现**

```ts
// src/tools/screenshot/main/dpi.ts
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function cssToImage(r: Rect, dpr: number): Rect {
  return { x: r.x * dpr, y: r.y * dpr, w: r.w * dpr, h: r.h * dpr }
}

export function imageToCss(r: Rect, dpr: number): Rect {
  return {
    x: Math.round(r.x / dpr),
    y: Math.round(r.y / dpr),
    w: Math.round(r.w / dpr),
    h: Math.round(r.h / dpr),
  }
}

export function clampRectInBounds(r: Rect, maxW: number, maxH: number): Rect {
  // 先归一化负宽高
  let { x, y, w, h } = r
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  // 再裁到边界
  if (x < 0) { w += x; x = 0 }
  if (y < 0) { h += y; y = 0 }
  if (x + w > maxW) w = maxW - x
  if (y + h > maxH) h = maxH - y
  if (w < 0) w = 0
  if (h < 0) h = 0
  return { x, y, w, h }
}
```

- [ ] **Step 3: 测试通过**

Run: `npm test`
Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/main/dpi.ts tests/unit/dpi.test.ts
git commit -m "feat(screenshot): dpi/rect utility functions with tests"
```

---

### Task 17: screencapture 调用封装

**Files:**
- Create: `src/tools/screenshot/main/capture.ts`

- [ ] **Step 1: 实现 capture**

```ts
// src/tools/screenshot/main/capture.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { screen, type Display } from 'electron'
import { createLogger } from '@main/logger'

const execFileP = promisify(execFile)
const log = createLogger('screenshot.capture')

export interface CapturedDisplay {
  display: Display
  imagePath: string
  pixelWidth: number    // 物理像素
  pixelHeight: number
}

/**
 * 对每块显示器调用 macOS 自带的 `screencapture` CLI 抓屏。
 * `-x` 静音；`-D <displayId>` 指定显示器；`-t png` 输出 png。
 * `screencapture` 的 -D 参数从 1 开始，与 Electron Display 的顺序对应。
 * 我们直接按 screen.getAllDisplays() 顺序枚举并传 1..N。
 */
export async function captureAllDisplays(): Promise<CapturedDisplay[]> {
  const displays = screen.getAllDisplays()
  const ts = Date.now()

  const results = await Promise.all(
    displays.map(async (display, idx) => {
      const imagePath = join(tmpdir(), `maxtools-shot-${ts}-${idx}.png`)
      try {
        await execFileP('/usr/sbin/screencapture', [
          '-x',
          '-D', String(idx + 1),
          '-t', 'png',
          imagePath,
        ], { timeout: 5000 })
      } catch (err) {
        log.error('screencapture failed for display', idx, err)
        throw err
      }
      // 物理像素 = CSS 尺寸 * 缩放
      const { width, height } = display.size
      const dpr = display.scaleFactor
      return {
        display,
        imagePath,
        pixelWidth: Math.round(width * dpr),
        pixelHeight: Math.round(height * dpr),
      }
    }),
  )
  log.info(`captured ${results.length} displays in ${Date.now() - ts}ms`)
  return results
}

export async function captureSingleDisplay(displayIndex: number): Promise<CapturedDisplay> {
  const displays = screen.getAllDisplays()
  const d = displays[displayIndex]
  if (!d) throw new Error(`display index ${displayIndex} out of range`)
  const ts = Date.now()
  const imagePath = join(tmpdir(), `maxtools-fs-${ts}.png`)
  await execFileP('/usr/sbin/screencapture', [
    '-x', '-D', String(displayIndex + 1), '-t', 'png', imagePath,
  ], { timeout: 5000 })
  const { width, height } = d.size
  const dpr = d.scaleFactor
  return {
    display: d,
    imagePath,
    pixelWidth: Math.round(width * dpr),
    pixelHeight: Math.round(height * dpr),
  }
}
```

- [ ] **Step 2: 验证（手动）**

Run: `npm run dev` 然后在主进程添加临时一次调用：在 `initScreenshotTool` 里加 `await import('./capture').then(m => m.captureAllDisplays()).then(r => ctx.log.info('test capture:', r))`

Expected: 启动后日志看到 `captured N displays in Xms`，`/tmp/maxtools-shot-*.png` 文件被创建（可用 Finder 打开看）。验证完把临时调用删掉。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/main/capture.ts
git commit -m "feat(screenshot): screencapture CLI wrapper"
```

---

### Task 18: sharp 裁剪模块 + 单测

**Files:**
- Create: `src/tools/screenshot/main/crop.ts`
- Create: `tests/unit/crop.test.ts`

- [ ] **Step 1: 单测：纯坐标校验函数**

```ts
// tests/unit/crop.test.ts
import { describe, it, expect } from 'vitest'
import { validateCropRegion } from '@tools/screenshot/main/crop'

describe('validateCropRegion', () => {
  it('passes valid rect', () => {
    expect(() => validateCropRegion({ x: 0, y: 0, w: 10, h: 10 }, 100, 100)).not.toThrow()
  })
  it('throws when zero size', () => {
    expect(() => validateCropRegion({ x: 10, y: 10, w: 0, h: 5 }, 100, 100)).toThrow()
  })
  it('throws when out of bounds', () => {
    expect(() => validateCropRegion({ x: 90, y: 0, w: 20, h: 10 }, 100, 100)).toThrow()
  })
  it('throws on negative origin', () => {
    expect(() => validateCropRegion({ x: -1, y: 0, w: 10, h: 10 }, 100, 100)).toThrow()
  })
})
```

- [ ] **Step 2: 实现**

```ts
// src/tools/screenshot/main/crop.ts
import sharp from 'sharp'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Rect } from './dpi'

export function validateCropRegion(r: Rect, imgW: number, imgH: number): void {
  if (r.w <= 0 || r.h <= 0) throw new Error(`invalid crop: zero size (${r.w}x${r.h})`)
  if (r.x < 0 || r.y < 0) throw new Error(`invalid crop: negative origin (${r.x},${r.y})`)
  if (r.x + r.w > imgW || r.y + r.h > imgH) {
    throw new Error(`invalid crop: out of bounds (${r.x + r.w},${r.y + r.h} vs ${imgW}x${imgH})`)
  }
}

export interface CropResult {
  outputPath: string
  width: number
  height: number
}

export async function cropImage(
  inputPath: string,
  regionInImagePixels: Rect,
  imgW: number,
  imgH: number,
): Promise<CropResult> {
  validateCropRegion(regionInImagePixels, imgW, imgH)
  const out = join(tmpdir(), `maxtools-crop-${Date.now()}.png`)
  await sharp(inputPath)
    .extract({
      left: Math.round(regionInImagePixels.x),
      top: Math.round(regionInImagePixels.y),
      width: Math.round(regionInImagePixels.w),
      height: Math.round(regionInImagePixels.h),
    })
    .png()
    .toFile(out)
  return { outputPath: out, width: regionInImagePixels.w, height: regionInImagePixels.h }
}
```

- [ ] **Step 3: 测试通过**

Run: `npm test`
Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/main/crop.ts tests/unit/crop.test.ts
git commit -m "feat(screenshot): sharp-based image crop with region validation"
```

---

## Phase 5 - 截图工具：叠层（Overlay）

### Task 19: Overlay window 控制器

**Files:**
- Create: `src/tools/screenshot/main/overlay-controller.ts`
- Create: `src/shared/types/screenshot-ipc.ts`

- [ ] **Step 1: 定义截图工具内部 IPC**

```ts
// src/shared/types/screenshot-ipc.ts
import type { Rect } from '@tools/screenshot/main/dpi'

export const SS_IPC = {
  /** main → overlay 渲染层：推送底图与几何 */
  OverlayInit: 'overlay/init',
  /** overlay → main：用户确认选区 */
  OverlaySelected: 'overlay/selected',
  /** overlay → main：用户取消（Esc） */
  OverlayCancelled: 'overlay/cancelled',
  /** main → overlay：要求关闭 */
  OverlayClose: 'overlay/close',
  /** main → editor：推送裁剪后图 */
  EditorInit: 'editor/init',
  /** editor → main：完成（写剪贴板） */
  EditorComplete: 'editor/complete',
  /** editor → main：另存为 */
  EditorSaveAs: 'editor/save-as',
  /** editor → main：取消 */
  EditorCancel: 'editor/cancel',
} as const

export interface OverlayInitPayload {
  imagePath: string
  displayBounds: { x: number; y: number; width: number; height: number } // CSS px
  pixelWidth: number   // 位图物理像素
  pixelHeight: number
  devicePixelRatio: number
  windowsOnThisDisplay: WindowGeometry[]
}

export interface WindowGeometry {
  ownerName: string
  bounds: { x: number; y: number; width: number; height: number } // CSS px in display-local coords
  zOrder: number
}

export interface OverlaySelectedPayload {
  displayId: number
  regionInImagePixels: Rect
  pickedColor?: { hex: string; r: number; g: number; b: number }
}
```

- [ ] **Step 2: Overlay 控制器**

```ts
// src/tools/screenshot/main/overlay-controller.ts
import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { captureAllDisplays, type CapturedDisplay } from './capture'
import { detectWindowsOnDisplay } from './window-detect'
import { cropImage } from './crop'
import { SS_IPC, type OverlayInitPayload, type OverlaySelectedPayload } from '@shared/types/screenshot-ipc'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.overlay')

let activeOverlays: BrowserWindow[] = []

function buildOverlayWindow(captured: CapturedDisplay): BrowserWindow {
  const { display } = captured
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../../../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  return win
}

export interface ShowOverlayResult {
  cancelled: boolean
  croppedPath?: string
  width?: number
  height?: number
  region?: { x: number; y: number; w: number; h: number }
  displayBounds?: { x: number; y: number; width: number; height: number }
}

export async function showOverlays(): Promise<ShowOverlayResult> {
  const captured = await captureAllDisplays()
  if (captured.length === 0) return { cancelled: true }

  return new Promise((resolve) => {
    const settledKey = Symbol('settled')
    let settled = false
    const settle = (r: ShowOverlayResult) => {
      if (settled) return
      settled = true
      ;(global as Record<string | symbol, unknown>)[settledKey] = true
      closeAll()
      cleanupIpc()
      resolve(r)
    }

    const closeAll = () => {
      for (const w of activeOverlays) {
        if (!w.isDestroyed()) w.close()
      }
      activeOverlays = []
    }

    const onSelected = async (_e: Electron.IpcMainEvent, payload: OverlaySelectedPayload) => {
      const cap = captured[payload.displayId]
      if (!cap) { log.error('selected unknown displayId', payload.displayId); return }
      try {
        const cropped = await cropImage(
          cap.imagePath,
          payload.regionInImagePixels,
          cap.pixelWidth,
          cap.pixelHeight,
        )
        settle({
          cancelled: false,
          croppedPath: cropped.outputPath,
          width: payload.regionInImagePixels.w,
          height: payload.regionInImagePixels.h,
          region: payload.regionInImagePixels,
          displayBounds: cap.display.bounds,
        })
      } catch (err) {
        log.error('crop failed', err)
        settle({ cancelled: true })
      }
    }
    const onCancelled = () => settle({ cancelled: true })

    ipcMain.on(SS_IPC.OverlaySelected, onSelected)
    ipcMain.on(SS_IPC.OverlayCancelled, onCancelled)

    const cleanupIpc = () => {
      ipcMain.off(SS_IPC.OverlaySelected, onSelected)
      ipcMain.off(SS_IPC.OverlayCancelled, onCancelled)
    }

    // 为每块屏创建叠层
    captured.forEach((cap, idx) => {
      const win = buildOverlayWindow(cap)
      activeOverlays.push(win)
      win.on('blur', () => {
        // 任意叠层失焦：关闭所有并取消
        settle({ cancelled: true })
      })
      win.on('closed', () => {
        if (!settled) settle({ cancelled: true })
      })

      const url = process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/../tools/screenshot/renderer/overlay/`
        : null
      if (url) {
        win.loadURL(url)
      } else {
        win.loadFile(join(__dirname, '../../../renderer/screenshot/overlay/index.html'))
      }

      win.webContents.once('did-finish-load', () => {
        const payload: OverlayInitPayload = {
          imagePath: cap.imagePath,
          displayBounds: cap.display.bounds,
          pixelWidth: cap.pixelWidth,
          pixelHeight: cap.pixelHeight,
          devicePixelRatio: cap.display.scaleFactor,
          windowsOnThisDisplay: detectWindowsOnDisplay(cap.display),
        }
        // 渲染层用 displayId = 数组索引
        win.webContents.send(SS_IPC.OverlayInit, { ...payload, displayId: idx })
      })
    })
  })
}
```

> 注：上面 `URL` 拼装路径是示意；具体调试时根据 `electron.vite.config.ts` 的 input key 调整（`screenshot_overlay`）。下一 task 创建 entry 后再校准。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/main/overlay-controller.ts src/shared/types/screenshot-ipc.ts
git commit -m "feat(screenshot): overlay window controller scaffold"
```

---

### Task 20: CGWindowList 窗口几何抓取

**Files:**
- Create: `src/tools/screenshot/main/window-detect.ts`

- [ ] **Step 1: 实现（macOS 用 osascript 调 CoreGraphics，简化为 JSON 输出）**

```ts
// src/tools/screenshot/main/window-detect.ts
import { execFileSync } from 'node:child_process'
import type { Display } from 'electron'
import { createLogger } from '@main/logger'
import type { WindowGeometry } from '@shared/types/screenshot-ipc'

const log = createLogger('screenshot.window-detect')

const APPLESCRIPT = `
use framework "AppKit"
use scripting additions

set output to ""
set windowList to (current application's CGWindowListCopyWindowInfo(((current application's kCGWindowListOptionOnScreenOnly) as integer) + ((current application's kCGWindowListExcludeDesktopElements) as integer), (current application's kCGNullWindowID) as integer)) as list

repeat with w in windowList
  try
    set theOwner to (w's |kCGWindowOwnerName|) as text
    set theBounds to w's |kCGWindowBounds|
    set theLayer to (w's |kCGWindowLayer|) as integer
    if theLayer is 0 then
      set X to (theBounds's |X|) as integer
      set Y to (theBounds's |Y|) as integer
      set W to (theBounds's |Width|) as integer
      set H to (theBounds's |Height|) as integer
      set output to output & theOwner & "|" & X & "|" & Y & "|" & W & "|" & H & linefeed
    end if
  end try
end repeat

return output
`

export function detectWindowsOnDisplay(display: Display): WindowGeometry[] {
  if (process.platform !== 'darwin') return []
  try {
    const out = execFileSync('/usr/bin/osascript', ['-e', APPLESCRIPT], {
      timeout: 1500,
      encoding: 'utf8',
    })
    const lines = out.split('\n').filter((l) => l.trim().length > 0)
    const result: WindowGeometry[] = []
    let z = 0
    for (const line of lines) {
      const parts = line.split('|')
      if (parts.length !== 5) continue
      const [owner, xs, ys, ws, hs] = parts
      const x = Number(xs), y = Number(ys), w = Number(ws), h = Number(hs)
      // 只保留与该 display 相交的窗口（坐标是全局桌面坐标）
      const dx = display.bounds.x, dy = display.bounds.y
      const dw = display.bounds.width, dh = display.bounds.height
      const intersect =
        x < dx + dw && x + w > dx && y < dy + dh && y + h > dy
      if (!intersect) continue
      result.push({
        ownerName: owner,
        // 转换到该 display 局部坐标
        bounds: { x: x - dx, y: y - dy, width: w, height: h },
        zOrder: z++,
      })
    }
    return result
  } catch (err) {
    log.warn('window detect failed (Accessibility 权限可能未授予):', err)
    return []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/screenshot/main/window-detect.ts
git commit -m "feat(screenshot): window geometry detection via osascript"
```

---

### Task 21: Overlay React 骨架 + 底图渲染 + ImageData decode

**Files:**
- Create: `src/tools/screenshot/renderer/overlay/index.html`
- Create: `src/tools/screenshot/renderer/overlay/index.tsx`
- Create: `src/tools/screenshot/renderer/overlay/Overlay.tsx`
- Create: `src/tools/screenshot/renderer/overlay/useImagePixels.ts`
- Create: `src/tools/screenshot/renderer/overlay/styles.css`
- Modify: `src/preload/index.ts` (暴露截图 IPC channel)

- [ ] **Step 1: 扩展 preload 暴露 SS_IPC**

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types/ipc'
import { SS_IPC } from '@shared/types/screenshot-ipc'

const api = {
  invoke: (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload),
  send: (channel: string, payload?: unknown) => ipcRenderer.send(channel, payload),
  on: (channel: string, listener: (payload: unknown) => void) => {
    const wrapped = (_e: unknown, payload: unknown) => listener(payload)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
  IPC,
  SS_IPC,
}

contextBridge.exposeInMainWorld('mt', api)

export type MtApi = typeof api
declare global {
  interface Window {
    mt: MtApi
  }
}
```

- [ ] **Step 2: Overlay HTML**

```html
<!-- src/tools/screenshot/renderer/overlay/index.html -->
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <title>Overlay</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: transparent; cursor: crosshair; user-select: none; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Overlay 样式**

```css
/* src/tools/screenshot/renderer/overlay/styles.css */
.overlay-root { position: fixed; inset: 0; }
.overlay-bg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none; }
.overlay-dim { position: absolute; inset: 0; background: rgba(0,0,0,0.35); pointer-events: none; }
.overlay-selection {
  position: absolute;
  border: 1px solid #007aff;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
  background: transparent;
  pointer-events: none;
}
.overlay-window-hilite {
  position: absolute;
  border: 2px dashed rgba(0,122,255,0.8);
  background: rgba(0,122,255,0.08);
  pointer-events: none;
}
.overlay-info {
  position: absolute;
  background: rgba(0,0,0,0.7); color: white;
  padding: 4px 8px; border-radius: 4px;
  font-family: -apple-system, sans-serif; font-size: 11px;
  pointer-events: none;
}
```

- [ ] **Step 4: Image pixels hook**

```ts
// src/tools/screenshot/renderer/overlay/useImagePixels.ts
import { useEffect, useState } from 'react'

export interface ImagePixels {
  width: number
  height: number
  data: Uint8ClampedArray // RGBA
}

export function useImagePixels(filePath: string | null): ImagePixels | null {
  const [pixels, setPixels] = useState<ImagePixels | null>(null)
  useEffect(() => {
    if (!filePath) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setPixels({ width: d.width, height: d.height, data: d.data })
    }
    img.src = `file://${filePath}`
  }, [filePath])
  return pixels
}

export function pickColor(p: ImagePixels, xImg: number, yImg: number): { r: number; g: number; b: number; hex: string } | null {
  const x = Math.max(0, Math.min(p.width - 1, Math.round(xImg)))
  const y = Math.max(0, Math.min(p.height - 1, Math.round(yImg)))
  const i = (y * p.width + x) * 4
  const r = p.data[i], g = p.data[i + 1], b = p.data[i + 2]
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
  return { r, g, b, hex }
}
```

- [ ] **Step 5: Overlay 主组件（先只渲染底图，无交互）**

```tsx
// src/tools/screenshot/renderer/overlay/Overlay.tsx
import React, { useEffect, useState } from 'react'
import type { OverlayInitPayload } from '@shared/types/screenshot-ipc'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { off(); window.removeEventListener('keydown', onKey) }
  }, [])

  if (!init) return null
  return (
    <div className="overlay-root">
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      <div className="overlay-dim" />
    </div>
  )
}
```

- [ ] **Step 6: index.tsx**

```tsx
// src/tools/screenshot/renderer/overlay/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Overlay } from './Overlay'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(<Overlay />)
```

- [ ] **Step 7: Commit**

```bash
git add src/preload src/tools/screenshot/renderer/overlay
git commit -m "feat(screenshot): overlay react skeleton with image render"
```

---

### Task 22: Overlay - 拖拽矩形选区 + 确认

**Files:**
- Modify: `src/tools/screenshot/renderer/overlay/Overlay.tsx`
- Create: `src/tools/screenshot/renderer/overlay/SelectionRect.tsx`

- [ ] **Step 1: SelectionRect 组件**

```tsx
// src/tools/screenshot/renderer/overlay/SelectionRect.tsx
import React from 'react'
import type { Rect } from '@tools/screenshot/main/dpi'

interface Props {
  rect: Rect | null
}

export function SelectionRect({ rect }: Props) {
  if (!rect) return null
  // 把可能为负的尺寸归一化只为展示
  const { x, y, w, h } = rect
  const left = w < 0 ? x + w : x
  const top = h < 0 ? y + h : y
  const width = Math.abs(w)
  const height = Math.abs(h)
  return (
    <div className="overlay-selection" style={{ left, top, width, height }} />
  )
}
```

- [ ] **Step 2: Overlay 加拖拽**

```tsx
// src/tools/screenshot/renderer/overlay/Overlay.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { OverlayInitPayload } from '@shared/types/screenshot-ipc'
import type { Rect } from '@tools/screenshot/main/dpi'
import { SelectionRect } from './SelectionRect'
import { cssToImage, clampRectInBounds } from '@tools/screenshot/main/dpi'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const drag = useRef<{ startX: number; startY: number } | null>(null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    return off
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      else if ((e.key === 'Enter' || e.key === 'Return') && rect && init) {
        confirm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, init])

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY }
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return
    const s = drag.current
    setRect({ x: s.startX, y: s.startY, w: e.clientX - s.startX, h: e.clientY - s.startY })
  }
  function onMouseUp() {
    drag.current = null
    if (rect && Math.abs(rect.w) > 4 && Math.abs(rect.h) > 4) {
      // 仅当宽高有意义时立即确认（行为同 macOS 系统截图）
      confirm()
    }
  }

  function confirm() {
    if (!rect || !init) return
    // CSS px → image px
    const inImg = cssToImage(
      { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
      init.devicePixelRatio,
    )
    const clamped = clampRectInBounds(inImg, init.pixelWidth, init.pixelHeight)
    window.mt.send(window.mt.SS_IPC.OverlaySelected, {
      displayId: init.displayId,
      regionInImagePixels: clamped,
    })
  }

  if (!init) return null
  return (
    <div
      className="overlay-root"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ pointerEvents: 'auto' }}
    >
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      {!rect && <div className="overlay-dim" />}
      <SelectionRect rect={rect} />
    </div>
  )
}
```

- [ ] **Step 3: 手动验证（先把全局快捷键接上 — Task 42 才正式做。这里临时用主进程"启动 2 秒后调一次 showOverlays"验证）**

Modify `src/tools/screenshot/main/index.ts`:

```ts
import type { ToolContext } from '@shared/types/tool-manifest'
import { showOverlays } from './overlay-controller'

export async function initScreenshotTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('screenshot tool init')
  // 临时验证用：3 秒后弹一次叠层
  setTimeout(() => {
    showOverlays().then((r) => ctx.log.info('overlay result:', r))
  }, 3000)
}
```

Run: `npm run dev`
Expected: 3 秒后屏幕"凝固"，拖拽出矩形，松手 → 控制台输出 `overlay result: { cancelled: false, croppedPath: '/tmp/maxtools-crop-...png' }`。打开该文件确认裁剪正确。Esc 取消则输出 `cancelled: true`。

> 验证完后把临时 setTimeout 删掉。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot
git commit -m "feat(screenshot): drag-to-select rect with confirm/cancel"
```

---

### Task 23: Overlay - 放大镜 + 实时取色

**Files:**
- Create: `src/tools/screenshot/renderer/overlay/Magnifier.tsx`
- Modify: `src/tools/screenshot/renderer/overlay/Overlay.tsx`

- [ ] **Step 1: Magnifier 组件（在鼠标右下方显示一个 120x120 的放大方框 + 当前像素色值）**

```tsx
// src/tools/screenshot/renderer/overlay/Magnifier.tsx
import React, { useEffect, useRef } from 'react'
import type { ImagePixels } from './useImagePixels'

interface Props {
  pixels: ImagePixels | null
  cssX: number
  cssY: number
  dpr: number
  color: { hex: string; r: number; g: number; b: number } | null
}

const BOX = 120
const GRID = 11 // 11x11 像素方块
const CELL = BOX / GRID

export function Magnifier({ pixels, cssX, cssY, dpr, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!pixels) return
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, BOX, BOX)
    const cx = Math.round(cssX * dpr)
    const cy = Math.round(cssY * dpr)
    const half = Math.floor(GRID / 2)
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = cx + dx
        const py = cy + dy
        if (px < 0 || py < 0 || px >= pixels.width || py >= pixels.height) {
          ctx.fillStyle = '#000'
        } else {
          const i = (py * pixels.width + px) * 4
          ctx.fillStyle = `rgb(${pixels.data[i]},${pixels.data[i+1]},${pixels.data[i+2]})`
        }
        ctx.fillRect((dx + half) * CELL, (dy + half) * CELL, CELL, CELL)
      }
    }
    // 中心十字标
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(half * CELL, half * CELL, CELL, CELL)
  }, [pixels, cssX, cssY, dpr])

  // 智能定位：避开边缘
  const off = 16
  const right = window.innerWidth - cssX - BOX - off
  const bottom = window.innerHeight - cssY - BOX - 60 - off
  const left = right > 0 ? cssX + off : cssX - BOX - off
  const top = bottom > 0 ? cssY + off : cssY - BOX - 60 - off

  return (
    <div style={{ position: 'fixed', left, top, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        width={BOX}
        height={BOX}
        style={{ background: '#222', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
      />
      <div className="overlay-info" style={{ position: 'static', marginTop: 4, textAlign: 'center', width: BOX }}>
        {color ? `${color.hex}  rgb(${color.r},${color.g},${color.b})` : ''}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 接入 Overlay**

Modify `src/tools/screenshot/renderer/overlay/Overlay.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react'
import type { OverlayInitPayload } from '@shared/types/screenshot-ipc'
import type { Rect } from '@tools/screenshot/main/dpi'
import { SelectionRect } from './SelectionRect'
import { Magnifier } from './Magnifier'
import { useImagePixels, pickColor } from './useImagePixels'
import { cssToImage, clampRectInBounds } from '@tools/screenshot/main/dpi'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ startX: number; startY: number } | null>(null)
  const pixels = useImagePixels(init?.imagePath ?? null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    return off
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      else if ((e.key === 'Enter' || e.key === 'Return') && rect && init) confirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, init])

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY }
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
  }
  function onMouseMove(e: React.MouseEvent) {
    setCursor({ x: e.clientX, y: e.clientY })
    if (!drag.current) return
    const s = drag.current
    setRect({ x: s.startX, y: s.startY, w: e.clientX - s.startX, h: e.clientY - s.startY })
  }
  function onMouseUp() {
    drag.current = null
    if (rect && Math.abs(rect.w) > 4 && Math.abs(rect.h) > 4) confirm()
  }

  function confirm() {
    if (!rect || !init) return
    const inImg = cssToImage({ x: rect.x, y: rect.y, w: rect.w, h: rect.h }, init.devicePixelRatio)
    const clamped = clampRectInBounds(inImg, init.pixelWidth, init.pixelHeight)
    const color = pixels && cursor ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio) : null
    window.mt.send(window.mt.SS_IPC.OverlaySelected, {
      displayId: init.displayId,
      regionInImagePixels: clamped,
      pickedColor: color ?? undefined,
    })
  }

  if (!init) return null
  const color = pixels && cursor
    ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio)
    : null

  return (
    <div className="overlay-root" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{ pointerEvents: 'auto' }}>
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      {!rect && <div className="overlay-dim" />}
      <SelectionRect rect={rect} />
      {cursor && !drag.current && (
        <Magnifier pixels={pixels} cssX={cursor.x} cssY={cursor.y} dpr={init.devicePixelRatio} color={color} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`（沿用 Task 22 的临时 setTimeout）
Expected: 鼠标在叠层移动时，右下角出现放大镜 + 当前像素色值。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/overlay
git commit -m "feat(screenshot): magnifier loupe with realtime color"
```

---

### Task 24: Overlay - 窗口自动高亮 + 单击截整窗

**Files:**
- Create: `src/tools/screenshot/renderer/overlay/WindowHighlight.tsx`
- Modify: `src/tools/screenshot/renderer/overlay/Overlay.tsx`

- [ ] **Step 1: 窗口高亮组件**

```tsx
// src/tools/screenshot/renderer/overlay/WindowHighlight.tsx
import React from 'react'
import type { WindowGeometry } from '@shared/types/screenshot-ipc'

interface Props {
  win: WindowGeometry | null
}

export function WindowHighlight({ win }: Props) {
  if (!win) return null
  return (
    <div
      className="overlay-window-hilite"
      style={{
        left: win.bounds.x,
        top: win.bounds.y,
        width: win.bounds.width,
        height: win.bounds.height,
      }}
    />
  )
}

export function findHoveredWindow(windows: WindowGeometry[], x: number, y: number): WindowGeometry | null {
  // 取面积最小的命中窗口（典型"前置"判断的近似）
  const candidates = windows.filter(
    (w) => x >= w.bounds.x && x < w.bounds.x + w.bounds.width
        && y >= w.bounds.y && y < w.bounds.y + w.bounds.height,
  )
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height)
  return candidates[0]
}
```

- [ ] **Step 2: 接入 Overlay**

Modify `src/tools/screenshot/renderer/overlay/Overlay.tsx` - 加入 hovered window 状态、在 onMouseMove 中计算、用 WindowHighlight 显示、单击窗口（无拖拽）时按窗口几何确认选区。

```tsx
import React, { useEffect, useRef, useState } from 'react'
import type { OverlayInitPayload, WindowGeometry } from '@shared/types/screenshot-ipc'
import type { Rect } from '@tools/screenshot/main/dpi'
import { SelectionRect } from './SelectionRect'
import { Magnifier } from './Magnifier'
import { WindowHighlight, findHoveredWindow } from './WindowHighlight'
import { useImagePixels, pickColor } from './useImagePixels'
import { cssToImage, clampRectInBounds } from '@tools/screenshot/main/dpi'

type InitPayload = OverlayInitPayload & { displayId: number }

export function Overlay() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [hoveredWin, setHoveredWin] = useState<WindowGeometry | null>(null)
  const drag = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)
  const pixels = useImagePixels(init?.imagePath ?? null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.OverlayInit, (p) => setInit(p as InitPayload))
    return off
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.mt.send(window.mt.SS_IPC.OverlayCancelled)
      else if ((e.key === 'Enter' || e.key === 'Return') && rect && init) confirmRect(rect)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, init])

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY, moved: false }
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
  }
  function onMouseMove(e: React.MouseEvent) {
    setCursor({ x: e.clientX, y: e.clientY })
    if (drag.current) {
      const s = drag.current
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true
      setRect({ x: s.startX, y: s.startY, w: dx, h: dy })
    } else if (init) {
      setHoveredWin(findHoveredWindow(init.windowsOnThisDisplay, e.clientX, e.clientY))
    }
  }
  function onMouseUp(e: React.MouseEvent) {
    const wasDragMove = drag.current?.moved
    drag.current = null
    if (rect && wasDragMove && Math.abs(rect.w) > 4 && Math.abs(rect.h) > 4) {
      confirmRect(rect)
    } else if (!wasDragMove && hoveredWin) {
      // 单击命中窗口 → 截整窗
      setRect(null)
      confirmRect({
        x: hoveredWin.bounds.x,
        y: hoveredWin.bounds.y,
        w: hoveredWin.bounds.width,
        h: hoveredWin.bounds.height,
      })
    } else {
      setRect(null)
    }
  }

  function confirmRect(r: Rect) {
    if (!init) return
    const inImg = cssToImage(r, init.devicePixelRatio)
    const clamped = clampRectInBounds(inImg, init.pixelWidth, init.pixelHeight)
    const color = pixels && cursor ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio) : null
    window.mt.send(window.mt.SS_IPC.OverlaySelected, {
      displayId: init.displayId,
      regionInImagePixels: clamped,
      pickedColor: color ?? undefined,
    })
  }

  if (!init) return null
  const color = pixels && cursor
    ? pickColor(pixels, cursor.x * init.devicePixelRatio, cursor.y * init.devicePixelRatio)
    : null

  return (
    <div className="overlay-root" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{ pointerEvents: 'auto' }}>
      <img className="overlay-bg" src={`file://${init.imagePath}`} alt="" />
      {!rect && <div className="overlay-dim" />}
      {!rect && hoveredWin && <WindowHighlight win={hoveredWin} />}
      <SelectionRect rect={rect} />
      {cursor && !drag.current && (
        <Magnifier pixels={pixels} cssX={cursor.x} cssY={cursor.y} dpr={init.devicePixelRatio} color={color} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected: 鼠标悬停在某个 app 窗口上方 → 该窗口被虚线框高亮 → 单击 → 立即截整窗。

> 若 Accessibility 权限未授予，windowsOnThisDisplay 为空数组，鼠标悬停不显示高亮，但拖拽仍正常工作。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/overlay
git commit -m "feat(screenshot): hover-to-highlight window with one-click capture"
```

---

### Task 25: 全屏快捷键路径

**Files:**
- Modify: `src/tools/screenshot/main/overlay-controller.ts` (导出 captureFullscreen)
- Create: `src/tools/screenshot/main/fullscreen.ts`

- [ ] **Step 1: 全屏抓取（不出叠层，直接送 editor）**

```ts
// src/tools/screenshot/main/fullscreen.ts
import { screen } from 'electron'
import { captureSingleDisplay } from './capture'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.fullscreen')

export interface FullscreenResult {
  imagePath: string
  width: number
  height: number
  displayBounds: { x: number; y: number; width: number; height: number }
}

export async function captureFullscreenAtCursor(): Promise<FullscreenResult | null> {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const idx = screen.getAllDisplays().indexOf(display)
  if (idx < 0) {
    log.error('cannot resolve display index for cursor')
    return null
  }
  const cap = await captureSingleDisplay(idx)
  return {
    imagePath: cap.imagePath,
    width: cap.pixelWidth,
    height: cap.pixelHeight,
    displayBounds: display.bounds,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/screenshot/main/fullscreen.ts
git commit -m "feat(screenshot): fullscreen-at-cursor capture path"
```

---

## Phase 6 - 截图工具：编辑器

### Task 26: Editor window 控制器

**Files:**
- Create: `src/tools/screenshot/main/editor-controller.ts`

- [ ] **Step 1: 实现 editor 窗口创建与 IPC 协议**

```ts
// src/tools/screenshot/main/editor-controller.ts
import { BrowserWindow, ipcMain, clipboard, nativeImage } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { SS_IPC } from '@shared/types/screenshot-ipc'
import { createLogger } from '@main/logger'

const log = createLogger('screenshot.editor')

let activeEditor: BrowserWindow | null = null

export interface OpenEditorArgs {
  imagePath: string
  pixelWidth: number
  pixelHeight: number
  /** 编辑器窗口希望放在屏幕上的位置（视觉无缝接管原选区） */
  windowBounds: { x: number; y: number; width: number; height: number }
  /** 默认保存目录与文件名模板（用于另存为） */
  saveDir: string
  filenameTemplate: string
}

export async function openEditor(args: OpenEditorArgs): Promise<void> {
  if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()

  const TOOLBAR_HEIGHT = 48
  const PADDING = 4

  const win = new BrowserWindow({
    x: Math.max(0, args.windowBounds.x - PADDING),
    y: Math.max(0, args.windowBounds.y - PADDING),
    width: args.windowBounds.width + PADDING * 2,
    height: args.windowBounds.height + PADDING * 2 + TOOLBAR_HEIGHT,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#1c1c1e',
    webPreferences: {
      preload: join(__dirname, '../../../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })
  activeEditor = win

  const url = process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/../tools/screenshot/renderer/editor/`
    : null
  if (url) win.loadURL(url)
  else win.loadFile(join(__dirname, '../../../renderer/screenshot/editor/index.html'))

  win.webContents.once('did-finish-load', () => {
    win.webContents.send(SS_IPC.EditorInit, {
      imagePath: args.imagePath,
      pixelWidth: args.pixelWidth,
      pixelHeight: args.pixelHeight,
      saveDir: args.saveDir,
      filenameTemplate: args.filenameTemplate,
    })
  })

  const onComplete = async (_e: Electron.IpcMainEvent, payload: { dataUrl: string }) => {
    try {
      const img = nativeImage.createFromDataURL(payload.dataUrl)
      clipboard.writeImage(img)
      log.info('editor result copied to clipboard')
    } catch (err) {
      log.error('clipboard write failed', err)
    }
    closeEditor()
  }
  const onSaveAs = async (_e: Electron.IpcMainEvent, payload: { dataUrl: string; suggestedPath: string }) => {
    try {
      const { dialog } = await import('electron')
      const r = await dialog.showSaveDialog(win, {
        defaultPath: payload.suggestedPath,
        filters: [{ name: 'PNG', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }],
      })
      if (r.canceled || !r.filePath) return
      const buf = Buffer.from(payload.dataUrl.split(',')[1], 'base64')
      await writeFile(r.filePath, buf)
      log.info('editor result saved to', r.filePath)
    } catch (err) {
      log.error('save-as failed', err)
    }
  }
  const onCancel = () => closeEditor()

  ipcMain.on(SS_IPC.EditorComplete, onComplete)
  ipcMain.on(SS_IPC.EditorSaveAs, onSaveAs)
  ipcMain.on(SS_IPC.EditorCancel, onCancel)

  const closeEditor = () => {
    if (activeEditor && !activeEditor.isDestroyed()) activeEditor.close()
    activeEditor = null
    ipcMain.off(SS_IPC.EditorComplete, onComplete)
    ipcMain.off(SS_IPC.EditorSaveAs, onSaveAs)
    ipcMain.off(SS_IPC.EditorCancel, onCancel)
  }

  win.on('closed', closeEditor)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/screenshot/main/editor-controller.ts
git commit -m "feat(screenshot): editor window controller with clipboard/save ipc"
```

---

### Task 27: Editor React 骨架 + Canvas 视图

**Files:**
- Create: `src/tools/screenshot/renderer/editor/index.html`
- Create: `src/tools/screenshot/renderer/editor/index.tsx`
- Create: `src/tools/screenshot/renderer/editor/Editor.tsx`
- Create: `src/tools/screenshot/renderer/editor/canvas/CanvasView.tsx`
- Create: `src/tools/screenshot/renderer/editor/canvas/draw.ts`
- Create: `src/tools/screenshot/renderer/editor/styles.css`

- [ ] **Step 1: HTML 与样式**

```html
<!-- src/tools/screenshot/renderer/editor/index.html -->
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <title>Editor</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #1c1c1e; -webkit-app-region: drag; user-select: none; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

```css
/* src/tools/screenshot/renderer/editor/styles.css */
.editor-root { display: flex; flex-direction: column; height: 100vh; }
.editor-canvas-wrap { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; -webkit-app-region: no-drag; }
.editor-canvas { display: block; box-shadow: 0 4px 20px rgba(0,0,0,0.5); cursor: crosshair; }
.editor-toolbar {
  height: 48px;
  background: #2c2c2e;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  -webkit-app-region: no-drag;
  color: white;
  font-family: -apple-system, sans-serif;
  font-size: 12px;
  border-top: 1px solid #3a3a3c;
}
.tool-btn { background: transparent; color: white; border: 1px solid transparent; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
.tool-btn:hover { background: rgba(255,255,255,0.08); }
.tool-btn.active { background: #007aff; }
.tool-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
.tool-sep { width: 1px; height: 22px; background: #3a3a3c; margin: 0 6px; }
.color-swatch { width: 22px; height: 22px; border-radius: 4px; border: 2px solid #3a3a3c; cursor: pointer; }
.text-edit-input { position: absolute; background: rgba(0,0,0,0.6); color: white; border: 1px dashed #fff; padding: 4px 6px; font-size: 16px; outline: none; }
```

- [ ] **Step 2: 画布渲染逻辑（提前抽 draw.ts，后续 Task 30+ 会加 layer 实现）**

```ts
// src/tools/screenshot/renderer/editor/canvas/draw.ts
import type { Layer } from '../layers/types'

export interface DrawCtx {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  baseImage: HTMLImageElement | ImageBitmap | null
}

const layerRenderers: Record<string, (ctx: CanvasRenderingContext2D, layer: Layer) => void> = {}

export function registerLayerRenderer<T extends Layer['type']>(
  type: T,
  fn: (ctx: CanvasRenderingContext2D, layer: Extract<Layer, { type: T }>) => void,
): void {
  layerRenderers[type] = fn as never
}

export function drawScene(dc: DrawCtx, layers: Layer[]): void {
  const { ctx, width, height, baseImage } = dc
  ctx.clearRect(0, 0, width, height)
  if (baseImage) ctx.drawImage(baseImage, 0, 0, width, height)
  for (const layer of layers) {
    const r = layerRenderers[layer.type]
    if (r) r(ctx, layer)
  }
}
```

- [ ] **Step 3: Canvas 视图组件**

```tsx
// src/tools/screenshot/renderer/editor/canvas/CanvasView.tsx
import React, { useEffect, useRef } from 'react'
import { drawScene } from './draw'
import type { Layer } from '../layers/types'

interface Props {
  baseImage: HTMLImageElement | null
  layers: Layer[]
  width: number
  height: number
  onMouseDown?: (x: number, y: number, e: React.MouseEvent) => void
  onMouseMove?: (x: number, y: number, e: React.MouseEvent) => void
  onMouseUp?: (x: number, y: number, e: React.MouseEvent) => void
  onDblClick?: (x: number, y: number) => void
}

export function CanvasView({ baseImage, layers, width, height, onMouseDown, onMouseMove, onMouseUp, onDblClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    drawScene({ ctx, width, height, baseImage }, layers)
  }, [baseImage, layers, width, height])

  function pos(e: React.MouseEvent): [number, number] {
    const r = canvasRef.current!.getBoundingClientRect()
    return [(e.clientX - r.left) * (width / r.width), (e.clientY - r.top) * (height / r.height)]
  }

  return (
    <canvas
      ref={canvasRef}
      className="editor-canvas"
      width={width}
      height={height}
      style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%', maxHeight: '100%' }}
      onMouseDown={(e) => { const [x, y] = pos(e); onMouseDown?.(x, y, e) }}
      onMouseMove={(e) => { const [x, y] = pos(e); onMouseMove?.(x, y, e) }}
      onMouseUp={(e) => { const [x, y] = pos(e); onMouseUp?.(x, y, e) }}
      onDoubleClick={(e) => { const [x, y] = pos(e); onDblClick?.(x, y) }}
    />
  )
}
```

- [ ] **Step 4: Layer 类型占位（具体 layer 在后续 task 实现）**

```ts
// src/tools/screenshot/renderer/editor/layers/types.ts
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export type Color = string

export type ToolKind = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'blur' | 'text'

export type Layer =
  | { id: string; type: 'rect'; bounds: Rect; stroke: Color; strokeWidth: number; fill?: Color }
  | { id: string; type: 'ellipse'; bounds: Rect; stroke: Color; strokeWidth: number; fill?: Color }
  | { id: string; type: 'arrow'; from: Point; to: Point; stroke: Color; strokeWidth: number }
  | { id: string; type: 'pen'; points: Point[]; stroke: Color; strokeWidth: number }
  | { id: string; type: 'text'; pos: Point; content: string; fontSize: number; color: Color; fontFamily: string }
  | { id: string; type: 'mosaic'; region: MosaicRegion; blockSize: number }
  | { id: string; type: 'blur'; region: MosaicRegion; blurRadius: number }

export type MosaicRegion =
  | { kind: 'rect'; bounds: Rect }
  | { kind: 'pen'; points: Point[]; radius: number }

export function newLayerId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
```

- [ ] **Step 5: Editor 主组件骨架**

```tsx
// src/tools/screenshot/renderer/editor/Editor.tsx
import React, { useEffect, useState } from 'react'
import { CanvasView } from './canvas/CanvasView'
import type { Layer } from './layers/types'

interface InitPayload {
  imagePath: string
  pixelWidth: number
  pixelHeight: number
  saveDir: string
  filenameTemplate: string
}

export function Editor() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [baseImage, setBase] = useState<HTMLImageElement | null>(null)
  const [layers] = useState<Layer[]>([])

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.EditorInit, (p) => setInit(p as InitPayload))
    return off
  }, [])

  useEffect(() => {
    if (!init) return
    const img = new Image()
    img.onload = () => setBase(img)
    img.src = `file://${init.imagePath}`
  }, [init])

  if (!init) return null

  return (
    <div className="editor-root">
      <div className="editor-canvas-wrap">
        <CanvasView baseImage={baseImage} layers={layers} width={init.pixelWidth} height={init.pixelHeight} />
      </div>
      <div className="editor-toolbar">
        <span>编辑器（工具栏 Task 36 实现）</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: index.tsx**

```tsx
// src/tools/screenshot/renderer/editor/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from './Editor'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(<Editor />)
```

- [ ] **Step 7: 临时验证（在 overlay-controller 的结果后串到 editor）**

Modify `src/tools/screenshot/main/index.ts`（临时调试）:

```ts
import type { ToolContext } from '@shared/types/tool-manifest'
import { showOverlays } from './overlay-controller'
import { openEditor } from './editor-controller'
import { app } from 'electron'
import { join } from 'node:path'

export async function initScreenshotTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('screenshot tool init')
  setTimeout(async () => {
    const r = await showOverlays()
    if (!r.cancelled && r.croppedPath && r.region && r.displayBounds) {
      await openEditor({
        imagePath: r.croppedPath,
        pixelWidth: r.width!,
        pixelHeight: r.height!,
        windowBounds: {
          x: r.displayBounds.x + Math.round(r.region.x / 2),
          y: r.displayBounds.y + Math.round(r.region.y / 2),
          width: Math.round(r.region.w / 2),
          height: Math.round(r.region.h / 2),
        },
        saveDir: join(app.getPath('pictures'), 'max-tools'),
        filenameTemplate: 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}',
      })
    }
  }, 3000)
}
```

Run: `npm run dev`
Expected: 3 秒后弹叠层，拖选 → 出现编辑器窗口在原选区位置，里面显示裁剪后的图。

> 验证后保留这段临时代码，Task 42 会替换为快捷键触发。

- [ ] **Step 8: Commit**

```bash
git add src/tools/screenshot/renderer/editor src/tools/screenshot/main/editor-controller.ts src/tools/screenshot/main/index.ts
git commit -m "feat(screenshot): editor window with canvas view skeleton"
```

---

### Task 28: 编辑器状态 + 历史栈（undo/redo）+ 单测

**Files:**
- Create: `src/tools/screenshot/renderer/editor/state/history.ts`
- Create: `src/tools/screenshot/renderer/editor/state/store.ts`
- Create: `tests/unit/history.test.ts`

- [ ] **Step 1: 历史栈纯函数 + 单测**

```ts
// tests/unit/history.test.ts
import { describe, it, expect } from 'vitest'
import { createHistory, pushSnapshot, undo, redo } from '@tools/screenshot/renderer/editor/state/history'

describe('history', () => {
  it('starts empty', () => {
    const h = createHistory<string[]>(['a'])
    expect(undo(h)).toEqual(['a']) // 无 prior，保持 current
  })
  it('push & undo', () => {
    let h = createHistory<string[]>(['a'])
    h = pushSnapshot(h, ['a', 'b'])
    h = pushSnapshot(h, ['a', 'b', 'c'])
    expect(undo(h).current).toEqual(['a', 'b'])
    expect(undo(undo(h)).current).toEqual(['a'])
  })
  it('redo restores forward', () => {
    let h = createHistory<string[]>(['a'])
    h = pushSnapshot(h, ['a', 'b'])
    h = undo(h)
    expect(redo(h).current).toEqual(['a', 'b'])
  })
  it('push after undo clears redo stack', () => {
    let h = createHistory<string[]>(['a'])
    h = pushSnapshot(h, ['a', 'b'])
    h = undo(h)
    h = pushSnapshot(h, ['a', 'x'])
    expect(redo(h).current).toEqual(['a', 'x']) // no redo possible after divergence
  })
})
```

- [ ] **Step 2: 实现历史栈**

```ts
// src/tools/screenshot/renderer/editor/state/history.ts
export interface History<T> {
  current: T
  past: T[]
  future: T[]
}

export function createHistory<T>(initial: T): History<T> {
  return { current: initial, past: [], future: [] }
}

export function pushSnapshot<T>(h: History<T>, next: T): History<T> {
  return { current: next, past: [...h.past, h.current], future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  const prev = h.past[h.past.length - 1]
  return { current: prev, past: h.past.slice(0, -1), future: [h.current, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  const [next, ...rest] = h.future
  return { current: next, past: [...h.past, h.current], future: rest }
}
```

需要 `undo({past:[], current:['a']}).current` 等于 `['a']`：上面实现 `if past.length === 0 return h` 满足。改一下测试以匹配返回 History（不是数组）：

```ts
// 重写第一个 it 用例
it('starts empty (undo no-op)', () => {
  const h = createHistory<string[]>(['a'])
  expect(undo(h).current).toEqual(['a'])
})
```

- [ ] **Step 3: 测试通过**

Run: `npm test`
Expected: 全绿。

- [ ] **Step 4: 编辑器状态 store（React useReducer-style）**

```ts
// src/tools/screenshot/renderer/editor/state/store.ts
import { useReducer } from 'react'
import { createHistory, pushSnapshot, undo, redo, type History } from './history'
import type { Layer, ToolKind, Color } from '../layers/types'

export interface EditorState {
  history: History<Layer[]>
  selectedLayerId: string | null
  activeTool: ToolKind
  style: {
    color: Color
    strokeWidth: number
    fontSize: number
    blockSize: number
    blurRadius: number
  }
}

type Action =
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'UPDATE_LAYER'; id: string; patch: Partial<Layer> }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'SELECT_LAYER'; id: string | null }
  | { type: 'SET_TOOL'; tool: ToolKind }
  | { type: 'SET_STYLE'; patch: Partial<EditorState['style']> }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'ADD_LAYER':
      return { ...state, history: pushSnapshot(state.history, [...state.history.current, action.layer]), selectedLayerId: action.layer.id }
    case 'UPDATE_LAYER':
      return {
        ...state,
        history: pushSnapshot(
          state.history,
          state.history.current.map((l) => l.id === action.id ? { ...l, ...action.patch } as Layer : l),
        ),
      }
    case 'DELETE_LAYER':
      return {
        ...state,
        history: pushSnapshot(state.history, state.history.current.filter((l) => l.id !== action.id)),
        selectedLayerId: state.selectedLayerId === action.id ? null : state.selectedLayerId,
      }
    case 'SELECT_LAYER':
      return { ...state, selectedLayerId: action.id }
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, selectedLayerId: null }
    case 'SET_STYLE':
      return { ...state, style: { ...state.style, ...action.patch } }
    case 'UNDO':
      return { ...state, history: undo(state.history), selectedLayerId: null }
    case 'REDO':
      return { ...state, history: redo(state.history), selectedLayerId: null }
  }
}

const initial: EditorState = {
  history: createHistory<Layer[]>([]),
  selectedLayerId: null,
  activeTool: 'rect',
  style: { color: '#FF3B30', strokeWidth: 3, fontSize: 18, blockSize: 12, blurRadius: 8 },
}

export function useEditorStore() {
  const [state, dispatch] = useReducer(reducer, initial)
  return { state, dispatch }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/screenshot/renderer/editor/state tests/unit/history.test.ts
git commit -m "feat(screenshot): editor state with undo/redo history"
```

---

### Task 29: 图层：矩形

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/rect.ts`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: rect 渲染 + 注册**

```ts
// src/tools/screenshot/renderer/editor/layers/rect.ts
import { registerLayerRenderer } from '../canvas/draw'
import type { Layer, Rect } from './types'

export function normalizeRect(r: Rect): Rect {
  let { x, y, w, h } = r
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  return { x, y, w, h }
}

registerLayerRenderer('rect', (ctx, layer) => {
  const r = normalizeRect(layer.bounds)
  ctx.lineWidth = layer.strokeWidth
  ctx.strokeStyle = layer.stroke
  if (layer.fill) {
    ctx.fillStyle = layer.fill
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }
  ctx.strokeRect(r.x, r.y, r.w, r.h)
})
```

- [ ] **Step 2: Editor 接入绘制 → 拖拽创建矩形**

Modify `Editor.tsx` to introduce drawing state and pipe mouse events:

```tsx
import React, { useEffect, useRef, useState } from 'react'
import { CanvasView } from './canvas/CanvasView'
import { useEditorStore } from './state/store'
import { newLayerId, type Rect } from './layers/types'
import './layers/rect' // register renderer

interface InitPayload { imagePath: string; pixelWidth: number; pixelHeight: number; saveDir: string; filenameTemplate: string }

export function Editor() {
  const [init, setInit] = useState<InitPayload | null>(null)
  const [baseImage, setBase] = useState<HTMLImageElement | null>(null)
  const { state, dispatch } = useEditorStore()
  const dragRef = useRef<{ startX: number; startY: number; tempId: string } | null>(null)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.EditorInit, (p) => setInit(p as InitPayload))
    return off
  }, [])

  useEffect(() => {
    if (!init) return
    const img = new Image()
    img.onload = () => setBase(img)
    img.src = `file://${init.imagePath}`
  }, [init])

  function onDown(x: number, y: number) {
    if (state.activeTool === 'rect') {
      const id = newLayerId()
      dragRef.current = { startX: x, startY: y, tempId: id }
      dispatch({
        type: 'ADD_LAYER',
        layer: { id, type: 'rect', bounds: { x, y, w: 0, h: 0 }, stroke: state.style.color, strokeWidth: state.style.strokeWidth },
      })
    }
  }
  function onMove(x: number, y: number) {
    if (!dragRef.current) return
    const s = dragRef.current
    dispatch({ type: 'UPDATE_LAYER', id: s.tempId, patch: { bounds: { x: s.startX, y: s.startY, w: x - s.startX, h: y - s.startY } as Rect } })
  }
  function onUp() {
    dragRef.current = null
  }

  if (!init) return null
  return (
    <div className="editor-root">
      <div className="editor-canvas-wrap">
        <CanvasView baseImage={baseImage} layers={state.history.current} width={init.pixelWidth} height={init.pixelHeight}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} />
      </div>
      <div className="editor-toolbar">
        <span>编辑器：当前工具 = {state.activeTool}（工具栏 Task 36 完整实现）</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected: 截图编辑器出来后能在画布上拖出红色矩形。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): rect layer + drag-to-create"
```

---

### Task 30: 图层：椭圆

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/ellipse.ts`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: ellipse 渲染 + 注册**

```ts
// src/tools/screenshot/renderer/editor/layers/ellipse.ts
import { registerLayerRenderer } from '../canvas/draw'
import { normalizeRect } from './rect'

registerLayerRenderer('ellipse', (ctx, layer) => {
  const r = normalizeRect(layer.bounds)
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  ctx.lineWidth = layer.strokeWidth
  ctx.strokeStyle = layer.stroke
  ctx.beginPath()
  ctx.ellipse(cx, cy, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
  if (layer.fill) {
    ctx.fillStyle = layer.fill
    ctx.fill()
  }
  ctx.stroke()
})
```

- [ ] **Step 2: Editor onDown 加 ellipse 分支**

替换 Editor.tsx 的 onDown / onMove 让两种工具共用矩形拖拽逻辑：

```tsx
function onDown(x: number, y: number) {
  if (state.activeTool === 'rect' || state.activeTool === 'ellipse') {
    const id = newLayerId()
    dragRef.current = { startX: x, startY: y, tempId: id }
    const baseLayer = state.activeTool === 'rect'
      ? { id, type: 'rect' as const, bounds: { x, y, w: 0, h: 0 }, stroke: state.style.color, strokeWidth: state.style.strokeWidth }
      : { id, type: 'ellipse' as const, bounds: { x, y, w: 0, h: 0 }, stroke: state.style.color, strokeWidth: state.style.strokeWidth }
    dispatch({ type: 'ADD_LAYER', layer: baseLayer })
  }
}
```

并在 Editor.tsx 顶部加 `import './layers/ellipse'`。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): ellipse layer"
```

---

### Task 31: 图层：箭头

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/arrow.ts`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: arrow 渲染**

```ts
// src/tools/screenshot/renderer/editor/layers/arrow.ts
import { registerLayerRenderer } from '../canvas/draw'

registerLayerRenderer('arrow', (ctx, layer) => {
  const { from, to, stroke, strokeWidth } = layer
  ctx.strokeStyle = stroke
  ctx.fillStyle = stroke
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  // 直线
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  // 箭头头部（V 形）
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const head = Math.max(12, strokeWidth * 3)
  const a1 = angle + Math.PI - Math.PI / 6
  const a2 = angle + Math.PI + Math.PI / 6
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x + head * Math.cos(a1), to.y + head * Math.sin(a1))
  ctx.lineTo(to.x + head * Math.cos(a2), to.y + head * Math.sin(a2))
  ctx.closePath()
  ctx.fill()
})
```

- [ ] **Step 2: Editor 加 arrow 拖拽分支**

```tsx
// 在 onDown 中追加分支
if (state.activeTool === 'arrow') {
  const id = newLayerId()
  dragRef.current = { startX: x, startY: y, tempId: id }
  dispatch({
    type: 'ADD_LAYER',
    layer: { id, type: 'arrow', from: { x, y }, to: { x, y }, stroke: state.style.color, strokeWidth: state.style.strokeWidth },
  })
}

// onMove 中追加分支
if (dragRef.current && state.activeTool === 'arrow') {
  dispatch({ type: 'UPDATE_LAYER', id: dragRef.current.tempId, patch: { to: { x, y } } })
}
```

并在 Editor 顶部 `import './layers/arrow'`。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): arrow layer"
```

---

### Task 32: 图层：画笔

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/pen.ts`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: pen 渲染**

```ts
// src/tools/screenshot/renderer/editor/layers/pen.ts
import { registerLayerRenderer } from '../canvas/draw'

registerLayerRenderer('pen', (ctx, layer) => {
  if (layer.points.length === 0) return
  ctx.strokeStyle = layer.stroke
  ctx.lineWidth = layer.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(layer.points[0].x, layer.points[0].y)
  for (let i = 1; i < layer.points.length; i++) {
    ctx.lineTo(layer.points[i].x, layer.points[i].y)
  }
  ctx.stroke()
})
```

- [ ] **Step 2: Editor 加 pen 分支（采集 points 数组）**

```tsx
// 在 onDown 中追加
if (state.activeTool === 'pen') {
  const id = newLayerId()
  dragRef.current = { startX: x, startY: y, tempId: id }
  dispatch({
    type: 'ADD_LAYER',
    layer: { id, type: 'pen', points: [{ x, y }], stroke: state.style.color, strokeWidth: state.style.strokeWidth },
  })
}

// 在 onMove 中追加
if (dragRef.current && state.activeTool === 'pen') {
  // 取当前 layer 拼接新点
  const current = state.history.current.find((l) => l.id === dragRef.current!.tempId)
  if (current && current.type === 'pen') {
    dispatch({ type: 'UPDATE_LAYER', id: current.id, patch: { points: [...current.points, { x, y }] } })
  }
}
```

并 `import './layers/pen'`。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): pen layer"
```

---

### Task 33: 图层：文字（DOM input 浮层）

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/text.ts`
- Create: `src/tools/screenshot/renderer/editor/TextOverlay.tsx`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: text 渲染（已 commit 的图层渲染为 canvas 文字）**

```ts
// src/tools/screenshot/renderer/editor/layers/text.ts
import { registerLayerRenderer } from '../canvas/draw'

registerLayerRenderer('text', (ctx, layer) => {
  ctx.font = `${layer.fontSize}px ${layer.fontFamily}`
  ctx.fillStyle = layer.color
  ctx.textBaseline = 'top'
  // 多行支持
  const lines = layer.content.split('\n')
  lines.forEach((line, i) => {
    ctx.fillText(line, layer.pos.x, layer.pos.y + i * layer.fontSize * 1.2)
  })
})
```

- [ ] **Step 2: TextOverlay 组件（在用户点画布时显示 input）**

```tsx
// src/tools/screenshot/renderer/editor/TextOverlay.tsx
import React, { useEffect, useRef } from 'react'

interface Props {
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  onCommit: (text: string) => void
  onCancel: () => void
}

export function TextOverlay({ x, y, fontSize, color, fontFamily, onCommit, onCancel }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <textarea
      ref={ref}
      className="text-edit-input"
      style={{ left: x, top: y, fontSize, color, fontFamily }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onCommit((e.target as HTMLTextAreaElement).value)
        }
      }}
      onBlur={(e) => onCommit(e.target.value)}
    />
  )
}
```

- [ ] **Step 3: Editor 加 text 工具**

```tsx
// Editor.tsx 增加 textPos state
const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)

// onDown 增加分支
if (state.activeTool === 'text') {
  setTextPos({ x, y })
  return
}

// 在 canvas-wrap 内插入 TextOverlay：
{textPos && (
  <TextOverlay
    x={textPos.x / (init.pixelWidth / 1) * 1}  // 转 CSS px 坐标（详见下）
    y={textPos.y / (init.pixelHeight / 1) * 1}
    fontSize={state.style.fontSize}
    color={state.style.color}
    fontFamily="-apple-system, sans-serif"
    onCommit={(text) => {
      if (text.trim()) {
        dispatch({
          type: 'ADD_LAYER',
          layer: { id: newLayerId(), type: 'text', pos: textPos, content: text,
                   fontSize: state.style.fontSize, color: state.style.color,
                   fontFamily: '-apple-system, sans-serif' },
        })
      }
      setTextPos(null)
    }}
    onCancel={() => setTextPos(null)}
  />
)}
```

> 注：因为 canvas 用 `width={pixelWidth}` 物理像素，但 style 的 width 与 canvas 实际占据的 CSS 大小可能不同（受 max-width 限制）。要 TextOverlay 视觉位置正确，应把 textPos 也保存为画布逻辑坐标，再在浮层渲染时换算。简化做法：保持 canvas 1:1 显示（不缩放），即 style.width = pixelWidth + 'px'，避免坐标换算。下方 styles 已经写了 maxWidth: '100%'，若画布太大溢出再加 scroll；不接受缩放显示。

并 `import './layers/text'`。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): text layer with DOM input overlay"
```

---

### Task 34: 图层：马赛克

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/mosaic.ts`
- Create: `tests/unit/mosaic.test.ts`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: 马赛克块计算单测**

```ts
// tests/unit/mosaic.test.ts
import { describe, it, expect } from 'vitest'
import { computeMosaicGrid } from '@tools/screenshot/renderer/editor/layers/mosaic'

describe('computeMosaicGrid', () => {
  it('returns aligned grid covering the region', () => {
    const cells = computeMosaicGrid({ x: 10, y: 20, w: 30, h: 24 }, 8)
    // 应覆盖 (10,20)~(40,44) 区域，按 8 像素块对齐
    expect(cells.length).toBeGreaterThan(0)
    cells.forEach((c) => {
      expect(c.size).toBe(8)
    })
    // 第一个块的左上角应是 ≤10,≤20 的 8 倍数
    const first = cells[0]
    expect(first.x % 8).toBe(0)
    expect(first.y % 8).toBe(0)
  })
  it('clamps tiny region to at least one cell', () => {
    const cells = computeMosaicGrid({ x: 0, y: 0, w: 1, h: 1 }, 16)
    expect(cells.length).toBe(1)
  })
})
```

- [ ] **Step 2: 实现马赛克**

```ts
// src/tools/screenshot/renderer/editor/layers/mosaic.ts
import { registerLayerRenderer } from '../canvas/draw'
import type { Rect } from './types'
import { normalizeRect } from './rect'

export interface MosaicCell { x: number; y: number; size: number }

export function computeMosaicGrid(region: Rect, block: number): MosaicCell[] {
  const cells: MosaicCell[] = []
  const startX = Math.floor(region.x / block) * block
  const startY = Math.floor(region.y / block) * block
  const endX = Math.max(startX + block, region.x + region.w)
  const endY = Math.max(startY + block, region.y + region.h)
  for (let y = startY; y < endY; y += block) {
    for (let x = startX; x < endX; x += block) {
      cells.push({ x, y, size: block })
    }
  }
  return cells.length === 0 ? [{ x: region.x, y: region.y, size: block }] : cells
}

registerLayerRenderer('mosaic', (ctx, layer) => {
  // 仅支持 rect region；pen 区域可在后续扩展
  if (layer.region.kind !== 'rect') return
  const region = normalizeRect(layer.region.bounds)
  const block = layer.blockSize
  // 拿底层像素后逐块平均；这里需要把已经绘制到 canvas 上的内容采样
  const data = ctx.getImageData(region.x, region.y, region.w, region.h)
  const cells = computeMosaicGrid({ x: 0, y: 0, w: region.w, h: region.h }, block)
  for (const c of cells) {
    let r = 0, g = 0, b = 0, n = 0
    const x2 = Math.min(c.x + c.size, region.w)
    const y2 = Math.min(c.y + c.size, region.h)
    for (let yy = c.y; yy < y2; yy++) {
      for (let xx = c.x; xx < x2; xx++) {
        const i = (yy * region.w + xx) * 4
        r += data.data[i]; g += data.data[i + 1]; b += data.data[i + 2]; n++
      }
    }
    if (n === 0) continue
    ctx.fillStyle = `rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`
    ctx.fillRect(region.x + c.x, region.y + c.y, c.size, c.size)
  }
})
```

- [ ] **Step 3: Editor 加马赛克拖拽（共用矩形拖拽）**

```tsx
// onDown 增加
if (state.activeTool === 'blur') {
  // 注：工具栏里下拉切"马赛克 / 高斯模糊"，激活的 tool 都是 'blur'，
  // 实际 layer type 由 state.style 决定（下一 task 36 加 blurMode）
  const id = newLayerId()
  dragRef.current = { startX: x, startY: y, tempId: id }
  // 这里先固定 mosaic；Task 35 切到 store.style.blurMode
  dispatch({
    type: 'ADD_LAYER',
    layer: { id, type: 'mosaic', region: { kind: 'rect', bounds: { x, y, w: 0, h: 0 } }, blockSize: state.style.blockSize },
  })
}

// onMove 增加
if (dragRef.current && state.activeTool === 'blur') {
  const cur = state.history.current.find((l) => l.id === dragRef.current!.tempId)
  if (cur && (cur.type === 'mosaic' || cur.type === 'blur')) {
    const r = { x: dragRef.current.startX, y: dragRef.current.startY, w: x - dragRef.current.startX, h: y - dragRef.current.startY }
    dispatch({ type: 'UPDATE_LAYER', id: cur.id, patch: { region: { kind: 'rect', bounds: r } } as Partial<typeof cur> })
  }
}
```

并 `import './layers/mosaic'`。

- [ ] **Step 4: 测试 + 手动验证**

Run: `npm test` Expected: 全绿。
Run: `npm run dev` Expected: 在编辑器里能拖出马赛克块。

- [ ] **Step 5: Commit**

```bash
git add src/tools/screenshot/renderer/editor tests/unit/mosaic.test.ts
git commit -m "feat(screenshot): mosaic layer with pixelation"
```

---

### Task 35: 图层：高斯模糊

**Files:**
- Create: `src/tools/screenshot/renderer/editor/layers/blur.ts`
- Modify: `src/tools/screenshot/renderer/editor/state/store.ts` (加 blurMode)

- [ ] **Step 1: 在 store style 加 blurMode**

```ts
// src/tools/screenshot/renderer/editor/state/store.ts
export interface EditorState {
  // ...
  style: {
    color: Color
    strokeWidth: number
    fontSize: number
    blockSize: number
    blurRadius: number
    blurMode: 'mosaic' | 'gaussian'
  }
}

const initial: EditorState = {
  // ...
  style: { color: '#FF3B30', strokeWidth: 3, fontSize: 18, blockSize: 12, blurRadius: 8, blurMode: 'mosaic' },
}
```

- [ ] **Step 2: 实现 blur 渲染**

```ts
// src/tools/screenshot/renderer/editor/layers/blur.ts
import { registerLayerRenderer } from '../canvas/draw'
import { normalizeRect } from './rect'

registerLayerRenderer('blur', (ctx, layer) => {
  if (layer.region.kind !== 'rect') return
  const region = normalizeRect(layer.region.bounds)
  // 取该区域已经绘制的像素，blur 后放回
  const tmp = document.createElement('canvas')
  tmp.width = region.w
  tmp.height = region.h
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(ctx.canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)
  ctx.save()
  ctx.filter = `blur(${layer.blurRadius}px)`
  ctx.drawImage(tmp, region.x, region.y)
  ctx.restore()
})
```

- [ ] **Step 3: 修改 Editor 的 blur 工具分支按 blurMode 创建 layer 类型**

```tsx
if (state.activeTool === 'blur') {
  const id = newLayerId()
  dragRef.current = { startX: x, startY: y, tempId: id }
  if (state.style.blurMode === 'gaussian') {
    dispatch({
      type: 'ADD_LAYER',
      layer: { id, type: 'blur', region: { kind: 'rect', bounds: { x, y, w: 0, h: 0 } }, blurRadius: state.style.blurRadius },
    })
  } else {
    dispatch({
      type: 'ADD_LAYER',
      layer: { id, type: 'mosaic', region: { kind: 'rect', bounds: { x, y, w: 0, h: 0 } }, blockSize: state.style.blockSize },
    })
  }
}
```

并 `import './layers/blur'`。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): gaussian blur layer"
```

---

### Task 36: 工具栏 UI + 颜色 / 线宽

**Files:**
- Create: `src/tools/screenshot/renderer/editor/toolbar/Toolbar.tsx`
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: Toolbar 组件**

```tsx
// src/tools/screenshot/renderer/editor/toolbar/Toolbar.tsx
import React, { useState } from 'react'
import type { ToolKind } from '../layers/types'

interface Props {
  activeTool: ToolKind
  setTool: (t: ToolKind) => void
  color: string
  setColor: (c: string) => void
  strokeWidth: number
  setStrokeWidth: (n: number) => void
  blurMode: 'mosaic' | 'gaussian'
  setBlurMode: (m: 'mosaic' | 'gaussian') => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSaveAs: () => void
  onComplete: () => void
}

const PRESET_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#000000', '#FFFFFF']

export function Toolbar(p: Props) {
  const [showBlurMenu, setShowBlurMenu] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const tools: { id: ToolKind; label: string }[] = [
    { id: 'select', label: '选择' },
    { id: 'rect', label: '矩形' },
    { id: 'ellipse', label: '椭圆' },
    { id: 'arrow', label: '箭头' },
    { id: 'pen', label: '画笔' },
    { id: 'blur', label: p.blurMode === 'mosaic' ? '马赛克 ▾' : '模糊 ▾' },
    { id: 'text', label: '文字' },
  ]
  return (
    <div className="editor-toolbar">
      {tools.map((t) => (
        <div key={t.id} style={{ position: 'relative' }}>
          <button
            className={`tool-btn ${p.activeTool === t.id ? 'active' : ''}`}
            onClick={() => {
              p.setTool(t.id)
              if (t.id === 'blur') setShowBlurMenu((s) => !s); else setShowBlurMenu(false)
            }}
          >{t.label}</button>
          {t.id === 'blur' && showBlurMenu && (
            <div style={{ position: 'absolute', bottom: 36, left: 0, background: '#3a3a3c', borderRadius: 4, padding: 4, zIndex: 10 }}>
              <div className="tool-btn" onClick={() => { p.setBlurMode('mosaic'); setShowBlurMenu(false) }}>马赛克</div>
              <div className="tool-btn" onClick={() => { p.setBlurMode('gaussian'); setShowBlurMenu(false) }}>高斯模糊</div>
            </div>
          )}
        </div>
      ))}
      <div className="tool-sep" />
      <div className="color-swatch" style={{ background: p.color }} onClick={() => setShowColorMenu((s) => !s)} />
      {showColorMenu && (
        <div style={{ position: 'absolute', bottom: 56, left: 220, background: '#3a3a3c', borderRadius: 4, padding: 6, display: 'flex', gap: 4, zIndex: 10 }}>
          {PRESET_COLORS.map((c) => (
            <div key={c} className="color-swatch" style={{ background: c, width: 18, height: 18 }} onClick={() => { p.setColor(c); setShowColorMenu(false) }} />
          ))}
          <input type="color" value={p.color} onChange={(e) => p.setColor(e.target.value)} />
        </div>
      )}
      <select value={p.strokeWidth} onChange={(e) => p.setStrokeWidth(Number(e.target.value))}>
        {[1, 2, 3, 5, 8, 12].map((w) => <option key={w} value={w}>{w}px</option>)}
      </select>
      <div className="tool-sep" />
      <button className="tool-btn" disabled={!p.canUndo} onClick={p.onUndo}>↶</button>
      <button className="tool-btn" disabled={!p.canRedo} onClick={p.onRedo}>↷</button>
      <div style={{ flex: 1 }} />
      <button className="tool-btn" onClick={p.onSaveAs}>另存为</button>
      <button className="tool-btn" style={{ background: '#007aff' }} onClick={p.onComplete}>完成</button>
    </div>
  )
}
```

- [ ] **Step 2: 接入 Editor**

替换 Editor.tsx 底部 toolbar 占位：

```tsx
// 在 Editor 中：
import { Toolbar } from './toolbar/Toolbar'

// JSX 部分：
<Toolbar
  activeTool={state.activeTool}
  setTool={(t) => dispatch({ type: 'SET_TOOL', tool: t })}
  color={state.style.color}
  setColor={(c) => dispatch({ type: 'SET_STYLE', patch: { color: c } })}
  strokeWidth={state.style.strokeWidth}
  setStrokeWidth={(n) => dispatch({ type: 'SET_STYLE', patch: { strokeWidth: n } })}
  blurMode={state.style.blurMode}
  setBlurMode={(m) => dispatch({ type: 'SET_STYLE', patch: { blurMode: m } })}
  canUndo={state.history.past.length > 0}
  canRedo={state.history.future.length > 0}
  onUndo={() => dispatch({ type: 'UNDO' })}
  onRedo={() => dispatch({ type: 'REDO' })}
  onSaveAs={() => exportAndSaveAs()}
  onComplete={() => exportAndComplete()}
/>
```

`exportAndSaveAs` / `exportAndComplete` 在 Task 38/39 实现。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): editor toolbar UI"
```

---

### Task 37: 选中已有图层、改大小、删除

**Files:**
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`
- Create: `src/tools/screenshot/renderer/editor/canvas/hit.ts`

- [ ] **Step 1: hit test 工具**

```ts
// src/tools/screenshot/renderer/editor/canvas/hit.ts
import type { Layer } from '../layers/types'
import { normalizeRect } from '../layers/rect'

export function hitTest(layers: Layer[], x: number, y: number): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (l.type === 'rect' || l.type === 'ellipse') {
      const r = normalizeRect(l.bounds)
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return l
    } else if ((l.type === 'mosaic' || l.type === 'blur') && l.region.kind === 'rect') {
      const r = normalizeRect(l.region.bounds)
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return l
    } else if (l.type === 'text') {
      const w = l.fontSize * l.content.length * 0.6
      const h = l.fontSize * l.content.split('\n').length * 1.2
      if (x >= l.pos.x && x <= l.pos.x + w && y >= l.pos.y && y <= l.pos.y + h) return l
    }
  }
  return null
}
```

- [ ] **Step 2: Editor 加 select 工具行为（拖动 + 删除 + undo/redo 键）**

在 Editor.tsx 中：

1) 顶部 import：

```tsx
import { hitTest } from './canvas/hit'
```

2) 状态：

```tsx
const selectDragRef = useRef<{ id: string; startX: number; startY: number; origin: Layer } | null>(null)
```

3) onDown 最前面加 select 分支（在其它工具分支之前 return）：

```tsx
if (state.activeTool === 'select') {
  const hit = hitTest(state.history.current, x, y)
  dispatch({ type: 'SELECT_LAYER', id: hit?.id ?? null })
  if (hit) selectDragRef.current = { id: hit.id, startX: x, startY: y, origin: hit }
  return
}
```

4) onMove 加：

```tsx
if (selectDragRef.current) {
  const dx = x - selectDragRef.current.startX
  const dy = y - selectDragRef.current.startY
  const o = selectDragRef.current.origin
  if (o.type === 'rect' || o.type === 'ellipse') {
    dispatch({ type: 'UPDATE_LAYER', id: o.id, patch: { bounds: { ...o.bounds, x: o.bounds.x + dx, y: o.bounds.y + dy } } })
  } else if (o.type === 'text') {
    dispatch({ type: 'UPDATE_LAYER', id: o.id, patch: { pos: { x: o.pos.x + dx, y: o.pos.y + dy } } })
  } else if ((o.type === 'mosaic' || o.type === 'blur') && o.region.kind === 'rect') {
    const b = o.region.bounds
    dispatch({ type: 'UPDATE_LAYER', id: o.id, patch: { region: { kind: 'rect', bounds: { ...b, x: b.x + dx, y: b.y + dy } } } as Partial<typeof o> })
  }
}
```

5) onUp 加：

```tsx
selectDragRef.current = null
```

6) 选中态高亮（在 canvas-wrap 中叠一个 div）：

```tsx
{state.selectedLayerId && (() => {
  const l = state.history.current.find((x) => x.id === state.selectedLayerId)
  if (!l) return null
  let r: { x: number; y: number; w: number; h: number } | null = null
  if (l.type === 'rect' || l.type === 'ellipse') r = l.bounds
  else if ((l.type === 'mosaic' || l.type === 'blur') && l.region.kind === 'rect') r = l.region.bounds
  if (!r) return null
  return (
    <div style={{
      position: 'absolute', left: r.x, top: r.y, width: Math.abs(r.w), height: Math.abs(r.h),
      border: '1px dashed #fff', pointerEvents: 'none',
    }} />
  )
})()}
```

> 注：保持 canvas 1:1 显示（styles 已设 `display: block` 不缩放），选中框坐标和 canvas 坐标一致。键盘绑定（Delete / Cmd+Z / Cmd+Shift+Z）统一放到 Task 40。

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected: 切到"选择"工具 → 点已有矩形 → 出现虚线高亮 → 拖拽可移动；按 Delete 删除（Task 40 统一键盘后才可用）。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): select/move existing layers"
```

---

## Phase 7 - 截图工具：出口

### Task 38: Enter / 完成 → 复制到剪贴板

**Files:**
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: 实现导出函数**

```tsx
// Editor.tsx 内部加：
function exportCanvas(): string | null {
  const cvs = document.querySelector('canvas.editor-canvas') as HTMLCanvasElement | null
  if (!cvs) return null
  return cvs.toDataURL('image/png')
}

function exportAndComplete() {
  const dataUrl = exportCanvas()
  if (!dataUrl) return
  window.mt.send(window.mt.SS_IPC.EditorComplete, { dataUrl })
}

function exportAndSaveAs() {
  const dataUrl = exportCanvas()
  if (!dataUrl) return
  // 文件名建议（在主进程根据 saveDir + filenameTemplate 拼），这里先传一个简单名
  const suggested = `screenshot-${Date.now()}.png`
  window.mt.send(window.mt.SS_IPC.EditorSaveAs, { dataUrl, suggestedPath: `${init!.saveDir}/${suggested}` })
}
```

- [ ] **Step 2: 全局键盘绑定**

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Return') {
      if (textPos) return // 让 TextOverlay 处理
      e.preventDefault()
      exportAndComplete()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      window.mt.send(window.mt.SS_IPC.EditorCancel)
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [init, textPos])
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected: 截图编辑完后按 Enter，编辑器关闭；打开 IM 或 Notes 应用 Cmd+V，能粘贴图片。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): editor enter-to-clipboard, esc-to-cancel"
```

---

### Task 39: 另存为 → 系统 save dialog

**Files:**
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx` (用 init.filenameTemplate + init.saveDir 计算建议路径)
- Modify: `src/tools/screenshot/main/editor-controller.ts` (确保目录存在再写)
- Modify: `src/tools/screenshot/renderer/editor/index.tsx` (无需改)

- [ ] **Step 1: 编辑器侧建议路径**

```tsx
// Editor.tsx 改 exportAndSaveAs：
import { renderFilenameTemplate } from '@tools/screenshot/main/filename'

function exportAndSaveAs() {
  const dataUrl = exportCanvas()
  if (!dataUrl || !init) return
  const name = renderFilenameTemplate(init.filenameTemplate) + '.png'
  window.mt.send(window.mt.SS_IPC.EditorSaveAs, { dataUrl, suggestedPath: `${init.saveDir}/${name}` })
}
```

> 注意：`renderFilenameTemplate` 当前在 `@tools/screenshot/main/`，是纯函数，可被渲染层引用。

- [ ] **Step 2: 主进程 ensureDir**

Modify `src/tools/screenshot/main/editor-controller.ts` 的 onSaveAs：

```ts
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const onSaveAs = async (_e: Electron.IpcMainEvent, payload: { dataUrl: string; suggestedPath: string }) => {
  try {
    const { dialog } = await import('electron')
    const r = await dialog.showSaveDialog(win, {
      defaultPath: payload.suggestedPath,
      filters: [{ name: 'PNG', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }],
    })
    if (r.canceled || !r.filePath) return
    await mkdir(dirname(r.filePath), { recursive: true })
    const buf = Buffer.from(payload.dataUrl.split(',')[1], 'base64')
    await writeFile(r.filePath, buf)
    log.info('editor result saved to', r.filePath)
  } catch (err) {
    log.error('save-as failed', err)
  }
}
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected: 编辑器点"另存为" → 弹系统 save dialog，默认文件名形如 `screenshot-2026-06-17-21-30-45.png`，选位置保存 → 文件成功落盘。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot
git commit -m "feat(screenshot): save-as with filename template"
```

---

### Task 40: Esc 取消 + 编辑器键盘快捷键全集

**Files:**
- Modify: `src/tools/screenshot/renderer/editor/Editor.tsx`

- [ ] **Step 1: 整理 Editor 的所有键盘绑定（统一一处，避免散落）**

```tsx
// 在 Editor.tsx 把多个 useEffect 中的 onKey 合并：
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    // 文字编辑中 → 让 TextOverlay 处理
    if (textPos) return

    if (e.key === 'Escape') {
      e.preventDefault()
      window.mt.send(window.mt.SS_IPC.EditorCancel)
    } else if (e.key === 'Enter' || e.key === 'Return') {
      e.preventDefault()
      exportAndComplete()
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedLayerId) {
      e.preventDefault()
      dispatch({ type: 'DELETE_LAYER', id: state.selectedLayerId })
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault(); dispatch({ type: 'UNDO' })
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault(); dispatch({ type: 'REDO' })
    } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault(); exportAndSaveAs()
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [textPos, state.selectedLayerId])
```

- [ ] **Step 2: 删掉旧的散落键盘 useEffect**

逐个找到并清理（Task 28/37 引入的）。

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected: 编辑器内按 Esc 关闭不复制；Enter 复制并关闭；Cmd+S 弹另存为；Cmd+Z / Cmd+Shift+Z 撤销重做；选中后 Delete 删除图层。

- [ ] **Step 4: Commit**

```bash
git add src/tools/screenshot/renderer/editor
git commit -m "feat(screenshot): consolidate editor keyboard shortcuts"
```

---

## Phase 8 - 截图工具：设置页 & 完整接入

### Task 41: 截图工具 settings React 组件

**Files:**
- Modify: `src/tools/screenshot/renderer/settings/index.tsx`

- [ ] **Step 1: 完整实现设置页**

```tsx
// src/tools/screenshot/renderer/settings/index.tsx
import React, { useEffect, useState } from 'react'
import type { ToolSettingsProps } from '@shared/types/tool-manifest'
import { SettingRow } from '@renderer/shared/components/SettingRow'
import { Toggle } from '@renderer/shared/components/Toggle'
import { FilePathPicker } from '@renderer/shared/components/FilePathPicker'
import { ShortcutRecorder } from '@renderer/shared/components/ShortcutRecorder'

export default function ScreenshotSettings({ store, shortcuts, setShortcut, toast }: ToolSettingsProps) {
  const [saveDir, setSaveDir] = useState<string>(store.get('saveDir', ''))
  const [template, setTemplate] = useState<string>(store.get('filenameTemplate', 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}'))
  const [windowDetect, setWindowDetect] = useState<boolean>(store.get('windowDetect', true))
  const [colorFormat, setColorFormat] = useState<string>(store.get('colorFormat', 'HEX'))
  const [defaultBlockSize, setDefaultBlockSize] = useState<number>(store.get('defaultBlockSize', 12))

  useEffect(() => store.set('saveDir', saveDir), [saveDir, store])
  useEffect(() => store.set('filenameTemplate', template), [template, store])
  useEffect(() => store.set('windowDetect', windowDetect), [windowDetect, store])
  useEffect(() => store.set('colorFormat', colorFormat), [colorFormat, store])
  useEffect(() => store.set('defaultBlockSize', defaultBlockSize), [defaultBlockSize, store])

  const findShortcut = (key: string) => shortcuts.find((s) => s.key === key)?.combo ?? ''

  return (
    <div>
      <h1>截图</h1>

      <SettingRow label="启用" hint="关闭后菜单栏与快捷键不可用">
        <Toggle checked={true} onChange={() => toast('暂不支持，所有工具默认启用', 'info')} />
      </SettingRow>

      <SettingRow label="保存目录" hint="另存为时的默认位置">
        <FilePathPicker value={saveDir} onChange={setSaveDir} placeholder="~/Pictures/max-tools" />
      </SettingRow>

      <SettingRow label="文件名模板" hint="支持 {yyyy} {MM} {dd} {HH} {mm} {ss}">
        <input type="text" value={template} onChange={(e) => setTemplate(e.target.value)} style={{ width: '100%' }} />
      </SettingRow>

      <SettingRow label="窗口自动识别" hint="鼠标悬停 app 窗口高亮（需 Accessibility 权限）">
        <Toggle checked={windowDetect} onChange={setWindowDetect} />
      </SettingRow>

      <SettingRow label="取色格式">
        <select value={colorFormat} onChange={(e) => setColorFormat(e.target.value)}>
          <option value="HEX">HEX</option>
          <option value="RGB">RGB</option>
          <option value="HSL">HSL</option>
        </select>
      </SettingRow>

      <SettingRow label="默认马赛克块">
        <input type="number" min={4} max={64} value={defaultBlockSize} onChange={(e) => setDefaultBlockSize(Number(e.target.value))} />
      </SettingRow>

      <h2 style={{ marginTop: 24, fontSize: 14 }}>快捷键</h2>

      <SettingRow label="区域选区">
        <ShortcutRecorder value={findShortcut('region')} onChange={(c) => setShortcut('region', c)} />
      </SettingRow>

      <SettingRow label="全屏（鼠标所在屏）">
        <ShortcutRecorder value={findShortcut('fullscreen')} onChange={(c) => setShortcut('fullscreen', c)} />
      </SettingRow>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/screenshot/renderer/settings
git commit -m "feat(screenshot): settings page (paths, defaults, shortcuts)"
```

---

### Task 42: 截图工具完整 init 串联

**Files:**
- Modify: `src/tools/screenshot/main/index.ts`

- [ ] **Step 1: 完整 init**

```ts
// src/tools/screenshot/main/index.ts
import { app } from 'electron'
import { join } from 'node:path'
import type { ToolContext } from '@shared/types/tool-manifest'
import { showOverlays } from './overlay-controller'
import { openEditor } from './editor-controller'
import { captureFullscreenAtCursor } from './fullscreen'
import { ensureScreenRecording, openPermissionPane } from '@main/permissions'
import { imageToCss } from './dpi'

export async function initScreenshotTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('screenshot tool init')

  const defaultSaveDir = join(app.getPath('pictures'), 'max-tools')
  const defaultTemplate = 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}'

  function getSaveDir(): string {
    return ctx.store.get<string>('saveDir', '') || defaultSaveDir
  }
  function getTemplate(): string {
    return ctx.store.get<string>('filenameTemplate', '') || defaultTemplate
  }

  async function runRegionFlow(): Promise<void> {
    if (!(await ensureScreenRecording())) {
      openPermissionPane('screen')
      return
    }
    const r = await showOverlays()
    if (r.cancelled || !r.croppedPath || !r.region || !r.displayBounds || r.width == null || r.height == null) return
    // 选区物理像素 → CSS 像素（以选区所在 display 的 dpr 推导）
    // 用 r.width / display.bounds.width * pixelWidth → dpr。简化：直接除 2 假设是 Retina；
    // 但更稳：用 region 物理像素相对 width 推 dpr
    // 真正实现：在 ShowOverlayResult 里返回 dpr。但当前我们已知 region 在 image 像素中，displayBounds 是 CSS 像素：
    // window 的位置应等于 displayBounds.x + cssX, cssX = region.x / dpr。
    // 我们这里通过 region.w/regionInCss 不知，所以从 BrowserWindow 拿一次 display scaleFactor。
    const { screen } = await import('electron')
    const display = screen.getDisplayMatching(r.displayBounds)
    const dpr = display.scaleFactor
    const cssRegion = imageToCss(r.region, dpr)
    await openEditor({
      imagePath: r.croppedPath,
      pixelWidth: r.width,
      pixelHeight: r.height,
      windowBounds: {
        x: r.displayBounds.x + cssRegion.x,
        y: r.displayBounds.y + cssRegion.y,
        width: cssRegion.w,
        height: cssRegion.h,
      },
      saveDir: getSaveDir(),
      filenameTemplate: getTemplate(),
    })
  }

  async function runFullscreenFlow(): Promise<void> {
    if (!(await ensureScreenRecording())) {
      openPermissionPane('screen')
      return
    }
    const r = await captureFullscreenAtCursor()
    if (!r) return
    await openEditor({
      imagePath: r.imagePath,
      pixelWidth: r.width,
      pixelHeight: r.height,
      windowBounds: r.displayBounds,
      saveDir: getSaveDir(),
      filenameTemplate: getTemplate(),
    })
  }

  // 注册快捷键（默认值来自 manifest.defaultShortcuts，store 中已保存的会覆盖）
  const regionCombo = ctx.store.get<string>('shortcuts.region', '') || 'CommandOrControl+Shift+A'
  const fullscreenCombo = ctx.store.get<string>('shortcuts.fullscreen', '') || 'CommandOrControl+Shift+F'

  const r1 = await ctx.registerShortcut('region', regionCombo, () => { runRegionFlow().catch((e) => ctx.log.error(e)) })
  if (!r1.ok) ctx.log.warn('region shortcut registration failed:', r1.reason)

  const r2 = await ctx.registerShortcut('fullscreen', fullscreenCombo, () => { runFullscreenFlow().catch((e) => ctx.log.error(e)) })
  if (!r2.ok) ctx.log.warn('fullscreen shortcut registration failed:', r2.reason)
}
```

- [ ] **Step 2: 手动验证**

Run: `npm run dev`
Expected:
1. 不需要任何临时 setTimeout，按 `Cmd+Shift+A` 弹叠层。
2. 拖选 → 编辑器无缝接管。
3. 编辑器内做标注 → Enter → 关闭并复制到剪贴板。
4. 按 `Cmd+Shift+F` 直接进入编辑器（全屏鼠标所在屏）。
5. **核心痛点测试**：打开 Finder，右键某个文件出现菜单 → 按 `Cmd+Shift+A` → 验证截图叠层出来后能看到右键菜单仍然在底图上。

- [ ] **Step 3: Commit**

```bash
git add src/tools/screenshot/main/index.ts
git commit -m "feat(screenshot): wire shortcuts to region/fullscreen flows"
```

---

### Task 43: 主窗口 lazy 加载 settingsView 接入

**Files:**
- Modify: `src/main/index.ts` (注册 IPC：拿 tool 快捷键、设置 + 中转 store 读写)
- Modify: `src/main/tool-registry.ts` (导出供 IPC 用的查询函数)
- Modify: `src/renderer/main-window/pages/tool-host.tsx` (动态 import settingsView)

- [ ] **Step 1: 在 tool-registry 暴露查询**

```ts
// src/main/tool-registry.ts 追加：
import { listShortcuts, registerShortcut as smRegister } from './shortcut-manager'

export function getToolShortcuts(toolId: string) {
  const m = tools.get(toolId)?.manifest
  if (!m) return []
  const all = listShortcuts(toolId)
  // 合并 defaultShortcuts 未注册的 key 也展示出来
  const result: { key: string; combo: string }[] = []
  const seen = new Set<string>()
  for (const r of all) { result.push({ key: r.key, combo: r.combo }); seen.add(r.key) }
  for (const key of Object.keys(m.defaultShortcuts)) {
    if (!seen.has(key)) result.push({ key, combo: '' })
  }
  return result
}

export function setToolShortcut(toolId: string, key: string, combo: string) {
  const m = tools.get(toolId)?.manifest
  if (!m) return { ok: false, reason: 'unknown tool' }
  // 持久化
  const store = getScopedStore(`tool.${toolId}`)
  store.set(`shortcuts.${key}`, combo)
  // 重新注册：handler 已绑定在 init 时，这里需要重用同一个 handler？
  // 简化方案：要求重启应用使新快捷键生效。或在 init 时把 handler 缓存到 map：
  const handler = shortcutHandlers.get(`${toolId}:${key}`)
  if (!handler) return { ok: false, reason: 'no handler registered yet, restart needed' }
  return smRegister({ toolId, key, combo, handler })
}

const shortcutHandlers = new Map<string, () => void>()

export function rememberShortcutHandler(toolId: string, key: string, handler: () => void) {
  shortcutHandlers.set(`${toolId}:${key}`, handler)
}
```

并在 createContext 的 registerShortcut 里调 rememberShortcutHandler：

```ts
registerShortcut: async (key, combo, handler) => {
  rememberShortcutHandler(manifest.id, key, handler)
  // ... 原逻辑
}
```

- [ ] **Step 2: 主进程 IPC**

Modify `src/main/index.ts` 的 `registerAppIpc`：

```ts
import { getToolShortcuts, setToolShortcut } from './tool-registry'
import { getScopedStore } from './settings-store'

function registerAppIpc(): void {
  // ... 已有
  ipcMain.handle(IPC.ToolGetShortcuts, (_e, toolId: string) => getToolShortcuts(toolId))
  ipcMain.handle(IPC.ToolSetShortcut, (_e, args: { toolId: string; key: string; combo: string }) =>
    setToolShortcut(args.toolId, args.key, args.combo),
  )
  ipcMain.handle(IPC.ToolStoreGet, (_e, args: { toolId: string; key: string; defaultValue?: unknown }) => {
    return getScopedStore(`tool.${args.toolId}`).get(args.key, args.defaultValue as never)
  })
  ipcMain.handle(IPC.ToolStoreSet, (_e, args: { toolId: string; key: string; value: unknown }) => {
    getScopedStore(`tool.${args.toolId}`).set(args.key, args.value)
  })
}
```

- [ ] **Step 3: 改造 tool-host 页**

```tsx
// src/renderer/main-window/pages/tool-host.tsx
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import type { ToolSettingsProps, ShortcutBinding, ScopedStore } from '@shared/types/tool-manifest'

interface Props { toolId: string }

const settingsViewLoaders: Record<string, () => Promise<{ default: React.ComponentType<ToolSettingsProps> }>> = {
  screenshot: () => import('@tools/screenshot/renderer/settings/index'),
}

export function ToolHostPage({ toolId }: Props) {
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>([])
  const Loaded = useMemo(() => {
    const loader = settingsViewLoaders[toolId]
    if (!loader) return null
    return React.lazy(loader)
  }, [toolId])

  useEffect(() => {
    window.mt.invoke(window.mt.IPC.ToolGetShortcuts, toolId).then((r) => setShortcuts(r as ShortcutBinding[]))
  }, [toolId])

  const store: ScopedStore = {
    get: <T,>(key: string, defaultValue?: T): T => {
      // 同步 get 需要预加载，简化为返回 defaultValue；真正读用 async 包一层
      // 为了让 useState 初值能拿到，下面用 syncStore（见 hint）
      throw new Error('store.get: use the renderer-side hook instead')
    },
    set: (key, value) => { window.mt.invoke(window.mt.IPC.ToolStoreSet, { toolId, key, value }) },
    delete: () => {/* no-op for now */},
    has: () => false,
  } as unknown as ScopedStore

  const setShortcut = async (key: string, combo: string) => {
    const r = (await window.mt.invoke(window.mt.IPC.ToolSetShortcut, { toolId, key, combo })) as { ok: boolean; conflictWith?: { toolId: string; key: string }; reason?: string }
    if (r.ok) {
      setShortcuts((prev) => prev.map((s) => (s.key === key ? { ...s, combo } : s)))
    }
    return r
  }

  if (!Loaded) return <div><h1>{toolId}</h1>该工具没有设置页。</div>

  return (
    <Suspense fallback={<div>加载中…</div>}>
      <Loaded store={store} shortcuts={shortcuts} setShortcut={setShortcut} toast={(msg) => alert(msg)} />
    </Suspense>
  )
}
```

> 注：`store.get` 同步接口与 IPC 异步本质冲突。简单方案：把每个工具的设置初值在主进程暴露一份预加载好的 snapshot；或在 ToolSettingsProps 中改 `store` 为 async API；或在主进程用 `ipcRenderer.sendSync`（不推荐，会阻塞）。
>
> **本期简化方案**：把 ScopedStore 的 `get` 改成异步：把 store 从 props 拿掉，改为提供一个 hook `useToolSetting(toolId, key, defaultValue)`，内部 async 加载并缓存。
>
> 修改 `src/shared/types/tool-manifest.ts` 的 `ToolSettingsProps`，移除 `store`，改为：
>
> ```ts
> export interface ToolSettingsProps {
>   toolId: string
>   shortcuts: ShortcutBinding[]
>   setShortcut: (key: string, combo: string) => Promise<RegisterResult>
>   toast: (msg: string, type?: 'info' | 'error') => void
> }
> ```
>
> 并提供共享 hook `src/renderer/shared/hooks/useToolSetting.ts`：
>
> ```ts
> import { useEffect, useState } from 'react'
>
> export function useToolSetting<T>(toolId: string, key: string, defaultValue: T): [T, (next: T) => void] {
>   const [val, setVal] = useState<T>(defaultValue)
>   useEffect(() => {
>     window.mt.invoke(window.mt.IPC.ToolStoreGet, { toolId, key, defaultValue }).then((v) => setVal(v as T))
>   }, [toolId, key])
>   return [
>     val,
>     (next: T) => {
>       setVal(next)
>       window.mt.invoke(window.mt.IPC.ToolStoreSet, { toolId, key, value: next })
>     },
>   ]
> }
> ```
>
> 然后改 `src/tools/screenshot/renderer/settings/index.tsx` 用 `useToolSetting(toolId, 'saveDir', defaultSaveDir)` 替代之前的 store.get/set。

- [ ] **Step 4: 重写 settings 页用 hook**

```tsx
// src/tools/screenshot/renderer/settings/index.tsx
import React from 'react'
import type { ToolSettingsProps } from '@shared/types/tool-manifest'
import { SettingRow } from '@renderer/shared/components/SettingRow'
import { Toggle } from '@renderer/shared/components/Toggle'
import { FilePathPicker } from '@renderer/shared/components/FilePathPicker'
import { ShortcutRecorder } from '@renderer/shared/components/ShortcutRecorder'
import { useToolSetting } from '@renderer/shared/hooks/useToolSetting'

export default function ScreenshotSettings({ toolId, shortcuts, setShortcut, toast }: ToolSettingsProps) {
  const [saveDir, setSaveDir] = useToolSetting(toolId, 'saveDir', '')
  const [template, setTemplate] = useToolSetting(toolId, 'filenameTemplate', 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}')
  const [windowDetect, setWindowDetect] = useToolSetting(toolId, 'windowDetect', true)
  const [colorFormat, setColorFormat] = useToolSetting(toolId, 'colorFormat', 'HEX')
  const [defaultBlockSize, setDefaultBlockSize] = useToolSetting(toolId, 'defaultBlockSize', 12)

  const findShortcut = (key: string) => shortcuts.find((s) => s.key === key)?.combo ?? ''

  return (
    <div>
      <h1>截图</h1>
      <SettingRow label="保存目录" hint="另存为时的默认位置">
        <FilePathPicker value={saveDir} onChange={setSaveDir} placeholder="~/Pictures/max-tools" />
      </SettingRow>
      <SettingRow label="文件名模板" hint="支持 {yyyy} {MM} {dd} {HH} {mm} {ss}">
        <input type="text" value={template} onChange={(e) => setTemplate(e.target.value)} style={{ width: '100%' }} />
      </SettingRow>
      <SettingRow label="窗口自动识别" hint="鼠标悬停 app 窗口高亮（需 Accessibility 权限）">
        <Toggle checked={windowDetect} onChange={setWindowDetect} />
      </SettingRow>
      <SettingRow label="取色格式">
        <select value={colorFormat} onChange={(e) => setColorFormat(e.target.value)}>
          <option value="HEX">HEX</option>
          <option value="RGB">RGB</option>
          <option value="HSL">HSL</option>
        </select>
      </SettingRow>
      <SettingRow label="默认马赛克块">
        <input type="number" min={4} max={64} value={defaultBlockSize} onChange={(e) => setDefaultBlockSize(Number(e.target.value))} />
      </SettingRow>

      <h2 style={{ marginTop: 24, fontSize: 14 }}>快捷键</h2>
      <SettingRow label="区域选区">
        <ShortcutRecorder value={findShortcut('region')} onChange={(c) => setShortcut('region', c)} />
      </SettingRow>
      <SettingRow label="全屏（鼠标所在屏）">
        <ShortcutRecorder value={findShortcut('fullscreen')} onChange={(c) => setShortcut('fullscreen', c)} />
      </SettingRow>
    </div>
  )
}
```

- [ ] **Step 5: tool-host.tsx 简化 props**

```tsx
<Suspense fallback={<div>加载中…</div>}>
  <Loaded toolId={toolId} shortcuts={shortcuts} setShortcut={setShortcut} toast={(msg) => alert(msg)} />
</Suspense>
```

- [ ] **Step 6: 手动验证**

Run: `npm run dev`
Expected:
1. 主窗口左侧栏点"截图" → 右侧出现完整设置页。
2. 修改"保存目录" / "文件名模板" → 立即生效（再触发一次截图 → 另存为时默认路径已变）。
3. 修改"区域选区"快捷键 → 录入新组合键 → 立即生效。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(main): wire tool settings via lazy import + ipc"
```

---

## Phase 9 - 收尾

### Task 44: 权限引导 banner + 对话框

**Files:**
- Modify: `src/main/permissions.ts` (导出 banner-friendly status snapshot)
- Modify: `src/renderer/main-window/App.tsx` (顶部 banner)
- Modify: `src/shared/types/ipc.ts` (加 GetPermissions)
- Modify: `src/main/index.ts` (注册 IPC)

- [ ] **Step 1: IPC**

```ts
// src/shared/types/ipc.ts 追加
export const IPC = {
  // ... 已有
  GetPermissions: 'app/get-permissions',
  OpenPermissionPane: 'app/open-permission-pane',
} as const
```

- [ ] **Step 2: 主进程 handler**

```ts
// src/main/index.ts
import { getPermissionStatus, openPermissionPane } from './permissions'

// 在 registerAppIpc 里加：
ipcMain.handle(IPC.GetPermissions, () => ({
  screen: getPermissionStatus('screen'),
  accessibility: getPermissionStatus('accessibility'),
}))
ipcMain.handle(IPC.OpenPermissionPane, (_e, kind: 'screen' | 'accessibility') => openPermissionPane(kind))
```

- [ ] **Step 3: 主窗口顶部 banner**

```tsx
// App.tsx 加：
const [perms, setPerms] = useState<{ screen: string; accessibility: string }>({ screen: 'unknown', accessibility: 'unknown' })

useEffect(() => {
  const refresh = () => window.mt.invoke(window.mt.IPC.GetPermissions).then((p) => setPerms(p as never))
  refresh()
  const t = setInterval(refresh, 3000)
  return () => clearInterval(t)
}, [])

// 在 .content 顶部插入：
{perms.screen !== 'granted' && (
  <div className="error-banner">
    截图功能需要"屏幕录制"权限 —
    <button onClick={() => window.mt.invoke(window.mt.IPC.OpenPermissionPane, 'screen')}>去授权</button>
  </div>
)}
{perms.accessibility !== 'granted' && (
  <div className="error-banner">
    "窗口自动识别"需要"辅助功能"权限 —
    <button onClick={() => window.mt.invoke(window.mt.IPC.OpenPermissionPane, 'accessibility')}>去授权</button>
  </div>
)}
```

- [ ] **Step 4: 手动验证**

把"屏幕录制"权限关掉重启 → 主窗口顶部出现 banner → 点"去授权"打开系统偏好设置对应面板。

- [ ] **Step 5: Commit**

```bash
git add src/main src/renderer/main-window src/shared/types/ipc.ts
git commit -m "feat(main): permission banner with quick links to system settings"
```

---

### Task 45: 手动验收清单

**Files:**
- Create: `tests/manual-checklist.md`

- [ ] **Step 1: 写清单**

```markdown
# 手动验收清单

每次发版前依次走完。✅ 表示通过；❌ 标记问题立即开 issue 修复。

## 1. 启动 & 菜单栏

- [ ] `npm run dev` 启动无报错
- [ ] macOS Dock 不出现图标
- [ ] 顶部菜单栏出现 Max Tools 图标
- [ ] 右键菜单栏图标 → 显示"截图"、"打开主窗口"、"设置"、"关于"、"退出"

## 2. 主窗口

- [ ] 点"打开主窗口" → 出现窗口
- [ ] 左侧栏显示"截图"工具
- [ ] 切到"截图"页 → 显示完整设置（保存目录、文件名模板、快捷键等）
- [ ] 切到"关于" → 显示版本号；点"打开日志目录" → Finder 打开 `~/Library/Logs/max-tools/`
- [ ] 关闭主窗口 → 应用仍在 Tray

## 3. 权限

- [ ] 系统设置关掉"屏幕录制" → 主窗口顶部 banner 提示
- [ ] 触发截图 → 弹引导（不会黑屏）
- [ ] 授权后 banner 消失

## 4. 截图核心 — 区域选区

- [ ] Cmd+Shift+A → 屏幕"凝固"，出现叠层
- [ ] 鼠标移动 → 右下角放大镜 + 实时色值
- [ ] 拖出矩形 → 松手 → 编辑器弹出在原选区位置
- [ ] 编辑器画矩形 / 椭圆 / 箭头 / 画笔
- [ ] 编辑器加文字 → 双击位置 → 出现输入框 → Cmd+Enter 提交
- [ ] 编辑器加马赛克 → 拖矩形 → 出现像素化色块
- [ ] 编辑器切到"高斯模糊" → 拖矩形 → 出现模糊
- [ ] Cmd+Z 撤销，Cmd+Shift+Z 重做
- [ ] 选择工具点击已有矩形 → 出现虚线选中态 → 可拖动 → Delete 删除
- [ ] Enter → 编辑器关闭；Cmd+V 到 Notes/IM → 粘贴出图像（含所有标注）
- [ ] 再开一次 → 点"另存为" → 系统对话框默认目录是设置中的路径 → 文件名模板已渲染 → 保存成功 → Finder 打开能看到 PNG
- [ ] Esc → 编辑器关闭，剪贴板**不变**（用其它内容验证）

## 5. 截图核心 — 全屏

- [ ] Cmd+Shift+F → 直接进入编辑器（不出叠层），底图是鼠标所在屏的全屏
- [ ] 多显示器场景：鼠标移到另一块屏 → Cmd+Shift+F → 截的是那一块

## 6. 截图核心 — 窗口识别

- [ ] 鼠标悬停在 Finder 窗口上 → 虚线高亮整窗
- [ ] 单击窗口 → 直接截整窗 → 编辑器接管
- [ ] Accessibility 权限关掉 → 悬停无高亮，但拖拽仍可用

## 7. 核心痛点 — 右键菜单截图

- [ ] 打开 Finder，对某文件右键 → 出现系统菜单
- [ ] 不要让菜单消失 → 直接按 Cmd+Shift+A
- [ ] **菜单仍在底图上**（关键验收点）
- [ ] 拖出选区覆盖菜单 → 截图 → 编辑器里看得到菜单完整内容

## 8. 多显示器

- [ ] 在两块屏之间切换鼠标 → Cmd+Shift+A → 每块屏都有自己的叠层
- [ ] 在副屏拖选 → 只对副屏起作用，主屏叠层一并关闭
- [ ] 选区结果坐标正确（位置和大小符合预期）

## 9. Retina / 非 Retina

- [ ] Retina 屏（@2x）：截图清晰，色值准确
- [ ] 外接非 Retina 屏：截图无错位，编辑器尺寸正确

## 10. 快捷键配置

- [ ] 设置页改区域快捷键为 Cmd+Shift+1 → 立即生效
- [ ] 改成已被占用的组合 → 出现红字"已被 xxx 占用"
- [ ] 点"清除"→ 快捷键置空 → 无法触发截图

## 11. 错误恢复

- [ ] `screencapture` 命令杀掉模拟失败 (`sudo killall screencapture`) → 看日志有 error，无残留窗口
- [ ] 叠层显示时按 Mission Control（F3） → 叠层立即关闭，未卡死
```

- [ ] **Step 2: Commit**

```bash
git add tests/manual-checklist.md
git commit -m "docs: manual acceptance checklist"
```

---

### Task 46: README + 开发说明

**Files:**
- Create: `README.md`

- [ ] **Step 1: 写 README**

```markdown
# Max Tools

macOS 菜单栏多工具桌面应用。当前内置：**截图工具**（可稳定捕获 macOS 右键菜单、系统级浮层）。

## 状态

🚧 早期开发中。仅支持 macOS；Windows 后续考虑。

## 功能（截图）

- 区域选区、窗口自动识别、全屏（按鼠标所在屏）
- 实时取色 + 放大镜
- 编辑器：矩形 / 椭圆 / 箭头 / 画笔 / 马赛克 / 高斯模糊 / 文字
- Undo / Redo
- 完成 → 复制到剪贴板；另存为 → 保存到文件
- 可配置的快捷键、保存目录、文件名模板

## 开发

### 依赖

- Node.js 20+
- macOS 12+

### 启动

```bash
npm install
npm run dev
```

### 测试

```bash
npm test           # 单测一次
npm run test:watch # 监听
npm run typecheck
npm run lint
```

### 打包

```bash
npm run package    # 生成 .dmg / .app 到 release/
```

### 加新工具

每个工具是 `src/tools/<id>/` 下的一个目录，实现 `ToolManifest` 即可。最小示例：

```
src/tools/my-tool/
├── manifest.ts        # export const myToolManifest: ToolManifest = {...}
├── main/index.ts      # 主进程 init 入口
└── renderer/settings/index.tsx  # 主窗口里的设置页（default export 一个 React 组件）
```

在 `src/main/index.ts` 的 `loadTools` 调用中追加：

```ts
async () => (await import('@tools/my-tool/manifest')).myToolManifest,
```

主窗口侧栏会自动出现该工具入口；快捷键、设置都由工具自己声明并管理。

详见：
- 设计文档：`docs/superpowers/specs/2026-06-17-max-tools-design.md`
- 实施计划：`docs/superpowers/plans/2026-06-17-max-tools-implementation.md`
- 验收清单：`tests/manual-checklist.md`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: readme with dev/test/build/extension guide"
```

---

## 完工后的验证

按下面顺序完整跑一遍：

1. `npm run typecheck` → 无报错
2. `npm run lint` → 无 error（warning 可接受）
3. `npm test` → 所有单测通过（应共有 ≥20 个）
4. `npm run dev` 启动后逐条走 `tests/manual-checklist.md`

---



