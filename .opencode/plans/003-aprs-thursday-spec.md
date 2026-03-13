# Feature Specification: APRSThursday Net Support

**Feature Branch**: `003-aprs-thursday`
**Created**: 2026-03-12
**Status**: Draft
**Reference**: iOS implementation at `aprs-chat-ios/specs/021-aprs-thursday/`

## Overview

Add native APRSThursday support to APRSD WebChat, mirroring the capabilities in aprs-chat-ios. This enables users to participate in the weekly APRSThursday net via the ANSRVR HOTG group with a dedicated UI toggle, group chat view, subscription management, and inline location fetching for message senders.

## User Scenarios

### US1 - Enable APRSThursday Mode (P1)

As a ham radio operator, I want to enable APRSThursday mode with a single click so that I can access the dedicated #APRSThursday conversation.

**Acceptance Criteria:**
1. **Given** I click the APRSThursday toggle in the info bar, **When** it activates, **Then** a colored #APRSThursday tab appears in the tab list.
2. **Given** APRSThursday is enabled, **When** I click the toggle again, **Then** the #APRSThursday tab is removed and the feature is disabled.
3. **Given** I enable APRSThursday and refresh the page, **Then** the toggle state and tab persist from localStorage.

### US2 - Join APRSThursday Net (P1)

As a ham radio operator, I want to join the APRSThursday net so that I can participate in the weekly APRS activity event.

**Acceptance Criteria:**
1. **Given** I am in the #APRSThursday tab with Broadcast mode selected, **When** I type "Hello from California" and click Join Net, **Then** `CQ HOTG Hello from California` is sent to ANSRVR.
2. **Given** I am in Log-only mode, **When** I click Join Net with a message, **Then** `HOTG <message>` is sent to APRSPH (not ANSRVR).
3. **Given** I click Silent Subscribe, **Then** `K HOTG` is sent to ANSRVR and I subscribe without broadcasting.

### US3 - View APRSThursday Group Chat (P1)

As a ham radio operator participating in APRSThursday, I want to see all HOTG messages from other participants so that I can follow the net activity.

**Acceptance Criteria:**
1. **Given** APRSThursday is enabled, **When** an ANSRVR HOTG message arrives, **Then** it appears in the #APRSThursday tab with the sender's callsign as a header.
2. **Given** I receive multiple HOTG messages from different senders, **Then** each message shows its sender's callsign prominently above the message bubble.
3. **Given** I am viewing the #APRSThursday tab, **When** I type a message and send, **Then** it is sent as `CQ HOTG <message>` to ANSRVR (in Broadcast mode).

### US4 - Fetch Sender Location (P1)

As a ham radio operator, I want to see the location of stations participating in APRSThursday so that I know their distance and direction from me.

**Acceptance Criteria:**
1. **Given** I see a HOTG message with a callsign header, **When** I click "Fetch location" next to the callsign, **Then** the system fetches the station's location.
2. **Given** location fetch succeeds and I have a GPS fix, **Then** I see a bearing arrow (rotated to direction), distance, and cardinal direction (e.g., "↗ 45.3 km NE").
3. **Given** location fetch succeeds but I have no GPS fix, **Then** I see the station's coordinates instead of bearing/distance.
4. **Given** I already fetched a callsign's location, **When** I view another message from them, **Then** the cached location is shown without re-fetching.

### US5 - Subscription Management (P2)

As a ham radio operator, I want to manage my HOTG subscription so that I can control when I receive group messages.

**Acceptance Criteria:**
1. **Given** I am subscribed to HOTG, **When** I click "Leave Net", **Then** `U HOTG` is sent to ANSRVR and my status updates to unsubscribed.
2. **Given** I subscribed 11 hours ago, **When** I view the control panel, **Then** I see "Subscription expires in ~1 hour".
3. **Given** ANSRVR sends a confirmation message, **Then** my subscription status updates accordingly.

### US6 - Quick Message Templates (P2)

As a ham radio operator, I want to quickly compose common check-in messages so that I can participate efficiently.

**Acceptance Criteria:**
1. **Given** I click "Checking in from...", **When** prompted for location, I enter "San Francisco", **Then** "Checking in from San Francisco" is inserted into the message input.
2. **Given** I click "73 de [callsign]", **Then** "73 de WB4BOR-9" (my callsign) is inserted into the message input.
3. **Given** I click "Happy APRSThursday!", **Then** the message is inserted ready to send.

### US7 - Thursday Detection Warning (P3)

As a ham radio operator, I want to know when APRSThursday is active so that I participate at the right time.

**Acceptance Criteria:**
1. **Given** it is Thursday 0000-2359 UTC, **When** I view the control panel, **Then** I see "It's APRSThursday!" banner.
2. **Given** it is not Thursday UTC, **When** I view the control panel, **Then** I see a soft warning "APRSThursday runs Thursdays 00:00-23:59 UTC" but can still send messages.

## Functional Requirements

- **FR-001**: System MUST provide a toggle button in the info bar to enable/disable APRSThursday mode
- **FR-002**: System MUST create a distinctly-colored #APRSThursday tab when mode is enabled
- **FR-003**: System MUST display a collapsible control panel at the top of the #APRSThursday tab
- **FR-004**: System MUST format and send ANSRVR commands: `CQ HOTG <msg>`, `K HOTG`, `U HOTG`
- **FR-005**: System MUST format and send APRSPH log-only commands: `HOTG <msg>`
- **FR-006**: System MUST parse incoming ANSRVR HOTG messages in two formats:
  - Traditional: Source=ANSRVR, content=`SENDERCALL: message`
  - Notification: Content starts with `N:HOTG ` or `N:HOTG:`
- **FR-007**: System MUST display HOTG messages with sender callsign as header above message bubble
- **FR-008**: System MUST provide "Fetch location" link next to each sender callsign
- **FR-009**: System MUST display bearing arrow, distance, and cardinal direction after location fetch
- **FR-010**: System MUST track subscription status (subscribed/not, estimated expiration)
- **FR-011**: System MUST provide quick message templates that insert text into input field
- **FR-012**: System MUST detect Thursday (UTC) and show appropriate status banner
- **FR-013**: System MUST persist APRSThursday state in localStorage

## Technical Design

### UI Components

#### 1. Toggle Button (Info Bar)

Location: Info bar, next to raw packet toggle and beacon button

```html
<button type="button" class="btn-aprsthursday-toggle" id="aprsthursday_toggle"
        data-tooltip="Toggle APRSThursday mode" data-tooltip-position="bottom"
        aria-label="Toggle APRSThursday mode" aria-pressed="false">
    <span class="material-symbols-rounded">event</span>
</button>
```

Behavior:
- Toggle between enabled/disabled states
- When enabled: add `.active` class, create #APRSThursday tab
- When disabled: remove tab, clear state
- Persist to localStorage

#### 2. #APRSThursday Tab

Appearance:
- Distinct accent color (e.g., orange/red) background
- Text: "#APRSThursday"
- Cannot be closed via X button while enabled (must toggle off)

Tab ID: `tab-APRSTHURSDAY` (special constant, not a callsign)

#### 3. Collapsible Control Panel

Location: Top of #APRSThursday tab content area

Structure:
```
┌─────────────────────────────────────────────────────────┐
│ [▼] APRSThursday Controls                               │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🗓️ It's APRSThursday! (or warning if not Thursday) │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Status: Not subscribed | Subscribed (expires in ~Xh)    │
│                                                         │
│ Mode: (•) Broadcast  ( ) Log-only                       │
│                                                         │
│ [Join Net] [Silent Subscribe] [Leave Net]               │
│                                                         │
│ Quick Messages:                                         │
│ [Checking in from...] [73 de CALL] [Happy APRSThursday!]│
└─────────────────────────────────────────────────────────┘
```

Default state: Collapsed (to maximize message space)

#### 4. Group Message Display

Each HOTG message in #APRSThursday tab:

```
┌─────────────────────────────────────────────────────────┐
│ KC8OWL                          [Fetch location]        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Happy APRSThursday from Ohio!                       │ │
│ │                                          12:34 UTC  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

After location fetch:
```
│ KC8OWL                     ↗ 523.4 km NE              │
```

(Bearing arrow rotated to actual bearing degrees)

### Message Routing

#### Outgoing Messages

| Action | Destination | Message Format |
|--------|-------------|----------------|
| Join Net (Broadcast) | ANSRVR | `CQ HOTG <message>` |
| Join Net (Log-only) | APRSPH | `HOTG <message>` |
| Silent Subscribe | ANSRVR | `K HOTG` |
| Unsubscribe | ANSRVR | `U HOTG` |
| Send from tab (Broadcast) | ANSRVR | `CQ HOTG <message>` |
| Send from tab (Log-only) | APRSPH | `HOTG <message>` |

#### Incoming Message Parsing

Detect HOTG messages by checking:

1. **Traditional format**: `packet.from_call == "ANSRVR"` AND content contains `:`
   - Extract sender: everything before first `:`
   - Extract message: everything after first `:` (trimmed)

2. **Notification format**: Content starts with `N:HOTG ` or `N:HOTG:`
   - Sender: `packet.from_call` (original sender preserved)
   - Extract message: content after `N:HOTG ` prefix (trimmed)

### Backend Implementation

#### New Socket Events

**`aprsthursday_send`** (client → server)
```javascript
{
    "action": "join" | "silent_subscribe" | "unsubscribe" | "message",
    "message": "optional message text",
    "mode": "broadcast" | "logonly"
}
```

**`aprsthursday_message`** (server → client)
```javascript
{
    "sender": "KC8OWL",
    "message": "Happy APRSThursday!",
    "timestamp": "2026-03-12T12:34:56Z",
    "raw_packet": "ANSRVR>APRS::WB4BOR-9 :KC8OWL: Happy APRSThursday!"
}
```

**`aprsthursday_confirmation`** (server → client)
```javascript
{
    "type": "subscribed" | "unsubscribed" | "logged",
    "message": "Confirmation message from ANSRVR/APRSPH"
}
```

#### Backend Changes (webchat.py)

1. Add `on_aprsthursday_send()` handler in `SendMessageNamespace`
2. Modify `process_our_message_packet()` to detect HOTG messages
3. Add `is_hotg_message()` and `parse_hotg_message()` helper functions
4. Emit `aprsthursday_message` for parsed HOTG messages
5. Detect ANSRVR/APRSPH confirmations and emit `aprsthursday_confirmation`

### Frontend Implementation

#### New File: `static/js/aprs-thursday.js`

Responsibilities:
- Toggle state management
- Control panel initialization and event handlers
- Quick template insertion
- Thursday detection (UTC)
- Subscription state tracking
- localStorage persistence

Key functions:
```javascript
function init_aprs_thursday()
function toggle_aprs_thursday()
function is_aprs_thursday_utc()
function update_thursday_banner()
function update_subscription_status()
function send_aprsthursday_action(action, message, mode)
function insert_quick_template(template)
function handle_aprsthursday_message(data)
function handle_aprsthursday_confirmation(data)
```

#### Modifications to `send-message.js`

1. Add socket handlers for `aprsthursday_message` and `aprsthursday_confirmation`
2. Add `add_aprsthursday_message()` function for group chat display
3. Modify `create_bubble_row()` to handle callsign headers for group messages
4. Add location fetch click handler for callsign headers
5. Cache fetched locations per callsign

#### Modifications to `index.html`

1. Add toggle button in info bar `.radio-indicator` div
2. Add control panel HTML structure (hidden by default)
3. Add script tag for `aprs-thursday.js`

#### Modifications to `chat.css`

1. Toggle button styles (`.btn-aprsthursday-toggle`, `.active` state)
2. #APRSThursday tab accent color
3. Control panel styles (`.aprsthursday-panel`, collapsed/expanded states)
4. Callsign header styles (`.bubble-sender-header`)
5. Location display styles (`.sender-location`, bearing arrow rotation)
6. Thursday banner styles (`.thursday-banner`, warning variant)

### State Management

#### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `aprsd-webchat-aprsthursday-enabled` | boolean | Toggle state |
| `aprsd-webchat-aprsthursday-subscribed` | boolean | Subscription status |
| `aprsd-webchat-aprsthursday-mode` | string | "broadcast" or "logonly" |
| `aprsd-webchat-aprsthursday-subscribed-at` | string | ISO timestamp |
| `aprsd-webchat-aprsthursday-expires-at` | string | ISO timestamp |

#### Session State (JavaScript variables)

```javascript
var aprsThursdayEnabled = false;
var aprsThursdaySubscribed = false;
var aprsThursdayMode = 'broadcast';
var aprsThursdaySubscribedAt = null;
var aprsThursdayExpiresAt = null;
var aprsThursdayLocationCache = {}; // callsign -> location data
```

### Quick Message Templates

| Template | Prompt | Result |
|----------|--------|--------|
| "Checking in from..." | Prompt for location | "Checking in from {location}" |
| "73 de [callsign]" | None (auto-fill) | "73 de WB4BOR-9" |
| "Happy APRSThursday!" | None | "Happy APRSThursday!" |

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `static/js/aprs-thursday.js` | Create | Toggle, control panel, templates, state |
| `static/js/send-message.js` | Modify | Socket handlers, group message display |
| `static/css/chat.css` | Modify | APRSThursday-specific styles |
| `templates/index.html` | Modify | Toggle button, control panel HTML |
| `cmds/webchat.py` | Modify | Socket handlers, HOTG parsing |

## Edge Cases

1. **ANSRVR unreachable**: Show error toast, allow retry
2. **Malformed HOTG messages**: Log warning, skip display
3. **Duplicate messages**: Deduplicate by message ID (existing pattern)
4. **Location fetch timeout**: Show "Retry" link instead of location
5. **No GPS fix for bearing**: Show coordinates instead of bearing/distance
6. **Page refresh while subscribed**: Restore subscription state from localStorage, but note actual subscription may have expired server-side

## Success Criteria

- **SC-001**: Users can enable APRSThursday with 1 click from any tab
- **SC-002**: HOTG messages appear in #APRSThursday tab within 2 seconds of receipt
- **SC-003**: 100% of ANSRVR HOTG messages (both formats) are correctly parsed
- **SC-004**: Location fetch shows bearing/distance within 5 seconds
- **SC-005**: State persists across page refreshes via localStorage

## Dependencies

- Existing `get_callsign_location` socket event and `populate_callsign_location()` function
- Existing `haversine` library for distance calculation
- Existing `aprsd_utils.calculate_initial_compass_bearing()` for bearing
- Existing raw packet toggle pattern for UI reference

## Out of Scope

- Push notifications (web notifications API) - consider for future
- Automatic location fetch on message receive - user requested manual
- Server-side subscription state persistence - using localStorage only
- APRS-IS connection status checks before sending - assume connected
