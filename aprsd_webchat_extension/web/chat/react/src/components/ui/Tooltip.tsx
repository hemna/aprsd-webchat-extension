import type { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
  className?: string
}

/**
 * Instant CSS-only tooltip. Shows on hover with no delay.
 * Positioned above by default, shifts to below if near top of viewport.
 */
export function Tooltip({ text, children, className = '' }: TooltipProps) {
  if (!text) return <>{children}</>

  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 transition-opacity duration-75 group-hover:opacity-100"
        role="tooltip"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-foreground" />
      </span>
    </span>
  )
}
