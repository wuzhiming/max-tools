// src/tools/screenshot/renderer/editor/toolbar/Toolbar.tsx
import React, { useState } from 'react'
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

const PRESET_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#000000', '#FFFFFF']

export function Toolbar(p: Props) {
  const [showBlurMenu, setShowBlurMenu] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const tools: { id: ToolKind; label: string }[] = [
    { id: 'select', label: '选择' },
    { id: 'rect', label: '矩形' },
    { id: 'ellipse', label: '椭圆' },
    { id: 'arrow', label: '箭头' },
    { id: 'pen', label: '画笔' },
    { id: 'blur', label: p.blurMode === 'mosaic' ? '马赛克 ▾' : '模糊 ▾' },
    { id: 'text', label: '文字' },
  ]
  return (
    <div className="editor-toolbar">
      {tools.map((t) => (
        <div key={t.id} style={{ position: 'relative' }}>
          <button
            className={`tool-btn ${p.activeTool === t.id ? 'active' : ''}`}
            onClick={() => {
              p.setTool(t.id)
              if (t.id === 'blur') setShowBlurMenu((s) => !s)
              else setShowBlurMenu(false)
            }}
          >
            {t.label}
          </button>
          {t.id === 'blur' && showBlurMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: 36,
                left: 0,
                background: '#3a3a3c',
                borderRadius: 4,
                padding: 4,
                zIndex: 10,
              }}
            >
              <div
                className="tool-btn"
                onClick={() => {
                  p.setBlurMode('mosaic')
                  setShowBlurMenu(false)
                }}
              >
                马赛克
              </div>
              <div
                className="tool-btn"
                onClick={() => {
                  p.setBlurMode('gaussian')
                  setShowBlurMenu(false)
                }}
              >
                高斯模糊
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="tool-sep" />
      <div
        className="color-swatch"
        style={{ background: p.color }}
        onClick={() => setShowColorMenu((s) => !s)}
      />
      {showColorMenu && (
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 220,
            background: '#3a3a3c',
            borderRadius: 4,
            padding: 6,
            display: 'flex',
            gap: 4,
            zIndex: 10,
          }}
        >
          {PRESET_COLORS.map((c) => (
            <div
              key={c}
              className="color-swatch"
              style={{ background: c, width: 18, height: 18 }}
              onClick={() => {
                p.setColor(c)
                setShowColorMenu(false)
              }}
            />
          ))}
          <input type="color" value={p.color} onChange={(e) => p.setColor(e.target.value)} />
        </div>
      )}
      <select value={p.strokeWidth} onChange={(e) => p.setStrokeWidth(Number(e.target.value))}>
        {[1, 2, 3, 5, 8, 12].map((w) => (
          <option key={w} value={w}>
            {w}px
          </option>
        ))}
      </select>
      <div className="tool-sep" />
      <button className="tool-btn" disabled={!p.canUndo} onClick={p.onUndo}>
        ↶
      </button>
      <button className="tool-btn" disabled={!p.canRedo} onClick={p.onRedo}>
        ↷
      </button>
      <div style={{ flex: 1 }} />
      <button className="tool-btn" onClick={p.onSaveAs}>
        另存为
      </button>
      <button className="tool-btn" style={{ background: '#007aff' }} onClick={p.onComplete}>
        完成
      </button>
    </div>
  )
}
