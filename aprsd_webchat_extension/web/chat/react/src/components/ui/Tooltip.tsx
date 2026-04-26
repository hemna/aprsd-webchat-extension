import type { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
  className?: string
  /** Position relative to the element. Default "above". Use "below" for elements near the top of the viewport. */
  position?: 'above' | 'below'
}

/**
 * Instant CSS-only tooltip. Shows on hover with no delay.
 */
export function Tooltip({ text, children, className = '', position = 'above' }: TooltipProps) {
  if (!text) return <>{children}</>

  const isBelow = position === 'below'

  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 transition-opacity duration-75 group-hover:opacity-100 ${
          isBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
        }`}
        role="tooltip"
      >
        {text}
        {/* Arrow */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            isBelow
              ? 'bottom-full border-b-foreground'
              : 'top-full border-t-foreground'
          }`}
        />
      </span>
    </span>
  )
}
