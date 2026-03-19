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

/**
 * Safely strip all HTML tags from a string using the DOM parser.
 * Unlike regex-based approaches, this handles nested/malformed tags
 * and is not vulnerable to incomplete multi-character sanitization.
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
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

/** Parse a timestamp that could be ISO string, Unix epoch (seconds or ms), or Date-compatible string */
function parseTimestamp(value: string | number): Date {
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value))) {
    const num = Number(value)
    // If it looks like seconds (< year 2100 in seconds = 4102444800), treat as seconds
    // Otherwise treat as milliseconds
    if (num < 4102444800) {
      return new Date(num * 1000)
    }
    return new Date(num)
  }
  return new Date(value)
}

/** Format relative time (e.g., "2m ago", "1h ago") */
export function timeAgo(dateString: string): string {
  const date = parseTimestamp(dateString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 0) return 'just now'
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
