import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { APRSThursdayMessage, APRSThursdayConfirmation, CallsignLocation } from '@/types'

type APRSThursdayMode = 'broadcast' | 'logonly'

const SUBSCRIPTION_DURATION_MS = 43200000 // 12 hours

interface APRSThursdayState {
  enabled: boolean
  subscribed: boolean
  mode: APRSThursdayMode
  subscribedAt: string | null
  expiresAt: string | null
  messages: APRSThursdayMessage[]
  locationCache: Record<string, CallsignLocation>
}

interface APRSThursdayActions {
  setEnabled: (enabled: boolean) => void
  addMessage: (msg: APRSThursdayMessage) => void
  handleConfirmation: (data: APRSThursdayConfirmation) => void
  subscribe: (mode: APRSThursdayMode) => void
  unsubscribe: () => void
  checkExpiry: () => void
  updateLocationCache: (location: CallsignLocation) => void
  clearMessages: () => void
}

type APRSThursdayStore = APRSThursdayState & APRSThursdayActions

export const useAPRSThursday = create<APRSThursdayStore>()(
  persist(
    (set, get) => ({
      enabled: false,
      subscribed: false,
      mode: 'broadcast' as APRSThursdayMode,
      subscribedAt: null,
      expiresAt: null,
      messages: [],
      locationCache: {},

      setEnabled: (enabled: boolean) => set({ enabled }),

      addMessage: (msg: APRSThursdayMessage) => {
        const { messages } = get()
        const updated = [...messages, msg]
        // Keep max 50 messages (matching current jQuery behavior)
        set({ messages: updated.length > 50 ? updated.slice(-50) : updated })
      },

      handleConfirmation: (data: APRSThursdayConfirmation) => {
        if (data.type === 'subscribed') {
          const now = new Date()
          set({
            subscribed: true,
            subscribedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + SUBSCRIPTION_DURATION_MS).toISOString(),
          })
        } else if (data.type === 'unsubscribed') {
          set({
            subscribed: false,
            subscribedAt: null,
            expiresAt: null,
          })
        }
        // 'logged' type doesn't change subscription state
      },

      subscribe: (mode: APRSThursdayMode) => {
        const now = new Date()
        set({
          subscribed: true,
          mode,
          subscribedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + SUBSCRIPTION_DURATION_MS).toISOString(),
        })
      },

      unsubscribe: () => {
        set({
          subscribed: false,
          subscribedAt: null,
          expiresAt: null,
        })
      },

      checkExpiry: () => {
        const { expiresAt, subscribed } = get()
        if (subscribed && expiresAt) {
          if (new Date() >= new Date(expiresAt)) {
            set({
              subscribed: false,
              subscribedAt: null,
              expiresAt: null,
            })
          }
        }
      },

      updateLocationCache: (location: CallsignLocation) => {
        const { locationCache } = get()
        set({
          locationCache: { ...locationCache, [location.callsign]: location },
        })
      },

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'aprsd-webchat-aprsthursday',
      partialize: (state) => ({
        enabled: state.enabled,
        subscribed: state.subscribed,
        mode: state.mode,
        subscribedAt: state.subscribedAt,
        expiresAt: state.expiresAt,
      }),
    }
  )
)
