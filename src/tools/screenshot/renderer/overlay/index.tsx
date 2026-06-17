// src/tools/screenshot/renderer/overlay/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Overlay } from './Overlay'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(<Overlay />)
