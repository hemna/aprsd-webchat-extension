import { useState, useMemo } from 'react'
import { useGPS } from '@/stores/gps'
import { useUI } from '@/stores/ui'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { X, Search } from 'lucide-react'
import { APRSSymbol } from './APRSSymbol'
import type { BeaconSymbol } from '@/types'

const PRIMARY_SYMBOLS: Record<string, string> = {
  '!': 'Police Station', '"': 'Reserved', '#': 'Digi', '$': 'Phone',
  '%': 'DX Cluster', '&': 'HF Gateway', "'": 'Small Aircraft', '(': 'Mobile Satellite',
  ')': 'Wheelchair', '*': 'Snowmobile', '+': 'Red Cross', ',': 'Boy Scouts',
  '-': 'House QTH', '.': 'X', '/': 'Red Dot', '0': 'Circle (0)',
  '1': 'Circle (1)', '2': 'Circle (2)', '3': 'Circle (3)', '4': 'Circle (4)',
  '5': 'Circle (5)', '6': 'Circle (6)', '7': 'Circle (7)', '8': 'Circle (8)',
  '9': 'Circle (9)', ':': 'Fire', ';': 'Campground', '<': 'Motorcycle',
  '=': 'Railroad Engine', '>': 'Car', '?': 'File Server', '@': 'Hurricane',
  'A': 'Aid Station', 'B': 'BBS', 'C': 'Canoe', 'D': 'Reserved',
  'E': 'Eyeball', 'F': 'Tractor', 'G': 'Grid Square', 'H': 'Hotel',
  'I': 'TCP/IP', 'J': 'Reserved', 'K': 'School', 'L': 'PC User',
  'M': 'Mac Station', 'N': 'NTS Station', 'O': 'Balloon', 'P': 'Police',
  'Q': 'TBD', 'R': 'Rec Vehicle', 'S': 'Shuttle', 'T': 'SSTV',
  'U': 'Bus', 'V': 'ATV', 'W': 'Weather Station', 'X': 'Helicopter',
  'Y': 'Yacht', 'Z': 'WinAPRS', '[': 'Jogger', '\\': 'Triangle',
  ']': 'PBBS', '^': 'Large Aircraft', '_': 'Weather Station (Blue)',
  '`': 'Dish Antenna', 'a': 'Ambulance', 'b': 'Bike', 'c': 'ICP',
  'd': 'Fire Department', 'e': 'Horse', 'f': 'Fire Truck', 'g': 'Glider',
  'h': 'Hospital', 'i': 'IOTA', 'j': 'Jeep', 'k': 'Truck',
  'l': 'Laptop', 'm': 'Mic-E Repeater', 'n': 'Node', 'o': 'EOC',
  'p': 'Rover (Dog)', 'q': 'Grid Square (2)', 'r': 'Repeater',
  's': 'Ship (Power Boat)', 't': 'Truck Stop', 'u': 'Truck (18-wheeler)',
  'v': 'Van', 'w': 'Water Station', 'x': 'xAPRS', 'y': 'Yagi',
  'z': 'Shelter', '{': 'Reserved', '|': 'TNC Stream', '}': 'Reserved', '~': 'TNC Stream',
}

export function SymbolPickerSheet() {
  const activeSheet = useUI((s) => s.activeSheet)
  const setActiveSheet = useUI((s) => s.setActiveSheet)
  const symbol = useGPS((s) => s.symbol)
  const setSymbol = useGPS((s) => s.setSymbol)
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')

  const isOpen = activeSheet === 'symbol'

  const filteredSymbols = useMemo(() => {
    return Object.entries(PRIMARY_SYMBOLS)
      .filter(([, desc]) =>
        !search || desc.toLowerCase().includes(search.toLowerCase())
      )
      .map(([char, desc]) => ({ char, desc }))
  }, [search])

  if (!isOpen) return null

  const handleSelect = (char: string, desc: string) => {
    const newSymbol: BeaconSymbol = { table: '/', symbol: char, description: desc }
    setSymbol(newSymbol)
    setActiveSheet('gps')
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setActiveSheet('gps')}
      />
      <div
        className={`fixed z-[60] bg-card border-border overflow-hidden flex flex-col ${
          isMobile
            ? 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl border-t'
            : 'inset-y-0 right-0 w-96 border-l'
        }`}
      >
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Select Symbol</h2>
          <button
            onClick={() => setActiveSheet('gps')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-secondary py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          {symbol && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Current:</span>
              <APRSSymbol table={symbol.table} symbol={symbol.symbol} size={24} />
              <span>{symbol.description}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1">
            {filteredSymbols.map(({ char, desc }) => (
              <button
                key={char}
                onClick={() => handleSelect(char, desc)}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors ${
                  symbol.symbol === char && symbol.table === '/'
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-accent/50'
                }`}
                title={desc}
              >
                <APRSSymbol table="/" symbol={char} size={36} />
                <span className="text-[9px] text-muted-foreground leading-tight truncate w-full">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
