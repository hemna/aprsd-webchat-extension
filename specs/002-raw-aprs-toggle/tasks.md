# Tasks: Raw APRS Packet View Toggle

**Input**: Design documents from `/specs/002-raw-aprs-toggle/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Manual testing only (no automated tests requested for this frontend-only feature)

**Organization**: This feature has a single user story (US1). Tasks are organized to enable incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, the source files are located at:
- `aprsd_webchat_extension/web/chat/templates/index.html` - HTML template
- `aprsd_webchat_extension/web/chat/static/js/send-message.js` - JavaScript
- `aprsd_webchat_extension/web/chat/static/css/chat.css` - CSS styles

---

## Phase 1: Setup

**Purpose**: No setup required - this is a modification to existing files only.

**Note**: This feature modifies existing files rather than creating new ones. No project initialization needed.

---

## Phase 2: Foundational (CSS Styling)

**Purpose**: Add the CSS infrastructure that all toggle functionality depends on

**Why First**: The CSS rules must exist before the JavaScript can toggle classes, and the HTML elements need their styles defined.

- [X] T001 [P] Add toggle button styling (`.btn-raw-toggle`) in `aprsd_webchat_extension/web/chat/static/css/chat.css`
- [X] T002 [P] Add raw packet text styling (`.bubble-raw-packet`) in `aprsd_webchat_extension/web/chat/static/css/chat.css`
- [X] T003 [P] Add toggle visibility rules (`.show-raw-packets`) in `aprsd_webchat_extension/web/chat/static/css/chat.css`

**Checkpoint**: CSS foundation ready - UI implementation can proceed

---

## Phase 3: User Story 1 - Toggle Raw Packet View (Priority: P1 - MVP)

**Goal**: Add an info icon toggle button that switches between normal message view and raw APRS packet view

**Independent Test**:
1. Load webchat interface
2. Click info icon next to Quick Beacon button
3. Verify all messages switch to raw TNC2 packet format
4. Click again to return to normal view

### HTML Implementation (Toggle Button)

- [X] T004 [US1] Add raw packet toggle button to info bar in `aprsd_webchat_extension/web/chat/templates/index.html` (in `.radio-indicator` div after Quick Beacon button)

### JavaScript Implementation (Toggle Logic)

- [X] T005 [US1] Add `showRawPackets` global variable at top of `aprsd_webchat_extension/web/chat/static/js/send-message.js`
- [X] T006 [US1] Add `toggle_raw_packets()` function after `reload_popovers()` in `aprsd_webchat_extension/web/chat/static/js/send-message.js`
- [X] T007 [US1] Add toggle button click handler in `init_chat()` function in `aprsd_webchat_extension/web/chat/static/js/send-message.js`
- [X] T008 [US1] Update `create_message_html()` function to include raw packet element in `aprsd_webchat_extension/web/chat/static/js/send-message.js`

**Checkpoint**: Raw packet toggle is fully functional

---

## Phase 4: Polish & Manual Testing

**Purpose**: Verify all acceptance criteria and edge cases

- [ ] T009 Manual test: Verify toggle button appears next to Quick Beacon button
- [ ] T010 Manual test: Verify toggle icon changes between outline and filled states
- [ ] T011 Manual test: Verify messages switch to raw packets when toggled
- [ ] T012 Manual test: Verify toggle is instantaneous (no visible delay)
- [ ] T013 Manual test: Verify raw packets display in monospace font
- [ ] T014 Manual test: Verify messages without raw data show "(raw packet not available)"
- [ ] T015 Manual test: Verify light theme text contrast is readable
- [ ] T016 Manual test: Verify dark theme text contrast is readable
- [ ] T017 Manual test: Verify toggle button is keyboard accessible (Tab, Enter/Space)
- [ ] T018 Manual test: Verify new messages appear correctly in current mode
- [ ] T019 Manual test: Verify ACK indicators still work in raw mode
- [ ] T020 Manual test: Verify popover on hover still works in raw mode
- [ ] T021 Manual test: Verify mobile responsiveness of toggle button
- [ ] T022 Run existing tests to ensure no regressions: `pytest tests/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: N/A - no setup required
- **Phase 2 (Foundational)**: No dependencies - can start immediately
- **Phase 3 (US1)**: Depends on Phase 2 completion (CSS must exist first)
- **Phase 4 (Polish)**: Depends on Phase 3 completion

### Task Dependencies Within Phase 3

```
T004 (HTML button) ─────────────────────────────────────┐
                                                        │
T005 (global var) ──┬──► T006 (toggle function) ──────►│
                    │                                   ▼
T007 (click handler) depends on T006 ──────────────► Full Integration
                    │
T008 (message HTML) depends on Phase 2 CSS ───────────►│
```

### Parallel Opportunities

- **Phase 2**: All CSS tasks (T001, T002, T003) can run in parallel (same file, but different sections)
- **Phase 3**: T004 (HTML) and T005 (JS global var) can run in parallel (different files)
- **Phase 4**: All manual tests can be done in sequence during a single testing session

---

## Parallel Example: Phase 2 CSS Tasks

```bash
# All CSS can be added in a single edit to chat.css:
# - T001: Toggle button styling
# - T002: Raw packet text styling
# - T003: Toggle visibility rules
```

## Parallel Example: Phase 3 Initial Tasks

```bash
# Launch HTML and initial JS in parallel (different files):
Task: "T004 [US1] Add raw packet toggle button to info bar"
Task: "T005 [US1] Add showRawPackets global variable"
```

---

## Implementation Strategy

### MVP (Complete All Phases)

This is a small feature - all phases should be completed together:

1. Complete Phase 2: Add all CSS rules to `chat.css`
2. Complete Phase 3:
   - Add toggle button to `index.html`
   - Add toggle logic to `send-message.js`
   - Update message HTML generation
3. Complete Phase 4: Manual testing checklist

### Recommended Implementation Order

1. **CSS First** (T001-T003): Add all styling so toggle states work
2. **HTML Button** (T004): Add the toggle button
3. **JS Global + Function** (T005-T006): Add state variable and toggle function
4. **JS Click Handler** (T007): Wire up the button
5. **JS Message HTML** (T008): Update message rendering
6. **Test Everything** (T009-T022): Run through manual testing checklist

### Total Estimated Time

- Phase 2 (CSS): ~15 minutes
- Phase 3 (JS/HTML): ~30 minutes
- Phase 4 (Testing): ~20 minutes
- **Total**: ~1 hour

---

## Notes

- This is a frontend-only feature - no backend changes required
- Raw packet data already exists in `msg['raw']` - no data model changes needed
- CSS-driven toggle approach ensures instantaneous switching (no re-render)
- All tasks modify existing files - no new files are created
- Manual testing is sufficient - automated tests are optional for UI-only changes
