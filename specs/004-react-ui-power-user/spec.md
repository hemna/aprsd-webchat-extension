# 004: React UI — Power User (Discord-Inspired Adaptive Layout)

**Branch:** `004-react-ui-power-user`
**Status:** Design approved
**Date:** 2026-03-18

## Summary

Full frontend migration from jQuery/Bootstrap to React 19 + shadcn/ui with a
Discord-inspired power-user layout that adapts gracefully to mobile screens.
The Python/Flask/SocketIO backend stays unchanged (it must remain a valid APRSD
extension). Both the existing jQuery UI and the new React UI coexist — Flask
serves them at separate routes so they can be compared side-by-side.

## Goals

- Replace 5,200 lines of untyped jQuery JS with typed React/TypeScript
  components
- Eliminate duplicated CSS variables, duplicated utility functions, and global
  variable coupling
- Deliver a chat-native, power-user interface with sidebar channels, command
  palette, per-message raw packets, and a persistent status bar
- Work well on mobile devices (375px+) via adaptive layout patterns
- Zero backend Socket.IO protocol changes — the React frontend speaks the exact
  same events

## Non-Goals

- Rewriting the Python backend or changing the APRSD extension architecture
- Removing the existing jQuery UI (it stays on `/` as the default)
- Progressive Web App (PWA) features, push notifications, or service workers
- Server-side rendering (SSR) — this is a Vite SPA served by Flask

---

## 1. Architecture & Project Structure

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Build tool | Vite | 6.x |
| Language | TypeScript | 5.x |
| CSS | Tailwind CSS | 4.x |
| Components | shadcn/ui (Radix primitives) | latest |
| State | Zustand | 5.x |
| Animation | Framer Motion | 12.x |
| Socket | socket.io-client | 4.x |
| Testing | Vitest + Playwright | latest |

### Directory Layout

```
aprsd_webchat_extension/
├── web/
│   └── chat/
│       ├── templates/index.html          # Existing jQuery UI (untouched)
│       ├── static/                       # Existing static assets (untouched)
│       └── react/                        # NEW: React frontend source
│           ├── package.json
│           ├── vite.config.ts
│           ├── tsconfig.json
│           ├── tailwind.config.ts
│           ├── index.html                # Vite entry point (minimal)
│           ├── src/
│           │   ├── main.tsx              # React mount + Socket.IO init
│           │   ├── App.tsx               # Root layout
│           │   ├── components/
│           │   │   ├── ui/               # shadcn/ui (auto-generated)
│           │   │   ├── layout/           # AppShell, Sidebar, Header, StatusBar
│           │   │   ├── chat/             # MessageBubble, ChatView, MessageInput
│           │   │   ├── channels/         # ChannelList, ChannelItem, ChannelHeader
│           │   │   ├── gps/              # GPSSheet, BeaconControls, SymbolPicker
│           │   │   ├── aprs-thursday/    # APRSThursdayChannel, ControlPanel
│           │   │   └── command-palette/  # CommandPalette, CommandItem
│           │   ├── hooks/                # useSocket, useMessages, useGPS, useTheme
│           │   ├── stores/               # Zustand stores
│           │   ├── lib/                  # Utilities (escapeHtml, validation)
│           │   └── types/                # TypeScript type definitions
│           └── dist/                     # Built output (gitignored)
```

### Build Integration

**Development:**
- `npm run dev` starts Vite dev server on port 5173
- Vite proxies `/sendmsg` (Socket.IO namespace), `/api/*`, `/stats`,
  `/send-message-status`, and `/location/*` to Flask on port 8001
- Hot module replacement provides instant feedback on code changes

**Production:**
- `npm run build` outputs optimized bundles to `dist/`
- Flask serves `dist/index.html` for the `/v2/` route and `dist/assets/*` for
  JS/CSS bundles
- No Vite or Node.js needed at runtime

### Backend Changes (Minimal)

Two new Flask routes:

```python
# Serve React UI
@app.route("/v2/")
@auth.login_required
def react_ui():
    return send_from_directory("web/chat/react/dist", "index.html")

# JSON config endpoint (replaces inline <script> globals)
@app.route("/api/config")
@auth.login_required
def get_config():
    stats = _stats()
    transport, aprs_connection = _get_transport(stats["stats"])
    return jsonify({
        "callsign": CONF.callsign,
        "transport": transport,
        "aprs_connection": aprs_connection,
        "default_path": _get_default_path(),
        "beaconing_enabled": CONF.enable_beacon,
        "aprsthursday_enabled":
            CONF.aprsd_webchat_extension.enable_aprsthursday,
        "is_digipi": CONF.is_digipi,
        "latitude": CONF.aprsd_webchat_extension.latitude,
        "longitude": CONF.aprsd_webchat_extension.longitude,
        "version": aprsd_webchat_extension.__version__,
        "aprsd_version": aprsd.__version__,
        "initial_stats": stats,
    })
```

Zero changes to existing routes (`/`, `/stats`, `/send-message-status`,
`/location/<callsign>`). Zero changes to Socket.IO event handlers.

---

## 2. Component Hierarchy & Layout

### Desktop Layout (≥768px)

```
┌──────────────────────────────────────────────────────────┐
│ StatusBar (connection, beacon time, GPS lock, APRS-IS)   │
├────────────┬─────────────────────────────────────────────┤
│            │ ChannelHeader (callsign, path, raw toggle)  │
│  Sidebar   ├─────────────────────────────────────────────┤
│            │                                             │
│ ┌────────┐ │  ChatView (scrollable message area)         │
│ │Search  │ │                                             │
│ ├────────┤ │  ┌─────────────────────────────────┐       │
│ │DMs     │ │  │ MessageBubble (grouped by time)  │       │
│ │ KG7QIN │ │  │  - callsign header               │       │
│ │ W6ABC  │ │  │  - message text                  │       │
│ │ N7XYZ  │ │  │  - timestamp + ACK status        │       │
│ ├────────┤ │  │  - raw packet (collapsible)      │       │
│ │Groups  │ │  └─────────────────────────────────┘       │
│ │ #APRS  │ │                                             │
│ │ Thursday│ ├─────────────────────────────────────────────┤
│ ├────────┤ │ MessageInput                                │
│ │System  │ │ ┌───────────────────────┬──────┬──────────┐│
│ │ Beacon │ │ │ Type a message...     │ path │ (send)   ││
│ │ Status │ │ └───────────────────────┴──────┴──────────┘│
│ └────────┘ │                                             │
├────────────┴─────────────────────────────────────────────┤
│ [Ctrl+K Command Palette]  (floating, triggered by key)   │
└──────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

Two views in a navigation stack with slide transitions:

**Channel List View** (root):
```
┌─────────────────────────┐
│ StatusBar (compact)     │
│ ☰  APRSD Webchat  ⌘ ⚙  │
├─────────────────────────┤
│ 🔍 Search channels...  │
├─────────────────────────┤
│ Direct Messages         │
│  KG7QIN        2m ago  │
│  Last: heard you on... │
│                         │
│  W6ABC         15m ago │
│  Last: QSL 73!         │
│                         │
│ Groups                  │
│  #APRSThursday  Live 🟢│
│                         │
│ System                  │
│  🛰 Beacon    📡 Status│
├─────────────────────────┤
│ [GPS] [Symbol] [Theme]  │
└─────────────────────────┘
```

**Conversation View** (tap a channel):
```
┌─────────────────────────┐
│ ← Back    KG7QIN   ···  │
├─────────────────────────┤
│                         │
│  ChatView               │
│  (message bubbles)      │
│                         │
├─────────────────────────┤
│ Type a message...  ▶    │
│ WIDE1-1 ▾              │
└─────────────────────────┘
```

### Component Tree

```
<App>
  <ThemeProvider>
    <SocketProvider>
      <AppShell>
        <StatusBar />
        <Sidebar>
          <SearchInput />
          <ChannelList>
            <ChannelGroup label="Direct Messages">
              <ChannelItem />
            </ChannelGroup>
            <ChannelGroup label="Groups">
              <ChannelItem />        # APRSThursday
            </ChannelGroup>
            <ChannelGroup label="System">
              <ChannelItem />        # Beacon, Status
            </ChannelGroup>
          </ChannelList>
          <SidebarFooter>
            <QuickActions />         # GPS, Symbol, Theme, Settings
          </SidebarFooter>
        </Sidebar>
        <MainPanel>
          <ChannelHeader>
            <BackButton />           # Mobile only
            <CallsignInfo />
            <ChannelActions />       # Raw toggle, info, mute
          </ChannelHeader>
          <ChatView>
            <DateSeparator />
            <MessageGroup>
              <MessageBubble>
                <MessageText />
                <MessageMeta />      # Time + ACK (✓ ✓✓)
                <RawPacket />        # Collapsible TNC2
              </MessageBubble>
            </MessageGroup>
          </ChatView>
          <MessageInput>
            <TextArea />
            <PathSelector />
            <SendButton />
          </MessageInput>
        </MainPanel>
        <CommandPalette />           # Ctrl+K / bottom sheet
        <GPSSheet />
        <SymbolPickerSheet />
        <APRSThursdayPanel />        # Inline in channel
      </AppShell>
    </SocketProvider>
  </ThemeProvider>
</App>
```

### Key Design Decisions

- **Channels replace tabs:** Sidebar channel list grouped into DMs, Groups,
  System. Scales better than horizontal tab strips.
- **Raw packets per-message:** Each bubble has a collapsible raw section.
  Channel header has a "show all raw" toggle.
- **ACK as checkmarks:** ✓ (sent to APRS-IS), ✓✓ (ACK received).
- **APRSThursday is a channel:** Lives in Groups section with control panel in
  channel header. Not a separate modal/tab system.
- **Modals become sheets:** GPS and Symbol Picker use shadcn Sheet — bottom
  sheet on mobile, side panel on desktop.

---

## 3. State Management & Socket.IO

### Zustand Stores

Five typed stores replace 15+ global variables:

```typescript
// stores/messages.ts
interface MessagesStore {
  channels: Map<string, Channel>
  messages: Map<string, Message[]>
  selectedChannel: string | null
  unreadCounts: Map<string, number>
  addMessage(msg: Message): void
  ackMessage(msgNo: string): void
  selectChannel(callsign: string): void
  setPath(callsign: string, path: string): void
}

// stores/connection.ts
interface ConnectionStore {
  connected: boolean
  reconnecting: boolean
  transport: string
  aprsConnection: string
  callsign: string
  setConnected(value: boolean): void
  setReconnecting(value: boolean): void
  hydrate(config: ConfigResponse): void
  // Derived via Zustand selector, not stored:
  // connectionStatus: () => connected ? "connected" : reconnecting ? "reconnecting" : "disconnected"
}
// Usage: const status = useConnection(s => s.connected ? "connected" : s.reconnecting ? "reconnecting" : "disconnected")

// stores/gps.ts
interface GPSStore {
  fix: boolean
  latitude: number
  longitude: number
  altitude: number
  speed: number
  course: number
  beaconType: 0 | 1 | 2 | 3
  beaconInterval: number
  lastBeaconTime: Date | null
  symbol: { table: string; symbol: string; description: string }
  locations: Map<string, CallsignLocation>
}

// stores/ui.ts
interface UIStore {
  theme: "light" | "dark"
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  showRawPackets: boolean
  tourCompleted: boolean
  activeSheet: "gps" | "symbol" | null
}

// stores/aprs-thursday.ts
interface APRSThursdayStore {
  enabled: boolean
  subscribed: boolean
  mode: "broadcast" | "logonly"
  subscribedAt: Date | null
  expiresAt: Date | null
  messages: APRSThursdayMessage[]        // in-memory, not persisted
  locationCache: Map<string, CallsignLocation>
  addMessage(msg: APRSThursdayMessage): void
  handleConfirmation(data: { type: string; message: string }): void
  subscribe(mode: "broadcast" | "logonly"): void
  unsubscribe(): void
  checkExpiry(): void                    // called on 60s interval
}
```

### localStorage Persistence

Zustand `persist` middleware consolidates 14 separate localStorage keys into 5:

| Store | localStorage Key |
|---|---|
| MessagesStore | `aprsd-webchat-messages` |
| GPSStore | `aprsd-webchat-gps` |
| UIStore | `aprsd-webchat-ui` |
| APRSThursdayStore | `aprsd-webchat-aprsthursday` |

### Socket.IO Integration

A `SocketProvider` context manages the connection. A `useSocket` hook provides
typed emit helpers and wires all 11 server→client events to Zustand stores:

**Server → Client events (unchanged):**

| Event | Store Action |
|---|---|
| `connected` | connectionStore.setConnected(true) |
| `new` | messagesStore.addMessage(parseIncoming(data)) |
| `sent` | messagesStore.addMessage(parseSent(data)) |
| `ack` | messagesStore.ackMessage(data.msgNo) |
| `rx_pkt` | uiStore.blinkRadio("rx") |
| `tx_pkt` | uiStore.blinkRadio("tx") |
| `callsign_location` | gpsStore.updateLocation(data) |
| `gps_stats` | gpsStore.updateFix(data) |
| `gps_beacon_sent` | gpsStore.setLastBeacon(data) |
| `gps_settings` | gpsStore.updateSettings(data) |
| `aprsthursday_message` | aprsThursdayStore.addMessage(data) |
| `aprsthursday_confirmation` | aprsThursdayStore.handleConfirmation(data) |

**Client → Server events (unchanged):**

| Event | Data Shape | Trigger |
|---|---|---|
| `send` | `{to, message, path}` | MessageInput submit |
| `gps` | `{latitude, longitude, path, symbol}` | GPSSheet beacon button |
| `get_callsign_location` | `{callsign}` | Location fetch link |
| `aprsthursday_send` | `{action, message, mode, path}` | APRSThursday controls |
| `set_beaconing_setting` | `{beacon_type, beacon_interval, ...}` | GPSSheet save |

### Initial Config Hydration

React fetches `/api/config` once on mount to hydrate stores, replacing inline
`<script>` blocks that currently inject Jinja2 variables as JS globals.

---

## 4. Mobile Adaptation Patterns

### Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Single-panel, stacked navigation |
| Desktop | ≥ 768px | Sidebar + main panel |

### Component Adaptation Table

| Component | Desktop (≥768px) | Mobile (<768px) |
|---|---|---|
| **Sidebar** | Persistent, 280px, collapsible to 64px icons | Hidden drawer from left. ☰ button or swipe-right to open. Full-screen channel list when no chat selected |
| **Channel → Chat** | Click loads chat in main panel beside sidebar | Tap slides to full-screen chat. ← back arrow returns to list |
| **Command Palette** | `Ctrl+K` centered overlay (shadcn CommandDialog) | Tap ⌘ icon opens bottom sheet. Scroll + tap. 48px touch targets |
| **Raw Packets** | Hover popover per message. Collapsible inline with "Show All" toggle | Long-press context menu per message. Same collapsible inline. Monospace 12px with horizontal scroll |
| **Message Input** | Single-line expanding. Inline path dropdown. Enter to send | Single-line expanding. Path pill above input or long-press send. Send button appears only with text |
| **GPS/Beacon** | Sheet slides from right, 400px | Sheet slides from bottom, 85vh, drag to dismiss |
| **Symbol Picker** | Inline grid in GPS sheet | Nested bottom sheet or full-screen overlay |
| **Status Bar** | Full bar: connection, beacon time, GPS, APRS-IS | Icon-only indicators (colored dots). Tap to expand dropdown |
| **Keyboard shortcuts** | Full: Ctrl+K, Ctrl+/, Escape, arrow keys | None (touch-only) |
| **Enter key** | Sends message (Shift+Enter for newline) | Inserts newline (send button only) |

### Touch Targets & Safe Areas

- Minimum tap target: 44px × 44px (Apple HIG)
- Minimum gap between targets: 8px
- Input font size: 16px minimum (prevents iOS auto-zoom)
- Body text: 14px minimum
- Bottom safe area: `env(safe-area-inset-bottom)` for iPhone X+ home indicator

### Animation Budget

- **Always animate:** View transitions (slide), message appearance (fade +
  slide up), sheet open/close
- **Reduce on mobile:** Simple ease curves instead of spring physics, skip
  radio icon blink (color change only)
- **`prefers-reduced-motion`:** Disables all non-essential animations

### Navigation Stack

Mobile uses a stacked navigation model with Framer Motion `AnimatePresence`:

```
Channel List → (tap) → Conversation → (tap header) → Detail View
     ↑                      ↑                             │
     └── swipe right ───────┘── swipe right ──────────────┘
```

---

## 5. Migration & Branching Strategy

### Branch Layout

```
master                          ← Current jQuery UI (unchanged)
  │
  ├── 004-react-ui-power-user   ← This spec: Discord-inspired adaptive
  │
  └── 005-react-ui-signal       ← Approach 1: Signal-style minimal (future)
```

### Coexistence

Both UIs served simultaneously:

| Route | UI |
|---|---|
| `/` | Existing jQuery/Bootstrap (default) |
| `/v2/` | React UI |

A future config option (`default_ui`) can flip which is default.

### Implementation Phases

**Phase 1: Scaffold**
- Vite + React + TypeScript + Tailwind + shadcn/ui project in `web/chat/react/`
- Flask route serving built assets at `/v2/`
- Vite proxy config for dev
- `AppShell` with empty sidebar + main panel
- ThemeProvider (dark/light, system preference)

**Phase 2: Socket.IO + Stores**
- `SocketProvider` context connecting to `/sendmsg`
- Four Zustand stores with localStorage persist
- `/api/config` Flask endpoint
- All 11 server→client events wired
- All 5 client→server emit helpers typed

**Phase 3: Channel List + Chat (Core Messaging)**
- `Sidebar` with grouped `ChannelList`
- `ChatView` with `MessageBubble` components
- `MessageInput` with path selector and send
- Mobile: drawer sidebar, stacked navigation, swipe-back
- Deduplication, ACK checkmarks, date separators, auto-scroll, unread badges

**Phase 4: Power User Features**
- `CommandPalette` (desktop overlay / mobile bottom sheet)
- Per-message raw packet collapsible
- Channel header actions
- `StatusBar` (full / compact)
- Desktop keyboard shortcuts

**Phase 5: GPS + Beaconing**
- `GPSSheet` (right sheet / bottom sheet)
- Beacon mode controls, interval settings
- `SymbolPickerSheet` with sprite grid
- GPS indicators, beacon time tracking, quick beacon

**Phase 6: APRSThursday**
- Channel in Groups section
- Control panel in channel header
- HOTG message rendering with location fetch
- Subscription state and expiry

**Phase 7: Polish**
- Onboarding tour (shadcn Popover-based)
- Framer Motion animations
- `prefers-reduced-motion` support
- Reconnection, offline, empty states
- Virtualized message list if needed (TanStack Virtual)

### Testing

- **Unit:** Vitest for components and stores
- **E2E:** Playwright for send/receive/channel-switch flows
- **Existing:** `uv run pytest tests` unchanged (backend untouched)
- **CI:** Add `npm run build` + `npm test` alongside tox/CodeQL

---

## Socket.IO Event Reference

### Server → Client (namespace `/sendmsg`)

| Event | Data Shape |
|---|---|
| `connected` | `{data: string}` |
| `new` | `{from_call, to_call, message_text, msgNo, timestamp, raw, path, _type}` |
| `sent` | `{msgNo, from_call, to_call, message_text, timestamp, last_update, status, ack, path, raw}` |
| `ack` | `{msgNo, from_call, to_call, message_text, timestamp, last_update, status, ack: true, path, raw}` |
| `rx_pkt` | `packet.__dict__` |
| `tx_pkt` | `packet.__dict__` |
| `callsign_location` | `{callsign, lat, lon, altitude, course, compass_bearing, speed, lasttime, timeago, distance}` |
| `gps_stats` | `{fix, latitude, longitude, altitude, speed, track, time}` |
| `gps_beacon_sent` | `{message: "beacon sent", latitude, longitude, symbol}` |
| `gps_settings` | `{message: "gps_settings", settings: {beacon_type, beacon_interval, smart_beacon_distance_threshold, smart_beacon_time_window}}` |
| `aprsthursday_message` | `{sender, message, timestamp, raw_packet}` |
| `aprsthursday_confirmation` | `{type: "subscribed"|"unsubscribed"|"logged", message}` |

### Client → Server (namespace `/sendmsg`)

| Event | Data Shape |
|---|---|
| `send` | `{to: string, message: string, path: string}` |
| `gps` | `{latitude: float, longitude: float, path: string, symbol: string}` |
| `get_callsign_location` | `{callsign: string}` |
| `aprsthursday_send` | `{action: string, message: string, mode: string, path: string}` |
| `set_beaconing_setting` | `{beacon_type: int, beacon_interval: int, smart_beacon_distance_threshold: int, smart_beacon_time_window: int}` |

### Flask Routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Existing jQuery UI (auth required) |
| `/v2/` | GET | React UI (auth required) — **new** |
| `/api/config` | GET | JSON config for React hydration (auth required) — **new** |
| `/stats` | GET | Periodic stats polling |
| `/send-message-status` | GET | Sent message status (auth required) |
| `/location/<callsign>` | POST | Trigger async location fetch |

---

## localStorage Migration

| Current Keys (14) | New Key | Store |
|---|---|---|
| `callsign_list`, `message_list`, `callsign_location` | `aprsd-webchat-messages` | MessagesStore |
| `aprsd-webchat-beacon-symbol`, `aprsd-webchat-beacon-sent`, `aprsd-webchat-last-beacon-time` | `aprsd-webchat-gps` | GPSStore |
| `aprsd-webchat-theme`, `aprsd-webchat-tour-completed`, `aprsd-webchat-gps-seen` | `aprsd-webchat-ui` | UIStore |
| `aprsd-webchat-aprsthursday-enabled`, `aprsd-webchat-aprsthursday-subscribed`, `aprsd-webchat-aprsthursday-mode`, `aprsd-webchat-aprsthursday-subscribed-at`, `aprsd-webchat-aprsthursday-expires-at` | `aprsd-webchat-aprsthursday` | APRSThursdayStore |

The React UI uses new key names. The jQuery UI's localStorage keys are left
untouched so both UIs can run independently without interfering.
