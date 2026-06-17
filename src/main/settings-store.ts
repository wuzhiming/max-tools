// src/main/settings-store.ts
import Store from 'electron-store'

export interface ScopedStore {
  get<T = unknown>(key: string, defaultValue?: T): T
  set(key: string, value: unknown): void
  delete(key: string): void
  has(key: string): boolean
}

const root = new Store({ name: 'max-tools' })

export function getScopedStore(namespace: string): ScopedStore {
  const prefix = `${namespace}.`
  return {
    get: <T,>(key: string, defaultValue?: T): T =>
      (root.get(prefix + key, defaultValue) as T),
    set: (key, value) => root.set(prefix + key, value),
    delete: (key) => root.delete(prefix + key as never),
    has: (key) => root.has(prefix + key),
  }
}

export const appStore: ScopedStore = getScopedStore('app')
