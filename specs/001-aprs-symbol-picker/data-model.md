# Data Model: APRS Symbol Picker

**Feature**: APRS Beacon Symbol Picker
**Date**: 2026-03-05

## Entities

### APRSSymbol (Frontend - JavaScript)

Represents a single APRS symbol from the symbol table.

```javascript
/**
 * @typedef {Object} APRSSymbol
 * @property {string} table - Symbol table character: '/' (primary) or '\' (alternate)
 * @property {string} code - Symbol code character: ASCII 33-126
 * @property {string} description - Human-readable description
 * @property {number} spriteRow - Row position in sprite sheet (0-5)
 * @property {number} spriteCol - Column position in sprite sheet (0-15)
 */

// Example:
const carSymbol = {
    table: '/',
    code: '>',
    description: 'Car',
    spriteRow: 14,  // (62-33) % 16 = 13... wait let me recalculate
    spriteCol: 1    // Math.floor((62-33) / 16) = 1
};
```

**Sprite Position Calculation:**
```javascript
// ASCII code for '>' is 62
const charCode = '>'.charCodeAt(0);  // 62
const offset = charCode - 33;         // 29
const row = offset % 16;              // 13
const col = Math.floor(offset / 16);  // 1
```

### SymbolSelection (Frontend - localStorage)

The user's persisted symbol selection.

```javascript
/**
 * @typedef {Object} SymbolSelection
 * @property {string} table - Selected table character: '/' or '\'
 * @property {string} symbol - Selected symbol character
 * @property {string} [description] - Optional description for display
 */

// localStorage key: 'aprsd-webchat-beacon-symbol'
// Example stored value:
{
    "table": "/",
    "symbol": ">",
    "description": "Car"
}
```

### BeaconSymbolData (WebSocket Message - Frontend to Backend)

Extension to the existing GPS beacon message to include symbol.

```javascript
/**
 * @typedef {Object} BeaconSymbolData
 * @property {number} latitude - Beacon latitude
 * @property {number} longitude - Beacon longitude
 * @property {string} [path] - APRS path (existing)
 * @property {string} [symbol] - Two-character symbol string (table + code)
 */

// Example WebSocket emission:
socket.emit("gps", {
    latitude: 37.7749,
    longitude: -122.4194,
    path: "WIDE1-1",
    symbol: "/>"  // Table + Symbol code
});
```

## Symbol Tables Data Structure

### Primary Symbol Table (Frontend Constant)

```javascript
/**
 * Primary APRS symbol table (table character: '/')
 * Symbols are indexed by their ASCII code character
 */
const PRIMARY_SYMBOLS = {
    '!': { description: 'Police Station' },
    '"': { description: 'Reserved' },
    '#': { description: 'Digi' },
    '$': { description: 'Phone' },
    '%': { description: 'DX Cluster' },
    '&': { description: 'HF Gateway' },
    "'": { description: 'Small Aircraft' },
    '(': { description: 'Mobile Satellite Station' },
    ')': { description: 'Wheelchair' },
    '*': { description: 'Snowmobile' },
    '+': { description: 'Red Cross' },
    ',': { description: 'Boy Scouts' },
    '-': { description: 'House QTH' },
    '.': { description: 'X' },
    '/': { description: 'Red Dot' },
    // ... (ASCII 48-57: 0-9)
    '0': { description: 'Circle (0)' },
    '1': { description: 'Circle (1)' },
    '2': { description: 'Circle (2)' },
    '3': { description: 'Circle (3)' },
    '4': { description: 'Circle (4)' },
    '5': { description: 'Circle (5)' },
    '6': { description: 'Circle (6)' },
    '7': { description: 'Circle (7)' },
    '8': { description: 'Circle (8)' },
    '9': { description: 'Circle (9)' },
    ':': { description: 'Fire' },
    ';': { description: 'Campground' },
    '<': { description: 'Motorcycle' },
    '=': { description: 'Railroad Engine' },
    '>': { description: 'Car' },
    '?': { description: 'File Server' },
    '@': { description: 'Hurricane/Tropical Storm' },
    // ... (ASCII 65-90: A-Z)
    'A': { description: 'Aid Station' },
    'B': { description: 'BBS' },
    'C': { description: 'Canoe' },
    // ... continue for all symbols
    'O': { description: 'Balloon' },
    'R': { description: 'Recreational Vehicle' },
    'Y': { description: 'Yacht/Sailboat' },
    '[': { description: 'Jogger' },
    'a': { description: 'Ambulance' },
    'b': { description: 'Bicycle' },
    'f': { description: 'Fire Truck' },
    'k': { description: 'Truck' },
    's': { description: 'Ship (Power Boat)' },
    'v': { description: 'Van' },
    // ... (full table in implementation)
};
```

### Alternate Symbol Table (Frontend Constant)

```javascript
/**
 * Alternate APRS symbol table (table character: '\')
 * These symbols support alphanumeric overlays
 */
const ALTERNATE_SYMBOLS = {
    '!': { description: 'Emergency' },
    '#': { description: 'Numbered Star' },
    // ... similar structure to primary
    '>': { description: 'Car with Overlay' },
    '-': { description: 'House with Overlay' },
    // ...
};
```

## State Management

### Symbol Picker State (Component State)

```javascript
/**
 * @typedef {Object} SymbolPickerState
 * @property {boolean} isOpen - Whether the picker dialog is visible
 * @property {string} activeTable - Currently displayed table ('/' or '\')
 * @property {APRSSymbol|null} hoveredSymbol - Symbol currently under cursor
 * @property {APRSSymbol|null} selectedSymbol - Currently selected symbol
 */
```

## Validation Rules

### Symbol Selection Validation

```javascript
/**
 * Validate a symbol selection
 * @param {string} table - Table character
 * @param {string} symbol - Symbol code character
 * @returns {boolean} - True if valid
 */
function isValidSymbol(table, symbol) {
    // Table must be '/' or '\'
    if (table !== '/' && table !== '\\') return false;

    // Symbol must be ASCII 33-126
    const code = symbol.charCodeAt(0);
    if (code < 33 || code > 126) return false;

    return true;
}
```

### localStorage Data Validation

```javascript
/**
 * Validate and parse stored symbol data
 * @returns {SymbolSelection|null} - Parsed selection or null if invalid
 */
function loadSymbolSelection() {
    try {
        const stored = localStorage.getItem('aprsd-webchat-beacon-symbol');
        if (!stored) return null;

        const data = JSON.parse(stored);
        if (!isValidSymbol(data.table, data.symbol)) {
            console.warn('Invalid symbol data in localStorage, clearing');
            localStorage.removeItem('aprsd-webchat-beacon-symbol');
            return null;
        }

        return data;
    } catch (e) {
        console.error('Failed to parse symbol data:', e);
        localStorage.removeItem('aprsd-webchat-beacon-symbol');
        return null;
    }
}
```

## Default Values

| Field | Default Value | Rationale |
|-------|---------------|-----------|
| table | `/` | Primary table is most common |
| symbol | `>` | Car symbol - most common for mobile |
| description | `Car` | Human-readable default |
