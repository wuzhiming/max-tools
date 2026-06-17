// src/tools/screenshot/renderer/editor/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from './Editor'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
root.render(<Editor />)
