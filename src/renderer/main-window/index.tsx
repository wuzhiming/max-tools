// src/renderer/main-window/index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return <div style={{ padding: 24 }}>Max Tools — 主窗口（占位）</div>
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
