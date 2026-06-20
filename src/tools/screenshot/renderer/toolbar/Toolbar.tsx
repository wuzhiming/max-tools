// src/tools/screenshot/renderer/toolbar/Toolbar.tsx
import React, { useEffect, useState } from 'react'
import {
  ActionIcon,
  ColorPicker,
  ColorSwatch,
  Divider,
  Group,
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
  IconX,
} from '@tabler/icons-react'
import type {
  EditorStatusPayload,
  ToolbarActionPayload,
} from '@shared/types/screenshot-ipc'

type ToolKind = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'blur' | 'text'

const PRESETS = [
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

interface SimpleToolDef {
  id: Exclude<ToolKind, 'blur' | 'text'>
  label: string
  Icon: React.ComponentType<{ size?: number | string }>
}

const SIMPLE_TOOLS: SimpleToolDef[] = [
  { id: 'select', label: '选择', Icon: IconPointer },
  { id: 'rect', label: '矩形', Icon: IconSquare },
  { id: 'ellipse', label: '椭圆', Icon: IconCircle },
  { id: 'arrow', label: '箭头', Icon: IconArrowUpRight },
  { id: 'pen', label: '画笔', Icon: IconBrush },
]

export function Toolbar() {
  const [activeTool, setActiveTool] = useState<ToolKind>('rect')
  const [color, setColor] = useState('#FF3B30')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [blurMode, setBlurMode] = useState<'mosaic' | 'gaussian'>('mosaic')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.EditorStatus, (p) => {
      const status = p as EditorStatusPayload
      setCanUndo(status.canUndo)
      setCanRedo(status.canRedo)
    })
    // tell main we're ready so editor can send initial status
    window.mt.send(window.mt.SS_IPC.ToolbarReady)
    return () => { off() }
  }, [])

  const send = (a: ToolbarActionPayload) =>
    window.mt.send(window.mt.SS_IPC.ToolbarAction, a)
  const pickTool = (t: ToolKind) => {
    setActiveTool(t)
    send({ kind: 'SET_TOOL', payload: t })
  }
  const setStyle = (patch: Record<string, unknown>) =>
    send({ kind: 'SET_STYLE', payload: patch })

  const BlurIcon = blurMode === 'mosaic' ? IconGridDots : IconDroplet
  const blurLabel = blurMode === 'mosaic' ? '马赛克' : '高斯模糊'

  return (
    <Group
      h={48}
      px="sm"
      gap={4}
      wrap="nowrap"
      style={{
        background: 'white',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        userSelect: 'none',
      }}
    >
      {SIMPLE_TOOLS.map((t) => {
        const active = activeTool === t.id
        return (
          <Tooltip key={t.id} label={t.label} position="bottom" withArrow>
            <ActionIcon
              variant={active ? 'filled' : 'subtle'}
              color={active ? 'blue' : 'gray'}
              size="lg"
              aria-label={t.label}
              onClick={() => pickTool(t.id)}
            >
              <t.Icon size={ICON_SIZE} />
            </ActionIcon>
          </Tooltip>
        )
      })}

      {/* blur dropdown */}
      <Menu position="bottom-start" shadow="md" withArrow>
        <Menu.Target>
          <Tooltip label={blurLabel} position="bottom" withArrow>
            <ActionIcon
              variant={activeTool === 'blur' ? 'filled' : 'subtle'}
              color={activeTool === 'blur' ? 'blue' : 'gray'}
              size="lg"
              aria-label={blurLabel}
              onClick={() => pickTool('blur')}
            >
              <BlurIcon size={ICON_SIZE} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconGridDots size={14} />}
            onClick={() => {
              setBlurMode('mosaic')
              setStyle({ blurMode: 'mosaic' })
              pickTool('blur')
            }}
          >
            马赛克
          </Menu.Item>
          <Menu.Item
            leftSection={<IconDroplet size={14} />}
            onClick={() => {
              setBlurMode('gaussian')
              setStyle({ blurMode: 'gaussian' })
              pickTool('blur')
            }}
          >
            高斯模糊
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Tooltip label="文字" position="bottom" withArrow>
        <ActionIcon
          variant={activeTool === 'text' ? 'filled' : 'subtle'}
          color={activeTool === 'text' ? 'blue' : 'gray'}
          size="lg"
          aria-label="文字"
          onClick={() => pickTool('text')}
        >
          <IconLetterT size={ICON_SIZE} />
        </ActionIcon>
      </Tooltip>

      <Divider orientation="vertical" my={6} />

      {/* color + stroke group */}
      <Popover position="bottom" shadow="md" withArrow>
        <Popover.Target>
          <Tooltip label="颜色" position="bottom" withArrow>
            <ColorSwatch
              color={color}
              size={22}
              style={{ cursor: 'pointer' }}
              aria-label="颜色"
            />
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <ColorPicker
            value={color}
            onChange={(c) => {
              setColor(c)
              setStyle({ color: c })
            }}
            swatches={PRESETS}
            format="hex"
          />
        </Popover.Dropdown>
      </Popover>

      <Select
        size="xs"
        w={72}
        data={['1', '2', '3', '5', '8', '12'].map((v) => ({
          value: v,
          label: `${v}px`,
        }))}
        value={String(strokeWidth)}
        onChange={(v) => {
          if (v) {
            const n = Number(v)
            setStrokeWidth(n)
            setStyle({ strokeWidth: n })
          }
        }}
        allowDeselect={false}
        aria-label="线宽"
      />

      <Divider orientation="vertical" my={6} />

      {/* history group */}
      <Tooltip label="撤销" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          disabled={!canUndo}
          onClick={() => send({ kind: 'UNDO' })}
          aria-label="撤销"
        >
          <IconArrowBackUp size={ICON_SIZE} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="重做" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          disabled={!canRedo}
          onClick={() => send({ kind: 'REDO' })}
          aria-label="重做"
        >
          <IconArrowForwardUp size={ICON_SIZE} />
        </ActionIcon>
      </Tooltip>

      <Divider orientation="vertical" my={6} />

      {/* output group */}
      <Tooltip label="另存为" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={() => send({ kind: 'SAVE_AS' })}
          aria-label="另存为"
        >
          <IconDeviceFloppy size={ICON_SIZE} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="取消" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="red"
          size="lg"
          onClick={() => send({ kind: 'CANCEL' })}
          aria-label="取消"
        >
          <IconX size={ICON_SIZE} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="完成" position="bottom" withArrow>
        <ActionIcon
          variant="filled"
          color="blue"
          size="lg"
          onClick={() => send({ kind: 'COMPLETE' })}
          aria-label="完成"
        >
          <IconCheck size={ICON_SIZE} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}
