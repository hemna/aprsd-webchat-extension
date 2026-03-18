import { useState } from 'react'
import { useConnection } from '@/stores/connection'
import { useGPS } from '@/stores/gps'
import { useUI } from '@/stores/ui'
import { useSocketEmitters } from '@/hooks/useSocket'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Command, Radio, Satellite, Send, Wifi, WifiOff } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export function StatusBar() {
  const connected = useConnection((s) => s.connected)
  const transport = useConnection((s) => s.transport)
  const callsign = useConnection((s) => s.callsign)
  const defaultPath = useConnection((s) => s.defaultPath)
  const gpsFix = useGPS((s) => s.fix)
  const gpsLat = useGPS((s) => s.latitude)
  const gpsLon = useGPS((s) => s.longitude)
  const lastBeaconTime = useGPS((s) => s.lastBeaconTime)
  const symbol = useGPS((s) => s.symbol)
  const radioBlinkTx = useUI((s) => s.radioBlinkTx)
  const radioBlinkRx = useUI((s) => s.radioBlinkRx)
  const setCommandPaletteOpen = useUI((s) => s.setCommandPaletteOpen)
  const { sendBeacon } = useSocketEmitters()
  const isMobile = useIsMobile()

  const [beaconSent, setBeaconSent] = useState(false)

  // GPS status: hardware fix, config location, or no location
  const hasCoords = gpsLat !== 0 || gpsLon !== 0
  const gpsStatus = gpsFix ? 'fix' : hasCoords ? 'config' : 'none'
  const gpsColor = gpsStatus === 'fix' ? 'text-success' : gpsStatus === 'config' ? 'text-warning' : 'text-muted-foreground'
  const gpsLabel = gpsStatus === 'fix' ? 'GPS Fix' : gpsStatus === 'config' ? 'Config Loc' : 'No GPS'

  const handleQuickBeacon = () => {
    if (!hasCoords || !connected) return
    sendBeacon(gpsLat, gpsLon, defaultPath, `${symbol.table}${symbol.symbol}`)
    setBeaconSent(true)
    setTimeout(() => setBeaconSent(false), 2000)
  }

  if (isMobile) {
    return (
      <div className="flex h-10 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{callsign || 'APRSD'}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Beacon */}
          {hasCoords && (
            <button
              onClick={handleQuickBeacon}
              disabled={!connected}
              className={`rounded-md p-1 transition-colors ${
                beaconSent
                  ? 'text-success'
                  : 'text-muted-foreground hover:bg-accent disabled:opacity-50'
              }`}
              title="Send Beacon"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <Command className="h-4 w-4" />
          </button>
          <Radio
            className={`h-4 w-4 transition-colors ${
              radioBlinkTx ? 'text-destructive' : radioBlinkRx ? 'text-success' : 'text-muted-foreground'
            }`}
          />
          <Satellite className={`h-4 w-4 ${gpsColor}`} />
          {connected ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold">{callsign || 'APRSD Webchat'}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-success" />
              <span>{transport}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
              <span>Disconnected</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {/* Quick Beacon */}
        {hasCoords && (
          <button
            onClick={handleQuickBeacon}
            disabled={!connected}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors disabled:opacity-50 ${
              beaconSent
                ? 'border-success bg-success/10 text-success'
                : 'border-border hover:bg-accent'
            }`}
            title="Send Beacon Now"
          >
            <Send className="h-3 w-3" />
            <span>{beaconSent ? 'Sent!' : 'Beacon'}</span>
          </button>
        )}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 hover:bg-accent transition-colors"
          title="Command Palette (Ctrl+K)"
        >
          <Command className="h-3 w-3" />
          <span>Ctrl+K</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Radio
            className={`h-3.5 w-3.5 transition-colors ${
              radioBlinkTx ? 'text-destructive' : radioBlinkRx ? 'text-success' : 'text-muted-foreground'
            }`}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Satellite className={`h-3.5 w-3.5 ${gpsColor}`} />
          <span>{gpsLabel}</span>
        </div>
        {lastBeaconTime && (
          <span>Beacon: {timeAgo(lastBeaconTime)}</span>
        )}
      </div>
    </div>
  )
}
