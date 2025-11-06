var gps_icon_opacity = 0.2;
var gps_icon_interval = null;
var current_stats = null;

function init_gps() {
    console.log("init_gps Called.")
    current_stats = initial_stats;
    console.log(current_stats);

    // register the send beacon button click event.
    $("#send_beacon").click(function() {
        console.log("Send a beacon!")
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
        // change the opacity of the radio icon to 1 for 1 second.
        $.toast({
            heading: 'Beacon Sent',
            text: "Beacon sent",
            loader: true,
            loaderBg: '#9EC600',
            position: 'top-center',
        });
        $('#radio_icon').css('opacity', 1);
        window.setTimeout(function() {
            $('#radio_icon').css('opacity', 0.2);
        }, 1000);
    });

    // Start the GPS icon blinking until we get coordinates.
    gps_icon_interval = window.setInterval(function() {
            $('#gps_icon').css('opacity', gps_icon_opacity);
            gps_icon_opacity = gps_icon_opacity == 0.2 ? 1 : 0.2;
        }, 500);

    //if beaconing is disabled, disable the beacon button.
    // if gps extension is installed and enabled, we can enable the beacon button.
    $('#send_beacon').prop('disabled', true);
    gps = initial_stats.stats.gps;
    // beacon_types are none, interval, and smart.
    //console.log("beaconing_type is ", gps.gps_extension.beacon_type);
    $('#beaconing_type').text(beaconing_type.find(type => type.value === gps.gps_extension.beacon_type).description);

    $('#radio_icon').css('opacity', 0.2);
    $('#gps_icon').css('opacity', 0.2);
    if (gps.gps_extension.is_installed == true) {
        if (gps.gps_extension.enabled == true) {
            $('#send_beacon').prop('disabled', false);
            $('#beaconing_status').text('enabled');
            if (gps.gps_extension.beacon_type == 'smart') {
                beaconing_setting = 3;
            } else if (gps.gps_extension.beacon_type == 'interval') {
                beaconing_setting = 2;
            } else {
                beaconing_setting = 1;
            }
            //update_gps_fix(initial_stats.stats.GPSStats);

        } else {
            $('#send_beacon').prop('disabled', true);
            $('#beaconing_status').text('disabled - GPS Extension is disabled');
            // change the gps icon to greyed out.
            $('#gps_icon').css('opacity', 0.5);
            beaconing_setting = 0;
        }
    } else {
        if (gps.beaconing_enabled == true) {
            // If aprsd beaconing is enabled, but we don't have coordinates, disable the beacon button.
            if (isNaN(latitude) || isNaN(longitude) && location.protocol != 'https:') {
                // Have to disable the beacon button.
                $('#send_beacon').prop('disabled', true);
                $('#beaconing_status').text('disabled - No lat/lon in config');
                $('#gps_icon').css('opacity', 0.5);
                beaconing_setting = 0;
            } else {
                $('#send_beacon').prop('disabled', false);
                $('#beaconing_status').text('enabled');
                beaconing_setting = 1;
            }
        } else {
            $('#send_beacon').prop('disabled', true);
            $('#beaconing_status').text('disabled in config');
            $('#gps_icon').css('opacity', 0.5);
            beaconing_setting = 0;
        }
    }

    set_beaconing_setting(beaconing_setting);

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

function update_gps_info_box() {
    $('#gps_lat').text(current_stats.stats.GPSStats.latitude);
    $('#gps_lon').text(current_stats.stats.GPSStats.longitude);
    $('#gps_alt').text(Math.floor(current_stats.stats.GPSStats.altitude) + " m");
    // convert meters per second to kilometers per hour
    var speed_kph = current_stats.stats.GPSStats.speed * 3.6;
    $('#gps_speed').text(Math.floor(speed_kph) + " km/h");
    $('#gps_course').text(Math.floor(current_stats.stats.GPSStats.track) + "°");
    // now flash a green border around the gps_info_box.
    $('#gps_info_box').fadeOut(200).fadeIn(500).fadeOut(200).fadeIn(500);
}

function update_gps(data) {
    console.log("update_gps Called: ", data);
    current_stats = data;
    update_gps_fix(current_stats.stats.GPSStats);
    update_gps_info_box();
}

function update_gps_fix(data) {
    // IF we have a fix, then enable the beacon button if the beaconing mode is
    // set to manual.  Also update the GPS satellite icon.
    current_stats.stats.GPSStats = data;
    console.log("update_gps_fix Called.  GPS fix: ", data.fix);
    beaconing_setting = $('#beaconing_setting').val();
    if (data.fix == true) {
        //Only set the send_beacon enabled if the beaconing type is 1 (manual).
        if (beaconing_setting == 1) {
            $('#send_beacon').prop('disabled', false);
        }
        $('#beaconing_status').text('enabled');
        $('#gps_icon').css('opacity', 1);
        console.log("Clearing GPS icon interval.  We have a fix!");
        clearInterval(gps_icon_interval);
        gps_icon_interval = null;
    } else {
        $('#send_beacon').prop('disabled', true);
        $('#beaconing_status').text('disabled - No fix');
        $('#gps_icon').css('opacity', 0.2);
        if (gps_icon_interval == null) {
            console.log("Setting GPS icon interval.  NO fix!");
            gps_icon_interval = window.setInterval(function() {
                $('#gps_icon').css('opacity', gps_icon_opacity);
                gps_icon_opacity = gps_icon_opacity == 0.2 ? 1 : 0.2;
            }, 800);
        }
    }
    update_gps_info_box();
}

function sendPosition(position) {
  console.log("showPosition Called");
  path = $('#pkt_path option:selected').val();
  msg = {
      'latitude': position.coords.latitude,
      'longitude': position.coords.longitude,
      'path': path,
  }
  $.toast({
      heading: 'Sending GPS Beacon',
      text: "Latitude: "+position.coords.latitude+"<br>Longitude: "+position.coords.longitude,
      loader: true,
      loaderBg: '#9EC600',
      position: 'top-center',
  });

  console.log("Sending GPS: ", msg);
  socket.emit("gps", msg);
}
