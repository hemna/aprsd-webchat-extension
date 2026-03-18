import { useMessages } from '@/stores/messages'
import { useUI } from '@/stores/ui'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ArrowLeft, Code2, Menu, MoreVertical } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export function ChannelHeader() {
  const selectedChannel = useMessages((s) => s.selectedChannel)
  const selectChannel = useMessages((s) => s.selectChannel)
  const locations = useMessages((s) => s.locations)
  const showRawPackets = useUI((s) => s.showRawPackets)
  const toggleRawPackets = useUI((s) => s.toggleRawPackets)
  const toggleSidebar = useUI((s) => s.toggleSidebar)
  const isMobile = useIsMobile()

  if (!selectedChannel) return null

  const location = locations[selectedChannel]
  const isAPRSThursday = selectedChannel === 'APRSTHURSDAY'

  return (
    <div className="flex h-14 flex-shrink-0 items-center border-b border-border bg-card px-3">
      {/* Back / Menu button */}
      {isMobile ? (
        <button
          onClick={() => selectChannel(null)}
          className="mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={toggleSidebar}
          className="mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Channel info */}
      <div className="flex-1 overflow-hidden">
        <h2 className="text-sm font-semibold truncate">
          {isAPRSThursday ? '#APRSThursday' : selectedChannel}
        </h2>
        {location && (
          <p className="text-xs text-muted-foreground truncate">
            {location.distance} away · last heard {timeAgo(location.lasttime)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleRawPackets}
          className={`rounded-md p-2 transition-colors ${
            showRawPackets
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent'
          }`}
          title={showRawPackets ? 'Hide raw packets' : 'Show raw packets'}
        >
          <Code2 className="h-4 w-4" />
        </button>
        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          title="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
