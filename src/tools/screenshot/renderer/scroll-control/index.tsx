// src/tools/screenshot/renderer/scroll-control/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { ScrollControl } from './Control'

createRoot(document.getElementById('root')!).render(
  <MantineProvider defaultColorScheme="light">
    <ScrollControl />
  </MantineProvider>,
)
