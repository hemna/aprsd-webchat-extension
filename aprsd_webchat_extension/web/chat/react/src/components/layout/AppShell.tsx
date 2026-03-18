import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUI } from '@/stores/ui'
import { useMessages } from '@/stores/messages'

interface AppShellProps {
  sidebar: ReactNode
  main: ReactNode
  statusBar: ReactNode
}

export function AppShell({ sidebar, main, statusBar }: AppShellProps) {
  const isMobile = useIsMobile()
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const setSidebarOpen = useUI((s) => s.setSidebarOpen)
  const selectedChannel = useMessages((s) => s.selectedChannel)

  // Mobile: show sidebar (channel list) when no channel selected or drawer open
  // Desktop: always show sidebar + main
  const showSidebar = !isMobile || !selectedChannel || sidebarOpen
  const showMain = !isMobile || !!selectedChannel

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Status Bar */}
      {statusBar}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {isMobile ? (
          // Mobile: sidebar is full screen when visible
          showSidebar && !selectedChannel && (
            <div className="flex w-full flex-col">
              {sidebar}
            </div>
          )
        ) : (
          // Desktop: persistent sidebar
          <div className="flex w-72 flex-shrink-0 flex-col border-r border-border">
            {sidebar}
          </div>
        )}

        {/* Mobile overlay sidebar (drawer) when channel is selected */}
        {isMobile && sidebarOpen && selectedChannel && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-80 bg-background shadow-xl">
              {sidebar}
            </div>
          </>
        )}

        {/* Main Panel */}
        {showMain && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {main}
          </div>
        )}
      </div>
    </div>
  )
}
