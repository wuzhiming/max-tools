// src/tools/screenshot/renderer/editor/state/history.ts
export interface History<T> {
  current: T
  past: T[]
  future: T[]
}

export function createHistory<T>(initial: T): History<T> {
  return { current: initial, past: [], future: [] }
}

export function pushSnapshot<T>(h: History<T>, next: T): History<T> {
  return { current: next, past: [...h.past, h.current], future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  const prev = h.past[h.past.length - 1]
  return { current: prev, past: h.past.slice(0, -1), future: [h.current, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  const [next, ...rest] = h.future
  return { current: next, past: [...h.past, h.current], future: rest }
}
