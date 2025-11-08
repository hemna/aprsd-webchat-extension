var gps_icon_opacity = 0.2;
var gps_icon_interval = null;
var current_stats = null;
var gps_settings = null;


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

function update_gps_settings(data) {
    // We got the settings from the gps extension,
    // so we need to update the saved settings.
    // and update the UI with the new settings.
    gps_settings = data.settings;
    get_beacon_type_from_value(gps_settings.beacon_type);
    $('#beaconing_setting').val(get_beacon_type_from_value(gps_settings.beacon_type));
    $('#beacon_interval').val(gps_settings.beacon_interval);
    $('#smart_beacon_distance_threshold').val(gps_settings.smart_beacon_distance_threshold);
    $('#smart_beacon_time_window').val(gps_settings.smart_beacon_time_window);
    //Now enable the correct ui elements based on the beaconing type.
    set_beaconing_setting(get_beacon_type_from_value(gps_settings.beacon_type));
}

function set_beaconing_setting(value, description='') {
    console.log("setting beaconing setting to", value);
    $('#beaconing_setting').val(value);
    //$('#beaconing_setting_description').text(beaconing_settings[value].description);
    $('#interval_beaconing_status').text(beaconing_settings[value].description == 'Interval Beaconing' ? 'enabled' : 'disabled');
    $('#interval_beaconing_time_window').text(beaconing_settings[value].description == 'Interval Beaconing' ? '1800 seconds' : 'not set');

    if (value == 0) {
        // Beaconing is completely disabled.
        $('#beaconing_setting').prop('disabled', true);
        $('#send_beacon').prop('disabled', true);
        $('#beaconing_type').text('disabled in config');
        if (description != '') {
            beaconing_description = description;
        } else {
            beaconing_description = 'disabled in config';
        }
        $('#beaconing_setting_description').text(beaconing_description);
        $('#interval_beaconing_status').text('disabled in config');
        $('#interval_beaconing_time_window').text('disabled in config');
        $('#save_beacon_settings').prop('disabled', true);
        $('#gps_icon').css('opacity', 0.5);
        $('#save_beacon_settings').prop('disabled', true);

        //$('#beaconing_status').text('disabled in config');
        //Also disable the save button.
        return;
    }

    /*
    gps_icon_interval = window.setInterval(function() {
        $('#gps_icon').css('opacity', gps_icon_opacity);
        gps_icon_opacity = gps_icon_opacity == 0.2 ? 1 : 0.2;
    }, 500);
    */

    //if the beacon settings is set to manual enabled, enable the send beacon button.
    if (value == 1) {
        $('#send_beacon').prop('disabled', false);
    } else {
        $('#send_beacon').prop('disabled', true);
    }

    // if the beaconing setting is set to interval, enable the beacon interval.
    if (value == 2) {
        $('#beacon_interval_label').show();
        $('#beacon_interval').show();
    } else {
        $('#beacon_interval_label').hide();
        $('#beacon_interval').hide();
    }

    // if the beaconing setting is set to smart, enable the smart beaconing distance threshold.
    if (value == 3) {
        $('#smart_beacon_time_window_label').show();
        $('#smart_beacon_time_window').show();
        $('#smart_beacon_distance_threshold_label').show();
        $('#smart_beacon_distance_threshold').show();
    } else {
        $('#smart_beacon_time_window_label').hide();
        $('#smart_beacon_time_window').hide();
        $('#smart_beacon_distance_threshold_label').hide();
        $('#smart_beacon_distance_threshold').hide();

    }

}

function init_gps() {
    console.log("init_gps Called.")
    current_stats = initial_stats;
    console.log(current_stats);

    // register the send beacon button click event.
    $("#send_beacon").click(function() {
        // If the gps extension is installed and enabled,
        // we try and get the lat/lon from current gps position.
        if (current_stats.stats.gps.gps_extension.is_installed == true && current_stats.stats.gps.gps_extension.enabled == true) {
            // we have the gps extension installed and enabled, so we can get the lat/lon from the current gps position.
            sendPosition({'coords': {'latitude': current_stats.stats.GPSStats.latitude, 'longitude': current_stats.stats.GPSStats.longitude, 'altitude': current_stats.stats.GPSStats.altitude}});
        } else if (!isNaN(latitude) && !isNaN(longitude)) {
            // we don't have the gps extension installed or enabled, so we can't get the lat/lon from the current gps position.
            // we can't send a beacon.
            sendPosition({'coords': {'latitude': latitude, 'longitude': longitude}})
        }
    });

    // When the GPS stats are received, update the GPS fix.
    socket.on("gps_stats", function(msg) {
        console.log("GPS message received: ", msg);
        update_gps_fix(msg);
    });

    // When we send a beacon, update the radio icon
    socket.on("gps_beacon_sent", function(msg) {
        console.log("Beacon sent: ", msg);
        beacon_toast();
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
        beaconing_setting = 0;
    } else {
        // Start the GPS icon blinking until we get coordinates.
        /*gps_icon_interval = window.setInterval(function() {
            $('#gps_icon').css('opacity', gps_icon_opacity);
            gps_icon_opacity = gps_icon_opacity == 0.2 ? 1 : 0.2;
        }, 500);*/
        $('#beaconing_type').text(beaconing_type.find(type => type.value === gps.gps_extension.beacon_type).description);
        if (gps.gps_extension.is_installed == true) {
            if (gps.gps_extension.enabled == true) {
                //$('#send_beacon').prop('disabled', false);
                //$('#beaconing_status').text('enabled');
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
                    update_gps_info_box(0, 0, 0, 0, 0);
                    beaconing_setting = 0;
                } else {
                    console.log("Beaconing is enabled in config.  have to use webchat lat/lon, which is set in the config.");
                    update_gps_info_box(gps.latitude, gps.longitude, 0, 0, 0);
                    beaconing_setting = 1;
                }
            }
        } else {
            // If aprsd beaconing is enabled, but we don't have coordinates, disable the beacon button.
            if (isNaN(gps.latitude) || isNaN(gps.longitude)) {
                // Have to disable the beacon button.
                //$('#send_beacon').prop('disabled', true);
                //$('#beaconing_status').text('disabled - No lat/lon in config');
                //$('#gps_icon').css('opacity', 0.5);
                update_gps_info_box(0, 0, 0, 0, 0);
                beaconing_setting = 0;
            } else {
                //$('#send_beacon').prop('disabled', false);
                //$('#beaconing_status').text('enabled');
                beaconing_setting = 1;
            }
        }
    }

    set_beaconing_setting(beaconing_setting, beaconing_description);

    if (gps.gps_extension.smart_beacon_distance_threshold) {
        $('#smart_beacon_distance_threshold').val(gps.gps_extension.smart_beacon_distance_threshold);
    }

    if (gps.gps_extension.smart_beacon_time_window) {
        $('#smart_beacon_time_window').val(gps.gps_extension.smart_beacon_time_window);
    }

    if (gps.gps_extension.gpsd_host) {
        $('#gps_extension_host').text(gps.gps_extension.gpsd_host);
    }

    if (gps.gps_extension.gpsd_port) {
        $('#gps_extension_port').text(gps.gps_extension.gpsd_port);
    }

    if (gps.gps_extension.beacon_interval) {
        $('#beacon_interval').val(gps.gps_extension.beacon_interval);
    }
}

function update_gps_info_box(latitude, longitude, altitude, speed, course) {
    //console.log("update_gps_info_box Called.  Latitude: ", latitude, " Longitude: ", longitude, " Altitude: ", altitude, " Speed: ", speed, " Course: ", course);
    $('#gps_lat').text(latitude);
    $('#gps_lon').text(longitude);
    $('#gps_alt').text(Math.floor(altitude) + " m");
    // convert meters per second to kilometers per hour
    var speed_kph = speed * 3.6;
    $('#gps_speed').text(Math.floor(speed_kph) + " km/h");
    $('#gps_course').text(Math.floor(course) + "°");
    // now flash a green border around the gps_info_box.
    $('#gps_info_box').fadeOut(200).fadeIn(500);
}

function update_gps(data) {
    console.log("update_gps Called: ", data);
    current_stats = data;
    if (current_stats.stats.gps.beaconing_enabled == false) {
        return;
    }
    update_gps_fix(current_stats.stats.GPSStats);
}

function update_gps_fix(data) {
    // IF we have a fix, then enable the beacon button if the beaconing mode is
    // set to manual.  Also update the GPS satellite icon.
    current_stats.stats.GPSStats = data;
    gps = current_stats.stats.gps;
    //console.log("update_gps_fix Called.  GPS fix: ", data);
    beaconing_setting = $('#beaconing_setting').val();
    //console.log("beaconing_setting IS: ", beaconing_setting);
    if (gps.beaconing_enabled == false) {
        // everything is disabled.
        return;
    }

    if (gps.gps_extension.is_installed == true && gps.gps_extension.enabled == true) {
        // We have the gps extension installed and enabled, so we can get the lat/lon from the current gps position.
        //console.log("gps extension installed and enabled")
        if (data.fix == true) {
            //console.log("we have a fix")
            $('#send_beacon').prop('disabled', false);
            //Only set the send_beacon enabled if the beaconing type is 1 (manual).
            if (beaconing_setting == 1) {
                $('#send_beacon').prop('disabled', false);
            }
            $('#beaconing_status').text('enabled');
            $('#gps_icon').css('opacity', 1);
            //console.log("Clearing GPS icon interval.  We have a fix!");
            clearInterval(gps_icon_interval);
            gps_icon_interval = null;
            update_gps_info_box(data.latitude, data.longitude, data.altitude, data.speed, data.track);
        } else {
            //console.log("we don't have a fix")
            $('#send_beacon').prop('disabled', true);
            update_gps_info_box(0, 0, 0, 0, 0);
            $('#send_beacon').prop('disabled', true);
            $('#beaconing_status').text('disabled - No fix');
            $('#gps_icon').css('opacity', 0.2);
            if (gps_icon_interval == null) {
                //console.log("Setting GPS icon interval.  NO fix!");
                if (beaconing_setting != 0) {
                    gps_icon_interval = window.setInterval(function() {
                        $('#gps_icon').css('opacity', gps_icon_opacity);
                        gps_icon_opacity = gps_icon_opacity == 0.2 ? 1 : 0.2;
                    }, 800);
                }
            }
            return;
        }
    } else if (gps.gps_extension.is_installed == true && gps.gps_extension.enabled == false) {
        // We have the gps extension installed and disabled, so we can't get the lat/lon from the current gps position.
        // but we can try to use the hard coded lat/lon in the config.
        if (gps.latitude !== null && gps.longitude !== null) {
            // We have hard coded lat/lon in the config, so we can send a beacon.
            $('#send_beacon').prop('disabled', false);
            update_gps_info_box(gps.latitude, gps.longitude, data.altitude, data.speed, data.track);
            $('#gps_icon').css('opacity', 1);
        } else {
            // We don't have a gps fix and no lat/lon in the config, so we can't send a beacon.
            $('#send_beacon').prop('disabled', true);
            update_gps_info_box(0, 0, 0, 0, 0);
            $('#send_beacon').prop('disabled', true);
            $('#beaconing_status').text('disabled - No lat/lon in config');
            $('#gps_icon').css('opacity', 0.2);
        }

        return;
    }

    // we know the gps extension is not installed or enabled, so we can't get the lat/lon from the current gps position.
    if (gps.latitude !== null && gps.longitude !== null) {
        // We have hard coded lat/lon in the config, so we can send a beacon.
        $('#send_beacon').prop('disabled', false);
        update_gps_info_box(gps.latitude, gps.longitude, data.altitude, data.speed, data.track);
        $('#gps_icon').css('opacity', 1);
    } else {
        // We don't have a gps fix and no lat/lon in the config, so we can't send a beacon.
        $('#send_beacon').prop('disabled', true);
        update_gps_info_box(0, 0, 0, 0, 0);
    }
}

function beacon_toast() {
  lat = current_stats.stats.GPSStats.latitude;
  lon = current_stats.stats.GPSStats.longitude;
  $.toast({
      heading: 'Sending GPS Beacon',
      text: "Latitude: "+lat+"<br>Longitude: "+lon,
      loader: true,
      loaderBg: '#9EC600',
      position: 'top-left',
      hideAfter: 1500,
  });

}

function sendPosition(position) {
  console.log("showPosition Called");
  path = $('#pkt_path option:selected').val();
  msg = {
      'latitude': position.coords.latitude,
      'longitude': position.coords.longitude,
      'path': path,
  }
  beacon_toast();
  console.log("Sending GPS: ", msg);
  socket.emit("gps", msg);
}
