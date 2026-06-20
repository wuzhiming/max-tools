// src/tools/screenshot/renderer/editor/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Editor } from './Editor'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <MantineProvider defaultColorScheme="light">
    <Editor />
  </MantineProvider>,
)
