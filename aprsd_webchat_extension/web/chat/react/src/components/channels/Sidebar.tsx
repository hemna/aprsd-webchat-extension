import { useState } from 'react'
import { ChannelList } from './ChannelList'
import { useUI } from '@/stores/ui'
import { useConnection } from '@/stores/connection'
import { useGPS } from '@/stores/gps'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Moon, Sun, Satellite, Settings, X, Palette, Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'

export function Sidebar() {
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const setActiveSheet = useUI((s) => s.setActiveSheet)
  const version = useConnection((s) => s.version)
  const aprsdVersion = useConnection((s) => s.aprsdVersion)
  const callsign = useConnection((s) => s.callsign)
  const transport = useConnection((s) => s.transport)
  const gpsFix = useGPS((s) => s.fix)
  const gpsLat = useGPS((s) => s.latitude)
  const gpsLon = useGPS((s) => s.longitude)
  const isMobile = useIsMobile()

  const [settingsOpen, setSettingsOpen] = useState(false)

  const hasCoords = gpsLat !== 0 || gpsLon !== 0
  const gpsLabel = gpsFix ? 'GPS Fix' : hasCoords ? 'Configured' : 'None'

  return (
    <div className="flex h-full flex-col">
      <ChannelList />

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-border p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Tooltip text="GPS & Beaconing">
              <button
                onClick={() => setActiveSheet('gps')}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Satellite className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip text={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <button
                onClick={toggleTheme}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </Tooltip>
            <Tooltip text="Settings">
              <button
                onClick={() => setSettingsOpen(true)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          {(version || aprsdVersion) && (
            <span className="text-[10px] text-muted-foreground">
              v{version} / APRSD {aprsdVersion}
            </span>
          )}
        </div>
      </div>

      {/* Settings Sheet */}
      {settingsOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSettingsOpen(false)}
          />
          <div
            className={`fixed z-50 bg-card border-border overflow-y-auto ${
              isMobile
                ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t'
                : 'inset-y-0 right-0 w-96 border-l'
            }`}
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold">Settings</h2>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Theme */}
              <button
                onClick={() => { toggleTheme(); setSettingsOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
                <div className="text-left">
                  <p className="text-sm font-medium">{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</p>
                  <p className="text-xs text-muted-foreground">Current: {theme === 'dark' ? 'Dark' : 'Light'}</p>
                </div>
              </button>

              {/* GPS & Beaconing */}
              <button
                onClick={() => { setActiveSheet('gps'); setSettingsOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
              >
                <Satellite className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">GPS & Beaconing</p>
                  <p className="text-xs text-muted-foreground">Location: {gpsLabel}</p>
                </div>
              </button>

              {/* Symbol Picker */}
              <button
                onClick={() => { setActiveSheet('symbol'); setSettingsOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
              >
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Beacon Symbol</p>
                  <p className="text-xs text-muted-foreground">Change your APRS map icon</p>
                </div>
              </button>

              {/* About */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3 mb-3">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">About</p>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Callsign</span>
                    <span className="font-medium text-foreground">{callsign}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transport</span>
                    <span className="font-medium text-foreground">{transport}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Webchat Extension</span>
                    <span className="font-medium text-foreground">v{version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>APRSD</span>
                    <span className="font-medium text-foreground">v{aprsdVersion}</span>
                  </div>
                  {hasCoords && (
                    <div className="flex justify-between">
                      <span>Location</span>
                      <span className="font-medium text-foreground">{gpsLat.toFixed(4)}, {gpsLon.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
