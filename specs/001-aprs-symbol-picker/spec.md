# Feature Specification: APRS Beacon Symbol Picker

**Feature Branch**: `001-aprs-symbol-picker`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "create a mechanism in the webchat interface that allows the user to select the APRS Beacon symbol from an in page popup dialog that shows a matrix of APRS symbol icons and their associated character string. Once a user picks an icon, then save the setting and pass the text string to the backend for beacons that are sent out. Show the symbol icon as part of the quick beacon button."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Beacon Symbol from Picker Dialog (Priority: P1)

As a ham radio operator using the webchat interface, I want to select my beacon symbol from a visual grid of APRS symbols so that my transmitted beacons display the correct icon to other stations.

**Why this priority**: This is the core functionality - without a symbol picker, users cannot change their beacon symbol from the default. This directly impacts station identification and map display on APRS networks.

**Independent Test**: Can be fully tested by clicking the beacon button, viewing the symbol picker dialog, selecting a symbol, and verifying the selection persists. Delivers immediate value by allowing symbol customization.

**Acceptance Scenarios**:

1. **Given** the user is on the webchat page, **When** they click the quick beacon button or a symbol selector trigger, **Then** a popup dialog appears showing a matrix of APRS symbols organized in a grid.

2. **Given** the symbol picker dialog is open, **When** the user hovers over a symbol, **Then** a tooltip shows the symbol's character code and description.

3. **Given** the symbol picker dialog is open, **When** the user clicks on a symbol, **Then** the dialog closes, the symbol is selected, and the quick beacon button displays the newly selected symbol icon.

---

### User Story 2 - Persist Symbol Selection (Priority: P2)

As a ham radio operator, I want my beacon symbol selection to be saved across browser sessions so I don't have to re-select it every time I visit the webchat.

**Why this priority**: Persistence is essential for usability but builds on P1's symbol selection capability. Without persistence, users would have frustrating repeated configuration.

**Independent Test**: Can be tested by selecting a symbol, refreshing the page, and verifying the symbol selection is restored.

**Acceptance Scenarios**:

1. **Given** the user has selected a beacon symbol, **When** they refresh the page or close and reopen the browser, **Then** the previously selected symbol is still displayed and active.

2. **Given** the user has never selected a symbol, **When** they load the webchat page, **Then** a sensible default symbol (e.g., car `/>`  or house `/-`) is displayed.

---

### User Story 3 - Send Beacons with Selected Symbol (Priority: P3)

As a ham radio operator, I want my selected beacon symbol to be included in the beacons I transmit so that other stations see my correct symbol on their maps.

**Why this priority**: This completes the feature by connecting the frontend selection to actual beacon transmission. Depends on P1 and P2 being functional.

**Independent Test**: Can be tested by selecting a symbol, sending a manual beacon, and verifying the backend receives and transmits the correct symbol code.

**Acceptance Scenarios**:

1. **Given** the user has selected a beacon symbol, **When** they click "Send Beacon", **Then** the beacon packet transmitted includes the selected symbol character code.

2. **Given** the user changes their symbol from "car" to "house", **When** they send a beacon, **Then** the new symbol is used (not the old one).

3. **Given** interval beaconing is enabled, **When** beacons are automatically sent, **Then** each beacon uses the currently selected symbol.

---

### Edge Cases

- What happens when the user's browser has localStorage disabled? Fall back to session-only storage or display a warning.
- How does system handle corrupted/invalid symbol data in localStorage? Reset to default symbol.
- What if the APRS symbol sprite sheets fail to load? Show character codes as text fallback.
- What symbol is used for the first-time user before any selection? Default to a standard symbol (car or house).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a popup dialog showing all standard APRS symbols (primary and alternate tables) in a visual grid.
- **FR-002**: Each symbol in the grid MUST show the actual icon from the sprite sheet and be clickable.
- **FR-003**: System MUST display the symbol's character code (e.g., `/>` for car, `/-` for house) when hovering.
- **FR-004**: System MUST save the selected symbol to localStorage for persistence across sessions.
- **FR-005**: System MUST display the currently selected symbol icon on the quick beacon button.
- **FR-006**: System MUST pass the selected symbol character code to the backend when sending beacons.
- **FR-007**: Backend MUST include the symbol in the BeaconPacket when transmitting.
- **FR-008**: System MUST provide a default symbol if none is selected.
- **FR-009**: Dialog MUST be closeable via clicking outside, pressing Escape, or clicking a close button.
- **FR-010**: Dialog MUST be responsive and usable on mobile devices.

### Key Entities

- **APRSSymbol**: Represents an APRS symbol with table character (`/` or `\`), code character (ASCII 33-126), and optional description.
- **SymbolSelection**: The user's current symbol choice, including table and code character, stored in localStorage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select any of the 94 primary table symbols and 94 alternate table symbols (188 total).
- **SC-002**: Symbol selection persists across page refreshes 100% of the time (when localStorage is available).
- **SC-003**: Symbol picker dialog opens within 200ms of trigger click.
- **SC-004**: Selected symbol is correctly transmitted in beacon packets (verifiable via APRS-IS).
- **SC-005**: Quick beacon button displays the selected symbol icon (not just a generic icon).
