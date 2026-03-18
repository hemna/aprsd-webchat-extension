import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { SocketContext } from '@/hooks/useSocket'
import { useSocketEvents } from '@/hooks/useSocketEvents'
import { useConnection } from '@/stores/connection'
import { useGPS } from '@/stores/gps'
import { useUI } from '@/stores/ui'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBar } from '@/components/layout/StatusBar'
import { Sidebar } from '@/components/channels/Sidebar'
import { MainPanel } from '@/components/chat/MainPanel'
import { GPSSheet } from '@/components/gps/GPSSheet'
import { SymbolPickerSheet } from '@/components/gps/SymbolPickerSheet'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import type { ConfigResponse } from '@/types'

function AppContent({ socket }: { socket: Socket }) {
  useSocketEvents(socket)

  return (
    <>
      <AppShell
        statusBar={<StatusBar />}
        sidebar={<Sidebar />}
        main={<MainPanel />}
      />
      <GPSSheet />
      <SymbolPickerSheet />
      <CommandPalette />
    </>
  )
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const hydrate = useConnection((s) => s.hydrate)
  const configLoaded = useConnection((s) => s.configLoaded)
  const hydrateGPS = useGPS((s) => s.hydrateFromConfig)
  const theme = useUI((s) => s.theme)

  // Apply theme immediately on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Fetch config from Flask
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((config: ConfigResponse) => {
        hydrate(config)
        // Set initial GPS coordinates from config (before gps_stats events arrive)
        if (config.latitude && config.longitude) {
          hydrateGPS(config.latitude, config.longitude)
        }
      })
      .catch((err) => {
        console.error('Failed to load config:', err)
      })
  }, [hydrate])

  // Initialize Socket.IO
  useEffect(() => {
    const s = io('/sendmsg', {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
    })
    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  if (!configLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting to APRSD...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <SocketContext.Provider value={socket}>
        {socket ? (
          <AppContent socket={socket} />
        ) : (
          <div className="flex h-dvh items-center justify-center bg-background text-foreground">
            <p className="text-sm text-muted-foreground">Initializing...</p>
          </div>
        )}
      </SocketContext.Provider>
    </ThemeProvider>
  )
}
