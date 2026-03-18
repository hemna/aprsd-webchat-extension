# Implementation Plan: Raw APRS Packet View Toggle

**Branch**: `002-raw-aprs-toggle` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-raw-aprs-toggle/spec.md`

## Summary

Add an info icon (i) toggle button next to the Quick Beacon button in the webchat info bar that switches between displaying parsed message content and raw TNC2-format APRS packet strings in message bubbles. This provides operators with a quick way to debug APRS messaging without hovering over individual messages. The raw packet data already exists in the message objects (`msg['raw']`) - this feature simply adds a UI toggle to display it inline.

## Technical Context

**Language/Version**: Python 3.11+ (backend), JavaScript ES6 (frontend)
**Primary Dependencies**: Flask, Flask-SocketIO, jQuery 3.7.1, Bootstrap 5.3.8
**Storage**: localStorage (for message persistence), sessionStorage (for toggle state, optional)
**Testing**: pytest (backend), manual testing (frontend)
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: Flask web extension (APRSD plugin)
**Performance Goals**: Toggle must be instantaneous (<16ms for re-render)
**Constraints**: Must work with existing message HTML structure, must support light/dark themes
**Scale/Scope**: Single toggle button + CSS classes for raw packet display

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Requirement | Status | Notes |
|------|-------------|--------|-------|
| Code Quality | Functions <50 lines, clear responsibilities | PASS | Single toggle function, CSS class swap |
| Code Quality | Public APIs with type hints/docstrings | N/A | Frontend-only JavaScript change |
| Testing | New features MUST include test coverage | PASS | Manual UI testing, can add unit tests for toggle logic |
| Testing | WebSocket contract tests for message formats | N/A | No WebSocket format changes |
| UX Consistency | Visual consistency with existing patterns | PASS | Uses existing Material Symbols icons, matches info bar styling |
| UX Consistency | Mobile responsiveness maintained | PASS | Button placement follows existing responsive design |
| Performance | WebSocket message latency <500ms | N/A | No WebSocket changes |
| Performance | Page initial load <3s | PASS | Minimal CSS/JS additions |

**Constitution Compliance**: All applicable gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-raw-aprs-toggle/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for frontend-only feature)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
aprsd_webchat_extension/
└── web/
    └── chat/
        ├── templates/
        │   └── index.html       # Add toggle button to info bar
        └── static/
            ├── js/
            │   └── send-message.js  # Add toggle logic, update message rendering
            └── css/
                └── chat.css     # Add raw packet display styles

tests/
└── (manual testing for UI feature)
```

**Structure Decision**: This is a frontend-only UI enhancement. Changes are confined to:
1. HTML template (`index.html`) - Add toggle button
2. JavaScript (`send-message.js`) - Toggle state management and message re-rendering
3. CSS (`chat.css`) - Raw packet text styling

## Complexity Tracking

> No complexity violations. This is a simple UI toggle feature that:
> - Adds one button to existing info bar
> - Adds one global JavaScript variable for state
> - Adds/removes CSS classes to change text display
> - Uses existing raw packet data already in message objects
