import { useConnection } from '@/stores/connection'
import { useUI } from '@/stores/ui'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Wifi, WifiOff, Moon, Sun, Satellite } from 'lucide-react'

export function StatusBar() {
  const connected = useConnection((s) => s.connected)
  const callsign = useConnection((s) => s.callsign)
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const setActiveSheet = useUI((s) => s.setActiveSheet)
  const isMobile = useIsMobile()

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <h1 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
          {callsign || 'APRSD Webchat'}
        </h1>
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
          connected
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{connected ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveSheet('gps')}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent transition-colors"
          title="GPS"
        >
          <Satellite className="h-4 w-4" />
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
