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
  const aprsConnection = useConnection((s) => s.aprsConnection)
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

  // Strip HTML tags from aprsConnection (backend sends it with <a> tags)
  const serverString = aprsConnection ? aprsConnection.replace(/<[^>]*>/g, '').trim() : ''
  // Extract the APRS-IS server name (e.g. "T2TEXAS" from "# aprsc 2.1.20-g... T2TEXAS 205.209.228.99:14580")
  // Server name is the second-to-last token in the server_string
  const serverTokens = serverString.split(/\s+/)
  const aprsServerName = serverTokens.length >= 2 ? serverTokens[serverTokens.length - 2] : serverString

  // Tooltip strings
  const radioTitle = radioBlinkTx ? 'Transmitting' : radioBlinkRx ? 'Receiving' : 'Radio idle'
  const gpsTitle = gpsFix
    ? `GPS Fix: ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)}`
    : hasCoords
      ? `Configured location: ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)}`
      : 'No GPS location available'
  const connectionTitle = connected
    ? `Connected via ${transport}${serverString ? ' — ' + serverString : ''}`
    : 'Disconnected from APRS'
  const beaconTitle = beaconSent
    ? 'Beacon sent!'
    : `Send beacon now (${symbol.description} at ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)})`
  const lastBeaconTitle = lastBeaconTime
    ? `Last beacon sent ${timeAgo(lastBeaconTime)}`
    : ''

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
          <span className="text-sm font-semibold" title={`Station: ${callsign}`}>{callsign || 'APRSD'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Action buttons -- bordered to look tappable */}
          {hasCoords && (
            <button
              onClick={handleQuickBeacon}
              disabled={!connected}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                beaconSent
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border bg-secondary text-foreground hover:bg-accent'
              }`}
              title={beaconTitle}
            >
              <Send className="h-3 w-3" />
              <span>{beaconSent ? 'Sent' : 'Bcn'}</span>
            </button>
          )}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground hover:bg-accent transition-colors"
            title="Command palette — search, navigate, actions"
          >
            <Command className="h-3 w-3" />
          </button>

          {/* Separator */}
          <div className="mx-0.5 h-4 w-px bg-border" />

          {/* Status indicators -- no border, muted */}
          <span title={radioTitle}>
            <Radio
              className={`h-3.5 w-3.5 transition-colors ${
                radioBlinkTx ? 'text-destructive' : radioBlinkRx ? 'text-success' : 'text-muted-foreground'
              }`}
            />
          </span>
          <span title={gpsTitle}>
            <Satellite className={`h-3.5 w-3.5 ${gpsColor}`} />
          </span>
          <span title={connectionTitle}>
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            )}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold" title={`Station: ${callsign}`}>{callsign || 'APRSD Webchat'}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={connectionTitle}>
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-success" />
              <span>{transport}{aprsServerName ? ` — ${aprsServerName}` : ''}</span>
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
            title={beaconTitle}
          >
            <Send className="h-3 w-3" />
            <span>{beaconSent ? 'Sent!' : 'Beacon'}</span>
          </button>
        )}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 hover:bg-accent transition-colors"
          title="Command palette — search, navigate, actions (Ctrl+K)"
        >
          <Command className="h-3 w-3" />
          <span>Ctrl+K</span>
        </button>
        <span className="flex items-center gap-1.5" title={radioTitle}>
          <Radio
            className={`h-3.5 w-3.5 transition-colors ${
              radioBlinkTx ? 'text-destructive' : radioBlinkRx ? 'text-success' : 'text-muted-foreground'
            }`}
          />
        </span>
        <span className="flex items-center gap-1.5" title={gpsTitle}>
          <Satellite className={`h-3.5 w-3.5 ${gpsColor}`} />
          <span>{gpsLabel}</span>
        </span>
        {lastBeaconTime && (
          <span title={lastBeaconTitle}>Beacon: {timeAgo(lastBeaconTime)}</span>
        )}
      </div>
    </div>
  )
}
