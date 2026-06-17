// tests/unit/tool-registry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock electron APIs (registry doesn't actually call them in our test paths)
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  BrowserWindow: class {},
}))
vi.mock('@main/logger', () => ({
  mainLog: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@main/settings-store', () => ({
  getScopedStore: () => ({ get: () => '', set: () => {}, delete: () => {}, has: () => false }),
}))
vi.mock('@main/shortcut-manager', () => ({
  registerShortcut: vi.fn(() => ({ ok: true })),
}))

import { loadTools, listToolSummaries, _resetForTest } from '@main/tool-registry'
import type { ToolManifest } from '@shared/types/tool-manifest'

const makeManifest = (overrides: Partial<ToolManifest> = {}): ToolManifest => ({
  id: 'demo',
  name: 'Demo',
  defaultShortcuts: {},
  init: vi.fn(async () => {}),
  settingsView: async () => ({ default: () => null }),
  ...overrides,
})

describe('tool-registry', () => {
  beforeEach(() => _resetForTest())

  it('loads a valid tool', async () => {
    await loadTools({ manifestLoaders: [async () => makeManifest()] })
    const s = listToolSummaries()
    expect(s).toHaveLength(1)
    expect(s[0].loaded).toBe(true)
  })

  it('isolates init failure of one tool from others', async () => {
    const broken = makeManifest({ id: 'broken', init: async () => { throw new Error('boom') } })
    const ok = makeManifest({ id: 'ok' })
    await loadTools({ manifestLoaders: [async () => broken, async () => ok] })
    const s = listToolSummaries()
    expect(s).toHaveLength(2)
    expect(s.find((x) => x.id === 'broken')?.loaded).toBe(false)
    expect(s.find((x) => x.id === 'broken')?.loadError).toBe('boom')
    expect(s.find((x) => x.id === 'ok')?.loaded).toBe(true)
  })

  it('skips duplicate ids', async () => {
    await loadTools({
      manifestLoaders: [async () => makeManifest({ id: 'x' }), async () => makeManifest({ id: 'x' })],
    })
    expect(listToolSummaries()).toHaveLength(1)
  })

  it('skips manifest with missing id', async () => {
    await loadTools({ manifestLoaders: [async () => ({ ...makeManifest(), id: '' })] })
    expect(listToolSummaries()).toHaveLength(0)
  })

  it('swallows loader throw without crashing', async () => {
    await loadTools({
      manifestLoaders: [async () => { throw new Error('nope') }, async () => makeManifest({ id: 'ok' })],
    })
    expect(listToolSummaries()).toHaveLength(1)
  })
})
