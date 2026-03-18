import type { StorageValue } from 'zustand/middleware'

/**
 * Create a safe localStorage wrapper for Zustand persist middleware.
 * Catches JSON parse errors on read and quota errors on write to prevent
 * the app from crashing due to corrupted or overflowing localStorage.
 */
export function createSafeStorage<T>(name: string) {
  return {
    getItem: (key: string): StorageValue<T> | null => {
      try {
        const value = localStorage.getItem(key)
        if (!value) return null
        return JSON.parse(value) as StorageValue<T>
      } catch (e) {
        console.error(`Failed to read ${name} from localStorage, clearing:`, e)
        try { localStorage.removeItem(key) } catch { /* ignore */ }
        return null
      }
    },
    setItem: (key: string, value: StorageValue<T>) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        console.error(`Failed to persist ${name} to localStorage:`, e)
        // Don't crash -- just skip this persist cycle
      }
    },
    removeItem: (key: string) => {
      try { localStorage.removeItem(key) } catch { /* ignore */ }
    },
  }
}
