var gps_icon_opacity = 0.2;
var gps_icon_interval = null;
var current_stats = null;
var gps_settings = null;
// Track if a beacon has been sent (for warning users to beacon before messaging)
var beacon_sent = localStorage.getItem('aprsd-webchat-beacon-sent') === 'true';
// Track the last beacon sent time
var last_beacon_time = localStorage.getItem('aprsd-webchat-last-beacon-time') || null;

// Threshold in milliseconds for beacon highlight (5 minutes for testing)
// TODO: Change to 1 hour for production: var BEACON_STALE_THRESHOLD_MS = 60 * 60 * 1000;
var BEACON_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes for testing

// Timer for periodic beacon highlight check
var beacon_highlight_timer = null;

// Track original GPS settings values for change detection
var original_gps_settings = {
    beaconing_setting: null,
    beacon_interval: null,
    smart_beacon_distance_threshold: null,
    smart_beacon_time_window: null
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text
 */
function escapeHtml(text) {
    if (text == null || text === undefined) {
        return '';
    }
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update the GPS status indicator in the UI.
 * @param {string} status - One of: 'fix', 'no-fix', 'no-gps', 'config-only', 'waiting'
 * @param {string} [message] - Optional custom message
 */
function update_gps_status(status, message) {
    var el = $('#gps_status');
    // Dispose any existing Bootstrap tooltips before replacing content
    el.find('[data-bs-toggle="tooltip"]').each(function() {
        var tip = bootstrap.Tooltip.getInstance(this);
        if (tip) tip.dispose();
    });
    el.removeClass('gps-status-fix gps-status-no-fix gps-status-no-gps gps-status-config gps-status-waiting gps-status-error gps-status-no-fix-config');
    switch (status) {
        case 'fix':
            el.addClass('gps-status-fix');
            el.html(message || 'GPS Fix');
            break;
        case 'no-fix':
            el.addClass('gps-status-no-fix');
            el.html(message || 'No GPS Fix');
            break;
        case 'no-fix-config':
            el.addClass('gps-status-no-fix-config');
            el.html(message || 'No GPS Fix - Using Config Location');
            break;
        case 'gps-error':
            el.addClass('gps-status-error');
            el.html(message || 'GPS Daemon Error');
            break;
        case 'no-gps':
            el.addClass('gps-status-no-gps');
            el.html(message || 'GPS Not Available');
            break;
        case 'config-only':
            el.addClass('gps-status-config');
            el.html(message || 'Using Config Location');
            break;
        case 'waiting':
        default:
            el.addClass('gps-status-waiting');
            el.html(message || 'Waiting...');
            break;
    }
}


var beaconing_settings = [
    { value: 0, description: 'Disabled' },
    { value: 1, description: 'Manual Enabled' },
    { value: 2, description: 'Interval Beaconing every N seconds' },
    { value: 3, description: 'Smart Beaconing' },
];
var beaconing_type = [
    { value: 'none', description: 'Manual' },
    { value: 'interval', description: 'Interval' },
    { value: 'smart', description: 'Smart' },
];


function get_beacon_type_from_value(value) {
    // the beaconing type is a string with possible values of none, interval, and smart.
    // when the value is none, it might mean disabled or manual.$
    // manual is the value when beaconing is enabled in the config.
    // we check the current stats to see if beaconing is enabled in the config.
    enabled = current_stats.stats.gps.beaconing_enabled;
    return_value = 0;
    if (enabled == false) {
        return_value = 0;
    } else if (enabled == true && value == 'none') {
        return_value = 1;
    } else if (enabled == true && value == 'interval') {
        return_value = 2;
    } else if (enabled == true && value == 'smart') {
        return_value = 3;
    }
    return return_value;
}

/**
 * Check if any GPS settings have changed from their original values
 * and update the Save Settings button highlight accordingly
 */
function check_gps_settings_changed() {
    // Convert all values to strings for consistent comparison
    var current_beaconing = String($('#beaconing_setting').val());
    var current_interval = String($('#beacon_interval').val());
    var current_distance = String($('#smart_beacon_distance_threshold').val());
    var current_time_window = String($('#smart_beacon_time_window').val());

    var has_changes = (
        current_beaconing !== String(original_gps_settings.beaconing_setting) ||
        current_interval !== String(original_gps_settings.beacon_interval) ||
        current_distance !== String(original_gps_settings.smart_beacon_distance_threshold) ||
        current_time_window !== String(original_gps_settings.smart_beacon_time_window)
    );

    if (has_changes) {
        $('#save_beacon_settings').addClass('btn-highlight');
    } else {
        $('#save_beacon_settings').removeClass('btn-highlight');
    }
}

function update_gps_settings(data) {
    // We got the settings from the gps extension,
    // so we need to update the saved settings.
    // and update the UI with the new settings.
    gps_settings = data.settings;
    get_beacon_type_from_value(gps_settings.beacon_type);
    var beaconing_value = get_beacon_type_from_value(gps_settings.beacon_type);
    $('#beaconing_setting').val(beaconing_value);
    $('#beacon_interval').val(gps_settings.beacon_interval);
    $('#smart_beacon_distance_threshold').val(gps_settings.smart_beacon_distance_threshold);
    $('#smart_beacon_time_window').val(gps_settings.smart_beacon_time_window);

    // Store original values for change detection (as strings for consistent comparison)
    original_gps_settings.beaconing_setting = String(beaconing_value);
    original_gps_settings.beacon_interval = String(gps_settings.beacon_interval);
    original_gps_settings.smart_beacon_distance_threshold = String(gps_settings.smart_beacon_distance_threshold);
    original_gps_settings.smart_beacon_time_window = String(gps_settings.smart_beacon_time_window);

    // Remove any highlight since we just loaded fresh settings
    $('#save_beacon_settings').removeClass('btn-highlight');

    //Now enable the correct ui elements based on the beaconing type.
    set_beaconing_setting(beaconing_value);
}

function set_beaconing_setting(value, description='') {
    console.log("setting beaconing setting to", value);
    // Convert value to number if it's a string
    value = parseInt(value, 10);
    $('#beaconing_setting').val(value);

    if (beaconing_enabled == false) {
        $('#send_beacon, #send_beacon_quick').prop('disabled', true);
        $('#save_beacon_settings').prop('disabled', true);
        $('#beaconing_setting').prop('disabled', true);
        $('#beaconing_setting_description').text('disabled in config');
        $('#gps_icon').css('opacity', 0.5);
        // Hide all optional UI elements
        $('#beacon_interval_group').hide();
        $('#smart_beacon_time_window_group').hide();
        $('#smart_beacon_distance_threshold_group').hide();
        return;
    }

    if (value == 0) {
        // Beaconing is completely disabled.
        $('#send_beacon, #send_beacon_quick').prop('disabled', true);
        if (description != '') {
            beaconing_description = description;
            //disable the range selection and the save beacon settings button.
            $('#beaconing_setting').prop('disabled', true);
            $('#save_beacon_settings').prop('disabled', true);
        } else {
            beaconing_description = 'disabled';
        }
        $('#beaconing_setting_description').text(beaconing_description);
        $('#gps_icon').css('opacity', 0.5);
        // Hide all optional UI elements
        $('#beacon_interval_group').hide();
        $('#smart_beacon_time_window_group').hide();
        $('#smart_beacon_distance_threshold_group').hide();
    } else {
        //Always enable the send beacon if we have a gps fix.
        $('#send_beacon, #send_beacon_quick').prop('disabled', false);
    }

    if (value == 1) {
        description = 'Manual';
        $('#beaconing_setting_description').text(description);
        // Hide interval and smart beaconing UI elements for manual mode
        $('#beacon_interval_group').hide();
        $('#smart_beacon_time_window_group').hide();
        $('#smart_beacon_distance_threshold_group').hide();
    }

    // if the beaconing setting is set to interval, enable the beacon interval.
    if (value == 2) {
        $('#beacon_interval_group').show();
        description = 'Interval Beaconing every N seconds';
        $('#beaconing_setting_description').text(description);
        // Hide smart beaconing UI elements
        $('#smart_beacon_time_window_group').hide();
        $('#smart_beacon_distance_threshold_group').hide();
    }

    // if the beaconing setting is set to smart, enable the smart beaconing distance threshold.
    // Note: Smart option is only visible when GPS extension is installed, so no fallback needed
    if (value == 3) {
        $('#smart_beacon_time_window_group').show();
        $('#smart_beacon_distance_threshold_group').show();
        description = 'Smart Beaconing';
        $('#beaconing_setting_description').text(description);
        // Hide interval UI elements
        $('#beacon_interval_group').hide();
    }

    // Update active slider tick label
    $('.slider-tick').removeClass('active');
    $('.slider-tick').eq(value).addClass('active');
}

function init_gps() {
    console.log("init_gps Called.")
    current_stats = initial_stats;
    console.log(current_stats);

    // register the send beacon button click event.
    $("#send_beacon, #send_beacon_quick").click(function() {
        // If the gps extension is installed and enabled,
        // we try and get the lat/lon from current gps position.
        if (current_stats.stats.gps.gps_extension.is_installed == true && current_stats.stats.gps.gps_extension.enabled == true) {
            var lat = current_stats.stats.GPSStats.latitude;
            var lon = current_stats.stats.GPSStats.longitude;
            var alt = current_stats.stats.GPSStats.altitude;
            // If GPS has no fix (coords are 0), fall back to config lat/lon
            if (!lat && !lon && current_stats.stats.gps.latitude && current_stats.stats.gps.longitude) {
                lat = current_stats.stats.gps.latitude;
                lon = current_stats.stats.gps.longitude;
                alt = 0;
            }
            sendPosition({'coords': {'latitude': lat, 'longitude': lon, 'altitude': alt}});
        } else if (current_stats.stats.gps.latitude !== null && current_stats.stats.gps.longitude !== null) {
            // GPS extension not installed or disabled -- use config lat/lon.
            sendPosition({'coords': {'latitude': current_stats.stats.gps.latitude, 'longitude': current_stats.stats.gps.longitude}})
        }
    });

    // Hide Smart beaconing option if GPS extension is not installed or not enabled
    var gps_ext = current_stats.stats.gps.gps_extension;
    if (gps_ext.is_installed != true || gps_ext.enabled != true) {
        // Set the max value for the beaconing type to 2 (Interval Beaconing).
        $('#beaconing_setting').prop('max', 2);
        // Hide the Smart tick label since it's not available
        $('.slider-tick:nth-child(4)').hide();
        // Reposition tick marks for 3 options (0%, 50%, 100%) instead of 4
        $('.slider-ticks').addClass('three-options');
    }

    // When the GPS stats are received, update the GPS fix.
    socket.on("gps_stats", function(msg) {
        console.log("GPS message received: ", msg);
        update_gps_fix(msg);
    });

    // When we send a beacon, update the radio icon
    socket.on("gps_beacon_sent", function(msg) {
        console.log("Beacon sent: ", msg);
        // Mark that a beacon has been sent
        beacon_sent = true;
        localStorage.setItem('aprsd-webchat-beacon-sent', 'true');
        // Store the beacon sent time
        last_beacon_time = new Date().toISOString();
        localStorage.setItem('aprsd-webchat-last-beacon-time', last_beacon_time);
        // Update the UI with the last beacon time
        update_last_beacon_display();
        // Close the beacon warning toast if it's open
        if (typeof window.closeBeaconWarningToast === 'function') {
            window.closeBeaconWarningToast();
        }
        beacon_toast(msg);
    });

    // When the GPS settings are received, update the GPS settings.
    socket.on("gps_settings", function(msg) {
        console.log("GPS settings received: ", msg);
        update_gps_settings(msg);
    });

    //if beaconing is disabled, disable the beacon button.
    // if gps extension is installed and enabled, we can enable the beacon button.
    //$('#send_beacon').prop('disabled', true);
    gps = initial_stats.stats.gps;
    // beacon_types are none, interval, and smart.
    //console.log("beaconing_type is ", gps.gps_extension.beacon_type);

    $('#radio_icon').css('opacity', 0.2);
    $('#gps_icon').css('opacity', 0.2);
    beaconing_description = '';
    if (gps.beaconing_enabled == false) {
        // Beaconing is disabled in config - controls will be disabled,
        // but we still detect GPS extension and display coordinates.
        beaconing_setting = 0;
        if (gps.gps_extension.is_installed == true && gps.gps_extension.enabled == true) {
            // GPS extension is running - live coords will arrive via WebSocket.
            // Show config lat/lon initially until live data comes in.
            update_gps_status('waiting', 'Waiting for GPS...');
            if (gps.latitude !== null && gps.longitude !== null) {
                update_gps_info_box(gps.latitude, gps.longitude, 0, 0, 0, gps.time);
            }
        } else if (gps.latitude !== null && gps.longitude !== null) {
            // No GPS extension, but we have config lat/lon
            update_gps_status('config-only');
            update_gps_info_box(gps.latitude, gps.longitude, 0, 0, 0, gps.time);
        } else {
            update_gps_status('no-gps');
        }
    } else {
        if (gps.gps_extension.is_installed == true) {
            if (gps.gps_extension.enabled == true) {
                update_gps_status('waiting', 'Waiting for GPS...');
                if (gps.gps_extension.beacon_type == 'smart') {
                    beaconing_setting = 3;
                } else if (gps.gps_extension.beacon_type == 'interval') {
                    beaconing_setting = 2;
                } else {
                    beaconing_setting = 1;
                }
            } else {
                console.log(gps.latitude, gps.longitude);
                console.log(isNaN(gps.latitude), isNaN(gps.longitude));
                //If we have hard coded lat/lon then we can send in manual mode.
                if (gps.latitude === null || gps.longitude === null) {
                    console.log("Beaconing is disabled in config.  We have no lat/lon in the webchat extension.");
                    beaconing_description = 'missing lat/lon in config';
                    update_gps_info_box(0, 0, 0, 0, 0, new Date());
                    update_gps_status('no-gps', 'GPS Disabled, No Config Location');
                    beaconing_setting = 0;
                } else {
                    console.log("Beaconing is enabled in config.  have to use webchat lat/lon, which is set in the config.");
                    update_gps_info_box(gps.latitude, gps.longitude, 0, 0, 0, gps.time);
                    update_gps_status('config-only');
                    beaconing_setting = 1;
                }
            }
        } else {
            // GPS extension not installed
            if (gps.latitude === null || gps.longitude === null) {
                console.log("Beaconing is disabled in config.  We have no lat/lon in the webchat extension.");
                beaconing_description = 'missing lat/lon in config';
                update_gps_info_box(0, 0, 0, 0, 0, new Date());
                update_gps_status('no-gps');
                beaconing_setting = 0;
            } else {
                update_gps_status('config-only');
                beaconing_setting = 1;
            }
        }
    }

    set_beaconing_setting(beaconing_setting, beaconing_description);

    // Store original values for change detection
    // Read from the actual input values to capture defaults from HTML
    original_gps_settings.beaconing_setting = String($('#beaconing_setting').val());
    original_gps_settings.beacon_interval = String($('#beacon_interval').val());
    original_gps_settings.smart_beacon_distance_threshold = String($('#smart_beacon_distance_threshold').val());
    original_gps_settings.smart_beacon_time_window = String($('#smart_beacon_time_window').val());

    if (gps.gps_extension.smart_beacon_distance_threshold) {
        $('#smart_beacon_distance_threshold').val(gps.gps_extension.smart_beacon_distance_threshold);
        original_gps_settings.smart_beacon_distance_threshold = String(gps.gps_extension.smart_beacon_distance_threshold);
    }

    if (gps.gps_extension.smart_beacon_time_window) {
        $('#smart_beacon_time_window').val(gps.gps_extension.smart_beacon_time_window);
        original_gps_settings.smart_beacon_time_window = String(gps.gps_extension.smart_beacon_time_window);
    }

    if (gps.gps_extension.gpsd_host) {
        $('#gps_extension_host').text(gps.gps_extension.gpsd_host);
    }

    if (gps.gps_extension.gpsd_port) {
        $('#gps_extension_port').text(gps.gps_extension.gpsd_port);
    }

    if (gps.gps_extension.beacon_interval) {
        $('#beacon_interval').val(gps.gps_extension.beacon_interval);
        original_gps_settings.beacon_interval = String(gps.gps_extension.beacon_interval);
    }

    // Initialize the last beacon display from localStorage
    update_last_beacon_display();
    // Beacon highlight for stale beacons - disabled for now to avoid confusing users
    // TODO: Re-enable when ready: update_beacon_highlight();
    // TODO: Re-enable when ready: start_beacon_highlight_timer();

    // Initialize GPS modal
    init_gps_modal();
}

function update_gps_info_box(latitude, longitude, altitude, speed, course, time) {
    $('#gps_lat').text(latitude);
    $('#gps_lon').text(longitude);
    $('#gps_alt').text(Math.floor(altitude) + " m");
    // convert meters per second to kilometers per hour
    var speed_kph = speed * 3.6;
    $('#gps_speed').text(Math.floor(speed_kph) + " km/h");
    $('#gps_course').text(Math.floor(course) + "°");
    $('#gps_timeago').timeago("update", time);
    // Flash the gps_info_box with a highlight to indicate an update.
    var box = $('#gps_info_box');
    box.addClass('gps-info-flash');
    setTimeout(function() {
        box.removeClass('gps-info-flash');
    }, 600);
}

function update_gps(data) {
    console.log("update_gps Called: ", data);
    current_stats = data;
    update_gps_fix(current_stats.stats.GPSStats);
}

function update_gps_fix(data) {
    // IF we have a fix, then enable the beacon button if the beaconing mode is
    // set to manual.  Also update the GPS satellite icon.
    current_stats.stats.GPSStats = data;
    gps = current_stats.stats.gps;
    beaconing_setting = $('#beaconing_setting').val();
    if (gps.gps_extension.is_installed == true && gps.gps_extension.enabled == true) {
        // We have the gps extension installed and enabled, so we can get the lat/lon from the current gps position.
        if (data.fix == true) {
            // Always display live GPS coordinates regardless of beaconing setting
            update_gps_info_box(data.latitude, data.longitude, data.altitude, data.speed, data.track, data.time);
            update_gps_status('fix');
            $('#gps_icon').css('opacity', 1);
            clearInterval(gps_icon_interval);
            gps_icon_interval = null;
            // Only enable beacon controls if beaconing is enabled
            if (gps.beaconing_enabled != false) {
                $('#send_beacon, #send_beacon_quick').prop('disabled', false);
                if (beaconing_setting == 1) {
                    $('#send_beacon, #send_beacon_quick').prop('disabled', false);
                }
                $('#beaconing_status').text('enabled');
            }
            return;
        } else {
            // No GPS fix -- check if we have config coordinates as fallback
            if (data.config_fallback == true && data.latitude && data.longitude) {
                // We have config lat/lon to fall back to
                update_gps_info_box(data.latitude, data.longitude, 0, 0, 0, new Date());
                update_gps_status('no-fix-config', 'No GPS Fix - Using Config Location <span class="gps-error-icon" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="GPS daemon is connected but does not have a satellite fix yet. Coordinates shown are static values from the APRSD config file.">&#9432;</span>');
                // Initialize Bootstrap tooltips on the newly added elements
                $('#gps_status [data-bs-toggle="tooltip"]').each(function() {
                    new bootstrap.Tooltip(this, {trigger: 'hover focus'});
                });
                $('#gps_icon').css('opacity', 0.5);
                clearInterval(gps_icon_interval);
                gps_icon_interval = null;
                // Enable beacon buttons since we have usable coordinates
                if (gps.beaconing_enabled != false) {
                    $('#send_beacon, #send_beacon_quick').prop('disabled', false);
                    $('#beaconing_status').text('enabled - using config location');
                }
            } else {
                update_gps_info_box(0, 0, 0, 0, 0, new Date());
                // Check if this is a GPS daemon error or just no satellite fix.
                if (data.error) {
                    var escaped_error = escapeHtml(data.error);
                    update_gps_status('gps-error', 'GPS Daemon Error <span class="gps-error-icon" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="' + escaped_error + '">&#9432;</span>');
                } else {
                    update_gps_status('no-fix', 'No GPS Fix <span class="gps-error-icon" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="GPS daemon is connected but does not have a satellite fix yet. Make sure the GPS antenna has a clear view of the sky.">&#9432;</span>');
                }
                // Initialize Bootstrap tooltips on the newly added elements
                $('#gps_status [data-bs-toggle="tooltip"]').each(function() {
                    new bootstrap.Tooltip(this, {trigger: 'hover focus'});
                });
                $('#send_beacon, #send_beacon_quick').prop('disabled', true);
                if (gps.beaconing_enabled != false) {
                    $('#beaconing_status').text('disabled - No fix');
                }
                $('#gps_icon').css('opacity', 0.2);
                if (gps_icon_interval == null) {
                    if (beaconing_setting != 0) {
                        gps_icon_interval = window.setInterval(function() {
                            $('#gps_icon').css('opacity', gps_icon_opacity);
                            gps_icon_opacity = gps_icon_opacity == 0.2 ? 1 : 0.2;
                        }, 800);
                    }
                }
            }
            return;
        }
    } else if (gps.gps_extension.is_installed == true && gps.gps_extension.enabled == false) {
        // GPS extension installed but disabled, fall back to config lat/lon
        if (gps.latitude !== null && gps.longitude !== null) {
            update_gps_info_box(gps.latitude, gps.longitude, data.altitude, data.speed, data.track, gps.time);
            update_gps_status('config-only');
            $('#gps_icon').css('opacity', 1);
            if (gps.beaconing_enabled != false) {
                $('#send_beacon, #send_beacon_quick').prop('disabled', false);
            }
        } else {
            console.log("We don't have a gps fix and no lat/lon in the config, so we can't send a beacon.");
            $('#send_beacon, #send_beacon_quick').prop('disabled', true);
            update_gps_info_box(0, 0, 0, 0, 0, new Date());
            update_gps_status('no-gps', 'GPS Disabled, No Config Location');
            if (gps.beaconing_enabled != false) {
                $('#beaconing_status').text('disabled - No lat/lon in config');
            }
            $('#gps_icon').css('opacity', 0.2);
        }

        return;
    }

    // GPS extension not installed, fall back to config lat/lon
    if (gps.latitude !== null && gps.longitude !== null) {
        update_gps_info_box(gps.latitude, gps.longitude, data.altitude, data.speed, data.track, gps.time);
        update_gps_status('config-only');
        $('#gps_icon').css('opacity', 1);
        if (gps.beaconing_enabled != false) {
            $('#send_beacon, #send_beacon_quick').prop('disabled', false);
        }
    } else {
        // No lat/lon available at all
        update_gps_status('no-gps');
        if (gps.beaconing_enabled == false) {
            // Still show zeros so the user sees something
            update_gps_info_box(0, 0, 0, 0, 0, new Date());
        } else {
            $('#send_beacon, #send_beacon_quick').prop('disabled', true);
            update_gps_info_box(0, 0, 0, 0, 0, new Date());
        }
    }
}

function beacon_toast(msg) {
  // First try to get lat/lon from the message if provided
  var lat = null;
  var lon = null;
  if (msg && msg.latitude !== undefined && msg.longitude !== undefined) {
    lat = msg.latitude;
    lon = msg.longitude;
  } else {
    // Fallback: if the gps extension is installed we get the lat/lon from the gps extension.
    // if the gps extension is not installed we get the lat/lon from the config.
    if (current_stats.stats.gps.gps_extension.is_installed == true) {
      lat = current_stats.stats.GPSStats.latitude;
      lon = current_stats.stats.GPSStats.longitude;
    } else {
      lat = current_stats.stats.gps.latitude;
      lon = current_stats.stats.gps.longitude;
    }
  }
  // Escape lat/lon values to prevent XSS (even though they should be numbers)
  var escapedLat = escapeHtml(String(lat || ''));
  var escapedLon = escapeHtml(String(lon || ''));
  $.toast({
      heading: 'Sending GPS Beacon',
      text: "Latitude: "+escapedLat+"<br>Longitude: "+escapedLon,
      loader: true,
      loaderBg: '#9EC600',
      position: 'top-left',
      hideAfter: 1500,
  });
}

/**
 * Format a date/time for display
 * Returns a human-readable string like "2 minutes ago" or the formatted date
 */
function format_beacon_time(isoString) {
    if (!isoString) {
        return 'Never';
    }
    var date = new Date(isoString);
    var now = new Date();
    var diffMs = now - date;
    var diffSecs = Math.floor(diffMs / 1000);
    var diffMins = Math.floor(diffSecs / 60);
    var diffHours = Math.floor(diffMins / 60);
    var diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
        return 'Just now';
    } else if (diffMins < 60) {
        return diffMins + ' min' + (diffMins > 1 ? 's' : '') + ' ago';
    } else if (diffHours < 24) {
        return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    } else if (diffDays < 7) {
        return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    } else {
        // Format as date
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

/**
 * Update the last beacon display in the GPS panel and tooltip
 */
function update_last_beacon_display() {
    var timeStr = format_beacon_time(last_beacon_time);
    // Update the GPS panel
    $('#last_beacon_time').text(timeStr);
    // Update the quick beacon button tooltip (using data-tooltip for instant display)
    var beaconTooltipText = 'Send Beacon';
    if (last_beacon_time) {
        beaconTooltipText = 'Send Beacon\nLast: ' + timeStr;
    }
    $('#send_beacon_quick').attr('data-tooltip', beaconTooltipText);
    // Update the GPS panel button tooltip with last beacon time
    var gpsTooltipText = 'GPS & Beaconing';
    if (last_beacon_time) {
        gpsTooltipText = 'GPS & Beaconing\nLast beacon: ' + timeStr;
    } else {
        gpsTooltipText = 'GPS & Beaconing\nNo beacon sent';
    }
    $('.btn-gps').attr('data-tooltip', gpsTooltipText);
    // Beacon highlight for stale beacons - disabled for now to avoid confusing users
    // TODO: Re-enable when ready: update_beacon_highlight();
}

/**
 * Check if beacon is stale (never sent or older than threshold)
 * and update the highlight on beacon buttons and GPS icon
 */
function update_beacon_highlight() {
    var shouldHighlight = false;

    if (!last_beacon_time) {
        // Never sent a beacon
        shouldHighlight = true;
    } else {
        // Check if beacon is older than threshold
        var beaconDate = new Date(last_beacon_time);
        var now = new Date();
        var diffMs = now - beaconDate;
        shouldHighlight = diffMs > BEACON_STALE_THRESHOLD_MS;
    }

    if (shouldHighlight) {
        $('#send_beacon, #send_beacon_quick, .btn-gps').addClass('beacon-highlight');
    } else {
        $('#send_beacon, #send_beacon_quick, .btn-gps').removeClass('beacon-highlight');
    }
}

/**
 * Start the periodic timer to check beacon staleness
 * Runs every 30 seconds to update the highlight state
 */
function start_beacon_highlight_timer() {
    // Clear any existing timer
    if (beacon_highlight_timer) {
        clearInterval(beacon_highlight_timer);
    }
    // Check every 30 seconds
    beacon_highlight_timer = setInterval(function() {
        update_beacon_highlight();
        // Also update the time display (e.g., "5 mins ago" → "6 mins ago")
        update_last_beacon_display();
    }, 30 * 1000);
}

function sendPosition(position) {
  path = $('#pkt_path option:selected').val();
  // Get the selected symbol from the symbol picker
  var symbol = '/>';  // Default to car
  if (typeof getSelectedSymbolString === 'function') {
      symbol = getSelectedSymbolString();
  }
  msg = {
      'latitude': position.coords.latitude,
      'longitude': position.coords.longitude,
      'path': path,
      'symbol': symbol
  }
  socket.emit("gps", msg);
}

// ============================================================================
// GPS Modal — GPS panel is always shown in a modal dialog
// ============================================================================

var gps_modal_instance = null;

/**
 * Initialize the GPS modal behavior.
 * GPS button click opens the modal. Called once from init_gps().
 */
function init_gps_modal() {
    var gpsBtn = document.getElementById('btn_gps_modal');
    var gpsModalEl = document.getElementById('gpsModal');
    if (!gpsBtn || !gpsModalEl) return;

    gps_modal_instance = new bootstrap.Modal(gpsModalEl);

    gpsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        gps_modal_instance.show();
    });
}
