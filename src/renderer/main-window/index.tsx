// src/renderer/main-window/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { App } from './App'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <MantineProvider defaultColorScheme="light">
    <App />
  </MantineProvider>,
)
