// src/tools/screenshot/renderer/scroll-control/Control.tsx
import React, { useEffect, useState } from 'react'
import { ActionIcon, Group, Loader, Text, Tooltip } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import type { ScrollStatusPayload } from '@shared/types/screenshot-ipc'

export function ScrollControl() {
  const [framesCaptured, setFrames] = useState(0)
  const [phase, setPhase] = useState<'capturing' | 'stitching'>('capturing')

  useEffect(() => {
    const off = window.mt.on(window.mt.SS_IPC.ScrollStatus, (p) => {
      const s = p as ScrollStatusPayload
      setFrames(s.framesCaptured)
      setPhase(s.phase)
    })
    window.mt.send(window.mt.SS_IPC.ScrollReady)
    return () => { off() }
  }, [])

  const send = (channel: string) => window.mt.send(channel)

  return (
    <Group
      h={40}
      px="sm"
      gap={10}
      wrap="nowrap"
      style={{
        background: 'white',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        userSelect: 'none',
      }}
    >
      {phase === 'stitching' ? (
        <>
          <Loader size="xs" />
          <Text size="sm" c="dark">拼接中…</Text>
        </>
      ) : (
        <>
          <Text size="sm" c="dark" style={{ minWidth: 110 }}>
            滚动一下，已捕获 {framesCaptured} 帧
          </Text>
          <Tooltip label="取消 (Esc)" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              onClick={() => send(window.mt.SS_IPC.ScrollCancel)}
              aria-label="取消"
            >
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="完成 (Enter)" position="bottom" withArrow>
            <ActionIcon
              variant="filled"
              color="blue"
              size="lg"
              onClick={() => send(window.mt.SS_IPC.ScrollDone)}
              aria-label="完成"
            >
              <IconCheck size={18} />
            </ActionIcon>
          </Tooltip>
        </>
      )}
    </Group>
  )
}
