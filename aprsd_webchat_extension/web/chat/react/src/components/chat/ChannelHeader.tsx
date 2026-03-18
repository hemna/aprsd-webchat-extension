import { useMessages } from '@/stores/messages'
import { useUI } from '@/stores/ui'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ArrowLeft, Code2 } from 'lucide-react'

export function ChannelHeader() {
  const selectedChannel = useMessages((s) => s.selectedChannel)
  const selectChannel = useMessages((s) => s.selectChannel)
  const showRawPackets = useUI((s) => s.showRawPackets)
  const toggleRawPackets = useUI((s) => s.toggleRawPackets)
  const isMobile = useIsMobile()

  if (!selectedChannel) return null

  const isAPRSThursday = selectedChannel === 'APRSTHURSDAY'

  return (
    <div className="flex h-12 flex-shrink-0 items-center border-b border-border bg-card px-3">
      {isMobile && (
        <button
          onClick={() => selectChannel(null)}
          className="mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div className="flex-1">
        <h2 className="text-sm font-semibold">
          {isAPRSThursday ? '#APRSThursday' : selectedChannel}
        </h2>
      </div>

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
    </div>
  )
}
