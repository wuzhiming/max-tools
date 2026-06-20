// src/tools/screenshot/renderer/settings/index.tsx
import React from 'react'
import { NumberInput, SegmentedControl, Stack, TextInput, Title } from '@mantine/core'
import type { ToolSettingsProps } from '@shared/types/tool-manifest'
import { SettingRow } from '@renderer/shared/components/SettingRow'
import { Toggle } from '@renderer/shared/components/Toggle'
import { FilePathPicker } from '@renderer/shared/components/FilePathPicker'
import { ShortcutRecorder } from '@renderer/shared/components/ShortcutRecorder'
import { useToolSetting } from '@renderer/shared/hooks/useToolSetting'

export default function ScreenshotSettings({ toolId, shortcuts, setShortcut }: ToolSettingsProps) {
  const [saveDir, setSaveDir] = useToolSetting<string>(toolId, 'saveDir', '')
  const [template, setTemplate] = useToolSetting<string>(
    toolId,
    'filenameTemplate',
    'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}',
  )
  const [windowDetect, setWindowDetect] = useToolSetting<boolean>(toolId, 'windowDetect', true)
  const [colorFormat, setColorFormat] = useToolSetting<string>(toolId, 'colorFormat', 'HEX')
  const [defaultBlockSize, setDefaultBlockSize] = useToolSetting<number>(toolId, 'defaultBlockSize', 12)

  const findShortcut = (key: string) => shortcuts.find((s) => s.key === key)?.combo ?? ''

  return (
    <Stack gap="md">
      <Title order={3}>截图</Title>

      <SettingRow label="保存目录" hint="另存为时的默认位置">
        <FilePathPicker value={saveDir} onChange={setSaveDir} placeholder="~/Pictures/max-tools" />
      </SettingRow>

      <SettingRow label="文件名模板" hint="支持 {yyyy} {MM} {dd} {HH} {mm} {ss}">
        <TextInput
          value={template}
          onChange={(e) => setTemplate(e.currentTarget.value)}
          size="xs"
        />
      </SettingRow>

      <SettingRow label="窗口自动识别" hint="鼠标悬停 app 窗口高亮（需 Accessibility 权限）">
        <Toggle checked={windowDetect} onChange={setWindowDetect} />
      </SettingRow>

      <SettingRow label="取色格式">
        <SegmentedControl
          size="xs"
          data={['HEX', 'RGB', 'HSL']}
          value={colorFormat}
          onChange={setColorFormat}
        />
      </SettingRow>

      <SettingRow label="默认马赛克块">
        <NumberInput
          min={4}
          max={64}
          value={defaultBlockSize}
          onChange={(v) => setDefaultBlockSize(typeof v === 'number' ? v : Number(v) || 12)}
          size="xs"
          w={120}
        />
      </SettingRow>

      <Title order={5} mt="lg">
        快捷键
      </Title>

      <SettingRow label="区域选区">
        <ShortcutRecorder value={findShortcut('region')} onChange={(c) => setShortcut('region', c)} />
      </SettingRow>

      <SettingRow label="全屏（鼠标所在屏）">
        <ShortcutRecorder
          value={findShortcut('fullscreen')}
          onChange={(c) => setShortcut('fullscreen', c)}
        />
      </SettingRow>
    </Stack>
  )
}
