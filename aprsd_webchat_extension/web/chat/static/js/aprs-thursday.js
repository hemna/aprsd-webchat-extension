/**
 * APRSThursday Net Support
 *
 * Provides toggle, control panel, subscription management,
 * and group chat functionality for the ANSRVR HOTG group.
 */

// =====================================================
// Constants
// =====================================================
var APRSTHURSDAY_TAB_ID = "APRSTHURSDAY";
var APRSTHURSDAY_DISPLAY_NAME = "#APRSThursday";
var ANSRVR_CALLSIGN = "ANSRVR";
var APRSPH_CALLSIGN = "APRSPH";
var HOTG_GROUP = "HOTG";
var SUBSCRIPTION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours in ms

// =====================================================
// State
// =====================================================
var aprsThursdayEnabled = false;
var aprsThursdaySubscribed = false;
var aprsThursdayMode = 'broadcast';  // 'broadcast' or 'logonly'
var aprsThursdaySubscribedAt = null;  // Date object or null
var aprsThursdayExpiresAt = null;     // Date object or null
var aprsThursdayLocationCache = {};   // callsign -> location data
var aprsThursdayMessages = [];        // Array of received HOTG messages
var aprsThursdayInfoBarPhase = 0;     // 0 = subscription, 1 = contest time
var aprsThursdayInfoBarTimer = null;  // interval handle for alternation

// =====================================================
// Initialization
// =====================================================

/**
 * Initialize APRSThursday feature.
 * Called from init_chat() in send-message.js or from document ready.
 */
function init_aprs_thursday() {
    // Load state from localStorage
    load_aprsthursday_state();

    // Set up toggle button handler
    $('#aprsthursday_toggle').on('click', function(e) {
        e.preventDefault();
        toggle_aprs_thursday();
    });

    // Set up control panel handlers
    init_aprsthursday_controls();

    // Set up socket event handlers
    init_aprsthursday_socket_handlers();

    // If previously enabled, restore the tab
    if (aprsThursdayEnabled) {
        create_aprsthursday_tab(false); // don't auto-activate on load
        update_toggle_button(true);
    }

    // Start periodic checks (Thursday detection, subscription expiry)
    setInterval(periodic_aprsthursday_check, 60000); // every minute
    // Run initial check
    periodic_aprsthursday_check();
}

// =====================================================
// Toggle
// =====================================================

function toggle_aprs_thursday() {
    if (aprsThursdayEnabled && aprsThursdaySubscribed) {
        // Subscribed — show the Leave confirmation modal
        show_aprsthursday_leave_modal();
    } else if (aprsThursdayEnabled && !aprsThursdaySubscribed) {
        // Enabled but not subscribed — disable and remove tab
        aprsThursdayEnabled = false;
        update_toggle_button(false);
        remove_aprsthursday_tab();
        save_aprsthursday_state();
    } else {
        // Not enabled — show the Join modal
        show_aprsthursday_join_modal();
    }
}

/**
 * Show the Leave APRSThursday confirmation modal.
 */
function show_aprsthursday_leave_modal() {
    var modal = new bootstrap.Modal(document.getElementById('aprsthursdayLeaveModal'));
    modal.show();
}

/**
 * Show the Join APRSThursday modal dialog.
 * Updates the Thursday banner and resets the form.
 */
function show_aprsthursday_join_modal() {
    // Update Thursday banner inside modal
    var banner = $('#join_thursday_banner');
    if (is_aprs_thursday_utc()) {
        banner.html('<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">celebration</span> It\'s APRSThursday!');
        banner.removeClass('thursday-banner-warning').addClass('thursday-banner-active');
    } else {
        banner.html('<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">info</span> APRSThursday runs Thursdays 00:00&ndash;23:59 UTC');
        banner.removeClass('thursday-banner-active').addClass('thursday-banner-warning');
    }

    // Reset form
    $('#aprsthursday_join_msg').val('');
    $('input[name="join_aprsthursday_mode"][value="' + aprsThursdayMode + '"]').prop('checked', true);

    // Show modal
    var modal = new bootstrap.Modal(document.getElementById('aprsthursdayJoinModal'));
    modal.show();

    // Focus the message input after modal is shown
    $('#aprsthursdayJoinModal').one('shown.bs.modal', function() {
        $('#aprsthursday_join_msg').focus();
    });
}

/**
 * Called after user joins via modal. Enables APRSThursday, creates
 * the tab, and shows the user's join message in it.
 */
function complete_aprsthursday_join(message, mode) {
    // Close the modal
    var modalEl = document.getElementById('aprsthursdayJoinModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Enable APRSThursday
    aprsThursdayEnabled = true;
    aprsThursdayMode = mode;
    update_toggle_button(true);

    // Create and activate the tab
    create_aprsthursday_tab(true);

    // Show the user's own join message in the tab
    if (message) {
        var myCallsign = get_my_callsign();
        var outgoing = {
            sender: myCallsign,
            message: message,
            timestamp: new Date().toISOString(),
            raw_packet: ''
        };
        handle_aprsthursday_message(outgoing);
    }

    save_aprsthursday_state();
}

function update_toggle_button(enabled) {
    var toggleBtn = $('#aprsthursday_toggle');
    toggleBtn.toggleClass('active', enabled);
    toggleBtn.attr('aria-pressed', enabled ? 'true' : 'false');
}

// =====================================================
// Tab Management
// =====================================================

function create_aprsthursday_tab(activate) {
    // Don't create if already exists
    if ($('#msgsAPRSTHURSDAYLi').length > 0) {
        if (activate) {
            activate_aprsthursday_tab();
        }
        return;
    }

    var callsignTabs = $("#msgsTabList");
    // Remove the "+" tab, add our tab, then re-add "+"
    remove_add_tab();

    var tab_id = "msgsAPRSTHURSDAY";
    var tab_li_id = "msgsAPRSTHURSDAYLi";
    var tab_content_id = "msgsAPRSTHURSDAYContent";

    // Always create inactive — Bootstrap Tab API will activate properly
    var item_html = '<li class="nav-item" role="presentation" id="' + tab_li_id + '">';
    item_html += '<button callsign="APRSTHURSDAY" class="nav-link aprsthursday-tab" id="' + tab_id + '" ';
    item_html += 'data-bs-toggle="tab" data-bs-target="#' + tab_content_id + '" type="button" role="tab" ';
    item_html += 'aria-controls="APRSTHURSDAY" aria-selected="false">';
    item_html += '<span class="aprsthursday-tab-icon material-symbols-rounded" style="font-size:14px;">groups</span> ';
    item_html += '#APRSThu';
    item_html += '</button></li>';

    callsignTabs.append(item_html);

    // Create tab content (always inactive — activation handled below)
    create_aprsthursday_tab_content();

    // Re-add the "+" tab
    ensure_add_tab();

    // Add to callsign_list so tab system recognizes it
    if (!callsign_list.hasOwnProperty('APRSTHURSDAY')) {
        callsign_list['APRSTHURSDAY'] = '';
    }

    // Update mobile dropdown
    update_mobile_dropdown();

    if (activate) {
        activate_aprsthursday_tab();
    }
}

function create_aprsthursday_tab_content() {
    var callsignTabsContent = $("#msgsTabContent");
    var tab_content_id = "msgsAPRSTHURSDAYContent";
    var wrapper_id = "msgsAPRSTHURSDAYSpeechWrapper";

    var html = '<div class="tab-pane fade" id="' + tab_content_id + '" role="tabpanel" aria-labelledby="msgsAPRSTHURSDAY">';

    // Collapsible control panel
    html += '<div class="aprsthursday-panel">';
    html += '  <button class="aprsthursday-panel-toggle" type="button" data-bs-toggle="collapse" data-bs-target="#aprsthursdayControls" aria-expanded="false" aria-controls="aprsthursdayControls">';
    html += '    <span class="material-symbols-rounded" style="font-size:16px;">tune</span> APRSThursday Controls';
    html += '    <span class="material-symbols-rounded aprsthursday-panel-chevron">expand_more</span>';
    html += '  </button>';
    html += '  <div class="collapse" id="aprsthursdayControls">';
    html += '    <div class="aprsthursday-panel-body">';

    // Thursday banner
    html += '      <div id="thursday_banner" class="thursday-banner"></div>';

    // Subscription status
    html += '      <div class="aprsthursday-status">';
    html += '        <span class="aprsthursday-status-label">Status:</span> ';
    html += '        <span id="aprsthursday_sub_status" class="aprsthursday-status-value">Not subscribed</span>';
    html += '      </div>';

    // Mode selector
    html += '      <div class="aprsthursday-mode">';
    html += '        <span class="aprsthursday-mode-label">Mode:</span>';
    html += '        <label class="aprsthursday-radio"><input type="radio" name="aprsthursday_mode" value="broadcast" checked> Broadcast</label>';
    html += '        <label class="aprsthursday-radio"><input type="radio" name="aprsthursday_mode" value="logonly"> Log-only</label>';
    html += '      </div>';

    // Action buttons (Leave only - Join is done via modal)
    html += '      <div class="aprsthursday-actions">';
    html += '        <button type="button" class="btn btn-sm btn-aprsthursday-leave" id="btn_leave_net">Leave Net</button>';
    html += '      </div>';

    // Quick message templates
    html += '      <div class="aprsthursday-templates">';
    html += '        <span class="aprsthursday-templates-label">Quick Messages:</span>';
    html += '        <div class="aprsthursday-template-buttons">';
    html += '          <button type="button" class="btn btn-sm btn-outline-secondary aprsthursday-tpl" data-template="location">Checking in from...</button>';
    html += '          <button type="button" class="btn btn-sm btn-outline-secondary aprsthursday-tpl" data-template="greeting">73 de ' + get_my_callsign() + '</button>';
    html += '          <button type="button" class="btn btn-sm btn-outline-secondary aprsthursday-tpl" data-template="happy">Happy APRSThursday!</button>';
    html += '        </div>';
    html += '      </div>';

    html += '    </div>'; // panel-body
    html += '  </div>'; // collapse
    html += '</div>'; // panel

    // Message area (speech wrapper)
    html += '<div class="speech-wrapper" id="' + wrapper_id + '"></div>';

    html += '</div>'; // tab-pane

    callsignTabsContent.append(html);

    // Restore mode radio button
    $('input[name="aprsthursday_mode"][value="' + aprsThursdayMode + '"]').prop('checked', true);

    // Update displays
    update_thursday_banner();
    update_subscription_status();

    // Restore any cached messages
    restore_aprsthursday_messages();
}

function remove_aprsthursday_tab() {
    $('#msgsAPRSTHURSDAYLi').remove();
    $('#msgsAPRSTHURSDAYContent').remove();
    delete callsign_list['APRSTHURSDAY'];

    // If this was the selected tab, clear selection
    if (selected_tab_callsign === 'APRSTHURSDAY') {
        selected_tab_callsign = null;
        // Select first available tab
        var tabs = $("#msgsTabList .nav-link[callsign]");
        for (var i = 0; i < tabs.length; i++) {
            var cs = $(tabs[i]).attr('callsign');
            if (cs && cs !== 'ADD_TAB' && cs !== 'APRSTHURSDAY') {
                $(tabs[i]).click();
                break;
            }
        }
    }

    update_mobile_dropdown();
}

function activate_aprsthursday_tab() {
    var tabBtn = $('#msgsAPRSTHURSDAY');
    if (tabBtn.length > 0) {
        var tab = new bootstrap.Tab(tabBtn[0]);
        tab.show();
        selected_tab_callsign = 'APRSTHURSDAY';
        if (typeof updateSendButton === 'function') {
            updateSendButton();
        }
    }
}

// =====================================================
// Control Panel Handlers
// =====================================================

function init_aprsthursday_controls() {
    // Mode selector (in tab control panel)
    $(document).on('change', 'input[name="aprsthursday_mode"]', function() {
        aprsThursdayMode = $(this).val();
        save_aprsthursday_state();
    });

    // --- Modal controls ---

    // Join Net button (in modal)
    $(document).on('click', '#modal_join_net', function() {
        var message = $('#aprsthursday_join_msg').val().trim();
        if (!message) {
            $('#aprsthursday_join_msg').addClass('is-invalid');
            $('#aprsthursday_join_msg').focus();
            return;
        }
        $('#aprsthursday_join_msg').removeClass('is-invalid');

        var mode = $('input[name="join_aprsthursday_mode"]:checked').val() || 'broadcast';

        // Send the join action
        send_aprsthursday_action('join', message, mode);

        // Update subscription state for broadcast mode
        if (mode === 'broadcast') {
            aprsThursdaySubscribed = true;
            aprsThursdaySubscribedAt = new Date();
            aprsThursdayExpiresAt = new Date(Date.now() + SUBSCRIPTION_DURATION_MS);
        }

        // Complete the join — creates tab with message
        complete_aprsthursday_join(message, mode);
    });

    // Silent Subscribe button (in modal)
    $(document).on('click', '#modal_silent_subscribe', function() {
        var mode = $('input[name="join_aprsthursday_mode"]:checked').val() || 'broadcast';

        send_aprsthursday_action('silent_subscribe', '', 'broadcast');
        aprsThursdaySubscribed = true;
        aprsThursdaySubscribedAt = new Date();
        aprsThursdayExpiresAt = new Date(Date.now() + SUBSCRIPTION_DURATION_MS);

        // Complete the join — creates tab without a message
        complete_aprsthursday_join('', mode);
    });

    // Quick message templates in the modal
    $(document).on('click', '.aprsthursday-join-tpl', function() {
        var template = $(this).data('template');
        var message = '';
        var myCallsign = get_my_callsign();

        switch (template) {
            case 'location':
                var location = prompt("Enter your location (city, state, grid, etc.):");
                if (location) {
                    message = "Checking in from " + location;
                }
                break;
            case 'greeting':
                message = "73 de " + myCallsign;
                break;
            case 'happy':
                message = "Happy APRSThursday!";
                break;
        }

        if (message) {
            $('#aprsthursday_join_msg').val(message);
            $('#aprsthursday_join_msg').removeClass('is-invalid');
            $('#aprsthursday_join_msg').focus();
        }
    });

    // Allow Enter key in modal message input to submit
    $(document).on('keydown', '#aprsthursday_join_msg', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            $('#modal_join_net').click();
        }
    });

    // --- Tab controls ---

    // Leave Net button (in tab control panel)
    $(document).on('click', '#btn_leave_net', function() {
        show_aprsthursday_leave_modal();
    });

    // Confirm Leave button (in leave modal)
    $(document).on('click', '#modal_confirm_leave', function() {
        send_aprsthursday_action('unsubscribe', '', 'broadcast');
        aprsThursdaySubscribed = false;
        aprsThursdaySubscribedAt = null;
        aprsThursdayExpiresAt = null;
        update_subscription_status();
        save_aprsthursday_state();

        // Close the modal but keep the tab open
        var modalEl = document.getElementById('aprsthursdayLeaveModal');
        var modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    });

    // Quick message templates (in tab control panel)
    $(document).on('click', '.aprsthursday-tpl', function() {
        var template = $(this).data('template');
        insert_quick_template(template);
    });

    // Handle panel toggle chevron rotation
    $(document).on('show.bs.collapse', '#aprsthursdayControls', function() {
        $('.aprsthursday-panel-chevron').addClass('rotated');
    });
    $(document).on('hide.bs.collapse', '#aprsthursdayControls', function() {
        $('.aprsthursday-panel-chevron').removeClass('rotated');
    });
}

// =====================================================
// Socket Event Handlers
// =====================================================

function init_aprsthursday_socket_handlers() {
    socket.on("aprsthursday_message", function(msg) {
        console.log("APRSThursday message received:", msg);
        handle_aprsthursday_message(msg);
    });

    socket.on("aprsthursday_confirmation", function(msg) {
        console.log("APRSThursday confirmation:", msg);
        handle_aprsthursday_confirmation(msg);
    });
}

// =====================================================
// Message Handling
// =====================================================

function handle_aprsthursday_message(data) {
    if (!aprsThursdayEnabled) {
        return; // Feature disabled, ignore
    }

    // Store the message
    aprsThursdayMessages.push(data);
    save_aprsthursday_messages();

    // Ensure tab exists
    if ($('#msgsAPRSTHURSDAYLi').length === 0) {
        create_aprsthursday_tab(false);
    }

    // Create and append message HTML
    var msg_html = create_aprsthursday_message_html(data);
    var wrapper = $('#msgsAPRSTHURSDAYSpeechWrapper');
    wrapper.append(msg_html);

    // Scroll to bottom
    setTimeout(function() {
        scroll_to_bottom('APRSTHURSDAY');
    }, 50);

    // Update notification badge if not currently viewing
    if (selected_tab_callsign !== 'APRSTHURSDAY') {
        var badge = $('#msgsAPRSTHURSDAYnotify');
        if (badge.length === 0) {
            // Create badge if it doesn't exist
            var tabBtn = $('#msgsAPRSTHURSDAY');
            tabBtn.append('<span id="msgsAPRSTHURSDAYnotify" class="position-absolute top-0 start-80 translate-middle badge bg-danger border border-light rounded-pill">1</span>');
        } else {
            var count = parseInt(badge.text()) || 0;
            badge.text(count + 1);
            badge.removeClass('visually-hidden');
        }
        update_mobile_dropdown();
    }
}

function create_aprsthursday_message_html(data) {
    var sender = escapeHtml(data.sender);
    var message = escapeHtml(data.message);
    var raw = data.raw_packet ? escapeHtmlAttribute(data.raw_packet) : '';
    var raw_text = data.raw_packet ? escapeHtml(data.raw_packet) : '(raw packet not available)';

    // Parse timestamp
    var ts = data.timestamp ? new Date(data.timestamp) : new Date();
    var time_str = ts.toLocaleTimeString("en-US", {hour: '2-digit', minute: '2-digit'});

    // Check if we have cached location for this sender
    var locationHtml = '';
    if (aprsThursdayLocationCache[data.sender]) {
        locationHtml = build_sender_location_html(data.sender, aprsThursdayLocationCache[data.sender]);
    } else {
        locationHtml = '<a href="#" class="aprsthursday-fetch-location" data-callsign="' + escapeHtmlAttribute(data.sender) + '">Fetch location</a>';
    }

    var html = '<div class="bubble-row aprsthursday-msg-row">';
    // Sender header with location
    html += '<div class="aprsthursday-sender-header">';
    html += '<span class="aprsthursday-sender-callsign">' + sender + '</span>';
    html += '<span class="aprsthursday-sender-location" id="aprsthursday-loc-' + escapeHtmlAttribute(data.sender) + '">' + locationHtml + '</span>';
    html += '</div>';
    // Message bubble
    html += '<div class="bubble aprsthursday-bubble" title="APRS Raw Packet" data-bs-placement="right" data-bs-toggle="popover" data-bs-trigger="hover" data-bs-content="' + raw + '">';
    html += '<div class="bubble-text">';
    html += '<p class="bubble-message">' + message + '</p>';
    html += '<p class="bubble-raw-packet">' + raw_text + '</p>';
    html += '<span class="bubble-timestamp aprsthursday-timestamp">' + escapeHtml(time_str) + '</span>';
    html += '</div></div></div>';

    return html;
}

function build_sender_location_html(callsign, locData) {
    var html = '';
    if (locData.distance && locData.compass_bearing) {
        // Show bearing arrow + distance + cardinal
        var bearing = parseFloat(locData.course) || 0;
        html += '<span class="aprsthursday-bearing-arrow" style="display:inline-block;transform:rotate(' + bearing + 'deg);">&#x2191;</span> ';
        html += escapeHtml(locData.distance) + ' km ' + escapeHtml(locData.compass_bearing);
    } else if (locData.lat && locData.lon) {
        html += escapeHtml(String(locData.lat)) + ', ' + escapeHtml(String(locData.lon));
    }
    return html;
}

function restore_aprsthursday_messages() {
    // Restore messages from session
    var wrapper = $('#msgsAPRSTHURSDAYSpeechWrapper');
    if (wrapper.length === 0) return;

    for (var i = 0; i < aprsThursdayMessages.length; i++) {
        var msg_html = create_aprsthursday_message_html(aprsThursdayMessages[i]);
        wrapper.append(msg_html);
    }

    if (aprsThursdayMessages.length > 0) {
        setTimeout(function() {
            scroll_to_bottom('APRSTHURSDAY');
        }, 50);
    }
}

// =====================================================
// Location Fetching for HOTG Senders
// =====================================================

// Delegate click handler for fetch location links
$(document).on('click', '.aprsthursday-fetch-location', function(e) {
    e.preventDefault();
    var callsign = $(this).data('callsign');
    if (!callsign) return;

    // Show spinner
    var locSpan = $('#aprsthursday-loc-' + callsign.replace(/[^A-Z0-9-]/gi, ''));
    locSpan.html('<span class="spinner-border spinner-border-sm" role="status" style="width:12px;height:12px;"></span> Fetching...');

    // Use the existing socket event to fetch location
    socket.emit("get_callsign_location", {"callsign": callsign});

    // Set up a one-time handler to catch the response
    // We piggyback on the existing callsign_location handler
    var handler = function(msg) {
        if (msg.callsign && msg.callsign.toUpperCase() === callsign.toUpperCase()) {
            // Cache it
            aprsThursdayLocationCache[callsign.toUpperCase()] = msg;

            // Update ALL location displays for this callsign
            var locHtml = build_sender_location_html(callsign.toUpperCase(), msg);
            $('[id="aprsthursday-loc-' + callsign.toUpperCase() + '"]').html(locHtml);

            // Remove this handler
            socket.off("callsign_location", handler);
        }
    };
    socket.on("callsign_location", handler);

    // Timeout after 15 seconds
    setTimeout(function() {
        socket.off("callsign_location", handler);
        if (!aprsThursdayLocationCache[callsign.toUpperCase()]) {
            locSpan.html('<a href="#" class="aprsthursday-fetch-location" data-callsign="' + escapeHtmlAttribute(callsign) + '">Retry</a>');
        }
    }, 15000);
});

// =====================================================
// Confirmation Handling
// =====================================================

function handle_aprsthursday_confirmation(data) {
    if (data.type === 'subscribed') {
        aprsThursdaySubscribed = true;
        if (!aprsThursdaySubscribedAt) {
            aprsThursdaySubscribedAt = new Date();
            aprsThursdayExpiresAt = new Date(Date.now() + SUBSCRIPTION_DURATION_MS);
        }
        raise_info("APRSThursday: " + escapeHtml(data.message));
    } else if (data.type === 'unsubscribed') {
        aprsThursdaySubscribed = false;
        aprsThursdaySubscribedAt = null;
        aprsThursdayExpiresAt = null;
        raise_info("APRSThursday: " + escapeHtml(data.message));
    } else if (data.type === 'logged') {
        raise_info("APRSThursday logged: " + escapeHtml(data.message));
    }

    update_subscription_status();
    save_aprsthursday_state();
}

// =====================================================
// Sending Messages
// =====================================================

function send_aprsthursday_action(action, message, mode) {
    if (!socketio_connected) {
        raise_error("Not connected to APRSD server. Please check your connection.");
        return;
    }

    var path = $('#pkt_path option:selected').val();

    var data = {
        'action': action,
        'message': message,
        'mode': mode,
        'path': path || ''
    };

    console.log("Sending APRSThursday action:", data);
    socket.emit("aprsthursday_send", data);

    // Show confirmation toast
    var action_labels = {
        'join': 'Joining APRSThursday net' + (mode === 'logonly' ? ' (log-only)' : ''),
        'message': 'Sending to APRSThursday' + (mode === 'logonly' ? ' (log-only)' : ''),
        'silent_subscribe': 'Silent subscribing to HOTG',
        'unsubscribe': 'Leaving APRSThursday net'
    };
    raise_info(action_labels[action] || 'APRSThursday action sent');
}

/**
 * Check if the sendform should be intercepted for APRSThursday.
 * Called from the sendform submit handler in send-message.js.
 * Returns true if the message was handled (caller should return).
 */
function handle_aprsthursday_send() {
    if (selected_tab_callsign !== 'APRSTHURSDAY') {
        return false;
    }

    var message = $('#message').val().trim();
    if (!message) {
        raise_error("You must enter a message to send");
        return true;
    }

    send_aprsthursday_action('message', message, aprsThursdayMode);

    // Add to local display as our own message
    var myCallsign = get_my_callsign();
    var outgoing = {
        sender: myCallsign,
        message: message,
        timestamp: new Date().toISOString(),
        raw_packet: ''
    };
    handle_aprsthursday_message(outgoing);

    // Clear input
    $('#message').val('');
    $('#send_msg').prop('disabled', true);
    setTimeout(function() { $('#message').focus(); }, 100);

    return true;
}

// =====================================================
// Quick Message Templates
// =====================================================

function insert_quick_template(template) {
    var message = '';
    var myCallsign = get_my_callsign();

    switch (template) {
        case 'location':
            var location = prompt("Enter your location (city, state, grid, etc.):");
            if (location) {
                message = "Checking in from " + location;
            }
            break;
        case 'greeting':
            message = "73 de " + myCallsign;
            break;
        case 'happy':
            message = "Happy APRSThursday!";
            break;
    }

    if (message) {
        $('#message').val(message);
        $('#message').focus();
        if (typeof updateSendButton === 'function') {
            updateSendButton();
        }
    }
}

// =====================================================
// Thursday Detection
// =====================================================

function is_aprs_thursday_utc() {
    var now = new Date();
    // getUTCDay() returns 0=Sun, 1=Mon, ..., 4=Thu
    return now.getUTCDay() === 4;
}

function update_thursday_banner() {
    var banner = $('#thursday_banner');
    if (banner.length === 0) return;

    if (is_aprs_thursday_utc()) {
        banner.html('<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">celebration</span> It\'s APRSThursday!');
        banner.removeClass('thursday-banner-warning').addClass('thursday-banner-active');
    } else {
        banner.html('<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">info</span> APRSThursday runs Thursdays 00:00&ndash;23:59 UTC');
        banner.removeClass('thursday-banner-active').addClass('thursday-banner-warning');
    }
}

// =====================================================
// Subscription Status
// =====================================================

function update_subscription_status() {
    var statusEl = $('#aprsthursday_sub_status');
    if (statusEl.length === 0) return;

    if (!aprsThursdaySubscribed) {
        statusEl.html('Not subscribed');
        statusEl.removeClass('sub-active').addClass('sub-inactive');
    } else {
        var statusText = 'Subscribed';
        if (aprsThursdayExpiresAt) {
            var remaining = aprsThursdayExpiresAt.getTime() - Date.now();
            if (remaining > 0) {
                var hours = Math.floor(remaining / (60 * 60 * 1000));
                var mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                if (hours > 0) {
                    statusText += ' (expires in ~' + hours + 'h ' + mins + 'm)';
                } else {
                    statusText += ' (expires in ~' + mins + 'm)';
                }
            } else {
                // Expired
                aprsThursdaySubscribed = false;
                aprsThursdaySubscribedAt = null;
                aprsThursdayExpiresAt = null;
                statusEl.html('Subscription expired');
                statusEl.removeClass('sub-active').addClass('sub-inactive');
                save_aprsthursday_state();
                return;
            }
        }
        statusEl.html(statusText);
        statusEl.removeClass('sub-inactive').addClass('sub-active');
    }
}

function periodic_aprsthursday_check() {
    update_thursday_banner();
    update_subscription_status();
    // Info bar updates are handled by its own timer — no need to call here
}

/**
 * Start the info bar alternation timer when the APRSThursday tab is active.
 */
function start_aprsthursday_info_bar() {
    // Render immediately
    update_aprsthursday_info_bar();
    // Stop any existing timer
    stop_aprsthursday_info_bar();
    // Alternate every 5 seconds
    aprsThursdayInfoBarTimer = setInterval(function() {
        aprsThursdayInfoBarPhase = (aprsThursdayInfoBarPhase + 1) % 2;
        update_aprsthursday_info_bar();
    }, 5000);
}

/**
 * Stop the info bar alternation timer.
 */
function stop_aprsthursday_info_bar() {
    if (aprsThursdayInfoBarTimer) {
        clearInterval(aprsThursdayInfoBarTimer);
        aprsThursdayInfoBarTimer = null;
    }
}

/**
 * Calculate time remaining in the current APRSThursday event (Thursday UTC).
 * Returns {hours, mins} or null if it's not Thursday UTC.
 */
function get_contest_time_remaining() {
    var now = new Date();
    if (now.getUTCDay() !== 4) {
        // Not Thursday — calculate time until next Thursday
        return null;
    }
    // End of Thursday UTC is midnight Friday UTC
    var endOfThursday = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
        23, 59, 59, 999
    ));
    var remaining = endOfThursday.getTime() - now.getTime();
    if (remaining <= 0) return null;
    var hours = Math.floor(remaining / (60 * 60 * 1000));
    var mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return { hours: hours, mins: mins };
}

/**
 * Update the info bar with APRSThursday status.
 * Alternates between subscription status and contest time remaining.
 */
function update_aprsthursday_info_bar() {
    var html = '<span style="padding-left:5px;font-size:.85rem;">';
    html += '<strong style="color:#e65100;">APRSThursday</strong> &mdash; ';

    if (aprsThursdayInfoBarPhase === 0) {
        // Phase 0: Subscription status
        if (aprsThursdaySubscribed) {
            html += '<span style="color:#4caf50;">Subscribed</span>';
            if (aprsThursdayExpiresAt) {
                var remaining = aprsThursdayExpiresAt.getTime() - Date.now();
                if (remaining > 0) {
                    var hours = Math.floor(remaining / (60 * 60 * 1000));
                    var mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                    if (hours > 0) {
                        html += ' <span style="opacity:0.7;">(sub expires in ~' + hours + 'h ' + mins + 'm)</span>';
                    } else {
                        html += ' <span style="opacity:0.7;">(sub expires in ~' + mins + 'm)</span>';
                    }
                }
            }
            html += ' &bull; Mode: <strong>' + escapeHtml(aprsThursdayMode === 'logonly' ? 'Log-only' : 'Broadcast') + '</strong>';
        } else {
            html += '<span style="opacity:0.6;">Not subscribed</span>';
        }
    } else {
        // Phase 1: Contest time remaining
        var contestTime = get_contest_time_remaining();
        if (contestTime) {
            html += '<span style="color:#4caf50;">Event active</span> ';
            if (contestTime.hours > 0) {
                html += '<span style="opacity:0.7;">(ends in ' + contestTime.hours + 'h ' + contestTime.mins + 'm)</span>';
            } else {
                html += '<span style="opacity:0.7;">(ends in ' + contestTime.mins + 'm)</span>';
            }
        } else {
            // Not Thursday — show time until next Thursday
            var now = new Date();
            var daysUntil = (4 - now.getUTCDay() + 7) % 7;
            if (daysUntil === 0) daysUntil = 7; // shouldn't happen since we checked above
            html += '<span style="opacity:0.6;">Next event in ' + daysUntil + ' day' + (daysUntil !== 1 ? 's' : '') + ' (Thursday UTC)</span>';
        }
    }

    html += '</span>';
    $("#info_bar_container").html(html);
}

// =====================================================
// State Persistence (localStorage)
// =====================================================

function save_aprsthursday_state() {
    localStorage.setItem('aprsd-webchat-aprsthursday-enabled', aprsThursdayEnabled ? 'true' : 'false');
    localStorage.setItem('aprsd-webchat-aprsthursday-subscribed', aprsThursdaySubscribed ? 'true' : 'false');
    localStorage.setItem('aprsd-webchat-aprsthursday-mode', aprsThursdayMode);
    localStorage.setItem('aprsd-webchat-aprsthursday-subscribed-at',
        aprsThursdaySubscribedAt ? aprsThursdaySubscribedAt.toISOString() : '');
    localStorage.setItem('aprsd-webchat-aprsthursday-expires-at',
        aprsThursdayExpiresAt ? aprsThursdayExpiresAt.toISOString() : '');
}

function load_aprsthursday_state() {
    aprsThursdayEnabled = localStorage.getItem('aprsd-webchat-aprsthursday-enabled') === 'true';
    aprsThursdaySubscribed = localStorage.getItem('aprsd-webchat-aprsthursday-subscribed') === 'true';
    aprsThursdayMode = localStorage.getItem('aprsd-webchat-aprsthursday-mode') || 'broadcast';

    var subAt = localStorage.getItem('aprsd-webchat-aprsthursday-subscribed-at');
    aprsThursdaySubscribedAt = subAt ? new Date(subAt) : null;

    var expAt = localStorage.getItem('aprsd-webchat-aprsthursday-expires-at');
    aprsThursdayExpiresAt = expAt ? new Date(expAt) : null;

    // Check if subscription has expired
    if (aprsThursdaySubscribed && aprsThursdayExpiresAt && aprsThursdayExpiresAt.getTime() < Date.now()) {
        aprsThursdaySubscribed = false;
        aprsThursdaySubscribedAt = null;
        aprsThursdayExpiresAt = null;
        save_aprsthursday_state();
    }

    // Load cached messages from sessionStorage (not localStorage - these are ephemeral)
    try {
        var cached = sessionStorage.getItem('aprsd-webchat-aprsthursday-messages');
        if (cached) {
            aprsThursdayMessages = JSON.parse(cached);
        }
    } catch (e) {
        aprsThursdayMessages = [];
    }
}

function save_aprsthursday_messages() {
    try {
        sessionStorage.setItem('aprsd-webchat-aprsthursday-messages', JSON.stringify(aprsThursdayMessages));
    } catch (e) {
        // sessionStorage full, trim old messages
        if (aprsThursdayMessages.length > 50) {
            aprsThursdayMessages = aprsThursdayMessages.slice(-50);
            sessionStorage.setItem('aprsd-webchat-aprsthursday-messages', JSON.stringify(aprsThursdayMessages));
        }
    }
}

// =====================================================
// Utility
// =====================================================

function get_my_callsign() {
    // Try to get callsign from initial_stats
    if (typeof initial_stats !== 'undefined' && initial_stats && initial_stats.stats &&
        initial_stats.stats.APRSDStats && initial_stats.stats.APRSDStats.callsign) {
        return initial_stats.stats.APRSDStats.callsign;
    }
    // Fallback: read from the callsign badge in the header
    var badge = $('.callsign-badge').first();
    if (badge.length > 0) {
        return badge.text().trim();
    }
    return 'NOCALL';
}
