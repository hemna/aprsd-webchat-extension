# Research: APRS Symbol Standards

**Feature**: APRS Beacon Symbol Picker
**Date**: 2026-03-05

## APRS Symbol Format

### Decision: Use Standard APRS Symbol Format
APRS symbols consist of two characters:
1. **Table Character**: `/` (primary table) or `\` (alternate table)
2. **Symbol Code**: ASCII character from 33 (`!`) to 126 (`~`)

### Rationale
This is the APRS standard defined in APRS Protocol Reference (APRS101.pdf). All APRS software expects this format.

### Alternatives Considered
- Single character codes: Rejected - doesn't support alternate table
- Numeric IDs: Rejected - not compatible with APRS protocol

## Symbol Tables Structure

### Decision: Support Both Primary and Alternate Tables

**Primary Table (`/`)**: 94 symbols (ASCII 33-126)
- Standard symbols for common station types
- Examples: `/>` car, `/-` house, `/[` jogger, `/;` campground

**Alternate Table (`\`)**: 94 symbols (ASCII 33-126)
- Overlay-capable symbols (can have alphanumeric overlay)
- Examples: `\>` car with overlay, `\-` house with overlay

### Rationale
Both tables are part of the APRS standard and commonly used. Many operators use alternate table symbols with overlays for club identification.

### Symbol Code Reference

Common symbols (from existing sprite sheets):

| Code | Symbol | Description |
|------|--------|-------------|
| `/>` | Car | Primary table car |
| `/-` | House | Home station |
| `/[` | Jogger | Pedestrian |
| `/;` | Campground | Camping area |
| `/O` | Balloon | High-altitude balloon |
| `/Y` | Yacht | Boat/sailboat |
| `/k` | Truck | Commercial vehicle |
| `/v` | Van | Van/camper |
| `/b` | Bicycle | Bicycle |
| `/R` | RV | Recreational vehicle |
| `/'` | Aircraft | Small plane |
| `/X` | Helicopter | Rotorcraft |
| `/a` | Ambulance | Emergency vehicle |
| `/f` | Fire | Fire station/truck |
| `/s` | Ship | Large vessel |

## Sprite Sheet Layout

### Decision: Use Existing 16x16 and 64x64 Sprite Sheets

The project already has APRS symbol sprite sheets:
- `aprs-symbols-16-0.png` - Primary table (16x16 per symbol)
- `aprs-symbols-16-1.png` - Alternate table (16x16 per symbol)
- `aprs-symbols-64-0.png` - Primary table large (64x64 per symbol)
- `aprs-symbols-64-1.png` - Alternate table large (64x64 per symbol)

### Sprite Sheet Grid Layout
- 16 columns × 6 rows per sheet
- Symbol position calculated from ASCII offset:
  ```javascript
  offset = charCode - 33;  // ASCII 33 = '!'
  col = Math.floor(offset / 16);
  row = offset % 16;
  ```

### Rationale
Existing sprite sheets are already loaded and used by `main.js` for displaying APRS icons. Reusing them avoids additional asset downloads.

## localStorage Key Design

### Decision: Store as JSON Object with Table and Symbol

```javascript
localStorage.setItem('aprsd-webchat-beacon-symbol', JSON.stringify({
    table: '/',    // or '\'
    symbol: '>',   // ASCII 33-126
    description: 'Car'
}));
```

### Rationale
- Follows existing localStorage pattern (e.g., `aprsd-webchat-beacon-sent`)
- JSON allows storing table, symbol, and optional metadata
- Easy to extend if needed (e.g., overlay character for alternate table)

### Alternatives Considered
- Two-character string: Rejected - less extensible
- Numeric code: Rejected - less readable for debugging

## Default Symbol

### Decision: Default to Car (`/>`)

When no symbol is selected, default to the car symbol (`/>`).

### Rationale
- Car is the most commonly used APRS symbol for mobile stations
- Most webchat users are likely mobile/portable
- Consistent with many APRS client defaults

### Alternatives Considered
- House (`/-`): Common but typically for fixed stations
- Question mark (`/?`): Too ambiguous
- No default: Would cause errors in beacon transmission

## Backend Integration

### Decision: Add Symbol Parameter to GPS WebSocket Event

Modify the `on_gps()` handler in `webchat.py` to accept an optional `symbol` parameter:

```python
def on_gps(self, data):
    lat = float(data["latitude"])
    long = float(data["longitude"])
    symbol = data.get("symbol", "/>")  # Default to car
    # Parse symbol into table and code
    table_char = symbol[0] if len(symbol) >= 1 else '/'
    symbol_char = symbol[1] if len(symbol) >= 2 else '>'

    tx.send(
        packets.BeaconPacket(
            from_call=CONF.callsign,
            to_call="APDW16",
            latitude=lat,
            longitude=long,
            symbol=symbol_char,
            symbol_table=table_char,
            comment="APRSD WebChat Beacon",
            path=path,
        ),
        direct=True,
    )
```

### Rationale
- Minimal backend change
- Symbol selection is user preference, not server configuration
- Allows different symbols per session without server restart

## UI Pattern

### Decision: Bootstrap Modal with Grid Layout

Use a Bootstrap 5 modal dialog with:
- Responsive CSS grid (auto-fill columns)
- Clickable symbol icons from sprite sheets
- Hover tooltip showing character code
- Two tabs for Primary/Alternate tables (or side-by-side sections)

### Rationale
- Consistent with Bootstrap patterns used elsewhere in the app
- Modal provides focus and easy dismiss (click outside, Escape key)
- Grid layout works well on mobile and desktop

### Alternatives Considered
- Dropdown: Too many options (188 symbols)
- Inline picker: Takes too much space
- Separate page: Breaks user flow
