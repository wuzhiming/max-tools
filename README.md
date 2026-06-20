# Max Tools

macOS 菜单栏多工具桌面应用。基座统一管理快捷键、设置存储、托盘菜单，新工具以插件形式注册。

当前内置：

- **截图**：稳定捕获 macOS 右键菜单 / 系统级浮层，编辑后复制或另存
- **剪切板选择器**：浮层选择历史剪切板项粘贴

## 状态

🚧 早期开发中。仅支持 macOS；Windows 后续考虑。

## 功能

### 截图

- 区域选区、窗口自动识别、全屏（按鼠标所在屏）
- 实时取色 + 放大镜
- 编辑器：矩形 / 椭圆 / 箭头 / 画笔 / 马赛克 / 高斯模糊 / 文字
- Undo / Redo
- 完成 → 复制到剪贴板；另存为 → 保存到文件
- 可配置的快捷键、保存目录、文件名模板

### 剪切板选择器

- 浮层快速选择历史剪切板项目
- 选中即粘贴（模拟 ⌘V，需要辅助功能权限）

### 基座

每个注册的工具自动获得：

- 主窗口侧栏入口 + 设置页位
- 托盘菜单分组
- 全局快捷键注册与冲突检测
- **启用 / 禁用开关**（关闭后自动注销其所有全局快捷键和托盘项）
- 设置项持久化（per-tool scoped store）

通用设置：开机启动（托盘隐藏运行）。

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

#### 不签名（本地调试用）

```bash
npm run package      # 生成 .dmg（未签名）
npm run package:dir  # 生成 .app 目录，不打 dmg
```

#### 签名 + 公证 dmg（分发用）

```bash
APPLE_DEVELOPER_ID="Developer ID Application: 你的名字 (TEAMID)" \
APPLE_ID="you@example.com" \
APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
APPLE_TEAM_ID="ABC123XYZ" \
npm run package:dmg
```

变量含义：

| 变量 | 说明 |
|---|---|
| `APPLE_DEVELOPER_ID` | 钥匙串里的 Developer ID Application 证书。前缀 `Developer ID Application:` 可加可不加，脚本会自己剥掉。也可改用 `CODESIGN_IDENTITY` |
| `APPLE_ID` | 用于公证的 Apple 账号邮箱 |
| `APPLE_PASSWORD` | 该账号的 app-specific password（appleid.apple.com 生成）。也可直接用 `APPLE_APP_SPECIFIC_PASSWORD` |
| `APPLE_TEAM_ID` | 开发者团队 ID |

任一变量缺失时：缺签名变量 → 出未签名 dmg；缺公证变量 → 签名但跳过公证（脚本会打印告警）。

构建产物在 `release/`，arm64 / x64 各一份 dmg。

### 加新工具

每个工具是 `src/tools/<id>/` 下的一个目录，实现 `ToolManifest`。最小骨架：

```
src/tools/my-tool/
├── manifest.ts        # export const myToolManifest: ToolManifest = {...}
├── main/index.ts      # 主进程 init 入口
└── renderer/settings/index.tsx  # 主窗口里的设置页（default export 一个 React 组件）
```

在 `src/main/index.ts` 的 `loadTools` 调用里追加一行：

```ts
async () => (await import('@tools/my-tool/manifest')).myToolManifest,
```

启动后基座会自动接管：侧栏入口、设置页位、快捷键注册、启用/禁用开关、托盘分组都不用工具自己写。

详见：

- 设计文档：`docs/superpowers/specs/2026-06-17-max-tools-design.md`
- 实施计划：`docs/superpowers/plans/2026-06-17-max-tools-implementation.md`
- 验收清单：`tests/manual-checklist.md`
