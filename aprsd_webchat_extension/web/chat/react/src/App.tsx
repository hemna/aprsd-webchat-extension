import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { SocketContext } from '@/hooks/useSocket'
import { useSocketEvents } from '@/hooks/useSocketEvents'
import { useConnection } from '@/stores/connection'
import { useUI } from '@/stores/ui'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBar } from '@/components/layout/StatusBar'
import { Sidebar } from '@/components/channels/Sidebar'
import { MainPanel } from '@/components/chat/MainPanel'
import type { ConfigResponse } from '@/types'

function AppContent({ socket }: { socket: Socket }) {
  useSocketEvents(socket)

  return (
    <AppShell
      statusBar={<StatusBar />}
      sidebar={<Sidebar />}
      main={<MainPanel />}
    />
  )
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const hydrate = useConnection((s) => s.hydrate)
  const configLoaded = useConnection((s) => s.configLoaded)
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
      })
      .catch((err) => {
        console.error('Failed to load config:', err)
      })
  }, [hydrate])

  // Initialize Socket.IO
  useEffect(() => {
    const s = io('/sendmsg', {
      transports: ['websocket', 'polling'],
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
