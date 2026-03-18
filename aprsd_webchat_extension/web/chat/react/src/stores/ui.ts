import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeStorage } from '@/lib/safe-storage'

type Theme = 'light' | 'dark'
type SheetType = 'gps' | 'symbol' | null

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  showRawPackets: boolean
  tourCompleted: boolean
  activeSheet: SheetType
  radioBlinkTx: boolean
  radioBlinkRx: boolean
}

interface UIActions {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setShowRawPackets: (show: boolean) => void
  toggleRawPackets: () => void
  setTourCompleted: (completed: boolean) => void
  setActiveSheet: (sheet: SheetType) => void
  blinkRadio: (direction: 'tx' | 'rx') => void
}

type UIStore = UIState & UIActions

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export const useUI = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),
      sidebarOpen: false,
      commandPaletteOpen: false,
      showRawPackets: false,
      tourCompleted: false,
      activeSheet: null,
      radioBlinkTx: false,
      radioBlinkRx: false,

      setTheme: (theme: Theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
        set({ theme: newTheme })
      },

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),

      setShowRawPackets: (show: boolean) => set({ showRawPackets: show }),
      toggleRawPackets: () => set((s) => ({ showRawPackets: !s.showRawPackets })),

      setTourCompleted: (completed: boolean) => set({ tourCompleted: completed }),
      setActiveSheet: (sheet: SheetType) => set({ activeSheet: sheet }),

      blinkRadio: (direction: 'tx' | 'rx') => {
        if (direction === 'tx') {
          set({ radioBlinkTx: true })
          setTimeout(() => set({ radioBlinkTx: false }), 300)
        } else {
          set({ radioBlinkRx: true })
          setTimeout(() => set({ radioBlinkRx: false }), 300)
        }
      },
    }),
    {
      name: 'aprsd-webchat-ui',
      storage: createSafeStorage('ui'),
      partialize: (state) => ({
        theme: state.theme,
        tourCompleted: state.tourCompleted,
        showRawPackets: state.showRawPackets,
      }),
    }
  )
)
