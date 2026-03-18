import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Channel, Message, CallsignLocation } from '@/types'
import { generateMessageId } from '@/lib/utils'

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

        set({
          channels: updatedChannels,
          messages: {
            ...messages,
            [callsign]: [...existing, msg].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            ),
          },
          unreadCounts: updatedUnread,
        })
      },

      ackMessage: (msgNo: string) => {
        const { messages } = get()
        const updated = { ...messages }
        for (const callsign of Object.keys(updated)) {
          updated[callsign] = updated[callsign].map(msg =>
            msg.msgNo === msgNo ? { ...msg, ack: true } : msg
          )
        }
        set({ messages: updated })
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
        set({
          locations: {
            ...locations,
            [location.callsign]: { ...location, last_updated: new Date().toISOString() },
          },
        })
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
      partialize: (state) => ({
        channels: state.channels,
        messages: state.messages,
        locations: state.locations,
      }),
    }
  )
)
