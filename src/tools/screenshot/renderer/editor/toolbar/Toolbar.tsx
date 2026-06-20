// src/tools/screenshot/renderer/editor/toolbar/Toolbar.tsx
import React from 'react'
import {
  ActionIcon,
  ColorPicker,
  ColorSwatch,
  Divider,
  Group,
  Kbd,
  Menu,
  Popover,
  Select,
  Tooltip,
} from '@mantine/core'
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowUpRight,
  IconBrush,
  IconCheck,
  IconCircle,
  IconDeviceFloppy,
  IconDroplet,
  IconGridDots,
  IconLetterT,
  IconPointer,
  IconSquare,
} from '@tabler/icons-react'
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

const PRESET_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#5856D6',
  '#000000',
  '#FFFFFF',
]

const ICON_SIZE = 18

interface ToolDef {
  id: Exclude<ToolKind, 'blur'>
  label: string
  Icon: React.ComponentType<{ size?: number | string }>
}

const SIMPLE_TOOLS: ToolDef[] = [
  { id: 'select', label: '选择', Icon: IconPointer },
  { id: 'rect', label: '矩形', Icon: IconSquare },
  { id: 'ellipse', label: '椭圆', Icon: IconCircle },
  { id: 'arrow', label: '箭头', Icon: IconArrowUpRight },
  { id: 'pen', label: '画笔', Icon: IconBrush },
]

export function Toolbar(p: Props) {
  const blurActive = p.activeTool === 'blur'
  const BlurIcon = p.blurMode === 'mosaic' ? IconGridDots : IconDroplet
  const blurLabel = p.blurMode === 'mosaic' ? '马赛克' : '高斯模糊'

  return (
    <div className="editor-toolbar">
      <Group gap="xs" wrap="nowrap" style={{ width: '100%' }}>
        {SIMPLE_TOOLS.map((t) => {
          const active = p.activeTool === t.id
          return (
            <Tooltip key={t.id} label={t.label} position="top" withArrow>
              <ActionIcon
                variant={active ? 'filled' : 'subtle'}
                color={active ? 'blue' : 'gray'}
                size="lg"
                aria-label={t.label}
                onClick={() => p.setTool(t.id)}
              >
                <t.Icon size={ICON_SIZE} />
              </ActionIcon>
            </Tooltip>
          )
        })}

        <Menu position="top-start" shadow="md" withArrow>
          <Menu.Target>
            <Tooltip label={blurLabel} position="top" withArrow>
              <ActionIcon
                variant={blurActive ? 'filled' : 'subtle'}
                color={blurActive ? 'blue' : 'gray'}
                size="lg"
                aria-label={blurLabel}
                onClick={() => p.setTool('blur')}
              >
                <BlurIcon size={ICON_SIZE} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconGridDots size={14} />}
              onClick={() => {
                p.setBlurMode('mosaic')
                p.setTool('blur')
              }}
            >
              马赛克
            </Menu.Item>
            <Menu.Item
              leftSection={<IconDroplet size={14} />}
              onClick={() => {
                p.setBlurMode('gaussian')
                p.setTool('blur')
              }}
            >
              高斯模糊
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Tooltip label="文字" position="top" withArrow>
          <ActionIcon
            variant={p.activeTool === 'text' ? 'filled' : 'subtle'}
            color={p.activeTool === 'text' ? 'blue' : 'gray'}
            size="lg"
            aria-label="文字"
            onClick={() => p.setTool('text')}
          >
            <IconLetterT size={ICON_SIZE} />
          </ActionIcon>
        </Tooltip>

        <Divider orientation="vertical" />

        <Popover position="top" shadow="md" withArrow>
          <Popover.Target>
            <Tooltip label="颜色" position="top" withArrow>
              <ColorSwatch
                color={p.color}
                size={22}
                style={{ cursor: 'pointer' }}
                aria-label="颜色"
              />
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <ColorPicker
              value={p.color}
              onChange={p.setColor}
              swatches={PRESET_COLORS}
              format="hex"
            />
          </Popover.Dropdown>
        </Popover>

        <Select
          size="xs"
          w={80}
          data={['1', '2', '3', '5', '8', '12'].map((v) => ({ value: v, label: `${v}px` }))}
          value={String(p.strokeWidth)}
          onChange={(v) => v && p.setStrokeWidth(Number(v))}
          allowDeselect={false}
          aria-label="线宽"
        />

        <Divider orientation="vertical" />

        <Tooltip label={<><Kbd>⌘</Kbd>+<Kbd>Z</Kbd></>} position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            disabled={!p.canUndo}
            onClick={p.onUndo}
            aria-label="撤销"
          >
            <IconArrowBackUp size={ICON_SIZE} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={<><Kbd>⇧</Kbd>+<Kbd>⌘</Kbd>+<Kbd>Z</Kbd></>} position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            disabled={!p.canRedo}
            onClick={p.onRedo}
            aria-label="重做"
          >
            <IconArrowForwardUp size={ICON_SIZE} />
          </ActionIcon>
        </Tooltip>

        <div style={{ flex: 1 }} />

        <Tooltip label="另存为" position="top" withArrow>
          <ActionIcon
            variant="default"
            size="lg"
            onClick={p.onSaveAs}
            aria-label="另存为"
          >
            <IconDeviceFloppy size={ICON_SIZE} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="完成" position="top" withArrow>
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={p.onComplete}
            aria-label="完成"
          >
            <IconCheck size={ICON_SIZE} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  )
}
