# Data Model: Raw APRS Packet View Toggle

**Feature**: 002-raw-aprs-toggle
**Date**: 2026-03-06

## Overview

This feature is primarily a UI/presentation change. No new data models are introduced. The existing message data model already contains the `raw` field with the TNC2-format APRS packet string.

## Existing Data Structures

### Message Object (JavaScript)

The message object passed via Socket.IO and stored in `message_list` already contains the raw packet:

```javascript
// Message object structure (existing)
{
    "from_call": "K1ABC",        // Sender callsign
    "to_call": "W1XYZ",          // Recipient callsign
    "message_text": "Hello!",    // Parsed message content
    "msgNo": "001",              // Message number for ACK
    "raw": "K1ABC>APRS,WIDE1-1::W1XYZ   :Hello!{001",  // Raw TNC2 packet
    "timestamp": 1709740800.123, // Unix timestamp
    "type": "tx" | "rx" | "ack", // Message type
    "ack": true | false,         // ACK received (for TX)
    "path": "WIDE1-1"            // Digipeater path used
}
```

### UI State (New)

A single global variable to track toggle state:

```javascript
// New global variable in send-message.js
var showRawPackets = false;  // Default to normal view
```

## DOM Structure Changes

### Current Message Bubble HTML

```html
<div class="bubble-row alt">
    <div id="K1ABC_001" class="bubble alt"
         title="APRS Raw Packet"
         data-bs-toggle="popover"
         data-bs-content="K1ABC>APRS,WIDE1-1::W1XYZ   :Hello!{001">
        <div class="bubble-text">
            <p class="bubble-name alt">K1ABC
                <span class="bubble-timestamp">3/6/2026 10:00:00 AM</span>
                <span class="material-symbols-rounded md-10" id="ack_xxx">thumb_up</span>
            </p>
            <p class="bubble-message">Hello!</p>
            <div class="bubble-arrow alt"></div>
        </div>
    </div>
</div>
```

### New Message Bubble HTML (with raw packet element)

```html
<div class="bubble-row alt">
    <div id="K1ABC_001" class="bubble alt"
         title="APRS Raw Packet"
         data-bs-toggle="popover"
         data-bs-content="K1ABC>APRS,WIDE1-1::W1XYZ   :Hello!{001">
        <div class="bubble-text">
            <p class="bubble-name alt">K1ABC
                <span class="bubble-timestamp">3/6/2026 10:00:00 AM</span>
                <span class="material-symbols-rounded md-10" id="ack_xxx">thumb_up</span>
            </p>
            <!-- Normal message view -->
            <p class="bubble-message">Hello!</p>
            <!-- Raw packet view (hidden by default) -->
            <p class="bubble-raw-packet">K1ABC>APRS,WIDE1-1::W1XYZ   :Hello!{001</p>
            <div class="bubble-arrow alt"></div>
        </div>
    </div>
</div>
```

## CSS Class States

### Container State

The `wc-content` or `.speech-wrapper` element will have a class that indicates raw mode:

```css
/* Default: show normal messages, hide raw */
.bubble-raw-packet {
    display: none;
}

/* When raw mode is enabled */
.show-raw-packets .bubble-message {
    display: none;
}

.show-raw-packets .bubble-raw-packet {
    display: block;
}
```

## State Transitions

```
                    ┌─────────────────────────────────┐
                    │         User Actions            │
                    └─────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────┐    Click    ┌──────────────────┐
│  showRawPackets  │◄───Toggle───│   Info Button    │
│     = false      │             │    (toggle)      │
│  Normal View     │             └──────────────────┘
└──────────────────┘                     │
         │                               │
         │ Toggle                        │ Toggle
         │ On                            │ Off
         ▼                               ▼
┌──────────────────┐    Click    ┌──────────────────┐
│  showRawPackets  │◄───Toggle───│   Info Button    │
│     = true       │             │    (toggle)      │
│   Raw View       │             └──────────────────┘
└──────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│                  CSS Class Toggle                     │
│  document.body.classList.toggle('show-raw-packets')  │
│                                                       │
│  - When added: raw packets visible, messages hidden   │
│  - When removed: messages visible, raw packets hidden │
└──────────────────────────────────────────────────────┘
```

## Validation Rules

### Raw Packet Display

| Condition | Display |
|-----------|---------|
| `msg.raw` exists and non-empty | Display raw packet text |
| `msg.raw` is undefined/null/empty | Display "(raw packet not available)" in italic/muted |

### Toggle State

| State | Icon | CSS Class | Visible Content |
|-------|------|-----------|-----------------|
| Off (default) | `info` (outline) | None | `.bubble-message` |
| On | `info` (filled) | `.show-raw-packets` | `.bubble-raw-packet` |

## Backward Compatibility

Messages loaded from localStorage that were stored before this feature may not have `raw` data:

1. Messages stored with raw data: Display normally
2. Messages without raw data: Display placeholder text
3. New messages: Always include raw data (already part of Socket.IO message format)

## No Database Changes

This feature does not require any changes to:
- Backend Python models
- Database schema
- Socket.IO message format (raw is already included)
- localStorage structure (continues to store full message objects)
