import { ChannelList } from './ChannelList'
import { useConnection } from '@/stores/connection'

export function Sidebar() {
  const version = useConnection((s) => s.version)
  const aprsdVersion = useConnection((s) => s.aprsdVersion)

  return (
    <div className="flex h-full flex-col">
      <ChannelList />

      {/* Version footer */}
      {(version || aprsdVersion) && (
        <div className="flex-shrink-0 border-t border-border px-4 py-2">
          <span className="text-[10px] text-muted-foreground">
            v{version} / APRSD {aprsdVersion}
          </span>
        </div>
      )}
    </div>
  )
}
