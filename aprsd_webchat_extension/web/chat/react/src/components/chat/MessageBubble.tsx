import type { Message } from '@/types'
import { escapeHtml, timeAgo } from '@/lib/utils'
import { useUI } from '@/stores/ui'
import { Check, CheckCheck } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  showCallsign?: boolean
}

export function MessageBubble({ message, showCallsign = false }: MessageBubbleProps) {
  const isSent = message.type === 'tx'
  const showRawPackets = useUI((s) => s.showRawPackets)

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3.5 py-2 ${
          isSent
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-secondary text-secondary-foreground rounded-bl-md'
        }`}
      >
        {showCallsign && !isSent && (
          <p className="text-xs font-semibold mb-0.5 opacity-70">{message.from_call}</p>
        )}

        <p
          className="text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: escapeHtml(message.message_text) }}
        />

        {/* Timestamp + ACK */}
        <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isSent ? 'opacity-70' : 'text-muted-foreground'}`}>
            {timeAgo(message.timestamp)}
          </span>
          {isSent && (
            <span className="inline-flex">
              {message.ack ? (
                <CheckCheck className="h-3.5 w-3.5 opacity-70" />
              ) : (
                <Check className="h-3.5 w-3.5 opacity-50" />
              )}
            </span>
          )}
        </div>

        {/* Raw packet (global toggle only, no per-message expand) */}
        {showRawPackets && message.raw && (
          <pre
            className={`mt-1 rounded-md p-2 text-[10px] font-mono overflow-x-auto ${
              isSent
                ? 'bg-black/10 text-primary-foreground'
                : 'bg-black/5 text-secondary-foreground dark:bg-white/5'
            }`}
          >
            {message.raw}
          </pre>
        )}
      </div>
    </div>
  )
}
