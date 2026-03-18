import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUI } from '@/stores/ui'
import { useMessages } from '@/stores/messages'
import { useConnection } from '@/stores/connection'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { isValidCallsign } from '@/lib/utils'
import {
  Search, MessageSquare, Satellite, Code2, Sun, Moon,
  X, Radio, Palette,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: string
  action: () => void
  keywords?: string[]
}

export function CommandPalette() {
  const isOpen = useUI((s) => s.commandPaletteOpen)
  const setOpen = useUI((s) => s.setCommandPaletteOpen)
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const setActiveSheet = useUI((s) => s.setActiveSheet)
  const toggleRawPackets = useUI((s) => s.toggleRawPackets)
  const showRawPackets = useUI((s) => s.showRawPackets)
  const selectChannel = useMessages((s) => s.selectChannel)
  const ensureChannel = useMessages((s) => s.ensureChannel)
  const channels = useMessages((s) => s.channels)
  const callsign = useConnection((s) => s.callsign)
  const isMobile = useIsMobile()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Keyboard shortcut to open (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!isOpen)
      }
      if (e.key === 'Escape' && isOpen) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, setOpen])

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // Navigation
      ...Object.values(channels).map((ch) => ({
        id: `nav-${ch.callsign}`,
        label: ch.callsign,
        description: 'Open conversation',
        icon: <MessageSquare className="h-4 w-4" />,
        category: 'Conversations',
        action: () => { selectChannel(ch.callsign); setOpen(false) },
        keywords: [ch.callsign.toLowerCase()],
      })),

      // Actions
      {
        id: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        description: 'Toggle dark/light theme',
        icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        category: 'Actions',
        action: () => { toggleTheme(); setOpen(false) },
        keywords: ['theme', 'dark', 'light', 'mode'],
      },
      {
        id: 'toggle-raw',
        label: showRawPackets ? 'Hide Raw Packets' : 'Show Raw Packets',
        description: 'Toggle raw APRS packet display',
        icon: <Code2 className="h-4 w-4" />,
        category: 'Actions',
        action: () => { toggleRawPackets(); setOpen(false) },
        keywords: ['raw', 'packet', 'tnc2', 'aprs'],
      },
      {
        id: 'open-gps',
        label: 'GPS & Beaconing',
        description: 'Open GPS settings and beacon controls',
        icon: <Satellite className="h-4 w-4" />,
        category: 'Actions',
        action: () => { setActiveSheet('gps'); setOpen(false) },
        keywords: ['gps', 'beacon', 'location', 'position'],
      },
      {
        id: 'open-symbol',
        label: 'Change Beacon Symbol',
        description: 'Select APRS symbol for beacon',
        icon: <Palette className="h-4 w-4" />,
        category: 'Actions',
        action: () => { setActiveSheet('symbol'); setOpen(false) },
        keywords: ['symbol', 'icon', 'aprs'],
      },

      // Info
      {
        id: 'my-callsign',
        label: `My Callsign: ${callsign}`,
        description: 'Your station identification',
        icon: <Radio className="h-4 w-4" />,
        category: 'Info',
        action: () => setOpen(false),
        keywords: ['callsign', 'station'],
      },
    ]
    return items
  }, [channels, theme, showRawPackets, callsign, selectChannel, setOpen, toggleTheme, toggleRawPackets, setActiveSheet])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands

    const q = query.toLowerCase()

    // Check if query looks like a callsign for new conversation
    if (isValidCallsign(query.trim())) {
      const trimmed = query.trim().toUpperCase()
      const existing = commands.find((c) => c.id === `nav-${trimmed}`)
      if (!existing) {
        return [
          {
            id: `new-${trimmed}`,
            label: `Message ${trimmed}`,
            description: 'Start new conversation',
            icon: <MessageSquare className="h-4 w-4" />,
            category: 'New',
            action: () => {
              ensureChannel(trimmed, 'dm')
              selectChannel(trimmed)
              setOpen(false)
            },
          },
          ...commands.filter((c) =>
            c.label.toLowerCase().includes(q) ||
            c.keywords?.some((k) => k.includes(q))
          ),
        ]
      }
    }

    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.includes(q))
    )
  }, [query, commands, ensureChannel, selectChannel, setOpen])

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands.length])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault()
      filteredCommands[selectedIndex].action()
    }
  }, [filteredCommands, selectedIndex])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Group by category
  const grouped: Record<string, typeof filteredCommands> = {}
  for (const cmd of filteredCommands) {
    if (!grouped[cmd.category]) grouped[cmd.category] = []
    grouped[cmd.category].push(cmd)
  }

  let flatIndex = 0

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        className={`fixed z-[80] bg-card border-border shadow-2xl overflow-hidden flex flex-col ${
          isMobile
            ? 'inset-x-2 bottom-2 max-h-[70vh] rounded-2xl border'
            : 'left-1/2 top-1/4 w-[560px] max-h-[420px] -translate-x-1/2 rounded-xl border'
        }`}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Type a command or callsign..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <button onClick={() => setOpen(false)} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredCommands.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-2">
              <h3 className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                {category}
              </h3>
              {items.map((cmd) => {
                const currentIndex = flatIndex++
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selectedIndex === currentIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <span className="text-muted-foreground">{cmd.icon}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">{cmd.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        {!isMobile && (
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span><kbd className="rounded bg-secondary px-1.5 py-0.5">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded bg-secondary px-1.5 py-0.5">↵</kbd> Select</span>
            <span><kbd className="rounded bg-secondary px-1.5 py-0.5">Esc</kbd> Close</span>
          </div>
        )}
      </div>
    </>
  )
}
