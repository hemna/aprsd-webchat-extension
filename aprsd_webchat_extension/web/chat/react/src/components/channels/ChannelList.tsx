import { useMemo, useState } from 'react'
import { useMessages } from '@/stores/messages'
import { useConnection } from '@/stores/connection'
import { ChannelItem } from './ChannelItem'
import { isValidCallsign } from '@/lib/utils'
import { Plus, Search, X } from 'lucide-react'

export function ChannelList() {
  const channels = useMessages((s) => s.channels)
  const ensureChannel = useMessages((s) => s.ensureChannel)
  const selectChannel = useMessages((s) => s.selectChannel)
  const aprsthursdayEnabled = useConnection((s) => s.aprsthursdayEnabled)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [newCallsign, setNewCallsign] = useState('')

  const groupedChannels = useMemo(() => {
    const all = Object.values(channels)
    const filtered = searchQuery
      ? all.filter((c) =>
          c.callsign.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : all

    // Sort by last activity within groups
    const sorted = filtered.sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )

    return {
      dm: sorted.filter((c) => c.category === 'dm'),
      group: sorted.filter((c) => c.category === 'group'),
      system: sorted.filter((c) => c.category === 'system'),
    }
  }, [channels, searchQuery])

  const handleNewChat = () => {
    const trimmed = newCallsign.trim().toUpperCase()
    if (isValidCallsign(trimmed)) {
      ensureChannel(trimmed, 'dm')
      selectChannel(trimmed)
      setNewCallsign('')
      setShowNewChat(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search + New Chat */}
      <div className="flex-shrink-0 p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-secondary py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {showNewChat ? (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Callsign (e.g. W6ABC)"
              value={newCallsign}
              onChange={(e) => setNewCallsign(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleNewChat()}
              className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button
              onClick={handleNewChat}
              disabled={!isValidCallsign(newCallsign.trim())}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Go
            </button>
            <button
              onClick={() => { setShowNewChat(false); setNewCallsign('') }}
              className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewChat(true)}
            className="flex w-full items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </button>
        )}
      </div>

      {/* Channel Groups */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groupedChannels.dm.length > 0 && (
          <div className="mb-2">
            <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Direct Messages
            </h3>
            <div className="space-y-0.5">
              {groupedChannels.dm.map((channel) => (
                <ChannelItem key={channel.callsign} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {(groupedChannels.group.length > 0 || aprsthursdayEnabled) && (
          <div className="mb-2">
            <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Groups
            </h3>
            <div className="space-y-0.5">
              {groupedChannels.group.map((channel) => (
                <ChannelItem key={channel.callsign} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {groupedChannels.system.length > 0 && (
          <div className="mb-2">
            <h3 className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
              System
            </h3>
            <div className="space-y-0.5">
              {groupedChannels.system.map((channel) => (
                <ChannelItem key={channel.callsign} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {Object.keys(channels).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new conversation above
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
