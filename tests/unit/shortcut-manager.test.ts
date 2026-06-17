// tests/unit/shortcut-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerShortcut, _resetForTest, listShortcuts } from '@main/shortcut-manager'

const deps = {
  electronRegister: vi.fn(() => true),
  electronUnregister: vi.fn(),
}

describe('shortcut-manager', () => {
  beforeEach(() => {
    _resetForTest()
    deps.electronRegister.mockClear()
    deps.electronUnregister.mockClear()
    deps.electronRegister.mockReturnValue(true)
  })

  it('registers a fresh combo', () => {
    const r = registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    expect(r.ok).toBe(true)
    expect(deps.electronRegister).toHaveBeenCalledOnce()
    expect(listShortcuts()).toHaveLength(1)
  })

  it('rejects combo conflict from another tool', () => {
    registerShortcut({ toolId: 'a', key: 'x', combo: 'Cmd+B', handler: () => {} }, deps)
    const r = registerShortcut({ toolId: 'b', key: 'y', combo: 'Cmd+B', handler: () => {} }, deps)
    expect(r.ok).toBe(false)
    expect(r.conflictWith).toEqual({ toolId: 'a', key: 'x' })
  })

  it('replaces same toolId/key when combo changes', () => {
    registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    const r = registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+C', handler: () => {} }, deps)
    expect(r.ok).toBe(true)
    expect(deps.electronUnregister).toHaveBeenCalledWith('Cmd+A')
    expect(listShortcuts()).toHaveLength(1)
    expect(listShortcuts()[0].combo).toBe('Cmd+C')
  })

  it('empty combo clears existing binding without registering', () => {
    registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    deps.electronRegister.mockClear()
    const r = registerShortcut({ toolId: 't', key: 'k', combo: '', handler: () => {} }, deps)
    expect(r.ok).toBe(true)
    expect(deps.electronRegister).not.toHaveBeenCalled()
    expect(deps.electronUnregister).toHaveBeenCalledWith('Cmd+A')
    expect(listShortcuts()).toHaveLength(0)
  })

  it('reports OS rejection', () => {
    deps.electronRegister.mockReturnValue(false)
    const r = registerShortcut({ toolId: 't', key: 'k', combo: 'Cmd+A', handler: () => {} }, deps)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/OS rejected/)
  })
})
