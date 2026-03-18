function aprs_img(item, x_offset, y_offset) {
    var x = x_offset * -16;
    if (y_offset > 5) {
        y_offset = 5;
    }
    var y = y_offset * -16;
    var loc = x + 'px '+ y + 'px'
    item.css('background-position', loc);
}

function show_aprs_icon(item, symbol) {
    var offset = ord(symbol) - 33;
    var col = Math.floor(offset / 16);
    var row = offset % 16;
    //console.log("'" + symbol+"'   off: "+offset+"  row: "+ row + "   col: " + col)
    aprs_img(item, row, col);
}

function ord(str){return str.charCodeAt(0);}

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

function update_stats( data ) {
    console.log("update_stats() main.js called");
    console.log(data);
    $("#version").text( data["stats"]["APRSDStats"]["version"] );
    // aprs_connection contains intentional HTML (link to APRS-IS server) from backend
    $("#aprs_connection").html( data["aprs_connection"] || '' );
    short_time = data["time"].split(/\s(.+)/)[1];

    update_gps(data);
}

function radio_icon_blink(tx=true) {
    // blink the radio icon for 1 second.
    //If tx is true we want the radio svg icon fill color
    //to be red, if false we want it to be blue.
    if (tx) {
        $('#radio_icon_svg').attr('fill', '#FF2E2E');
    } else {
        $('#radio_icon_svg').attr('fill', '#00A318');
    }
    $('#radio_icon_svg').css('opacity', 1);
    window.setTimeout(function() {
        $('#radio_icon_svg').css('opacity', 0.2);
    }, 500);

    window.setTimeout(function() {
        $('#radio_icon_svg').attr('fill', '#aaaaaa');
        $('#radio_icon_svg').css('opacity', 0.2);
    }, 500);
}


function start_update() {

    (function statsworker() {
            $.ajax({
                url: "/stats",
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    update_stats(data);
                },
                complete: function() {
                    setTimeout(statsworker, 60000);
                }
            });
    })();
}
