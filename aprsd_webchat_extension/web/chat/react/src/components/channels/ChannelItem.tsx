import type { Channel } from '@/types'
import { useMessages } from '@/stores/messages'
import { timeAgo } from '@/lib/utils'
import { escapeHtml } from '@/lib/utils'

interface ChannelItemProps {
  channel: Channel
}

export function ChannelItem({ channel }: ChannelItemProps) {
  const selectedChannel = useMessages((s) => s.selectedChannel)
  const selectChannel = useMessages((s) => s.selectChannel)
  const unreadCounts = useMessages((s) => s.unreadCounts)
  const unread = unreadCounts[channel.callsign] || 0
  const isSelected = selectedChannel === channel.callsign
  const isAPRSThursday = channel.callsign === 'APRSTHURSDAY'

  return (
    <button
      onClick={() => selectChannel(channel.callsign)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50'
      } ${isAPRSThursday ? 'border-l-2 border-orange-500' : ''}`}
    >
      {/* Avatar / Symbol */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isAPRSThursday
            ? 'bg-orange-500/10 text-orange-500'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {isAPRSThursday ? '#' : channel.callsign.charAt(0)}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">
            {isAPRSThursday ? '#APRSThursday' : channel.callsign}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {channel.lastActivity ? timeAgo(channel.lastActivity) : ''}
          </span>
        </div>
        {channel.lastMessage && (
          <p
            className="text-xs text-muted-foreground truncate mt-0.5"
            dangerouslySetInnerHTML={{
              __html: escapeHtml(channel.lastMessage.message_text),
            }}
          />
        )}
      </div>

      {/* Unread badge */}
      {unread > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
