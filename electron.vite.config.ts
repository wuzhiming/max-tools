import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared'),
        '@tools': resolve('src/tools'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared'),
        '@tools': resolve('src/tools'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main_window: resolve('src/renderer/main-window/index.html'),
          screenshot_overlay: resolve('src/tools/screenshot/renderer/overlay/index.html'),
          screenshot_editor: resolve('src/tools/screenshot/renderer/editor/index.html'),
        },
      },
    },
  },
})
