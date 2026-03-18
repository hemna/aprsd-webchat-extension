import { useState, useRef, useCallback } from 'react'
import { useMessages } from '@/stores/messages'
import { useConnection } from '@/stores/connection'
import { useSocketEmitters } from '@/hooks/useSocket'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { SendHorizontal } from 'lucide-react'

export function MessageInput() {
  const selectedChannel = useMessages((s) => s.selectedChannel)
  const channels = useMessages((s) => s.channels)
  const setPath = useMessages((s) => s.setPath)
  const defaultPath = useConnection((s) => s.defaultPath)
  const connected = useConnection((s) => s.connected)
  const { sendMessage } = useSocketEmitters()
  const isMobile = useIsMobile()

  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentPath = selectedChannel && channels[selectedChannel]
    ? channels[selectedChannel].path
    : defaultPath

  const handleSend = useCallback(() => {
    if (!selectedChannel || !text.trim() || !connected) return
    sendMessage(selectedChannel, text.trim(), currentPath)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [selectedChannel, text, connected, currentPath, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Auto-resize textarea
    const target = e.target
    target.style.height = 'auto'
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
  }

  if (!selectedChannel) return null

  return (
    <div className="flex-shrink-0 border-t border-border bg-card p-3">
      {/* Path selector */}
      <div className="mb-2">
        <select
          value={currentPath}
          onChange={(e) => selectedChannel && setPath(selectedChannel, e.target.value)}
          className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground outline-none"
        >
          <option value="WIDE1-1,WIDE2-1">WIDE1-1,WIDE2-1</option>
          <option value="WIDE1-1">WIDE1-1</option>
          <option value="">Direct</option>
          {currentPath && !['WIDE1-1,WIDE2-1', 'WIDE1-1', ''].includes(currentPath) && (
            <option value={currentPath}>{currentPath}</option>
          )}
        </select>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 rounded-2xl bg-secondary px-4 py-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedChannel}...`}
            rows={1}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ maxHeight: 120 }}
            disabled={!connected}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || !connected}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
            text.trim() && connected
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
