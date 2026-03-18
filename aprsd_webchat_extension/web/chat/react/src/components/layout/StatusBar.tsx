import { useState } from 'react'
import { useConnection } from '@/stores/connection'
import { useGPS } from '@/stores/gps'
import { useUI } from '@/stores/ui'
import { useSocketEmitters } from '@/hooks/useSocket'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Command, Radio, Satellite, Send, Wifi, WifiOff } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'

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

  // GPS status
  const hasCoords = gpsLat !== 0 || gpsLon !== 0
  const gpsStatus = gpsFix ? 'fix' : hasCoords ? 'config' : 'none'
  const gpsColor = gpsStatus === 'fix' ? 'text-success' : gpsStatus === 'config' ? 'text-warning' : 'text-muted-foreground'
  const gpsLabel = gpsStatus === 'fix' ? 'GPS Fix' : gpsStatus === 'config' ? 'Config Loc' : 'No GPS'

  // Parse server info
  const serverString = aprsConnection ? aprsConnection.replace(/<[^>]*>/g, '').trim() : ''
  const serverTokens = serverString.split(/\s+/)
  const aprsServerName = serverTokens.length >= 2 ? serverTokens[serverTokens.length - 2] : serverString

  // Tooltip strings
  const radioTip = radioBlinkTx ? 'Transmitting' : radioBlinkRx ? 'Receiving' : 'Radio idle'
  const gpsTip = gpsFix
    ? `GPS Fix: ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)}`
    : hasCoords
      ? `Configured location: ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)}`
      : 'No GPS location available'
  const connectionTip = connected
    ? `Connected via ${transport}${serverString ? ' — ' + serverString : ''}`
    : 'Disconnected from APRS'
  const beaconTip = beaconSent
    ? 'Beacon sent!'
    : `Send beacon (${symbol.description} at ${gpsLat.toFixed(4)}, ${gpsLon.toFixed(4)})`
  const lastBeaconTip = lastBeaconTime
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
          <span className="text-sm font-semibold">{callsign || 'APRSD'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasCoords && (
            <Tooltip text={beaconTip}>
              <button
                onClick={handleQuickBeacon}
                disabled={!connected}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                  beaconSent
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border bg-secondary text-foreground hover:bg-accent'
                }`}
              >
                <Send className="h-3 w-3" />
                <span>{beaconSent ? 'Sent' : 'Bcn'}</span>
              </button>
            </Tooltip>
          )}
          <Tooltip text="Commands">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground hover:bg-accent transition-colors"
            >
              <Command className="h-3 w-3" />
            </button>
          </Tooltip>

          <div className="mx-0.5 h-4 w-px bg-border" />

          <Tooltip text={radioTip}>
            <Radio
              className={`h-3.5 w-3.5 transition-colors ${
                radioBlinkTx ? 'text-destructive' : radioBlinkRx ? 'text-success' : 'text-muted-foreground'
              }`}
            />
          </Tooltip>
          <Tooltip text={gpsTip}>
            <Satellite className={`h-3.5 w-3.5 ${gpsColor}`} />
          </Tooltip>
          <Tooltip text={connectionTip}>
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            )}
          </Tooltip>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <Tooltip text={`Station: ${callsign}`}>
          <span className="text-sm font-semibold">{callsign || 'APRSD Webchat'}</span>
        </Tooltip>
        <Tooltip text={connectionTip}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
        </Tooltip>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {hasCoords && (
          <Tooltip text={beaconTip}>
            <button
              onClick={handleQuickBeacon}
              disabled={!connected}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors disabled:opacity-50 ${
                beaconSent
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <Send className="h-3 w-3" />
              <span>{beaconSent ? 'Sent!' : 'Beacon'}</span>
            </button>
          </Tooltip>
        )}
        <Tooltip text="Command palette (Ctrl+K)">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 hover:bg-accent transition-colors"
          >
            <Command className="h-3 w-3" />
            <span>Ctrl+K</span>
          </button>
        </Tooltip>
        <Tooltip text={radioTip}>
          <span className="flex items-center gap-1.5">
            <Radio
              className={`h-3.5 w-3.5 transition-colors ${
                radioBlinkTx ? 'text-destructive' : radioBlinkRx ? 'text-success' : 'text-muted-foreground'
              }`}
            />
          </span>
        </Tooltip>
        <Tooltip text={gpsTip}>
          <span className="flex items-center gap-1.5">
            <Satellite className={`h-3.5 w-3.5 ${gpsColor}`} />
            <span>{gpsLabel}</span>
          </span>
        </Tooltip>
        {lastBeaconTime && (
          <Tooltip text={lastBeaconTip}>
            <span>Beacon: {timeAgo(lastBeaconTime)}</span>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
