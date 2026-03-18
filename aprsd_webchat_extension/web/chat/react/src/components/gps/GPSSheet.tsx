import { useState } from 'react'
import { useGPS } from '@/stores/gps'
import { useUI } from '@/stores/ui'
import { useConnection } from '@/stores/connection'
import { useSocketEmitters } from '@/hooks/useSocket'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { X, Satellite, Send, MapPin } from 'lucide-react'
import { APRSSymbol } from './APRSSymbol'

const BEACON_MODES = [
  { value: 0, label: 'Disabled', description: 'No automatic beaconing' },
  { value: 1, label: 'Manual', description: 'Send beacon manually' },
  { value: 2, label: 'Interval', description: 'Beacon at fixed intervals' },
  { value: 3, label: 'Smart', description: 'Beacon based on movement' },
] as const

export function GPSSheet() {
  const activeSheet = useUI((s) => s.activeSheet)
  const setActiveSheet = useUI((s) => s.setActiveSheet)
  const beaconingEnabled = useConnection((s) => s.beaconingEnabled)
  const defaultPath = useConnection((s) => s.defaultPath)
  const { sendBeacon, setBeaconingSetting } = useSocketEmitters()

  const fix = useGPS((s) => s.fix)
  const latitude = useGPS((s) => s.latitude)
  const longitude = useGPS((s) => s.longitude)
  const altitude = useGPS((s) => s.altitude)
  const speed = useGPS((s) => s.speed)
  const beaconType = useGPS((s) => s.beaconType)
  const beaconInterval = useGPS((s) => s.beaconInterval)
  const smartBeaconDistance = useGPS((s) => s.smartBeaconDistance)
  const smartBeaconTimeWindow = useGPS((s) => s.smartBeaconTimeWindow)
  const lastBeaconTime = useGPS((s) => s.lastBeaconTime)
  const symbol = useGPS((s) => s.symbol)
  const setBeaconType = useGPS((s) => s.setBeaconType)
  const setBeaconInterval = useGPS((s) => s.setBeaconInterval)

  const isMobile = useIsMobile()
  const isOpen = activeSheet === 'gps'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const [beaconStatus, setBeaconStatus] = useState<'idle' | 'sent'>('idle')

  if (!isOpen) return null

  const handleSendBeacon = () => {
    if (fix && latitude && longitude) {
      sendBeacon(latitude, longitude, defaultPath, `${symbol.table}${symbol.symbol}`)
      setBeaconStatus('sent')
      setTimeout(() => setBeaconStatus('idle'), 2000)
    }
  }

  const handleSaveSettings = () => {
    setBeaconingSetting({
      beacon_type: beaconType,
      beacon_interval: beaconInterval,
      smart_beacon_distance_threshold: smartBeaconDistance,
      smart_beacon_time_window: smartBeaconTimeWindow,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => setActiveSheet(null)}
      />

      {/* Sheet */}
      <div
        className={`fixed z-50 bg-card border-border overflow-y-auto ${
          isMobile
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t'
            : 'inset-y-0 right-0 w-96 border-l'
        }`}
      >
        {/* Handle bar (mobile) */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Satellite className={`h-5 w-5 ${fix ? 'text-success' : 'text-muted-foreground'}`} />
            <h2 className="text-base font-semibold">GPS & Beaconing</h2>
          </div>
          <button
            onClick={() => setActiveSheet(null)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* GPS Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">GPS Status</h3>
            <div className={`rounded-lg p-3 ${fix ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className={`h-4 w-4 ${fix ? 'text-success' : 'text-destructive'}`} />
                <span className={`text-sm font-medium ${fix ? 'text-success' : 'text-destructive'}`}>
                  {fix ? 'GPS Fix Acquired' : 'No GPS Fix'}
                </span>
              </div>
              {fix && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Lat: {latitude.toFixed(6)}</div>
                  <div>Lon: {longitude.toFixed(6)}</div>
                  <div>Alt: {altitude.toFixed(1)}m</div>
                  <div>Speed: {(speed * 3.6).toFixed(1)} km/h</div>
                </div>
              )}
            </div>
          </div>

          {/* Beacon Symbol */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Beacon Symbol</h3>
            <button
              onClick={() => setActiveSheet('symbol')}
              className="flex items-center gap-3 w-full rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                <APRSSymbol table={symbol.table} symbol={symbol.symbol} size={36} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{symbol.description}</p>
                <p className="text-xs text-muted-foreground">Tap to change</p>
              </div>
            </button>
          </div>

          {/* Beaconing Mode */}
          {beaconingEnabled && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Beaconing Mode</h3>
              <div className="space-y-2">
                {BEACON_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setBeaconType(mode.value as 0 | 1 | 2 | 3)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      beaconType === mode.value
                        ? 'bg-primary/10 border border-primary/30'
                        : 'border border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className={`h-3 w-3 rounded-full ${
                      beaconType === mode.value ? 'bg-primary' : 'bg-muted'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Beacon interval (only for interval mode) */}
              {beaconType === 2 && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Interval: {beaconInterval}s
                  </label>
                  <select
                    value={beaconInterval}
                    onChange={(e) => setBeaconInterval(Number(e.target.value))}
                    className="w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none"
                  >
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                  </select>
                </div>
              )}

              {/* Save settings */}
              <button
                onClick={handleSaveSettings}
                className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                  saveStatus === 'saved'
                    ? 'bg-success text-white'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
              </button>
            </div>
          )}

          {/* Quick Beacon */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Quick Beacon</h3>
            <button
              onClick={handleSendBeacon}
              disabled={!fix}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                beaconStatus === 'sent'
                  ? 'bg-success text-white'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Send className="h-4 w-4" />
              {beaconStatus === 'sent' ? 'Beacon Sent!' : 'Send Beacon Now'}
            </button>
            {lastBeaconTime && (
              <p className="text-xs text-center text-muted-foreground">
                Last beacon: {new Date(lastBeaconTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
