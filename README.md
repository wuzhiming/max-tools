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
