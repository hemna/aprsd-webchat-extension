import { create } from 'zustand'
import { persist, type StorageValue } from 'zustand/middleware'
import type { Channel, Message, CallsignLocation } from '@/types'
import { generateMessageId } from '@/lib/utils'

// Maximum messages kept per channel to prevent unbounded growth
const MAX_MESSAGES_PER_CHANNEL = 200
// Maximum location entries cached
const MAX_LOCATIONS = 100

interface MessagesState {
  channels: Record<string, Channel>
  messages: Record<string, Message[]>
  selectedChannel: string | null
  unreadCounts: Record<string, number>
  locations: Record<string, CallsignLocation>
}

interface MessagesActions {
  addMessage: (msg: Message) => void
  ackMessage: (msgNo: string) => void
  selectChannel: (callsign: string | null) => void
  setPath: (callsign: string, path: string) => void
  updateLocation: (location: CallsignLocation) => void
  ensureChannel: (callsign: string, category?: Channel['category']) => void
  clearUnread: (callsign: string) => void
}

type MessagesStore = MessagesState & MessagesActions
type PersistedMessages = Partial<MessagesState>

/** Safe localStorage wrapper with quota recovery for the messages store */
const messagesStorage = {
  getItem: (name: string): StorageValue<PersistedMessages> | null => {
    try {
      const value = localStorage.getItem(name)
      if (!value) return null
      return JSON.parse(value) as StorageValue<PersistedMessages>
    } catch (e) {
      console.error('Failed to read persisted messages, clearing:', e)
      try { localStorage.removeItem(name) } catch { /* ignore */ }
      return null
    }
  },
  setItem: (name: string, value: StorageValue<PersistedMessages>) => {
    try {
      localStorage.setItem(name, JSON.stringify(value))
    } catch (e) {
      console.error('Failed to persist messages (likely quota exceeded), trimming:', e)
      // Try to recover by aggressively trimming message history
      try {
        const state = value.state
        if (state?.messages) {
          const trimmed = { ...state.messages }
          for (const callsign of Object.keys(trimmed)) {
            trimmed[callsign] = trimmed[callsign].slice(-50)
          }
          localStorage.setItem(name, JSON.stringify({ ...value, state: { ...state, messages: trimmed } }))
        }
      } catch {
        // Last resort: clear entirely
        try { localStorage.removeItem(name) } catch { /* ignore */ }
      }
    }
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name) } catch { /* ignore */ }
  },
}

export const useMessages = create<MessagesStore>()(
  persist(
    (set, get) => ({
      channels: {},
      messages: {},
      selectedChannel: null,
      unreadCounts: {},
      locations: {},

      addMessage: (msg: Message) => {
        const { channels, messages, selectedChannel, unreadCounts } = get()
        const callsign = msg.type === 'tx' ? msg.to_call : msg.from_call
        const msgId = generateMessageId(msg.from_call, msg.to_call, msg.timestamp, msg.msgNo)

        // Deduplicate
        const existing = messages[callsign] || []
        if (existing.some(m => generateMessageId(m.from_call, m.to_call, m.timestamp, m.msgNo) === msgId)) {
          return
        }

        // Auto-create channel if needed
        const updatedChannels = { ...channels }
        if (!updatedChannels[callsign]) {
          updatedChannels[callsign] = {
            callsign,
            path: msg.path || 'WIDE1-1,WIDE2-1',
            lastActivity: msg.timestamp,
            category: 'dm',
          }
        }
        updatedChannels[callsign] = {
          ...updatedChannels[callsign],
          lastMessage: msg,
          lastActivity: msg.timestamp,
        }

        // Update unread if not the selected channel
        const updatedUnread = { ...unreadCounts }
        if (msg.type === 'rx' && callsign !== selectedChannel) {
          updatedUnread[callsign] = (updatedUnread[callsign] || 0) + 1
        }

        // Append and cap at MAX_MESSAGES_PER_CHANNEL (no sort -- just append in order)
        let channelMsgs = [...existing, msg]
        if (channelMsgs.length > MAX_MESSAGES_PER_CHANNEL) {
          channelMsgs = channelMsgs.slice(-MAX_MESSAGES_PER_CHANNEL)
        }

        set({
          channels: updatedChannels,
          messages: {
            ...messages,
            [callsign]: channelMsgs,
          },
          unreadCounts: updatedUnread,
        })
      },

      ackMessage: (msgNo: string) => {
        // Only scan and update the channel that contains this msgNo
        const { messages } = get()
        for (const callsign of Object.keys(messages)) {
          const channelMsgs = messages[callsign]
          const idx = channelMsgs.findIndex(m => m.msgNo === msgNo && !m.ack)
          if (idx !== -1) {
            // Found it -- only update this one channel
            const updated = [...channelMsgs]
            updated[idx] = { ...updated[idx], ack: true }
            set({
              messages: {
                ...messages,
                [callsign]: updated,
              },
            })
            return
          }
        }
      },

      selectChannel: (callsign: string | null) => {
        const { unreadCounts } = get()
        const updatedUnread = { ...unreadCounts }
        if (callsign) {
          delete updatedUnread[callsign]
        }
        set({ selectedChannel: callsign, unreadCounts: updatedUnread })
      },

      setPath: (callsign: string, path: string) => {
        const { channels } = get()
        if (channels[callsign]) {
          set({
            channels: {
              ...channels,
              [callsign]: { ...channels[callsign], path },
            },
          })
        }
      },

      updateLocation: (location: CallsignLocation) => {
        const { locations } = get()
        const updated = {
          ...locations,
          [location.callsign]: { ...location, last_updated: new Date().toISOString() },
        }
        // Cap location cache size
        const keys = Object.keys(updated)
        if (keys.length > MAX_LOCATIONS) {
          // Remove oldest entries
          const sorted = keys.sort((a, b) => {
            const aTime = updated[a].last_updated || '0'
            const bTime = updated[b].last_updated || '0'
            return aTime.localeCompare(bTime)
          })
          for (let i = 0; i < keys.length - MAX_LOCATIONS; i++) {
            delete updated[sorted[i]]
          }
        }
        set({ locations: updated })
      },

      ensureChannel: (callsign: string, category: Channel['category'] = 'dm') => {
        const { channels } = get()
        if (!channels[callsign]) {
          set({
            channels: {
              ...channels,
              [callsign]: {
                callsign,
                path: 'WIDE1-1,WIDE2-1',
                lastActivity: new Date().toISOString(),
                category,
              },
            },
          })
        }
      },

      clearUnread: (callsign: string) => {
        const { unreadCounts } = get()
        const updated = { ...unreadCounts }
        delete updated[callsign]
        set({ unreadCounts: updated })
      },
    }),
    {
      name: 'aprsd-webchat-messages',
      storage: messagesStorage,
      partialize: (state) => ({
        channels: state.channels,
        messages: state.messages,
        locations: state.locations,
      }),
    }
  )
)
