// src/tools/screenshot/renderer/overlay/SelectionToolbar.tsx
import React from 'react'
import type { Rect } from '@tools/screenshot/main/dpi'

interface Props {
  rect: Rect
  /** display viewport CSS size (overlay window equals one display) */
  viewport: { width: number; height: number }
  onConfirm: () => void
  onScroll: () => void
  onCancel: () => void
}

const BUTTON_SIZE = 30
const GAP = 6
const PAD = 6
const BUTTONS = 3
const TOOLBAR_W = PAD * 2 + BUTTONS * BUTTON_SIZE + (BUTTONS - 1) * GAP
const TOOLBAR_H = PAD * 2 + BUTTON_SIZE
const ANCHOR_GAP = 8

/** Compute where to place the toolbar, relative to the selection rect.
 *  Prefer below the selection; flip above if there's no room; if neither
 *  has room (very tall selection that spans the display), tuck inside
 *  the bottom-right corner. */
function placement(rect: Rect, view: Props['viewport']): { x: number; y: number } {
  // Normalize a possibly-negative rect
  let x = rect.x
  let y = rect.y
  let w = rect.w
  let h = rect.h
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }

  let tx = x + w - TOOLBAR_W   // align toolbar right edge to selection right edge
  let ty = y + h + ANCHOR_GAP   // below selection
  if (ty + TOOLBAR_H > view.height - 4) {
    ty = y - TOOLBAR_H - ANCHOR_GAP // try above
  }
  if (ty < 4) {
    // No room above either — sit just inside the bottom of the selection
    ty = Math.max(4, y + h - TOOLBAR_H - ANCHOR_GAP)
  }
  if (tx + TOOLBAR_W > view.width - 4) tx = view.width - TOOLBAR_W - 4
  if (tx < 4) tx = 4
  return { x: tx, y: ty }
}

export function SelectionToolbar({ rect, viewport, onConfirm, onScroll, onCancel }: Props) {
  const { x, y } = placement(rect, viewport)
  // Stop bubbling so mousedown on a button never starts a new selection drag.
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      className="overlay-toolbar"
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: TOOLBAR_W,
        height: TOOLBAR_H,
        padding: PAD,
        display: 'flex',
        gap: GAP,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        zIndex: 30,
      }}
    >
      <button
        type="button"
        title="长截图（滚动）"
        aria-label="长截图"
        className="overlay-tb-btn"
        onClick={onScroll}
        style={btnStyle('#f1f3f5', '#222')}
      >
        <ScrollIcon />
      </button>
      <button
        type="button"
        title="取消 (Esc)"
        aria-label="取消"
        className="overlay-tb-btn"
        onClick={onCancel}
        style={btnStyle('#f1f3f5', '#e03131')}
      >
        <XIcon />
      </button>
      <button
        type="button"
        title="完成 (Enter)"
        aria-label="完成"
        className="overlay-tb-btn"
        onClick={onConfirm}
        style={btnStyle('#1c7ed6', 'white')}
      >
        <CheckIcon />
      </button>
    </div>
  )
}

function btnStyle(bg: string, fg: string): React.CSSProperties {
  return {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    background: bg,
    color: fg,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  }
}

function ScrollIcon() {
  // Down-pointing scroll: page + arrow
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3 H7 a2 2 0 0 0 -2 2 v8" />
      <path d="M14 3 v4 a2 2 0 0 0 2 2 h4" />
      <path d="M14 3 l6 6" />
      <path d="M12 13 v8" />
      <path d="M9 18 l3 3 3 -3" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 L6 18" />
      <path d="M6 6 L18 18" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12 L10 17 L19 7" />
    </svg>
  )
}
