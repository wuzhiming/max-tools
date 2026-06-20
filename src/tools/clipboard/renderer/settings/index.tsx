// src/tools/clipboard/renderer/settings/index.tsx
import React from 'react'
import { NumberInput, Stack, Text, Title } from '@mantine/core'
import type { ToolSettingsProps } from '@shared/types/tool-manifest'
import { SettingRow } from '@renderer/shared/components/SettingRow'
import { ShortcutRecorder } from '@renderer/shared/components/ShortcutRecorder'
import { useToolSetting } from '@renderer/shared/hooks/useToolSetting'

export default function ClipboardSettings({ toolId, shortcuts, setShortcut, toast }: ToolSettingsProps) {
  const [maxQueueSize, setMaxQueueSize] = useToolSetting<number>(toolId, 'maxQueueSize', 30)

  const findShortcut = (key: string) => shortcuts.find((s) => s.key === key)?.combo ?? ''

  return (
    <Stack gap="md">
      <Title order={3}>剪切板</Title>

      <Text c="dimmed" size="sm">
        每次 ⌘C 后内容会自动进入队列。⌘V 走系统默认（粘最近一项），
        ⌘⇧V 弹出选择器；可用 数字 1–9 或 ↑↓+Enter 选中粘贴。
      </Text>

      <SettingRow label="队列最大长度" hint="超过会从末尾丢弃，范围 5–200">
        <NumberInput
          min={5}
          max={200}
          step={1}
          value={maxQueueSize}
          onChange={(v) => setMaxQueueSize(typeof v === 'number' ? v : Number(v) || 30)}
          size="xs"
          w={120}
          allowDecimal={false}
          allowNegative={false}
          clampBehavior="strict"
        />
      </SettingRow>

      <Title order={5} mt="lg">
        快捷键
      </Title>

      <SettingRow label="打开选择器">
        <ShortcutRecorder
          value={findShortcut('showPicker')}
          onChange={async (c) => {
            const r = await setShortcut('showPicker', c)
            if (!r.ok && r.reason) toast(r.reason, 'error')
            return r
          }}
        />
      </SettingRow>
    </Stack>
  )
}
