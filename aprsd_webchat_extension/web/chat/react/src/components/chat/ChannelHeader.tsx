import { useState, useRef, useEffect } from 'react'
import { useMessages } from '@/stores/messages'
import { useUI } from '@/stores/ui'
import { useSocketEmitters } from '@/hooks/useSocket'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ArrowLeft, Code2, MapPin, Copy, Trash2, MoreVertical } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export function ChannelHeader() {
  const selectedChannel = useMessages((s) => s.selectedChannel)
  const selectChannel = useMessages((s) => s.selectChannel)
  const locations = useMessages((s) => s.locations)
  const showRawPackets = useUI((s) => s.showRawPackets)
  const toggleRawPackets = useUI((s) => s.toggleRawPackets)
  const { getLocation } = useSocketEmitters()
  const isMobile = useIsMobile()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  if (!selectedChannel) return null

  const location = locations[selectedChannel]
  const isAPRSThursday = selectedChannel === 'APRSTHURSDAY'

  const handleFetchLocation = () => {
    getLocation(selectedChannel)
    setMenuOpen(false)
  }

  const handleCopyCallsign = () => {
    navigator.clipboard.writeText(selectedChannel)
    setMenuOpen(false)
  }

  const handleClearMessages = () => {
    // Clear messages for this channel from the store
    const { messages } = useMessages.getState()
    const updated = { ...messages }
    delete updated[selectedChannel]
    useMessages.setState({ messages: updated })
    setMenuOpen(false)
  }

  return (
    <div className="flex h-14 flex-shrink-0 items-center border-b border-border bg-card px-3">
      {/* Back button (mobile) */}
      {isMobile && (
        <button
          onClick={() => selectChannel(null)}
          className="mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
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

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`rounded-md p-2 transition-colors ${
              menuOpen
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            title="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-48 rounded-lg border border-border bg-card py-1 shadow-lg">
              {!isAPRSThursday && (
                <button
                  onClick={handleFetchLocation}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Fetch Location
                </button>
              )}
              <button
                onClick={handleCopyCallsign}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
                Copy Callsign
              </button>
              <button
                onClick={handleClearMessages}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear Messages
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
