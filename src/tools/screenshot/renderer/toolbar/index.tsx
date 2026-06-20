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
