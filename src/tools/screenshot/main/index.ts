import type { ToolContext } from '@shared/types/tool-manifest'

export async function initScreenshotTool(ctx: ToolContext): Promise<void> {
  ctx.log.info('screenshot tool init (skeleton)')
  // 后续 task 在这里注册快捷键、IPC、窗口
}
