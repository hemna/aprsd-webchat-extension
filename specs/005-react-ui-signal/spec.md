# 005: React UI — Signal-Style Minimal

**Branch:** `005-react-ui-signal`
**Status:** Documented for future implementation
**Date:** 2026-03-18

## Summary

An alternative React frontend for APRSD Webchat with a Signal/iMessage-inspired
minimal design. Shares the same tech stack and backend integration as
004-react-ui-power-user but takes a stripped-down approach: fewer panels, no
command palette, simpler mobile experience. Built on a separate branch so both
approaches can be compared against master.

This spec is intentionally lighter than 004 because the architecture (Section 1)
and state management (Section 3) are identical. Only the layout, components, and
mobile patterns differ.

## Relationship to 004

| Aspect | 004 (Power User) | 005 (Signal Minimal) |
|---|---|---|
| Architecture | React + Vite + TS + shadcn | **Same** |
| State management | Zustand (5 stores) | **Same** |
| Socket.IO integration | Same events/hooks | **Same** |
| Backend changes | `/v2/` + `/api/config` | **Same** |
| Layout | Sidebar + main + optional detail | Single column + conversation list |
| Command palette | Yes (Ctrl+K / bottom sheet) | No |
| Raw packets | Per-message collapsible | Global toggle only |
| Status bar | Persistent, compact on mobile | Minimal header badge |
| Complexity | ~60-70 components | ~40-50 components |

**Reusable from 004:** All stores, hooks, types, utilities, Socket.IO provider,
theme provider, and `lib/` code. The difference is purely in `components/`.

---

## 1. Architecture

Identical to 004 spec Section 1. Same directory structure, same Vite config,
same Flask routes. The only difference is the components inside `src/components/`.

---

## 2. Layout & Components

### Design Philosophy

Strip everything down to the conversation. Chrome disappears; messages are front
and center. The UI should feel like opening iMessage or Signal — you see your
conversations, tap one, and you're chatting.

### Desktop Layout (≥768px)

```
┌──────────────────────────────────────────────────────────┐
│  APRSD Webchat    🛰 ● connected    [theme] [gps] [help]│
├───────────────┬──────────────────────────────────────────┤
│               │                                          │
│ Conversations │  ┌────────────────────────────────────┐  │
│               │  │ KG7QIN                    2m ago   │  │
│ ┌───────────┐ │  ├────────────────────────────────────┤  │
│ │ 🔍 Search │ │  │                                    │  │
│ ├───────────┤ │  │ Hey, heard you on 146.52           │  │
│ │ KG7QIN  2 │ │  │ yesterday. Nice signal!            │  │
│ │ W6ABC     │ │  │                        10:23 AM ✓✓ │  │
│ │ #APRSThu  │ │  │                                    │  │
│ │ N7XYZ     │ │  │              QSL! 73 de WB6YRU     │  │
│ │           │ │  │              10:24 AM ✓             │  │
│ └───────────┘ │  │                                    │  │
│               │  ├────────────────────────────────────┤  │
│               │  │ Type a message...    [path] [send] │  │
│               │  └────────────────────────────────────┘  │
├───────────────┴──────────────────────────────────────────┤
│  v2.0.0 | APRSD 3.4.2                                   │
└──────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

Same stacked navigation as 004 (conversation list → tap → full-screen chat)
but simpler:

**Conversation List:**
```
┌─────────────────────────┐
│ APRSD Webchat    ● [⚙]  │
├─────────────────────────┤
│ 🔍 Search...            │
├─────────────────────────┤
│ KG7QIN          2m ago  │
│ heard you on 146.52...  │
├─────────────────────────┤
│ #APRSThursday   Live 🟢│
│ W6ABC: QSL 73!          │
├─────────────────────────┤
│ W6ABC           15m ago │
│ QSL 73!                 │
└─────────────────────────┘
```

**Conversation:**
```
┌─────────────────────────┐
│ ← KG7QIN         [raw]  │
├─────────────────────────┤
│                         │
│ Hey, heard you on       │
│ 146.52 yesterday.       │
│              10:23 AM ✓✓│
│                         │
│     QSL! 73 de WB6YRU  │
│     10:24 AM ✓          │
│                         │
├─────────────────────────┤
│ Type a message...    ▶  │
└─────────────────────────┘
```

### Component Tree

```
<App>
  <ThemeProvider>
    <SocketProvider>
      <AppShell>
        <Header>                       # Minimal: title + status dot + settings
          <ConnectionBadge />
          <HeaderActions />            # Theme, GPS, Help
        </Header>
        <ConversationList>             # Left panel / root mobile view
          <SearchInput />
          <ConversationItem />         # Callsign + preview + time + badge
          <ConversationItem />         # APRSThursday (accent color)
        </ConversationList>
        <ChatPanel>                    # Right panel / pushed mobile view
          <ChatHeader>
            <BackButton />             # Mobile only
            <CallsignDisplay />
            <RawToggle />              # Global toggle (not per-message)
          </ChatHeader>
          <ChatView>
            <DateSeparator />
            <MessageBubble>
              <MessageText />
              <MessageMeta />          # Time + ACK checkmarks
            </MessageBubble>
          </ChatView>
          <MessageInput>
            <TextArea />
            <PathSelector />
            <SendButton />
          </MessageInput>
        </ChatPanel>
        <GPSSheet />                   # Bottom/side sheet
        <SymbolPickerSheet />
      </AppShell>
    </SocketProvider>
  </ThemeProvider>
</App>
```

### Differences from 004

| Feature | 004 (Power User) | 005 (Signal) |
|---|---|---|
| Sidebar categories | DMs, Groups, System with headers | Flat conversation list sorted by recency |
| Command palette | Full Ctrl+K with search, actions, shortcuts | None — settings via header gear icon |
| Raw packets | Per-message collapsible + hover popover | Single global toggle in chat header |
| Status bar | Persistent bar with connection, beacon, GPS | Small badge in header (colored dot) |
| Channel header | Actions menu: raw, info, mute | Minimal: back, callsign, raw toggle |
| APRSThursday | Channel with inline control panel | Conversation item with accent color; controls in a settings sheet |
| Keyboard shortcuts | Extensive (Ctrl+K, Ctrl+/, arrows) | None (optional Escape to go back) |
| Estimated components | 60-70 | 40-50 |
| Estimated TypeScript | 5,000-6,000 lines | 3,000-4,000 lines |

---

## 3. State Management

Identical to 004 spec Section 3. Same four Zustand stores, same Socket.IO
hook, same localStorage persistence, same `/api/config` hydration.

The `UIStore` is slightly simpler (no `commandPaletteOpen`, no `sidebarOpen`
needed since the sidebar is a simple conversation list).

---

## 4. Mobile Patterns

### Simpler Than 004

Because there's no command palette, no three-panel layout, and no status bar to
collapse, the mobile adaptation is more straightforward:

- **Conversation list** is the default view (full screen)
- **Tap** slides to conversation (full screen, horizontal slide animation)
- **← back** or **swipe right** returns to list
- **GPS/Symbol** open as bottom sheets (same as 004)
- **Settings** (theme, beaconing, APRSThursday) in a dedicated settings sheet
  from the gear icon
- **Raw packets** toggled by a button in the chat header — shows/hides raw text
  below all messages (same as current jQuery implementation)

### Touch Targets

Same minimums as 004: 44px tap targets, 8px gaps, 16px input font, safe area
insets.

### Animations

Lighter than 004:
- View transitions: horizontal slide (CSS transitions, not Framer Motion spring)
- Message appearance: simple fade-in (CSS `@keyframes`)
- Sheet open/close: CSS transition
- No radio icon blink animation — color change only
- `prefers-reduced-motion` respected

---

## 5. Implementation Notes

### Building This After 004

Since 004 is built first, branch `005-react-ui-signal` can:

1. Fork from `004-react-ui-power-user` after Phase 2 (stores + Socket.IO are
   done)
2. Replace `src/components/` with the simpler component set
3. Keep all of `src/hooks/`, `src/stores/`, `src/lib/`, `src/types/`
4. Remove Framer Motion dependency (CSS transitions only)
5. Remove command palette components

Alternatively, fork from the same base and share stores via a common package
or copy.

### Estimated Effort

With stores and hooks already built in 004, the component work for 005 is
roughly 60% of 004's Phase 3-7 effort. The simpler component set and fewer
mobile adaptations mean less code to write and test.

---

## When to Choose 005 Over 004

- Users who primarily use mobile and want the simplest possible interface
- Deployments where the audience is non-technical ham radio operators who
  want "just chat"
- Situations where bundle size matters (no Framer Motion = ~30KB less)
- If 004's power-user features prove to be rarely used in practice
