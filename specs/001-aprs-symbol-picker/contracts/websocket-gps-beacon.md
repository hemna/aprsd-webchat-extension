# WebSocket Contract: GPS Beacon with Symbol

**Feature**: APRS Beacon Symbol Picker
**Namespace**: `/sendmsg`
**Event**: `gps`

## Request (Client → Server)

### Event Name
`gps`

### Payload Schema

```typescript
interface GPSBeaconRequest {
    /** Latitude in decimal degrees */
    latitude: number;

    /** Longitude in decimal degrees */
    longitude: number;

    /** APRS path (optional) */
    path?: string;

    /**
     * APRS symbol string (NEW - optional)
     * Format: <table><code>
     * - table: '/' (primary) or '\' (alternate)
     * - code: ASCII character 33-126
     * Default: '/>' (car)
     */
    symbol?: string;
}
```

### Example Payloads

**Minimal (backward compatible):**
```json
{
    "latitude": 37.7749,
    "longitude": -122.4194
}
```

**With path (existing):**
```json
{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "path": "WIDE1-1,WIDE2-1"
}
```

**With symbol (new):**
```json
{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "path": "WIDE1-1",
    "symbol": "/>"
}
```

**Alternate table symbol:**
```json
{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "symbol": "\\>"
}
```
Note: Backslash must be escaped in JSON.

## Response (Server → Client)

### Event Name
`gps_beacon_sent`

### Payload Schema

```typescript
interface GPSBeaconResponse {
    /** Status message */
    message: string;

    /** Latitude that was transmitted */
    latitude: number;

    /** Longitude that was transmitted */
    longitude: number;

    /** Symbol that was transmitted (NEW - optional) */
    symbol?: string;
}
```

### Example Response

```json
{
    "message": "beacon sent",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "symbol": "/>"
}
```

## Validation Rules

### Server-Side Validation

1. **symbol** (if provided):
   - Must be exactly 2 characters
   - First character must be `/` or `\`
   - Second character must be ASCII 33-126
   - If invalid, fall back to default `/>`

### Error Handling

| Error | Behavior |
|-------|----------|
| Missing symbol | Use default `/>`  (backward compatible) |
| Invalid symbol format | Log warning, use default `/>`  |
| Symbol too short/long | Log warning, use default `/>`  |

## Backend Implementation Notes

### webchat.py Changes

```python
def on_gps(self, data):
    LOG.debug(f"WS on_GPS: {data}")
    lat = float(data["latitude"])
    long = float(data["longitude"])
    path = data.get("path", None)

    # NEW: Parse symbol (default to car)
    symbol_str = data.get("symbol", "/>")
    if len(symbol_str) >= 2:
        symbol_table = symbol_str[0]
        symbol_code = symbol_str[1]
    else:
        symbol_table = "/"
        symbol_code = ">"

    # ... path handling unchanged ...

    tx.send(
        packets.BeaconPacket(
            from_call=CONF.callsign,
            to_call="APDW16",
            latitude=lat,
            longitude=long,
            symbol=symbol_code,        # NEW
            symbol_table=symbol_table, # NEW
            comment="APRSD WebChat Beacon",
            path=path,
        ),
        direct=True,
    )

    # Include symbol in response
    socketio.emit(
        "gps_beacon_sent",
        {
            "message": "beacon sent",
            "latitude": lat,
            "longitude": long,
            "symbol": symbol_str,  # NEW
        },
        namespace="/sendmsg",
    )
```

## Backward Compatibility

This contract is **fully backward compatible**:

- The `symbol` parameter is optional
- Existing clients that don't send `symbol` will work unchanged
- Server defaults to `/>`  (car) if `symbol` is not provided
- Response includes `symbol` field for new clients, older clients can ignore it
