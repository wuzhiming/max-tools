// src/renderer/shared/components/ShortcutRecorder.tsx
import React, { useEffect, useState } from 'react'
import { ActionIcon, Button, Group, Kbd, Text, Tooltip } from '@mantine/core'
import { IconKeyboard, IconX } from '@tabler/icons-react'

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
    <Group gap={8} wrap="nowrap" align="center">
      {recording ? (
        <Button variant="light" color="yellow" size="xs">
          按下组合键…（Esc 取消）
        </Button>
      ) : (
        <Button
          variant="default"
          size="xs"
          leftSection={<IconKeyboard size={14} />}
          onClick={() => {
            setRecording(true)
            setDraft(null)
            setError(null)
          }}
          styles={{
            root: { minWidth: 180, justifyContent: 'flex-start', paddingLeft: 10, paddingRight: 12 },
            section: { marginRight: 8 },
            label: { width: '100%', textAlign: 'left' },
          }}
        >
          {display ? (
            <Kbd style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {display}
            </Kbd>
          ) : (
            <Text size="xs" c="dimmed">{placeholder ?? '未设置'}</Text>
          )}
        </Button>
      )}
      {value && !recording && (
        <Tooltip label="清除快捷键" withArrow position="top">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="sm"
            onClick={async () => {
              await onChange('')
              setDraft(null)
            }}
            aria-label="清除"
          >
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      )}
      {error && (
        <Text size="xs" c="red" ml={4}>
          {error}
        </Text>
      )}
    </Group>
  )
}

