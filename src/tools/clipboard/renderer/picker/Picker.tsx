// src/tools/clipboard/renderer/picker/Picker.tsx
import React, { useEffect, useRef, useState } from 'react'
import { ScrollArea, Stack, Text } from '@mantine/core'
import type { ClipboardEntry, PickerInitPayload } from '@shared/types/clipboard-ipc'

function previewOf(text: string, max = 110): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return flat.slice(0, max - 1) + '…'
}

function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 5) return '刚刚'
  if (s < 60) return `${s} 秒前`
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

export function Picker() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const [selected, setSelected] = useState(0)
  /** Last entry the user pointed at — drives the right-hand preview pane.
   *  Selection (number key / arrow) ALSO updates this so keyboard browsing
   *  feels coherent with mouse browsing. */
  const [previewId, setPreviewId] = useState<string | null>(null)

  const selectedRef = useRef(0)
  const entriesRef = useRef<ClipboardEntry[]>([])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { entriesRef.current = entries }, [entries])

  useEffect(() => {
    const off = window.mt.on(window.mt.CB_IPC.PickerInit, (p) => {
      const payload = p as PickerInitPayload
      setEntries(payload.entries)
      setSelected(0)
      setPreviewId(payload.entries[0]?.id ?? null)
    })
    window.mt.send(window.mt.CB_IPC.PickerReady)
    return () => { off() }
  }, [])

  const pick = (id: string) => window.mt.send(window.mt.CB_IPC.Pick, { id })

  // Keyboard nav. Update both `selected` (highlight in list) and
  // `previewId` (right-pane content) so keys drive the preview too.
  const selectAt = (i: number) => {
    setSelected(i)
    setPreviewId(entriesRef.current[i]?.id ?? null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const list = entriesRef.current
      const sel = selectedRef.current
      if (e.key === 'Escape') {
        e.preventDefault()
        window.mt.send(window.mt.CB_IPC.Cancel)
        return
      }
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const i = Number(e.key) - 1
        if (i < list.length) pick(list[i].id)
        return
      }
      if (e.key === 'Enter' || e.key === 'Return') {
        e.preventDefault()
        if (list[sel]) pick(list[sel].id)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectAt(Math.min(list.length - 1, sel + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectAt(Math.max(0, sel - 1))
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const previewEntry = entries.find((e) => e.id === previewId) ?? null

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Text fw={600} size="sm">剪切板历史</Text>
        <Text c="dimmed" size="xs">
          数字 1–9 直选 · ↑↓ Enter · Esc 取消 · 悬停看预览
        </Text>
      </div>

      {entries.length === 0 ? (
        <Stack align="center" justify="center" style={{ flex: 1 }} gap={4}>
          <Text c="dimmed" size="sm">剪切板队列还没有内容</Text>
          <Text c="dimmed" size="xs">复制点东西后再回来</Text>
        </Stack>
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: list */}
          <div style={{ width: 420, borderRight: '1px solid #eee', minWidth: 0 }}>
            <ScrollArea style={{ height: '100%' }} type="auto">
              {entries.map((entry, idx) => {
                const isActive = idx === selected
                const numLabel = idx < 9 ? String(idx + 1) : '·'
                return (
                  <div
                    key={entry.id}
                    onMouseEnter={() => { setSelected(idx); setPreviewId(entry.id) }}
                    onClick={() => pick(entry.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderBottom: '1px solid #f4f4f4',
                      background: isActive ? '#e7f5ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        flex: '0 0 22px',
                        height: 22,
                        borderRadius: 4,
                        background: isActive ? '#1c7ed6' : '#e9ecef',
                        color: isActive ? 'white' : '#495057',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {numLabel}
                    </div>
                    {entry.kind === 'image' ? (
                      <>
                        <img
                          src={entry.thumbDataUrl}
                          alt=""
                          draggable={false}
                          style={{
                            height: 36,
                            width: 'auto',
                            maxWidth: 80,
                            objectFit: 'contain',
                            borderRadius: 3,
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" c="dark">图片</Text>
                          <Text size="xs" c="dimmed" mt={2}>
                            {entry.width}×{entry.height} · {Math.round(entry.bytes / 1024)} KB · {relTime(entry.time)}
                          </Text>
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          size="sm"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#212529',
                          }}
                        >
                          {previewOf(entry.text)}
                        </Text>
                        <Text size="xs" c="dimmed" mt={2}>
                          {entry.text.length} 字符 · {relTime(entry.time)}
                        </Text>
                      </div>
                    )}
                  </div>
                )
              })}
            </ScrollArea>
          </div>

          {/* Right: preview pane */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#fafbfc',
            }}
          >
            {previewEntry === null ? (
              <Stack align="center" justify="center" style={{ flex: 1 }}>
                <Text c="dimmed" size="xs">悬停或键盘选中查看预览</Text>
              </Stack>
            ) : previewEntry.kind === 'image' ? (
              <>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                  }}
                >
                  <img
                    src={previewEntry.previewDataUrl}
                    alt=""
                    draggable={false}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: 4,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      background: 'white',
                    }}
                  />
                </div>
                <div style={{ padding: '6px 12px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                  <Text size="xs" c="dimmed">
                    {previewEntry.width}×{previewEntry.height} · {Math.round(previewEntry.bytes / 1024)} KB
                  </Text>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    padding: 12,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: '#212529',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    userSelect: 'text',
                  }}
                >
                  {previewEntry.text}
                </div>
                <div style={{ padding: '6px 12px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                  <Text size="xs" c="dimmed">{previewEntry.text.length} 字符</Text>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
