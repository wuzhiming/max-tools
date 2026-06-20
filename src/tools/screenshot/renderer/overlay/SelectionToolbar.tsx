// src/tools/screenshot/renderer/overlay/SelectionToolbar.tsx
import React from 'react'
import type { Rect } from '@tools/screenshot/main/dpi'

export type AnnotationTool = 'rect' | 'ellipse' | 'arrow' | 'pen' | 'blur' | 'text'

interface Props {
  rect: Rect
  viewport: { width: number; height: number }
  /** User picked an annotation tool — caller should confirm normal-mode
   *  and pre-select this tool in the editor. */
  onAnnotate: (tool: AnnotationTool) => void
  /** User picked the long-screenshot button — start scroll capture. */
  onScroll: () => void
  /** User confirmed without picking a tool (✓ or Enter) — just send to editor. */
  onConfirm: () => void
  /** User cancelled (✗ or Esc) — clear pending rect. */
  onCancel: () => void
}

const BUTTON_SIZE = 32
const GAP = 2
const PAD = 6
const SEP_W = 1
const ANCHOR_GAP = 8

// Layout: 6 annotation tools | 1 scroll | 1 cancel | 1 confirm
// separators between groups
const TOOLBAR_W =
  PAD * 2 +
  6 * BUTTON_SIZE + 5 * GAP + // annotation group
  GAP + SEP_W + GAP +
  BUTTON_SIZE +               // scroll
  GAP + SEP_W + GAP +
  BUTTON_SIZE + GAP + BUTTON_SIZE // cancel + confirm
const TOOLBAR_H = PAD * 2 + BUTTON_SIZE

function placement(rect: Rect, view: Props['viewport']): { x: number; y: number } {
  let { x, y, w, h } = rect
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  let tx = x + w - TOOLBAR_W // align right edge of toolbar to right edge of selection
  let ty = y + h + ANCHOR_GAP
  if (ty + TOOLBAR_H > view.height - 4) ty = y - TOOLBAR_H - ANCHOR_GAP
  if (ty < 4) ty = Math.max(4, y + h - TOOLBAR_H - ANCHOR_GAP)
  if (tx + TOOLBAR_W > view.width - 4) tx = view.width - TOOLBAR_W - 4
  if (tx < 4) tx = 4
  return { x: tx, y: ty }
}

export function SelectionToolbar({ rect, viewport, onAnnotate, onScroll, onConfirm, onCancel }: Props) {
  const { x, y } = placement(rect, viewport)
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
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
        alignItems: 'center',
        gap: GAP,
        background: 'rgba(38, 38, 38, 0.96)',
        borderRadius: 8,
        boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
        zIndex: 30,
      }}
    >
      <ToolBtn title="矩形"   onClick={() => onAnnotate('rect')}><RectIcon/></ToolBtn>
      <ToolBtn title="椭圆"   onClick={() => onAnnotate('ellipse')}><CircleIcon/></ToolBtn>
      <ToolBtn title="箭头"   onClick={() => onAnnotate('arrow')}><ArrowIcon/></ToolBtn>
      <ToolBtn title="画笔"   onClick={() => onAnnotate('pen')}><PenIcon/></ToolBtn>
      <ToolBtn title="马赛克" onClick={() => onAnnotate('blur')}><MosaicIcon/></ToolBtn>
      <ToolBtn title="文字"   onClick={() => onAnnotate('text')}><TextIcon/></ToolBtn>
      <Sep/>
      <ToolBtn title="长截图（滚动）" onClick={onScroll} accent="scroll"><ScrollIcon/></ToolBtn>
      <Sep/>
      <ToolBtn title="取消 (Esc)"  onClick={onCancel}  accent="danger"><XIcon/></ToolBtn>
      <ToolBtn title="完成 (Enter)" onClick={onConfirm} accent="primary"><CheckIcon/></ToolBtn>
    </div>
  )
}

function Sep() {
  return (
    <div style={{ width: SEP_W, height: BUTTON_SIZE - 8, background: 'rgba(255,255,255,0.18)' }} />
  )
}

function ToolBtn({
  title, onClick, children, accent,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
  accent?: 'primary' | 'danger' | 'scroll'
}) {
  const [hover, setHover] = React.useState(false)
  let bg = 'transparent'
  let color = 'rgba(255,255,255,0.9)'
  if (accent === 'primary') { bg = hover ? '#1971c2' : '#1c7ed6'; color = 'white' }
  else if (accent === 'danger') { color = hover ? '#ffa8a8' : '#ff8787' }
  else if (accent === 'scroll') {
    bg = hover ? 'rgba(34, 139, 230, 0.25)' : 'transparent'
    color = hover ? '#74c0fc' : '#a5d8ff'
  } else if (hover) bg = 'rgba(255,255,255,0.12)'

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        padding: 0,
        background: bg,
        color,
        border: 'none',
        borderRadius: 5,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 80ms, color 80ms',
      }}
    >
      {children}
    </button>
  )
}

// --- inline icons ---------------------------------------------------------
const svgProps = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
function RectIcon()   { return <svg {...svgProps}><rect x="4" y="5" width="16" height="14" rx="1.5"/></svg> }
function CircleIcon() { return <svg {...svgProps}><circle cx="12" cy="12" r="8"/></svg> }
function ArrowIcon()  { return <svg {...svgProps}><path d="M5 19 L19 5"/><path d="M11 5 H19 V13"/></svg> }
function PenIcon()    { return <svg {...svgProps}><path d="M16 4 L20 8 L8 20 H4 V16 Z"/></svg> }
function MosaicIcon() {
  return (
    <svg {...svgProps} strokeWidth={1.6}>
      <rect x="4"  y="4"  width="4" height="4"/>
      <rect x="10" y="4"  width="4" height="4"/>
      <rect x="16" y="4"  width="4" height="4"/>
      <rect x="4"  y="10" width="4" height="4"/>
      <rect x="10" y="10" width="4" height="4"/>
      <rect x="16" y="10" width="4" height="4"/>
      <rect x="4"  y="16" width="4" height="4"/>
      <rect x="10" y="16" width="4" height="4"/>
      <rect x="16" y="16" width="4" height="4"/>
    </svg>
  )
}
function TextIcon()   { return <svg {...svgProps}><path d="M5 6 H19"/><path d="M12 6 V20"/></svg> }
function ScrollIcon() {
  return (
    <svg {...svgProps}>
      <rect x="6" y="3" width="12" height="14" rx="1.5"/>
      <path d="M12 9 v8"/>
      <path d="M9 15 l3 3 3 -3"/>
    </svg>
  )
}
function XIcon()      { return <svg {...svgProps}><path d="M18 6 L6 18"/><path d="M6 6 L18 18"/></svg> }
function CheckIcon()  { return <svg {...svgProps} strokeWidth={2.4}><path d="M5 12 L10 17 L19 7"/></svg> }
