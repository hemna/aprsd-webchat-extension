import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind class merge utility (used by shadcn/ui components) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Escape HTML entities to prevent XSS */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  return div.innerHTML
}

/** Escape string for use in HTML attributes */
export function escapeHtmlAttribute(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Validate APRS callsign format */
export function isValidCallsign(callsign: string): boolean {
  if (!callsign || callsign.trim() === '') return false
  const trimmed = callsign.trim().toUpperCase()
  // Standard callsign with optional SSID: W6ABC, W6ABC-9, W6ABC-15
  const standard = /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,3}(-[0-9]{1,2})?$/
  // All-letter event callsigns: FIELD, EVENT
  const allLetter = /^[A-Z]{3,6}(-[0-9]{1,2})?$/
  return standard.test(trimmed) || allLetter.test(trimmed)
}

/** Generate a unique message ID */
export function generateMessageId(from: string, to: string, timestamp: string, msgNo: string): string {
  return `${from}-${to}-${timestamp}-${msgNo}`
}

/** Format relative time (e.g., "2m ago", "1h ago") */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
