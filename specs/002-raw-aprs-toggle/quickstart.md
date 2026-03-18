# Quickstart: Raw APRS Packet View Toggle

**Feature**: 002-raw-aprs-toggle
**Date**: 2026-03-06

## Overview

This guide provides the implementation details for adding a raw APRS packet view toggle to the webchat interface. The toggle allows users to switch between viewing parsed message content and raw TNC2-format APRS packets.

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `templates/index.html` | Modify | Add toggle button to info bar |
| `static/js/send-message.js` | Modify | Add toggle state and logic, update message HTML |
| `static/css/chat.css` | Modify | Add raw packet styling and toggle visibility rules |

## Implementation Steps

### Step 1: Add Toggle Button to HTML

**File**: `aprsd_webchat_extension/web/chat/templates/index.html`

Add the info toggle button inside `.radio-indicator`, right after the Quick Beacon button:

```html
<!-- In .radio-indicator div, after the beacon button -->
<button type="button" class="btn btn-sm btn-raw-toggle" id="raw_packet_toggle"
        data-tooltip="Toggle raw packet view" data-tooltip-position="bottom"
        aria-label="Toggle raw packet view" aria-pressed="false">
    <span class="material-symbols-rounded">info</span>
</button>
```

**Location**: After line 478 (after the `radio-icon-wrapper` span)

### Step 2: Add CSS Styles

**File**: `aprsd_webchat_extension/web/chat/static/css/chat.css`

Add the following styles at the end of the file:

```css
/* =====================================================
   Raw APRS Packet View Toggle (002-raw-aprs-toggle)
   ===================================================== */

/* Toggle button styling */
.btn-raw-toggle {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    transition: color var(--transition-base), background-color var(--transition-base);
    cursor: pointer;
}

.btn-raw-toggle:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.btn-raw-toggle:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
}

/* Active/toggled state */
.btn-raw-toggle.active {
    color: var(--primary-color);
}

.btn-raw-toggle.active .material-symbols-rounded {
    font-variation-settings: 'FILL' 1;
}

/* Raw packet text element (hidden by default) */
.bubble-raw-packet {
    display: none;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
    font-size: 0.8125rem;
    line-height: 1.4;
    word-break: break-all;
    margin: 0;
    padding: 0;
    color: var(--text-primary);
}

.bubble.alt .bubble-raw-packet {
    color: var(--text-inverse);
}

/* Placeholder for missing raw packet data */
.bubble-raw-packet.no-data {
    font-style: italic;
    color: var(--text-muted);
}

.bubble.alt .bubble-raw-packet.no-data {
    color: rgba(255, 255, 255, 0.6);
}

/* When raw packets mode is active */
.show-raw-packets .bubble-message {
    display: none;
}

.show-raw-packets .bubble-raw-packet {
    display: block;
}
```

### Step 3: Add JavaScript Toggle Logic

**File**: `aprsd_webchat_extension/web/chat/static/js/send-message.js`

#### 3a. Add Global Variable

At the top of the file (around line 11, after `socketio_reconnecting`):

```javascript
var showRawPackets = false;  // Toggle state for raw APRS packet view
```

#### 3b. Add Toggle Function

Add this function after the `reload_popovers()` function (around line 31):

```javascript
/**
 * Toggle the raw APRS packet view display
 * When enabled, shows raw TNC2 packet strings instead of parsed messages
 */
function toggle_raw_packets() {
    showRawPackets = !showRawPackets;

    // Update button visual state
    var toggleBtn = $('#raw_packet_toggle');
    toggleBtn.toggleClass('active', showRawPackets);
    toggleBtn.attr('aria-pressed', showRawPackets ? 'true' : 'false');

    // Update body class to trigger CSS visibility changes
    if (showRawPackets) {
        $('body').addClass('show-raw-packets');
    } else {
        $('body').removeClass('show-raw-packets');
    }
}
```

#### 3c. Initialize Toggle Button Event Handler

In the `init_chat()` function, add the click handler (around where other button handlers are initialized):

```javascript
// Initialize raw packet toggle button
$('#raw_packet_toggle').on('click', function(e) {
    e.preventDefault();
    toggle_raw_packets();
});
```

#### 3d. Update `create_message_html()` Function

Modify the `create_message_html()` function to include the raw packet element. Find the existing function (around line 891) and update it:

```javascript
function create_message_html(date, time, from, to, message, ack_id, msg, acked=false) {
    div_id = from + "_" + msg.msgNo;
    if (ack_id) {
      alt = " alt"
    } else {
      alt = ""
    }

    bubble_class = "bubble" + alt
    bubble_name_class = "bubble-name" + alt
    bubble_msgid = bubble_msg_id(msg);
    date_str = date + " " + time;
    sane_date_str = date_str.replace(/ /g,"").replaceAll("/","").replaceAll(":","");

    bubble_msg_class = "bubble-message";
    if (ack_id) {
      bubble_arrow_class = "bubble-arrow alt";
      popover_placement = "left";
    } else {
      bubble_arrow_class = "bubble-arrow";
      popover_placement = "right";
    }

    // Escape all user-provided data to prevent XSS
    var escaped_from = escapeHtml(from);
    var escaped_date_str = escapeHtml(date_str);
    var escaped_message = escapeHtml(message);
    var escaped_raw = escapeHtmlAttribute(msg['raw'] || '');
    var escaped_bubble_msgid = escapeHtmlAttribute(bubble_msgid);
    var escaped_ack_id = ack_id ? escapeHtmlAttribute(ack_id) : '';

    // Prepare raw packet display text
    var raw_packet_text = msg['raw'] ? escapeHtml(msg['raw']) : '(raw packet not available)';
    var raw_packet_class = msg['raw'] ? 'bubble-raw-packet' : 'bubble-raw-packet no-data';

    msg_html = '<div class="bubble-row'+alt+'">';
    msg_html += '<div id="'+escaped_bubble_msgid+'" class="'+ bubble_class + '" ';
    msg_html +=  'title="APRS Raw Packet" data-bs-placement="'+popover_placement+'" data-bs-toggle="popover" ';
    msg_html +=  'data-bs-trigger="hover" data-bs-content="'+escaped_raw+'">';
    msg_html += '<div class="bubble-text">';
    msg_html += '<p class="'+ bubble_name_class +'">'+escaped_from+'&nbsp;&nbsp;';
    msg_html += '<span class="bubble-timestamp">'+escaped_date_str+'</span>';

    if (ack_id) {
        if (acked) {
            msg_html += '<span class="material-symbols-rounded md-10" id="' + escaped_ack_id + '">thumb_up</span>';
        } else {
            msg_html += '<span class="material-symbols-rounded md-10" id="' + escaped_ack_id + '">thumb_down</span>';
        }
    }
    msg_html += "</p>";
    // Normal message view
    msg_html += '<p class="' +bubble_msg_class+ '">'+escaped_message+'</p>';
    // Raw packet view (hidden by default, shown when toggle is active)
    msg_html += '<p class="' + raw_packet_class + '">' + raw_packet_text + '</p>';
    msg_html += '<div class="'+ bubble_arrow_class + '"></div>';
    msg_html += "</div></div></div>";

    return msg_html
}
```

## Testing Checklist

### Manual Testing

1. **Toggle Button Visibility**
   - [ ] Button appears next to Quick Beacon button in info bar
   - [ ] Button is visible on both desktop and mobile views
   - [ ] Button has appropriate tooltip on hover

2. **Toggle Functionality**
   - [ ] Clicking toggle switches icon from outline to filled
   - [ ] Messages switch from parsed content to raw packet view
   - [ ] Toggle is instantaneous (no visible delay)
   - [ ] Toggle state persists while navigating between conversation tabs

3. **Raw Packet Display**
   - [ ] Raw packets display in monospace font
   - [ ] Long packets wrap properly without horizontal scroll
   - [ ] Messages without raw data show "(raw packet not available)"
   - [ ] Placeholder text is italicized and muted

4. **Theme Support**
   - [ ] Light theme: Text is readable with appropriate contrast
   - [ ] Dark theme: Text is readable with appropriate contrast
   - [ ] Sent/received bubbles have correct text colors in both modes

5. **Accessibility**
   - [ ] Toggle button is keyboard accessible (Tab, Enter/Space)
   - [ ] Button has appropriate aria-pressed state
   - [ ] Screen reader announces toggle state changes

6. **Edge Cases**
   - [ ] New messages appear correctly in current mode
   - [ ] ACK indicators still work in raw mode
   - [ ] Popover on hover still works in raw mode
   - [ ] Messages loaded from localStorage display correctly

## Verification Commands

```bash
# Verify CSS syntax
npx stylelint aprsd_webchat_extension/web/chat/static/css/chat.css

# Verify JavaScript syntax (if eslint is configured)
npx eslint aprsd_webchat_extension/web/chat/static/js/send-message.js

# Run existing tests (should not be affected)
pytest tests/
```

## Rollback Plan

If issues are discovered:

1. Remove the toggle button from `index.html`
2. Remove the CSS rules for `.btn-raw-toggle`, `.bubble-raw-packet`, and `.show-raw-packets`
3. Remove the `showRawPackets` variable and `toggle_raw_packets()` function
4. Revert `create_message_html()` to not include the raw packet paragraph

The raw packet data will still be available via the existing hover popover functionality.
