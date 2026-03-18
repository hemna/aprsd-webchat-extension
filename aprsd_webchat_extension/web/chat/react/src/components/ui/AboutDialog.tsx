import { useConnection } from '@/stores/connection'
import { useGPS } from '@/stores/gps'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { X, Radio, ExternalLink } from 'lucide-react'
import { APRSSymbol } from '@/components/gps/APRSSymbol'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const callsign = useConnection((s) => s.callsign)
  const transport = useConnection((s) => s.transport)
  const aprsConnection = useConnection((s) => s.aprsConnection)
  const version = useConnection((s) => s.version)
  const aprsdVersion = useConnection((s) => s.aprsdVersion)
  const gpsFix = useGPS((s) => s.fix)
  const gpsLat = useGPS((s) => s.latitude)
  const gpsLon = useGPS((s) => s.longitude)
  const symbol = useGPS((s) => s.symbol)
  const isMobile = useIsMobile()

  if (!open) return null

  const hasCoords = gpsLat !== 0 || gpsLon !== 0
  const serverString = aprsConnection ? aprsConnection.replace(/<[^>]*>/g, '').trim() : ''

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/50"
        onClick={onClose}
      />
      <div
        className={`fixed z-[90] bg-card border border-border shadow-2xl overflow-y-auto ${
          isMobile
            ? 'inset-x-3 top-12 bottom-12 rounded-2xl'
            : 'left-1/2 top-1/2 w-[440px] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">APRSD Webchat</h2>
              <p className="text-xs text-muted-foreground">Amateur Packet Radio Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Project description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            A modern web interface for <strong className="text-foreground">APRSD</strong> — the
            APRS daemon that connects amateur radio operators through the Automatic Packet
            Reporting System. Send and receive APRS messages, track positions, and manage
            beaconing from any device.
          </p>

          {/* Author */}
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-2">Author</p>
            <p className="text-sm font-medium">Walter A. Boring IV — WB4BOR</p>
          </div>

          {/* Version info */}
          <div className="rounded-lg border border-border p-4 space-y-2.5">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Version Info</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Webchat Extension</span>
              <span className="font-medium text-right">v{version || '?'}</span>

              <span className="text-muted-foreground">APRSD Core</span>
              <span className="font-medium text-right">v{aprsdVersion || '?'}</span>

              <span className="text-muted-foreground">UI Framework</span>
              <span className="font-medium text-right">React + Tailwind</span>
            </div>
          </div>

          {/* Station info */}
          <div className="rounded-lg border border-border p-4 space-y-2.5">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Station</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Callsign</span>
              <span className="font-medium text-right">{callsign || '—'}</span>

              <span className="text-muted-foreground">Transport</span>
              <span className="font-medium text-right">{transport || '—'}</span>

              {serverString && (
                <>
                  <span className="text-muted-foreground">Server</span>
                  <span className="font-medium text-right text-xs break-all">{serverString}</span>
                </>
              )}

              <span className="text-muted-foreground">GPS</span>
              <span className="font-medium text-right">
                {gpsFix ? 'Hardware Fix' : hasCoords ? 'Configured' : 'None'}
              </span>

              {hasCoords && (
                <>
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-right">{gpsLat.toFixed(4)}, {gpsLon.toFixed(4)}</span>
                </>
              )}

              <span className="text-muted-foreground">Symbol</span>
              <span className="flex items-center justify-end gap-2">
                <span className="font-medium">{symbol.description}</span>
                <APRSSymbol table={symbol.table} symbol={symbol.symbol} size={20} />
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <a
              href="https://github.com/hemna/aprsd-webchat-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">APRSD Webchat Extension</p>
                <p className="text-xs text-muted-foreground">github.com/hemna/aprsd-webchat-extension</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </a>
            <a
              href="https://github.com/hemna/aprsd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">APRSD Core</p>
                <p className="text-xs text-muted-foreground">github.com/hemna/aprsd</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </a>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-muted-foreground pt-2">
            73 de WB4BOR
          </p>
        </div>
      </div>
    </>
  )
}
