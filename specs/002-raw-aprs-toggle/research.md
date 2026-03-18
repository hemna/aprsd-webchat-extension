# Research: Raw APRS Packet View Toggle

**Feature**: 002-raw-aprs-toggle
**Date**: 2026-03-06

## Research Questions

### Q1: Where should the toggle button be placed?

**Context**: Need to find the best location for the toggle button that is discoverable but not intrusive.

**Decision**: Place next to the Quick Beacon button in the `.radio-indicator` div within `.wc-info-bar`

**Rationale**:
- Follows the iOS app pattern where the info icon is in the toolbar near other status icons
- The info bar is always visible, making the toggle easily accessible
- Groups with related beacon/status controls
- Consistent with existing UI patterns in the webchat

**Alternatives Considered**:
- In the header (too far from messages)
- Per-conversation toggle (too complex, inconsistent with mobile apps)
- In a settings panel (hidden, not quick access)

### Q2: How should the toggle state be managed?

**Context**: Need to decide how to store and manage the toggle state.

**Decision**: Use a global JavaScript variable (`showRawPackets`) that persists for the session only

**Rationale**:
- Session-only state matches the iOS/Android app behavior (resets on app restart)
- Simple implementation - no need for localStorage
- Raw packet view is a debugging/inspection feature, not a user preference
- Avoids cluttering localStorage with additional settings

**Alternatives Considered**:
- localStorage persistence (overkill for debugging feature)
- Per-callsign state (inconsistent UX, unnecessarily complex)
- URL parameter (too technical, not user-friendly)

### Q3: How should existing messages be updated when toggling?

**Context**: Messages are rendered as HTML and stored in the DOM. Need to toggle display without re-rendering everything.

**Decision**: Use CSS class toggle on the speech wrapper to show/hide appropriate content

**Rationale**:
- CSS-only approach is instantaneous (no JavaScript re-render needed)
- Both message text and raw packet can be in the DOM, visibility toggled via CSS
- Maintains scroll position and message state
- Matches React/Vue best practices for conditional rendering

**Implementation Approach**:
1. Modify `create_message_html()` to include both parsed message AND raw packet in separate elements
2. Add `.raw-packet-text` element alongside `.bubble-message` in each bubble
3. Add CSS rules that hide `.raw-packet-text` by default
4. When `showRawPackets` is true, add class to body/container that shows raw and hides parsed
5. Toggle updates class on container, CSS handles visibility

**Alternatives Considered**:
- Re-render all messages on toggle (slow, loses scroll position)
- jQuery text replacement (complex, error-prone)
- Store both in data attributes, swap on click (complex DOM manipulation)

### Q4: What icon should be used for the toggle?

**Context**: Need an icon that clearly indicates "raw/detailed view" toggle.

**Decision**: Use Material Symbols `info` icon (outline when off, filled when on)

**Rationale**:
- Matches iOS app which uses `info.circle` / `info.circle.fill`
- Consistent with Material Symbols already used in the project
- "Info" semantically relates to "show more detail/raw data"
- Outline/filled states provide clear visual feedback

**Icon Variations**:
- Off state: `<span class="material-symbols-rounded">info</span>`
- On state: Add filled style via CSS (font-variation-settings)

**Alternatives Considered**:
- `code` icon (too developer-focused)
- `terminal` icon (not in Material Symbols Rounded)
- `data_object` icon (not intuitive)
- `raw_on`/`raw_off` (not available)

### Q5: How should raw packet text be styled?

**Context**: Raw APRS packets are technical strings that need appropriate formatting.

**Decision**: Monospace font, slightly smaller size, appropriate contrast for both themes

**Rationale**:
- Monospace font is standard for technical/packet data
- Smaller size helps fit long packets without breaking layout
- Must maintain readability in both light and dark themes

**CSS Approach**:
```css
.raw-packet-text {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 0.8125rem;  /* Slightly smaller than normal message */
    word-break: break-all;  /* Allow breaking long packet strings */
    line-height: 1.4;
}
```

**Theme Support**:
- Light theme: Use slightly darker text color for contrast
- Dark theme: Use existing `--text-primary` which works well for code

### Q6: What happens if a message has no raw packet data?

**Context**: Some messages might not have raw packet data (e.g., old messages from localStorage before raw was stored).

**Decision**: Display "(raw packet not available)" in italicized, muted text

**Rationale**:
- Matches iOS app behavior
- Clear indication that data is missing, not a bug
- Muted styling indicates it's placeholder text

**Alternatives Considered**:
- Hide message entirely (confusing, breaks conversation flow)
- Show parsed message anyway (inconsistent UX)
- Empty bubble (confusing)

## Implementation Summary

The implementation will:
1. Add info toggle button to `.radio-indicator` in info bar
2. Include both `.bubble-message` and `.raw-packet-text` elements in message HTML
3. Use CSS class toggle on a parent container to switch visibility
4. Use Material Symbols `info` icon with filled/outline states
5. Style raw packets with monospace font and appropriate sizing
6. Show "(raw packet not available)" for messages missing raw data

This approach ensures:
- Instantaneous toggle (CSS-only, no re-render)
- Consistent UX with iOS/Android apps
- Proper theming support
- Graceful handling of missing data
