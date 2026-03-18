# Tasks: APRS Beacon Symbol Picker

**Input**: Design documents from `/specs/001-aprs-symbol-picker/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Backend tests will be added for the WebSocket symbol handling as noted in plan.md Constitution Check.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `aprsd_webchat_extension/cmds/webchat.py`
- **Frontend JS**: `aprsd_webchat_extension/web/chat/static/js/`
- **Frontend CSS**: `aprsd_webchat_extension/web/chat/static/css/`
- **Templates**: `aprsd_webchat_extension/web/chat/templates/`
- **Tests**: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new files and establish symbol data structures

- [X] T001 Create symbol-picker.js file with module structure in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T002 [P] Add APRS symbol table data constants (PRIMARY_SYMBOLS, ALTERNATE_SYMBOLS) with descriptions in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T003 [P] Add symbol picker CSS styles section in aprsd_webchat_extension/web/chat/static/css/index.css

**Checkpoint**: New files created, ready for feature implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core symbol utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement sprite position calculation function (getSymbolSpritePosition) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T005 [P] Implement symbol validation function (isValidSymbol) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T006 [P] Add symbol-picker.js script tag to aprsd_webchat_extension/web/chat/templates/index.html
- [X] T007 Implement getSymbolDescription helper function to lookup symbol descriptions in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js

**Checkpoint**: Foundation ready - symbol utilities available for all user stories

---

## Phase 3: User Story 1 - Select Beacon Symbol from Picker Dialog (Priority: P1) 🎯 MVP

**Goal**: Users can open a visual symbol picker dialog and select their beacon symbol from a grid of APRS icons

**Independent Test**: Click beacon button area to open picker, hover over symbols to see tooltips, click a symbol to select it and close dialog

### Implementation for User Story 1

- [X] T008 [US1] Add Bootstrap modal HTML structure for symbol picker dialog in aprsd_webchat_extension/web/chat/templates/index.html
- [X] T009 [US1] Implement renderSymbolGrid function to display symbols using sprite sheets in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T010 [US1] Add CSS for symbol grid layout (responsive grid, symbol cells, hover states) in aprsd_webchat_extension/web/chat/static/css/index.css
- [X] T011 [US1] Implement openSymbolPicker function to show modal dialog in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T012 [US1] Implement closeSymbolPicker function with modal dismiss in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T013 [US1] Add hover tooltip showing symbol code and description in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T014 [US1] Implement symbol selection click handler (onSymbolSelect) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T015 [US1] Add Primary/Alternate table tabs or toggle in symbol picker modal in aprsd_webchat_extension/web/chat/templates/index.html
- [X] T016 [US1] Implement table switching logic (switchSymbolTable) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T017 [US1] Add symbol icon display element to quick beacon button in aprsd_webchat_extension/web/chat/templates/index.html
- [X] T018 [US1] Implement updateBeaconButtonSymbol function to show selected symbol on button in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T019 [US1] Add click handler on beacon button symbol area to open picker in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T020 [US1] Wire up init_symbol_picker function call in page initialization in aprsd_webchat_extension/web/chat/templates/index.html

**Checkpoint**: User Story 1 complete - users can open picker, browse symbols with tooltips, select a symbol, and see it on the beacon button

---

## Phase 4: User Story 2 - Persist Symbol Selection (Priority: P2)

**Goal**: Symbol selection is saved to localStorage and restored on page load

**Independent Test**: Select a symbol, refresh page, verify same symbol is displayed on beacon button

### Implementation for User Story 2

- [X] T021 [US2] Implement saveSymbolSelection function to store in localStorage in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T022 [US2] Implement loadSymbolSelection function to retrieve from localStorage in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T023 [US2] Add localStorage validation and corruption handling (reset to default on invalid data) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T024 [US2] Define DEFAULT_SYMBOL constant ('/>' car) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T025 [US2] Implement getSelectedSymbol function (returns saved or default) in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T026 [US2] Call loadSymbolSelection and updateBeaconButtonSymbol on page load in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T027 [US2] Update onSymbolSelect to call saveSymbolSelection after selection in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js

**Checkpoint**: User Story 2 complete - symbol selection persists across page refreshes

---

## Phase 5: User Story 3 - Send Beacons with Selected Symbol (Priority: P3)

**Goal**: Selected symbol is included in beacon transmissions to the backend

**Independent Test**: Select a symbol, send beacon, verify backend receives correct symbol in WebSocket message

### Tests for User Story 3

- [X] T028 [P] [US3] Add test for on_gps WebSocket handler with symbol parameter in tests/test_aprsd_webchat_extension.py
- [X] T029 [P] [US3] Add test for on_gps backward compatibility (no symbol parameter) in tests/test_aprsd_webchat_extension.py

### Implementation for User Story 3

- [X] T030 [US3] Modify sendPosition function in gps.js to include symbol from getSelectedSymbol in aprsd_webchat_extension/web/chat/static/js/gps.js
- [X] T031 [US3] Update on_gps handler to parse symbol parameter from WebSocket data in aprsd_webchat_extension/cmds/webchat.py
- [X] T032 [US3] Add symbol_table and symbol parameters to BeaconPacket creation in on_gps handler in aprsd_webchat_extension/cmds/webchat.py
- [X] T033 [US3] Include symbol in gps_beacon_sent response emission in aprsd_webchat_extension/cmds/webchat.py
- [X] T034 [US3] Add type hints for symbol parsing in on_gps handler in aprsd_webchat_extension/cmds/webchat.py
- [X] T035 [US3] Export getSelectedSymbol function for use by gps.js in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js

**Checkpoint**: User Story 3 complete - beacons transmit with user-selected symbol

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T036 [P] Add mobile-responsive CSS for symbol picker grid on small screens in aprsd_webchat_extension/web/chat/static/css/index.css
- [X] T037 [P] Add keyboard support (Escape to close) for symbol picker dialog in aprsd_webchat_extension/web/chat/static/js/symbol-picker.js
- [X] T038 [P] Add highlight/border for currently selected symbol in grid in aprsd_webchat_extension/web/chat/static/css/index.css
- [X] T039 Run pre-commit hooks and fix any linting issues
- [ ] T040 Run quickstart.md validation scenarios manually
- [X] T041 [P] Add docstrings/JSDoc comments to all new functions in symbol-picker.js

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 file creation - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 - Core picker functionality
- **User Story 2 (Phase 4)**: Depends on Phase 3 (US1) - Persistence layer
- **User Story 3 (Phase 5)**: Depends on Phase 4 (US2) - Backend integration
- **Polish (Phase 6)**: Can run after any user story for incremental improvement

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Creates picker dialog
- **User Story 2 (P2)**: Requires US1 complete - Adds persistence to US1's selection
- **User Story 3 (P3)**: Requires US2 complete - Uses getSelectedSymbol from US2

### Within Each User Story

- HTML structure before JavaScript handlers
- JavaScript core functions before event wiring
- Tests (US3) written before implementation

### Parallel Opportunities

**Phase 1:**
- T002, T003 can run in parallel (different files)

**Phase 2:**
- T005, T006 can run in parallel (different files)

**Phase 3 (US1):**
- T008 (HTML) must complete before T009-T020 (JS depends on HTML elements)
- T009, T010 can run in parallel (JS logic vs CSS)

**Phase 5 (US3):**
- T028, T029 can run in parallel (different test functions)

**Phase 6:**
- T036, T037, T038, T041 can all run in parallel (different files/concerns)

---

## Parallel Example: User Story 1

```bash
# After T008 (HTML structure) completes:

# These can run in parallel:
Task: T009 "Implement renderSymbolGrid function"
Task: T010 "Add CSS for symbol grid layout"

# Then these can run in parallel:
Task: T011 "Implement openSymbolPicker function"
Task: T012 "Implement closeSymbolPicker function"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: User Story 1 (T008-T020)
4. **STOP and VALIDATE**: Test symbol picker opens, shows grid, allows selection
5. Demo: Users can pick symbols (not persisted yet)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test picker dialog → Demo (MVP!)
3. Add User Story 2 → Test persistence → Demo (symbol remembered)
4. Add User Story 3 → Test beacon transmission → Demo (full feature)
5. Add Polish → Improved UX (keyboard, mobile, highlighting)

### Single Developer Strategy

1. Complete Phases 1-3 sequentially for MVP
2. Add Phase 4 for persistence
3. Add Phase 5 for backend integration
4. Add Phase 6 tasks as time permits

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- US2 and US3 have dependencies on prior stories (not independently startable)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- localStorage key: `aprsd-webchat-beacon-symbol`
- Default symbol: `/>` (car)
