# Quickstart: APRS Beacon Symbol Picker

**Feature**: APRS Beacon Symbol Picker
**Date**: 2026-03-05

## Prerequisites

1. APRSD webchat extension installed and running
2. Web browser with localStorage enabled
3. Access to the webchat interface

## Testing the Symbol Picker

### 1. Open the Symbol Picker Dialog

**From the Quick Beacon Button:**
- Locate the beacon button in the info bar (location icon with the current symbol)
- Click on the symbol icon portion of the button (not the send action)
- The symbol picker dialog should open

**From the GPS Panel:**
- Click the GPS/satellite icon to expand the GPS panel
- Look for "Change Symbol" button or the symbol display
- Click to open the symbol picker

### 2. Select a Symbol

1. The dialog displays a grid of APRS symbols organized by table
2. Use the Primary/Alternate table tabs to switch between symbol sets
3. Hover over any symbol to see its character code and description
4. Click a symbol to select it
5. The dialog closes automatically

### 3. Verify Symbol Selection

**Visual Confirmation:**
- The quick beacon button should now display your selected symbol icon
- Hover over the button to see the symbol code in the tooltip

**localStorage Check (Developer Tools):**
```javascript
// In browser console:
JSON.parse(localStorage.getItem('aprsd-webchat-beacon-symbol'))
// Expected output: { "table": "/", "symbol": ">", "description": "Car" }
```

### 4. Send a Beacon with the Symbol

1. Ensure GPS coordinates are available (check GPS panel)
2. Click the "Send Beacon" button
3. Watch for the beacon toast notification
4. The beacon should be transmitted with your selected symbol

### 5. Verify Persistence

1. Note your current symbol selection
2. Refresh the browser page (F5 or Cmd+R)
3. The quick beacon button should still display your previously selected symbol
4. Open the symbol picker - your selection should be highlighted

## Testing Scenarios

### Scenario A: First-Time User

1. Clear localStorage: `localStorage.removeItem('aprsd-webchat-beacon-symbol')`
2. Refresh the page
3. Verify default symbol (car `/>`  ) is displayed
4. Send a beacon - should use default symbol

### Scenario B: Change Symbol

1. Open symbol picker, select "House" (`/-`)
2. Send a beacon
3. Verify beacon uses house symbol
4. Change to "Bicycle" (`/b`)
5. Send another beacon
6. Verify beacon uses bicycle symbol

### Scenario C: Alternate Table Symbol

1. Open symbol picker
2. Switch to "Alternate" table tab
3. Select a symbol (e.g., car with overlay `\>`)
4. Send a beacon
5. Verify alternate table symbol is transmitted

### Scenario D: Mobile Responsiveness

1. Open browser developer tools
2. Enable device emulation (mobile view)
3. Open symbol picker
4. Verify grid is scrollable and symbols are tappable
5. Select a symbol
6. Verify dialog closes and selection works

## Troubleshooting

### Symbol Picker Doesn't Open
- Check browser console for JavaScript errors
- Verify `symbol-picker.js` is loaded
- Check for Bootstrap modal conflicts

### Selection Doesn't Persist
- Check if localStorage is enabled/available
- Look for storage quota errors in console
- Try clearing and re-selecting

### Wrong Symbol Transmitted
- Check localStorage value vs. beacon data
- Verify WebSocket message in Network tab
- Check server logs for symbol parsing

### Sprite Images Not Loading
- Verify sprite sheet files exist in `/static/images/`
- Check Network tab for 404 errors
- Verify CSS background-image paths

## Development Testing

### Run Backend Tests
```bash
# From project root
uv run pytest tests/ -v -k symbol
```

### Run Linting
```bash
uv run ruff check aprsd_webchat_extension
```

### Start Development Server
```bash
aprsd webchat --loglevel DEBUG
```

### Monitor WebSocket Messages
In browser console:
```javascript
// Intercept gps emissions
const originalEmit = socket.emit;
socket.emit = function(event, data) {
    if (event === 'gps') {
        console.log('GPS Beacon Data:', data);
    }
    return originalEmit.apply(this, arguments);
};
```
