// src/renderer/shared/components/ShortcutRecorder.tsx
import React, { useEffect, useRef, useState } from 'react'

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
  const btnRef = useRef<HTMLButtonElement>(null)

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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setRecording((r) => !r); setDraft(null); setError(null) }}
        style={{
          minWidth: 140, padding: '4px 12px',
          background: recording ? '#fff3cd' : 'white',
          border: '1px solid #d1d1d6', borderRadius: 4,
          fontFamily: 'monospace',
        }}
      >
        {recording ? '按下组合键…（Esc 取消）' : display || placeholder || '未设置'}
      </button>
      {value && !recording && (
        <button type="button" onClick={async () => { await onChange(''); setDraft(null) }}>清除</button>
      )}
      {error && <span style={{ color: '#a40000', fontSize: 11 }}>{error}</span>}
    </div>
  )
}
