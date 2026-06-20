// src/tools/screenshot/renderer/toolbar/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Toolbar } from './Toolbar'

createRoot(document.getElementById('root')!).render(
  <MantineProvider defaultColorScheme="light">
    <Toolbar />
  </MantineProvider>,
)

// Click-through bookkeeping.
//
// The toolbar window is much bigger than the visible pill so popovers can
// breathe. The empty padding around the pill is transparent and should not
// intercept clicks. We start with `setIgnoreMouseEvents(true, {forward:true})`
// from the main process; here we toggle it off whenever the cursor lands on
// something interactive (the pill itself, or a portal'd popover/menu).
let passthrough = true
const hostsInteractive = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof Element)) return false
  // The flex container (#root) and the body/html shells are always transparent
  // backdrop. Anything else is part of the pill or a Mantine portal layer.
  if (target === document.body || target === document.documentElement) return false
  if ((target as HTMLElement).id === 'root') return false
  return true
}
const apply = (next: boolean) => {
  if (next === passthrough) return
  passthrough = next
  window.mt.send(window.mt.SS_IPC.ToolbarSetPassthrough, next)
}
document.addEventListener('mousemove', (e) => {
  apply(!hostsInteractive(e.target))
})
document.addEventListener('mouseleave', () => apply(true))
window.addEventListener('blur', () => apply(true))
