var cleared = false;
var callsign_list = {};
var callsign_location = {};
var message_list = {};
var from_msg_list = {};
var selected_tab_callsign = null;
const socket = io("/sendmsg");
var myModalAlternative = null;
var socketio_connected = false;
var socketio_reconnecting = false;

MSG_TYPE_TX = "tx";
MSG_TYPE_RX = "rx";
MSG_TYPE_ACK = "ack";

function reload_popovers() {
    $('[data-bs-toggle="popover"]').popover(
        {html: true, animation: true}
    );
}

function build_location_string(msg) {
    dt = new Date(parseInt(msg['lasttime']) * 1000);
    loc = "Last Location Update: " + dt.toLocaleString();
    loc += "<br>Latitude: " + msg['lat'] + "<br>Longitude: " + msg['lon'];
    loc += "<br>" + "Altitude: " + msg['altitude'] + " m";
    loc += "<br>" + "Speed: " + msg['speed'] + " kph";
    loc += "<br>" + "Bearing: " + msg['compass_bearing'];
    loc += "<br>" + "distance: " + msg['distance'] + " km";
    return loc;
}

function build_location_string_small(msg) {
    dt = new Date(parseInt(msg['lasttime']) * 1000);
    loc = "" + msg['distance'] + "km";
    //loc += "Lat " + msg['lat'] + "&nbsp;Lon " + msg['lon'];
    loc += "&nbsp;" + msg['compass_bearing'];
    //loc += "&nbsp;Distance " + msg['distance'] + " km";
    //loc += "&nbsp;" + dt.toLocaleString();
    //loc += "&nbsp;" + msg['timeago'];
    loc += "&nbsp;"
    timeago_str = "<time id='location_timeago' class='timeago' datetime='" + msg['last_updated'] + "'></time>";
    loc += timeago_str;
    return loc;
}

function size_dict(d){c=0; for (i in d) ++c; return c}

function raise_error(msg) {
   $.toast({
       heading: 'Error',
       text: msg,
       loader: true,
       loaderBg: '#FF0000',
       position: 'top-center',
   });
}

function raise_info(msg) {
   $.toast({
       heading: 'Information',
       text: msg,
       loader: true,
       loaderBg: '#00FF00',
       position: 'top-center',
   });
}

function init_chat() {
   socket.on('connect', function () {
      console.log("Connected to socketio webchat extension");
      if (socketio_reconnecting) {
        raise_info("Reconnected to APRSD server");
        socketio_reconnecting = false;
      }
      socketio_connected = true;
   });

   socket.on('disconnect', function(reason, details) {
      socketio_connected = false;
      if (socket.active) {
          // temporary disconnection, the scoket will automatically try to reconnect
          console.log("Disconnected from socketio webchat extension.  reconnecting");
      } else{
          console.log("Disconnected from socketio webchat extension");
          console.log(reason)
      }
      socketio_reconnecting = true;
   });

   socket.on('connect_error', function(error) {
      socketio_connected = false;
      if (socket.active) {
        // temporary failure, the scoket will automatically try to reconnect
        console.log("connection error from socketio webchat extension.  reconnecting");
      } else {
        console.log("Socket.io connection error: " + error.message);
      }
      socketio_reconnecting = true;
   });

   socket.on("sent", function(msg) {
       if (cleared === false) {
           var msgsdiv = $("#msgsTabsDiv");
           msgsdiv.html('');
           cleared = true;
       }
       msg["type"] = MSG_TYPE_TX;
       sent_msg(msg);
       radio_icon_blink(true);
   });

   socket.on("ack", function(msg) {
       msg["type"] = MSG_TYPE_ACK;
       ack_msg(msg);
       radio_icon_blink(false);
   });

   socket.on("new", function(msg) {
       if (cleared === false) {
           var msgsdiv = $("#msgsTabsDiv");
           msgsdiv.html('')
           cleared = true;
       }
       msg["type"] = MSG_TYPE_RX;
       from_msg(msg);
       radio_icon_blink(false);
   });

   socket.on("rx", function(msg) {
       console.log("RX packet received");
       console.log(msg);
       msg["type"] = MSG_TYPE_RX;
       from_msg(msg);
   });

   // For notifying the radio icon
   // to blink when we tx/rx packets
   socket.on("rx_pkt", function(msg) {
       console.log("RX(" + msg._type + ") packet received: " + msg.from_call + " to " + msg.to_call);
       radio_icon_blink(false);
   });

   socket.on("tx_pkt", function(msg) {
       console.log("TX(" + msg._type + ") packet received: " + msg.from_call + " to " + msg.to_call);
       radio_icon_blink(true);
   });


   socket.on("callsign_location", function(msg) {
       console.log("CALLSIGN Location!: ", msg);
       now = new Date();
       msg['last_updated'] = now;
       callsign_location[msg['callsign']] = msg;

       location_id = callsign_location_content(msg['callsign'], true);
       location_string = build_location_string_small(msg);
       //$(location_id).html(location_string);
       $("#location_str").html(location_string);
       //$(location_id+"Spinner").addClass('d-none');
       $("#location_spinner").addClass('d-none');
       save_data();
       $("time#location_timeago").timeago("update", msg['last_updated']);
   });

   $("#sendform").submit(function(event) {
       event.preventDefault();
       // Use the selected tab callsign instead of input field
       to_call = selected_tab_callsign;
       message = $('#message').val();
       path = $('#pkt_path option:selected').val();
       if (socketio_connected == false) {
           raise_error("The connection to the APRSD server has been lost.  Please check your APRSD server connection and try again.");
           return false;
       }
       if (!to_call || to_call == "") {
           raise_error("You must select a callsign tab to send a message")
           return false;
       } else {
           if (message == "") {
               raise_error("You must enter a message to send")
               return false;
           }
           // Save the path for this callsign
           if (path) {
               callsign_list[to_call] = path;
               save_data();
           }
           msg = {'to': to_call, 'message': message, 'path': path};
           //console.log(msg);
           socket.emit("send", msg);
           $('#message').val('');
           // Disable send button after clearing
           $('#send_msg').prop('disabled', true);
           // Refocus input for next message
           setTimeout(function() {
               $('#message').focus();
           }, 100);
           callsign_select(to_call);
           activate_callsign_tab(to_call);
       }
   });

   init_gps();
   // Try and load any existing chat threads from last time
   init_messages();
}


function tab_string(callsign, id=false) {
    name = "msgs"+callsign;
    if (id) {
        return "#"+name;
    } else {
        return name;
    }
}

function tab_li_string(callsign, id=false) {
    //The id of the LI containing the tab
    return tab_string(callsign,id)+"Li";
}

function tab_notification_id(callsign, id=false) {
    // The ID of the span that contains the notification count
    return tab_string(callsign, id)+"notify";
}

function tab_content_name(callsign, id=false) {
   return tab_string(callsign, id)+"Content";
}

function tab_content_speech_wrapper(callsign, id=false) {
    return tab_string(callsign, id)+"SpeechWrapper";
}

function tab_content_speech_wrapper_id(callsign) {
    return "#"+tab_content_speech_wrapper(callsign);
}

function content_divname(callsign) {
    return "#"+tab_content_name(callsign);
}

function callsign_tab(callsign) {
    return "#"+tab_string(callsign);
}

function callsign_location_popover(callsign, id=false) {
    return tab_string(callsign, id)+"Location";
}

function callsign_location_content(callsign, id=false) {
    return tab_string(callsign, id)+"LocationContent";
}

function bubble_msg_id(msg, id=false) {
    // The id of the div that contains a specific message
    name = msg["from_call"] + "_" + msg["msgNo"];
    if (id) {
        return "#"+name;
    } else {
        return name;
    }
}

function message_ts_id(msg) {
    //Create a 'id' from the message timestamp
    ts_str = msg["timestamp"].toString();
    ts = ts_str.split(".")[0]*1000;
    id = ts_str.split('.')[0];
    return {'timestamp': ts, 'id': id};
}

function time_ack_from_msg(msg)  {
    // Return the time and ack_id from a message
    ts_id = message_ts_id(msg);
    ts = ts_id['timestamp'];
    id = ts_id['id'];
    ack_id = "ack_" + id

    var d = new Date(ts).toLocaleDateString("en-US")
    var t = new Date(ts).toLocaleTimeString("en-US")
    return {'time': t, 'date': d, 'ack_id': ack_id};
}

function save_data() {
  // Save the relevant data to local storage
  localStorage.setItem('callsign_list', JSON.stringify(callsign_list));
  localStorage.setItem('message_list', JSON.stringify(message_list));
  localStorage.setItem('callsign_location', JSON.stringify(callsign_location));
}

function init_messages() {
    // This tries to load any previous conversations from local storage
    callsign_list = JSON.parse(localStorage.getItem('callsign_list'));
    message_list = JSON.parse(localStorage.getItem('message_list'));
    callsign_location = JSON.parse(localStorage.getItem('callsign_location'));
    if (callsign_list == null) {
       callsign_list = {};
    }
    if (message_list == null) {
       message_list = {};
    }
    if (callsign_location == null) {
       callsign_location = {};
    }
    if (Object.keys(callsign_list).length > 0) {
        console.log("callsign_list has " + Object.keys(callsign_list).length + " callsigns");
        $("#get_location_button").prop('disabled', false);
        update_info_bar(false);
    }
    console.log(callsign_list);
    console.log(message_list);
    console.log(callsign_location);

    // Now loop through each callsign and add the tabs
    first_callsign = null;
    for (callsign in callsign_list) {
        if (first_callsign === null) {
            first_callsign = callsign;
            active = true;
        } else {
            active = false;
        }
        create_callsign_tab(callsign, active);
    }
    // and then populate the messages in order
    for (callsign in message_list) {
        new_callsign = true;
        cleared = true;
        for (id in message_list[callsign]) {
            msg = message_list[callsign][id];
            info = time_ack_from_msg(msg);
            t = info['time'];
            d = info['date'];
            ack_id = false;
            acked = false;
            if (msg['type'] == MSG_TYPE_TX) {
                ack_id = info['ack_id'];
                acked = msg['ack'];
            }
            msg_html = create_message_html(d, t, msg['from_call'], msg['to_call'],
                                           msg['message_text'], ack_id, msg, acked);
            append_message_html(callsign, msg_html, new_callsign);
            new_callsign = false;
        }
    }

    // Always ensure the "+" tab exists
    ensure_add_tab();

    if (first_callsign !== null) {
      callsign_select(first_callsign);
    }

    //now create a timer that updates the location_str every minute
    setInterval(function() {
        //make sure there is a tab
        if (Object.keys(callsign_list).length > 0) {
            console.log("Interval Updating location string for: ", selected_tab_callsign);
            update_location_string(selected_tab_callsign);
        }
    }, 10000);
}

function scroll_main_content(callsign=false) {
   // Use the new scroll_to_bottom function for better reliability
   if (callsign) {
       scroll_to_bottom(callsign);
   }
}

function create_callsign_tab(callsign, active=false) {
  //Create the html for the callsign tab and insert it into the DOM
  var callsignTabs = $("#msgsTabList");
  // Remove the "+" tab before adding the new callsign tab
  remove_add_tab();

  tab_id = tab_string(callsign);
  tab_id_li = tab_li_string(callsign);
  tab_notify_id = tab_notification_id(callsign);
  tab_content = tab_content_name(callsign);
  popover_id = callsign_location_popover(callsign);
  if (active) {
    active_str = "active";
  } else {
    active_str = "";
  }

  item_html = '<li class="nav-item" role="presentation" callsign="'+callsign+'" id="'+tab_id_li+'">';
  //item_html += '<button onClick="callsign_select(\''+callsign+'\');" callsign="'+callsign+'" class="nav-link '+active_str+'" id="'+tab_id+'" data-bs-toggle="tab" data-bs-target="#'+tab_content+'" type="button" role="tab" aria-controls="'+callsign+'" aria-selected="true">';
  item_html += '<button onClick="callsign_select(\''+callsign+'\');" callsign="'+callsign+'" class="nav-link position-relative '+active_str+'" id="'+tab_id+'" data-bs-toggle="tab" data-bs-target="#'+tab_content+'" type="button" role="tab" aria-controls="'+callsign+'" aria-selected="true">';
  item_html += callsign+'&nbsp;&nbsp;';
  item_html += '<span id="'+tab_notify_id+'" class="position-absolute top-0 start-80 translate-middle badge bg-danger border border-light rounded-pill visually-hidden">0</span>';
  item_html += '<span onclick="delete_tab(\''+callsign+'\');">×</span>';
  item_html += '</button></li>'

  callsignTabs.append(item_html);
  create_callsign_tab_content(callsign, active);
  // we know we have at least one callsign, so we can enable the get location button
  $("#get_location_button").prop('disabled', false);
  update_info_bar(true);

  // Always ensure the "+" tab exists after creating a callsign tab
  ensure_add_tab();
}

function create_callsign_tab_content(callsign, active=false) {
  var callsignTabsContent = $("#msgsTabContent");
  tab_id = tab_string(callsign);
  tab_content = tab_content_name(callsign);
  wrapper_id = tab_content_speech_wrapper(callsign);
  if (active) {
    active_str = "show active";
  } else {
    active_str = '';
  }
/*
  location_str = ""
  if (callsign in callsign_location) {
    location_str = build_location_string_small(callsign_location[callsign]);
    location_class = '';
  }

  location_id = callsign_location_content(callsign);
  */

  item_html = '<div class="tab-pane fade '+active_str+'" id="'+tab_content+'" role="tabpanel" aria-labelledby="'+tab_id+'">';
  /*item_html += '<div class="" style="border: 1px solid #999999;background-color:#aaaaaa;">';
  item_html += '<div class="row" style="padding-top:4px;padding-bottom:4px;background-color:#aaaaaa;margin:0px;">';
  item_html +=   '<div class="d-flex col-md-10 justify-content-left" style="padding:0px;margin:0px;">';
  item_html +=     '<button onclick="call_callsign_location(\''+callsign+'\');" style="margin-left:2px;padding: 0px 4px 0px 4px;font-size: .9rem" type="button" class="btn btn-primary">';
  item_html +=     '<span id="'+location_id+'Spinner" class="d-none spinner-border spinner-border-sm" role="status" aria-hidden="true" style="font-size: .9rem"></span>Get Location</button>';
  item_html +=   '&nbsp;<span id="'+location_id+'" style="font-size: .9rem">'+location_str+'</span></div>';
  item_html += '</div>';
  */
  item_html += '<div class="speech-wrapper" id="'+wrapper_id+'"></div>';
  item_html += '</div>';
  callsignTabsContent.append(item_html);
}

function delete_tab(callsign) {
    // User asked to delete the tab and the conversation
    tab_id = tab_string(callsign, true);
    tab_id_li = tab_li_string(callsign, true);
    tab_content = tab_content_name(callsign, true);
    $(tab_id_li).remove();
    $(tab_content).remove();
    delete callsign_list[callsign];
    delete message_list[callsign];
    delete callsign_location[callsign];

    // Ensure "+" tab exists
    ensure_add_tab();

    // Now select the first tab (skip the "+" tab)
    var tabs = $("#msgsTabList").children();
    var first_callsign_tab = null;
    for (var i = 0; i < tabs.length; i++) {
        var tab = $(tabs[i]).children().first();
        var tab_callsign = tab.attr('callsign');
        if (tab_callsign && tab_callsign !== 'ADD_TAB') {
            first_callsign_tab = tab;
            break;
        }
    }

    if (first_callsign_tab && first_callsign_tab.length > 0) {
        first_callsign_tab.click();
        first_callsign = first_callsign_tab.attr('callsign');
        console.log("Selecting first tab: ", first_callsign);
        callsign_select(first_callsign);
    } else {
        selected_tab_callsign = null;
        update_info_bar(false);
    }

    console.log("selected_tab_callsign: ", selected_tab_callsign);
    save_data();
    // if there are no more tabs, disable the get location button
    if (Object.keys(callsign_list).length == 0) {
        console.log("No more tabs, disabling get location button");
        $("#get_location_button").prop('disabled', true);
        update_info_bar(false);
    }
}

function add_callsign(callsign, msg) {
   /* Ensure a callsign exists in the left hand nav */
  if (callsign in callsign_list) {
      return false
  }
  len = Object.keys(callsign_list).length;
  if (len == 0) {
      active = true;
  } else {
      active = false;
  }
  create_callsign_tab(callsign, active);
  // Initialize with path from message if available, otherwise empty
  callsign_list[callsign] = (msg && msg['path']) ? msg['path'] : '';
  return true;
}

function update_callsign_path(callsign, msg) {
  //Get the selected path to save for this callsign
  path = msg['path']
  $('#pkt_path').val(path);
  callsign_list[callsign] = path;
}

function append_message(callsign, msg, msg_html) {
  new_callsign = false
  if (!message_list.hasOwnProperty(callsign)) {
       message_list[callsign] = {};
  }
  ts_id = message_ts_id(msg);
  id = ts_id['id']
  message_list[callsign][id] = msg;
  if (selected_tab_callsign != callsign) {
      // We need to update the notification for the tab
      tab_notify_id = tab_notification_id(callsign, true);
      // get the current count of notifications
      count = parseInt($(tab_notify_id).text());
      if (isNaN(count)) {
          count = 0;
      }
      count += 1;
      $(tab_notify_id).text(count);
      $(tab_notify_id).removeClass('visually-hidden');
  }

  // Find the right div to place the html
  new_callsign = add_callsign(callsign, msg);
  // Update the path if it's in the message
  if (msg && msg['path'] && msg['path'] !== '') {
      callsign_list[callsign] = msg['path'];
      save_data();
  }
  append_message_html(callsign, msg_html, new_callsign);
  len = Object.keys(callsign_list).length;
  if (new_callsign) {
      //Now click the tab if and only if there is only one tab
      callsign_tab_id = callsign_tab(callsign);
      $(callsign_tab_id).click();
      console.log("append_message: calling callsign_select for: ", callsign);
      callsign_select(callsign);
  }
}


function append_message_html(callsign, msg_html, new_callsign) {
  var msgsTabs = $('#msgsTabsDiv');
  divname_str = tab_content_name(callsign);
  divname = content_divname(callsign);
  tab_content = tab_content_name(callsign);
  wrapper_id = tab_content_speech_wrapper_id(callsign);

  $(wrapper_id).append(msg_html);

  // Scroll to bottom to show new message
  // Use setTimeout to ensure DOM is updated
  setTimeout(function() {
      scroll_to_bottom(callsign);
  }, 50);
}

/**
 * Scroll the message area to show the latest message
 */
function scroll_to_bottom(callsign) {
    if (!callsign) {
        return;
    }

    wrapper_id = tab_content_speech_wrapper_id(callsign);
    var wrapper = $(wrapper_id);

    if (wrapper.length === 0) {
        // Try again after a short delay if element doesn't exist yet
        setTimeout(function() {
            scroll_to_bottom(callsign);
        }, 100);
        return;
    }

    // Get the scrollable container (speech-wrapper)
    var scrollContainer = wrapper[0];

    if (scrollContainer) {
        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(function() {
            // Calculate the scroll position to show the bottom
            var scrollHeight = scrollContainer.scrollHeight;
            var clientHeight = scrollContainer.clientHeight;

            // Only scroll if content is taller than container
            if (scrollHeight > clientHeight) {
                // Try native smooth scroll first
                if (typeof scrollContainer.scrollTo === 'function') {
                    scrollContainer.scrollTo({
                        top: scrollHeight,
                        behavior: 'smooth'
                    });
                } else {
                    // Fallback: use jQuery animate
                    $(scrollContainer).animate({
                        scrollTop: scrollHeight
                    }, 300);
                }
            }
        });
    }
}

function create_message_html(date, time, from, to, message, ack_id, msg, acked=false) {
    div_id = from + "_" + msg.msgNo;
    if (ack_id) {
      alt = " alt"
    } else {
      alt = ""
    }

    bubble_class = "bubble" + alt + " text-nowrap"
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

    msg_html = '<div class="bubble-row'+alt+'">';
    msg_html += '<div id="'+bubble_msgid+'" class="'+ bubble_class + '" ';
    msg_html +=  'title="APRS Raw Packet" data-bs-placement="'+popover_placement+'" data-bs-toggle="popover" ';
    msg_html +=  'data-bs-trigger="hover" data-bs-content="'+msg['raw']+'">';
    msg_html += '<div class="bubble-text">';
    msg_html += '<p class="'+ bubble_name_class +'">'+from+'&nbsp;&nbsp;';
    msg_html += '<span class="bubble-timestamp">'+date_str+'</span>';

    if (ack_id) {
        if (acked) {
            msg_html += '<span class="material-symbols-rounded md-10" id="' + ack_id + '">thumb_up</span>';
        } else {
            msg_html += '<span class="material-symbols-rounded md-10" id="' + ack_id + '">thumb_down</span>';
        }
    }
    msg_html += "</p>";
    msg_html += '<p class="' +bubble_msg_class+ '">'+message+'</p>';
    msg_html += '<div class="'+ bubble_arrow_class + '"></div>';
    msg_html += "</div></div></div>";

    return msg_html
}

function flash_message(msg) {
    // Callback function to bring a hidden box back
    msg_id = bubble_msg_id(msg, true);
    $(msg_id).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
}

function sent_msg(msg) {
    info = time_ack_from_msg(msg);
    t = info['time'];
    d = info['date'];
    ack_id = info['ack_id'];

    msg_html = create_message_html(d, t, msg['from_call'], msg['to_call'], msg['message_text'], ack_id, msg, false);
    append_message(msg['to_call'], msg, msg_html);
    save_data();
    // Scroll is handled in append_message_html, but ensure it happens
    setTimeout(function() {
        scroll_to_bottom(msg['to_call']);
    }, 100);
    reload_popovers();
}

function str_to_int(my_string) {
    total = 0
    for (let i = 0; i < my_string.length; i++) {
        total += my_string.charCodeAt(i);
    }
    return total
}

function from_msg(msg) {
   if (!from_msg_list.hasOwnProperty(msg["from_call"])) {
        from_msg_list[msg["from_call"]] = new Array();
   }

   // Try to account for messages that have no msgNo
   console.log(msg)
   if (msg["msgNo"] == null) {
        console.log("Need to add msgNO!!")
        // create an artificial msgNo
        total = str_to_int(msg["from_call"])
        total += str_to_int(msg["addresse"])
        total += str_to_int(msg["message_text"])
        msg["msgNo"] = total
   }

   if (msg["msgNo"] in from_msg_list[msg["from_call"]]) {
       // We already have this message
       //console.log("We already have this message msgNo=" + msg["msgNo"]);
       // Do some flashy thing?
       flash_message(msg);
       return false
   } else {
       from_msg_list[msg["from_call"]][msg["msgNo"]] = msg
   }
   info = time_ack_from_msg(msg);
   t = info['time'];
   d = info['date'];
   ack_id = info['ack_id'];

   from = msg['from_call']
   msg_html = create_message_html(d, t, from, false, msg['message_text'], false, msg, false);
   append_message(from, msg, msg_html);
   save_data();
   // Scroll is handled in append_message_html, but ensure it happens
   setTimeout(function() {
       scroll_to_bottom(from);
   }, 100);
   reload_popovers();
}

function ack_msg(msg) {
   // Acknowledge a message
   // We have an existing entry
   console.log("ack_msg", msg);
   ts_id = message_ts_id(msg);
   id = ts_id['id'];
   //Mark the message as acked
   callsign = msg['to_call'];
   // Ensure the message_list has this callsign
   if (!message_list.hasOwnProperty(callsign)) {
       console.log("ack_msg:callsign not found in message_list", callsign);
       return false
   }
   // Ensure the message_list has this id
   if (!message_list[callsign].hasOwnProperty(id)) {
       console.log("ack_msg:id not found in message_list", id);
       return false
   }
   if (message_list[callsign][id]['ack'] == true) {
       console.log("ack_msg:message already acked", id);
       return false;
   }
   message_list[callsign][id]['ack'] = true;
   ack_id = "ack_" + id

   if (msg['ack'] == true) {
       var ack_div = $('#' + ack_id);
       ack_div.html('thumb_up');
   }

   //$('.ui.accordion').accordion('refresh');
   save_data();
   scroll_main_content();
}

function update_location_string(callsign) {
    console.log("update_location_string: " + callsign);
    if (callsign in callsign_location) {
        location_data = callsign_location[callsign];
        location_string = build_location_string_small(location_data);
        $("#location_str").html(location_string);
        $("time#location_timeago").timeago("update", location_data['last_updated']);
    } else {
        $("#location_str").html("");
    }
}

function activate_callsign_tab(callsign) {
    console.log("activate_callsign_tab: " + callsign);
    tab_content = tab_string(callsign, id=true);
    $(tab_content).click();
    console.log("activate_callsign_tab: updating location string for: ", callsign);
    update_location_string(callsign);
}

function callsign_select(callsign) {
    if (!message_list.hasOwnProperty(callsign)) {
        // this is the case when the user clicks the
        // delete icon on the tab.  It eventually induces an
        // onclick callsign_select() for a deleted callsign.
        // so we do nothing here.
        return false
    }
    scroll_main_content(callsign);
    selected_tab_callsign = callsign;
    tab_notify_id = tab_notification_id(callsign, true);
    $(tab_notify_id).addClass('visually-hidden');
    $(tab_notify_id).text(0);
    // Update send button state
    if (typeof updateSendButton === 'function') {
        updateSendButton();
    }
    // Restore the path for this callsign
    if (callsign in callsign_list && callsign_list[callsign]) {
        $('#pkt_path').val(callsign_list[callsign]);
    } else {
        // If no path stored, use default (empty)
        $('#pkt_path').val('');
    }
    console.log("callsign_select: updating location string for: ", callsign);
    update_location_string(callsign);
}

function call_callsign_location(callsign) {
    //make sure we are connected to the socketio server
    if (socketio_connected == false) {
        raise_error("Not connected to the APRSD server.  Please check your APRSD server connection and try again.");
        return false;
    }
    msg = {'callsign': selected_tab_callsign};
    socket.emit("get_callsign_location", msg);
    location_id = callsign_location_content(callsign, true)+"Spinner";
    //$(location_id).removeClass('d-none');
    $("#location_spinner").removeClass('d-none');
}

function update_info_bar(show_button=false) {
    msgs = message_list[selected_tab_callsign];
    //get the length of the callsign's message list
    // Once we have a callsign tab created, we can update
    // the info bar's html to include the get location buttton
    if (show_button) {
        html = "<button onclick='call_callsign_location();' id='get_location_button' style='margin-left:2px;padding:1px;font-size: .8em;' type='button' class='btn btn-primary' disabled><span id='location_spinner' class='d-none spinner-border spinner-border-sm' role='status' aria-hidden='true' style='font-size: .8em'></span>Get Location</button>&nbsp;<span id='location_str' style='font-size: .8rem'></span>"
        //html = "<span style='border: 1px solid reload_popovers;font-size: .8em;'>ass</span>";
    } else {
        // show the welcome message instead.
        html = "<span id='welcome_message' style='padding-left: 5px;font-size: .9rem'>Welcome to APRSD WebChat.  &nbsp;&nbsp;Click the + tab to start a conversation.</span>"
    }

    $("#info_bar_container").html(html);
    if (show_button) {
        $("#get_location_button").prop('disabled', false);
    } else {
        $("#get_location_button").prop('disabled', true);
    }
}

/**
 * Ensure the "+" tab exists in the tab list
 */
function ensure_add_tab() {
    var addTabId = '#add-tab-li';
    if ($(addTabId).length === 0) {
        var callsignTabs = $("#msgsTabList");
        var addTabHtml = '<li class="nav-item" role="presentation" id="add-tab-li">';
        addTabHtml += '<button class="nav-link add-tab-button" id="add-tab-button" type="button" role="tab" data-bs-toggle="tab" data-bs-target="#add-tab-content" callsign="ADD_TAB">';
        addTabHtml += '<span class="add-tab-icon">+</span>';
        addTabHtml += '</button></li>';
        callsignTabs.append(addTabHtml);

        // Create the tab content for the "+" tab
        var tabContent = $("#msgsTabContent");
        var addTabContentHtml = '<div class="tab-pane fade" id="add-tab-content" role="tabpanel" aria-labelledby="add-tab-button">';
        addTabContentHtml += '<div class="add-tab-input-container">';
        addTabContentHtml += '<input type="text" class="add-tab-input" id="new-callsign-input" placeholder="Enter callsign..." maxlength="9" autocomplete="off">';
        addTabContentHtml += '<div class="add-tab-hint">Press Enter to create a new conversation</div>';
        addTabContentHtml += '</div></div>';
        tabContent.append(addTabContentHtml);

        // Set up event handlers
        $('#add-tab-button').on('click', function(e) {
            e.preventDefault();
            handle_add_tab_click();
        });

        $('#new-callsign-input').on('keydown', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                handle_new_callsign_input();
            }
        });

        // When the "+" tab is shown via Bootstrap
        $('#add-tab-content').on('shown.bs.tab', function() {
            setTimeout(function() {
                $('#new-callsign-input').focus();
            }, 100);
        });
    }
}

/**
 * Remove the "+" tab
 */
function remove_add_tab() {
    $('#add-tab-li').remove();
    $('#add-tab-content').remove();
}

/**
 * Handle click on the "+" tab
 */
function handle_add_tab_click() {
    // Use Bootstrap's tab functionality
    var addTabButton = $('#add-tab-button');
    if (addTabButton.length > 0) {
        // Trigger Bootstrap tab show
        var tab = new bootstrap.Tab(addTabButton[0]);
        tab.show();

        // Focus the input after tab is shown
        setTimeout(function() {
            $('#new-callsign-input').focus();
        }, 150);
    }
}

/**
 * Handle Enter key in the new callsign input
 */
function handle_new_callsign_input() {
    var newCallsign = $('#new-callsign-input').val().trim().toUpperCase();

    if (!newCallsign || newCallsign === '') {
        raise_error("Please enter a callsign");
        return;
    }

    // Check if callsign already exists
    if (newCallsign in callsign_list) {
        raise_error("A conversation with " + newCallsign + " already exists");
        // Switch to that tab instead
        callsign_select(newCallsign);
        activate_callsign_tab(newCallsign);
        $('#new-callsign-input').val('');
        return;
    }

    // Create the new tab
    var active = Object.keys(callsign_list).length === 0;
    create_callsign_tab(newCallsign, active);
    // Initialize with empty path (will be set when first message is sent)
    callsign_list[newCallsign] = '';
    message_list[newCallsign] = {};

    // Clear the input
    $('#new-callsign-input').val('');

    // Select the new tab
    callsign_select(newCallsign);
    activate_callsign_tab(newCallsign);

    // Focus the message input
    setTimeout(function() {
        $('#message').focus();
    }, 100);

    save_data();
}
