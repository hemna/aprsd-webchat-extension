# Implementation Plan: APRS Beacon Symbol Picker

**Branch**: `001-aprs-symbol-picker` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-aprs-symbol-picker/spec.md`

## Summary

Add a visual APRS symbol picker dialog to the webchat interface that allows users to select their beacon symbol from a matrix of icons. The selected symbol is persisted to localStorage and passed to the backend for inclusion in beacon transmissions. The quick beacon button displays the currently selected symbol.

## Technical Context

**Language/Version**: Python 3.11+ (backend), JavaScript ES6 (frontend)
**Primary Dependencies**: Flask, Flask-SocketIO, jQuery 3.7.1, Bootstrap 5.3.8
**Storage**: localStorage (browser), no database changes required
**Testing**: pytest (backend), manual testing (frontend)
**Target Platform**: Web browser (desktop and mobile), Linux/macOS/Windows server
**Project Type**: Web application extension (Flask + vanilla JS)
**Performance Goals**: <200ms dialog open, <500ms symbol selection response
**Constraints**: Must work with existing APRS symbol sprite sheets (16x16 and 64x64 variants)
**Scale/Scope**: Single webchat page, ~188 symbols to display (2 tables × 94 symbols)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New JS follows existing patterns, Python changes minimal, will include type hints |
| II. Testing Standards | PASS | Will add backend tests for symbol parameter handling |
| III. User Experience Consistency | PASS | Dialog follows Bootstrap modal pattern used elsewhere, mobile responsive |
| IV. Performance Requirements | PASS | Symbol grid uses existing sprite sheets, no additional network requests |

**Quality Gates Compliance:**
- Linting: Will pass pre-commit hooks
- Tests: Will add tests for new WebSocket event handler
- Type Check: Python changes will include type hints
- Build: No new dependencies
- Docs: Will add docstrings for new functions
- Performance: Sprite-based rendering ensures fast display

## Project Structure

### Documentation (this feature)

```text
specs/001-aprs-symbol-picker/
├── plan.md              # This file
├── research.md          # APRS symbol standards research
├── data-model.md        # Symbol data structures
├── quickstart.md        # Testing guide
├── contracts/           # WebSocket event contracts
└── tasks.md             # Implementation tasks (Phase 2)
```

### Source Code (repository root)

```text
aprsd_webchat_extension/
├── cmds/
│   └── webchat.py                    # Backend WebSocket handlers (modify)
└── web/
    └── chat/
        ├── static/
        │   ├── css/
        │   │   └── index.css         # Symbol picker styles (modify)
        │   ├── js/
        │   │   ├── main.js           # APRS icon utilities (modify)
        │   │   ├── gps.js            # Beacon sending (modify)
        │   │   └── symbol-picker.js  # NEW: Symbol picker dialog
        │   └── images/
        │       ├── aprs-symbols-16-0.png  # Primary table (existing)
        │       ├── aprs-symbols-16-1.png  # Alternate table (existing)
        │       ├── aprs-symbols-64-0.png  # Primary table large (existing)
        │       └── aprs-symbols-64-1.png  # Alternate table large (existing)
        └── templates/
            └── index.html            # Add symbol picker modal (modify)

tests/
└── test_aprsd_webchat_extension.py   # Add symbol WebSocket tests (modify)
```

**Structure Decision**: Follows existing single-project web application structure. New JavaScript file `symbol-picker.js` isolates the feature while integrating with existing `gps.js` for beacon functionality.

## Complexity Tracking

> No constitution violations identified. Feature follows established patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Symbol Data | Hardcoded in JS | APRS symbols are standardized (APRS101.pdf), no dynamic loading needed |
| Persistence | localStorage | Consistent with existing beacon settings storage pattern |
| Dialog | Bootstrap modal | Consistent with existing UI patterns |
