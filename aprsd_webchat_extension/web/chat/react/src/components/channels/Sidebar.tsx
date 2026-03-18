import { ChannelList } from './ChannelList'
import { useUI } from '@/stores/ui'
import { useConnection } from '@/stores/connection'
import { Moon, Sun, Satellite, Settings } from 'lucide-react'

export function Sidebar() {
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const setActiveSheet = useUI((s) => s.setActiveSheet)
  const version = useConnection((s) => s.version)
  const aprsdVersion = useConnection((s) => s.aprsdVersion)

  return (
    <div className="flex h-full flex-col">
      <ChannelList />

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-border p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSheet('gps')}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="GPS & Beaconing"
            >
              <Satellite className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          {(version || aprsdVersion) && (
            <span className="text-[10px] text-muted-foreground">
              v{version} / APRSD {aprsdVersion}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
