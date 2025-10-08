import datetime
import json
import logging
import signal
import sys
import threading
import time

import aprsd
import click
import flask
import timeago
import wrapt
from aprsd import cli_helper, client, packets, plugin_utils, stats, threads, utils
from aprsd import utils as aprsd_utils
from aprsd.client.client import APRSDClient
from aprsd.main import cli
from aprsd.threads import aprsd as aprsd_threads
from aprsd.threads import keepalive, rx, service, tx
from aprsd.threads import stats as stats_thread
from flask import request
from flask_httpauth import HTTPBasicAuth
from flask_socketio import Namespace, SocketIO
from haversine import haversine
from oslo_config import cfg

import aprsd_webchat_extension
from aprsd_webchat_extension import utils as webchat_utils

CONF = cfg.CONF
LOG = logging.getLogger()
auth = HTTPBasicAuth()
socketio = None

# List of callsigns that we don't want to track/fetch their location
callsign_no_track = [
    "APDW16",
    "BLN0",
    "BLN1",
    "BLN2",
    "BLN3",
    "BLN4",
    "BLN5",
    "BLN6",
    "BLN7",
    "BLN8",
    "BLN9",
]

# Callsign location information
# callsign: {lat: 0.0, long: 0.0, last_update: datetime}
callsign_locations = {}

flask_app = flask.Flask(
    "aprsd_webchat_extension",
    static_url_path="/static",
    static_folder="web/chat/static",
    template_folder="web/chat/templates",
)


def signal_handler(sig, frame):
    click.echo("signal_handler: called")
    LOG.info(
        f"Ctrl+C, Sending all threads({len(threads.APRSDThreadList())}) exit! "
        f"Can take up to 10 seconds {datetime.datetime.now()}",
    )
    threads.APRSDThreadList().stop_all()
    if "subprocess" not in str(frame):
        time.sleep(1.5)
        stats.stats_collector.collect()
        LOG.info("Telling flask to bail.")
        signal.signal(signal.SIGTERM, sys.exit(0))


class SentMessages:
    _instance = None
    lock = threading.Lock()

    data = {}

    def __new__(cls, *args, **kwargs):
        """This magic turns this into a singleton."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def is_initialized(self):
        return True

    @wrapt.synchronized(lock)
    def add(self, msg):
        self.data[msg.msgNo] = msg.__dict__

    @wrapt.synchronized(lock)
    def __len__(self):
        return len(self.data.keys())

    @wrapt.synchronized(lock)
    def get(self, id):
        if id in self.data:
            return self.data[id]

    @wrapt.synchronized(lock)
    def get_all(self):
        return self.data

    @wrapt.synchronized(lock)
    def set_status(self, id, status):
        if id in self.data:
            self.data[id]["last_update"] = str(datetime.datetime.now())
            self.data[id]["status"] = status

    @wrapt.synchronized(lock)
    def ack(self, id):
        """The message got an ack!"""
        if id in self.data:
            self.data[id]["last_update"] = str(datetime.datetime.now())
            self.data[id]["ack"] = True

    @wrapt.synchronized(lock)
    def reply(self, id, packet):
        """We got a packet back from the sent message."""
        if id in self.data:
            self.data[id]["reply"] = packet


def _build_location_from_repeat(message):
    # This is a location message Format is
    # ^ld^callsign:latitude,longitude,altitude,course,speed,timestamp
    a = message.split(":")
    LOG.warning(a)
    if len(a) == 2:
        callsign = a[0].replace("^ld^", "")
        b = a[1].split(",")
        LOG.warning(b)
        if len(b) == 6:
            lat = float(b[0])
            lon = float(b[1])
            alt = float(b[2])
            course = float(b[3])
            speed = float(b[4])
            time = int(b[5])
            compass_bearing = aprsd_utils.degrees_to_cardinal(course)
            data = {
                "callsign": callsign,
                "lat": lat,
                "lon": lon,
                "altitude": alt,
                "course": course,
                "compass_bearing": compass_bearing,
                "speed": speed,
                "lasttime": time,
                "timeago": timeago.format(time),
            }
            LOG.debug(f"Location data from REPEAT {data}")
            return data


def _calculate_location_data(location_data):
    """Calculate all of the location data from data from aprs.fi or REPEAT."""
    lat = location_data["lat"]
    lon = location_data["lon"]
    alt = location_data["altitude"]
    speed = location_data["speed"]
    lasttime = location_data["lasttime"]
    timeago_str = location_data.get(
        "timeago",
        timeago.format(lasttime),
    )
    # now calculate distance from our own location
    distance = 0
    if CONF.aprsd_webchat_extension.latitude and CONF.aprsd_webchat_extension.longitude:
        our_lat = float(CONF.aprsd_webchat_extension.latitude)
        our_lon = float(CONF.aprsd_webchat_extension.longitude)
        distance = haversine((our_lat, our_lon), (lat, lon))
        bearing = aprsd_utils.calculate_initial_compass_bearing(
            (our_lat, our_lon),
            (lat, lon),
        )
        compass_bearing = aprsd_utils.degrees_to_cardinal(bearing)
    else:
        bearing = 0
        distance = -1
        compass_bearing = "N"

    return {
        "callsign": location_data["callsign"],
        "lat": lat,
        "lon": lon,
        "altitude": alt,
        "course": f"{bearing:0.1f}",
        "compass_bearing": compass_bearing,
        "speed": speed,
        "lasttime": lasttime,
        "timeago": timeago_str,
        "distance": f"{distance:0.1f}",
    }


def send_location_data_to_browser(location_data):
    global socketio
    callsign = location_data["callsign"]
    LOG.info(f"Got location for {callsign} {callsign_locations[callsign]}")
    socketio.emit(
        "callsign_location",
        callsign_locations[callsign],
        namespace="/sendmsg",
    )


def populate_callsign_location(callsign, data=None):
    """Populate the location for the callsign.

    if data is passed in, then we have the location already from
    an APRS packet.  If data is None, then we need to fetch the
    location from aprs.fi or REPEAT.
    """
    global socketio
    """Fetch the location for the callsign."""
    LOG.debug(f"populate_callsign_location {callsign}")
    if data:
        location_data = _calculate_location_data(data)
        callsign_locations[callsign] = location_data
        send_location_data_to_browser(location_data)
        return

    # First we are going to try to get the location from aprs.fi
    # if there is no internets, then this will fail and we will
    # fallback to calling REPEAT for the location for the callsign.
    fallback = False
    if not CONF.aprs_fi.apiKey:
        LOG.warning(
            "Config aprs_fi.apiKey is not set. Can't get location from aprs.fi "
            " falling back to sending REPEAT to get location.",
        )
        fallback = True
    else:
        try:
            aprs_data = plugin_utils.get_aprs_fi(CONF.aprs_fi.apiKey, callsign)
            if not len(aprs_data["entries"]):
                LOG.error("Didn't get any entries from aprs.fi")
                return
            lat = float(aprs_data["entries"][0]["lat"])
            lon = float(aprs_data["entries"][0]["lng"])
            try:  # altitude not always provided
                alt = float(aprs_data["entries"][0]["altitude"])
            except Exception:
                alt = 0
            location_data = {
                "callsign": callsign,
                "lat": lat,
                "lon": lon,
                "altitude": alt,
                "lasttime": int(aprs_data["entries"][0]["lasttime"]),
                "course": float(aprs_data["entries"][0].get("course", 0)),
                "speed": float(aprs_data["entries"][0].get("speed", 0)),
            }
            location_data = _calculate_location_data(location_data)
            callsign_locations[callsign] = location_data
            send_location_data_to_browser(location_data)
            return
        except Exception as ex:
            LOG.error(f"Failed to fetch aprs.fi '{ex}'")
            LOG.error(ex)
            fallback = True

    if fallback:
        # We don't have the location data
        # and we can't get it from aprs.fi
        # Send a special message to REPEAT to get the location data
        LOG.info(f"Sending REPEAT to get location for callsign {callsign}.")
        tx.send(
            packets.MessagePacket(
                from_call=CONF.callsign,
                to_call="REPEAT",
                message_text=f"ld {callsign}",
            ),
        )


class WebChatProcessPacketThread(rx.APRSDProcessPacketThread):
    """Class that handles packets being sent to us."""

    def __init__(self, packet_queue, socketio):
        self.socketio = socketio
        self.connected = False
        super().__init__(packet_queue)

    def process_ack_packet(self, packet: packets.AckPacket):
        super().process_ack_packet(packet)
        ack_num = packet.get("msgNo")
        SentMessages().ack(ack_num)
        if msg := SentMessages().get(ack_num):
            self.socketio.emit(
                "ack",
                msg,
                namespace="/sendmsg",
            )
        self.got_ack = True

    def process_our_message_packet(self, packet: packets.MessagePacket):
        global callsign_locations
        # ok lets see if we have the location for the
        # person we just sent a message to.
        from_call = packet.get("from_call").upper()
        if from_call == "REPEAT":
            # We got a message from REPEAT.  Is this a location message?
            message = packet.get("message_text")
            if message.startswith("^ld^"):
                location_data = _build_location_from_repeat(message)
                callsign = location_data["callsign"]
                location_data = _calculate_location_data(location_data)
                callsign_locations[callsign] = location_data
                send_location_data_to_browser(location_data)
                return
        elif (
            from_call not in callsign_locations
            and from_call not in callsign_no_track
            and APRSDClient().driver.transport
            in [client.TRANSPORT_APRSIS, client.TRANSPORT_FAKE]
        ):
            # We have to ask aprs for the location for the callsign
            # We send a message packet to wb4bor-11 asking for location.
            populate_callsign_location(from_call)
        # Send the packet to the browser.
        self.socketio.emit(
            "new",
            packet.__dict__,
            namespace="/sendmsg",
        )


class LocationProcessingThread(aprsd_threads.APRSDThread):
    """Class to handle the location processing."""

    def __init__(self):
        super().__init__("LocationProcessingThread")

    def loop(self):
        pass


def _get_transport(stats):
    if CONF.aprs_network.enabled:
        transport = "aprs-is"
        aprs_connection = (
            "APRS-IS Server: <a href='http://status.aprs2.net' >" "{}</a>".format(
                stats["APRSClientStats"]["server_string"]
            )
        )
    elif CONF.kiss_tcp.enabled:
        transport = "kiss_tcp"
        aprs_connection = "TCPKISS://{}:{}".format(
            CONF.kiss_tcp.host,
            CONF.kiss_tcp.port,
        )
    elif CONF.kiss_serial.enabled:
        transport = "kiss_serial"
        # for pep8 violation
        aprs_connection = (
            "SerialKISS://{}@{} baud".format(
                CONF.kiss_serial.device,
                CONF.kiss_serial.baudrate,
            ),
        )
    elif CONF.fake_client.enabled:
        transport = client.TRANSPORT_FAKE
        aprs_connection = "Fake Client"

    return transport, aprs_connection


@flask_app.route("/location/<callsign>", methods=["POST"])
def location(callsign):
    LOG.debug(f"Fetch location for callsign {callsign}")
    if callsign not in callsign_no_track:
        populate_callsign_location(callsign)


@auth.login_required
@flask_app.route("/")
def index():
    stats = _stats()

    # For development
    html_template = "index.html"
    LOG.debug(f"Template {html_template}")

    transport, aprs_connection = _get_transport(stats["stats"])
    LOG.debug(f"transport {transport} aprs_connection {aprs_connection}")

    stats["transport"] = transport
    stats["aprs_connection"] = aprs_connection
    LOG.debug(f"initial stats = {stats}")
    latitude = CONF.aprsd_webchat_extension.latitude
    if latitude:
        latitude = float(CONF.aprsd_webchat_extension.latitude)

    longitude = CONF.aprsd_webchat_extension.longitude
    if longitude:
        longitude = float(longitude)

    return flask.render_template(
        html_template,
        initial_stats=stats,
        aprs_connection=aprs_connection,
        callsign=CONF.callsign,
        version=aprsd_webchat_extension.__version__,
        aprsd_version=aprsd.__version__,
        latitude=latitude,
        longitude=longitude,
    )


@auth.login_required
@flask_app.route("/send-message-status")
def send_message_status():
    LOG.debug(request)
    msgs = SentMessages()
    info = msgs.get_all()
    return json.dumps(info)


def _stats():
    now = datetime.datetime.now()

    time_format = "%m-%d-%Y %H:%M:%S"
    stats_dict = stats.stats_collector.collect(serializable=True)
    # Webchat doesnt need these
    if "WatchList" in stats_dict:
        del stats_dict["WatchList"]
    if "SeenList" in stats_dict:
        del stats_dict["SeenList"]
    if "APRSDThreadList" in stats_dict:
        del stats_dict["APRSDThreadList"]
    if "PacketList" in stats_dict:
        del stats_dict["PacketList"]
    if "EmailStats" in stats_dict:
        del stats_dict["EmailStats"]
    if "PluginManager" in stats_dict:
        del stats_dict["PluginManager"]

    result = {
        "time": now.strftime(time_format),
        "stats": stats_dict,
    }
    return result


@flask_app.route("/stats")
def get_stats():
    return json.dumps(_stats())


class SendMessageNamespace(Namespace):
    """Class to handle the socketio interactions."""

    got_ack = False
    reply_sent = False
    msg = None
    request = None

    def __init__(self, namespace=None, config=None):
        super().__init__(namespace)

    def on_connect(self):
        global socketio
        LOG.debug("Web socket connected")
        socketio.emit(
            "connected",
            {"data": "/sendmsg Connected"},
            namespace="/sendmsg",
        )

    def on_disconnect(self):
        LOG.debug("WS Disconnected")

    def on_send(self, data):
        global socketio
        LOG.debug(f"WS: on_send {data}")
        self.request = data
        data["from"] = CONF.callsign
        path = data.get("path", None)
        if not path:
            path = []
        elif "," in path:
            path_opts = path.split(",")
            path = [x.strip() for x in path_opts]
        else:
            path = [path]

        pkt = packets.MessagePacket(
            from_call=data["from"],
            to_call=data["to"].upper(),
            message_text=data["message"],
            path=path,
        )
        pkt.prepare()
        self.msg = pkt
        msgs = SentMessages()
        tx.send(pkt)
        msgs.add(pkt)
        msgs.set_status(pkt.msgNo, "Sending")
        obj = msgs.get(pkt.msgNo)
        socketio.emit(
            "sent",
            obj,
            namespace="/sendmsg",
        )

    def on_gps(self, data):
        LOG.debug(f"WS on_GPS: {data}")
        lat = data["latitude"]
        long = data["longitude"]
        LOG.debug(f"Lat {lat}")
        LOG.debug(f"Long {long}")
        path = data.get("path", None)
        if not path:
            path = []
        elif "," in path:
            path_opts = path.split(",")
            path = [x.strip() for x in path_opts]
        else:
            path = [path]

        tx.send(
            packets.BeaconPacket(
                from_call=CONF.callsign,
                to_call="APDW16",
                latitude=lat,
                longitude=long,
                comment="APRSD WebChat Beacon",
                path=path,
            ),
            direct=True,
        )

    def handle_message(self, data):
        LOG.debug(f"WS Data {data}")

    def handle_json(self, data):
        LOG.debug(f"WS json {data}")

    def on_get_callsign_location(self, data):
        LOG.debug(f"on_callsign_location {data}")
        if data["callsign"] not in callsign_no_track:
            populate_callsign_location(data["callsign"])


def init_flask(loglevel, quiet):
    global socketio, flask_app

    socketio = SocketIO(
        flask_app,
        logger=False,
        engineio_logger=False,
        async_mode="threading",
    )

    socketio.on_namespace(
        SendMessageNamespace(
            "/sendmsg",
        ),
    )
    return socketio


# main() ###
@cli.command()
@cli_helper.add_options(cli_helper.common_options)
@click.option(
    "-f",
    "--flush",
    "flush",
    is_flag=True,
    show_default=True,
    default=False,
    help="Flush out all old aged messages on disk.",
)
@click.option(
    "-p",
    "--port",
    "port",
    show_default=True,
    default=None,
    help="Port to listen to web requests.  This overrides the "
    "config.aprsd_webchat_extension.web_port setting.",
)
@click.pass_context
@cli_helper.process_standard_options
def webchat(ctx, flush, port):
    """Web based HAM Radio chat program!"""
    loglevel = ctx.obj["loglevel"]
    quiet = ctx.obj["quiet"]

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # setup webchat logging settings.
    webchat_utils.setup_logging(loglevel=loglevel)

    LOG.info(f"Python version: {sys.version}")
    LOG.info(f"APRSD Started version: {aprsd.__version__}")
    level, msg = utils._check_version()
    if level:
        LOG.warning(msg)
    else:
        LOG.info(msg)
    utils.package.log_installed_extensions_and_plugins()

    CONF.log_opt_values(logging.getLogger(), logging.DEBUG)
    if not port:
        port = CONF.aprsd_webchat_extension.web_port

    service_threads = service.ServiceThreads()

    # Make sure we have 1 client transport enabled
    if not APRSDClient().is_enabled:
        LOG.error("No Clients are enabled in config.")
        sys.exit(-1)

    if not APRSDClient().is_configured:
        LOG.error("APRS client is not properly configured in config file.")
        sys.exit(-1)

    # Creates the client object
    LOG.info("Creating client connection")
    aprs_client = APRSDClient()
    LOG.info(aprs_client)
    if not aprs_client.login_success:
        # We failed to login, will just quit!
        msg = f"Login Failure: {aprs_client.login_failure}"
        LOG.error(msg)
        print(msg)
        sys.exit(-1)

    service_threads.register(keepalive.KeepAliveThread())
    service_threads.register(stats_thread.APRSDStatsStoreThread())

    socketio = init_flask(loglevel, quiet)
    service_threads.register(
        rx.APRSDRXThread(
            packet_queue=threads.packet_queue,
        )
    )
    service_threads.register(
        WebChatProcessPacketThread(
            packet_queue=threads.packet_queue,
            socketio=socketio,
        )
    )
    service_threads.start()

    LOG.info("Start socketio.run()")
    socketio.run(
        flask_app,
        # This is broken for now after removing cryptography
        # and pyopenssl
        # ssl_context="adhoc",
        host=CONF.aprsd_webchat_extension.web_ip,
        port=port,
        allow_unsafe_werkzeug=True,
    )
    service_threads.join()

    LOG.info("WebChat exiting!!!!  Bye.")
