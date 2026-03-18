# Feature Spec: Raw APRS Packet View Toggle

**Feature**: 002-raw-aprs-toggle
**Date**: 2026-03-06

## Problem Statement

Users who want to debug APRS messaging or see the full raw packet format currently have to hover over each individual message bubble to see the raw packet in a popover. There is no way to see all messages as raw APRS packets at once, which makes debugging conversations difficult.

## Solution

Add an info icon toggle button next to the Quick Beacon button in the info bar that switches between the normal chat bubble view and a raw APRS packet view. When toggled, message bubbles display the raw TNC2-format APRS packet string instead of the parsed message content. This matches the UX pattern used by the iOS and Android APRS Chat apps.

## User Stories

### US1: Toggle Raw Packet View (P1 - MVP)

**As** an APRS operator,
**I want** a toggle button in the info bar to switch between normal and raw packet display,
**So that** I can quickly see the full APRS packet format for all messages without hovering over each one individually.

**Acceptance Criteria:**
- An info icon (i) button appears next to the Quick Beacon button in the info bar
- Tapping the button toggles between normal message view and raw packet view
- In raw packet view, message bubbles show the raw APRS packet string in monospace font
- The icon visually indicates which mode is active (filled vs outline icon)
- If a message has no raw packet data, display "(raw packet not available)" in raw mode
- Toggle state is local to the session (not persisted across page reloads)
- The toggle does not affect message input or sending behavior
- Raw packet text should be styled with appropriate contrast for both light and dark themes

## Non-Functional Requirements

- Toggle must be instantaneous (no loading state needed - data is already in memory)
- Raw packet text must be displayed in monospace font for readability
- The icon button must match the existing info bar button styling
- Toggle state should be remembered during the session (JavaScript variable)
- Button must be accessible with keyboard navigation
- Button must have appropriate tooltip/title for accessibility

## Out of Scope

- Persisting the toggle state across page reloads/sessions
- Filtering or searching raw packets
- Copying raw packets to clipboard (already available via popover hover)
- Displaying non-message APRS packets (position reports, etc.)
- Individual message raw toggle (already exists via hover popover)

## Technical Notes

- Raw packet data is already available in `msg['raw']` in the message objects
- Currently displayed in popover on hover (see `create_message_html()` in `send-message.js`)
- Icon should use existing Material Symbols Rounded font (`info` icon)
- Button placement should be right after the Quick Beacon button in `.radio-indicator`
