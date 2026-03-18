import { useRef, useEffect, useMemo } from 'react'
import { useMessages } from '@/stores/messages'
import { MessageBubble } from './MessageBubble'

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
        {date}
      </div>
    </div>
  )
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ChatView() {
  const selectedChannel = useMessages((s) => s.selectedChannel)
  const messages = useMessages((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)

  const channelMessages = selectedChannel ? messages[selectedChannel] || [] : []

  // Group messages by date for separators
  const messagesWithDates = useMemo(() => {
    const items: Array<{ type: 'date'; date: string } | { type: 'message'; message: (typeof channelMessages)[0]; showCallsign: boolean }> = []
    let lastDate = ''
    let lastSender = ''

    for (const msg of channelMessages) {
      const msgDate = new Date(msg.timestamp).toDateString()
      if (msgDate !== lastDate) {
        items.push({ type: 'date', date: formatDateLabel(msg.timestamp) })
        lastDate = msgDate
        lastSender = ''
      }
      const showCallsign = msg.type === 'rx' && msg.from_call !== lastSender
      items.push({ type: 'message', message: msg, showCallsign })
      lastSender = msg.from_call
    }
    return items
  }, [channelMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [channelMessages.length])

  if (!selectedChannel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">Welcome to APRSD Webchat</p>
          <p className="text-sm text-muted-foreground mt-1">
            Select a conversation or start a new one
          </p>
        </div>
      </div>
    )
  }

  if (channelMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No messages with {selectedChannel} yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Send a message to start the conversation
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
      {messagesWithDates.map((item, index) => {
        if (item.type === 'date') {
          return <DateSeparator key={`date-${index}`} date={item.date} />
        }
        return (
          <MessageBubble
            key={`${item.message.from_call}-${item.message.msgNo}-${item.message.timestamp}`}
            message={item.message}
            showCallsign={item.showCallsign}
          />
        )
      })}
    </div>
  )
}
