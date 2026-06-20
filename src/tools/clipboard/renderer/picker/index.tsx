// src/tools/clipboard/renderer/picker/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Picker } from './Picker'

createRoot(document.getElementById('root')!).render(
  <MantineProvider defaultColorScheme="light">
    <Picker />
  </MantineProvider>,
)
