/**
 * APRS Symbol sprite renderer.
 * Uses the same sprite sheets as the jQuery UI:
 *   /static/images/aprs-symbols-48-0.png (primary table '/')
 *   /static/images/aprs-symbols-48-1.png (alternate table '\')
 *
 * Sprite sheet layout: 16 columns x 6 rows, each cell 48x48px.
 * Symbol codes are ASCII 33-126, mapped to grid positions.
 */

interface APRSSymbolProps {
  table: string    // '/' for primary, '\' for alternate
  symbol: string   // Single ASCII character (33-126)
  size?: number    // Display size in px (default 36)
  className?: string
}

function getSymbolSpritePosition(symbolCode: string): { row: number; col: number } {
  const charCode = symbolCode.charCodeAt(0)
  const offset = charCode - 33
  return {
    row: offset % 16,
    col: Math.floor(offset / 16),
  }
}

export function APRSSymbol({ table, symbol, size = 36, className = '' }: APRSSymbolProps) {
  const spriteIndex = table === '/' ? 0 : 1
  const pos = getSymbolSpritePosition(symbol)
  const x = pos.row * -size
  const y = pos.col * -size

  return (
    <div
      className={`inline-block flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(/static/images/aprs-symbols-48-${spriteIndex}.png)`,
        backgroundPosition: `${x}px ${y}px`,
        backgroundSize: `${16 * size}px ${6 * size}px`,
        backgroundRepeat: 'no-repeat',
      }}
      role="img"
      aria-label={`APRS symbol ${table}${symbol}`}
    />
  )
}
