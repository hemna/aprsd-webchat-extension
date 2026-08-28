from oslo_config import cfg

extension_group = cfg.OptGroup(
    name="aprsd_webchat_extension",
    title="APRSD aprsd-webchat-extension extension settings",
)

extension_opts = [
    cfg.StrOpt(
        "web_ip",
        default="0.0.0.0",
        help="The ip address to listen on",
    ),
    cfg.PortOpt(
        "web_port",
        default=8001,
        help="The port to listen on",
    ),
    cfg.BoolOpt(
        "disable_url_request_logging",
        default=False,
        help="Disable the logging of url requests in the webchat command.",
    ),
    cfg.IntOpt(
        "beacon_interval",
        default=1800,
        help="The number of seconds between beacon packets.",
    ),
    cfg.BoolOpt(
        "enable_aprsthursday",
        default=False,
        help="Enable the APRSThursday net support feature. When enabled, "
        "adds a toggle button for joining the HOTG group via ANSRVR, "
        "with dedicated tab, message routing, and quick templates. "
        "When disabled, HOTG messages appear as normal incoming messages.",
    ),
    cfg.StrOpt(
        "public_url",
        default="",
        help="The public-facing URL of this webchat instance, including scheme "
        "and host (e.g. https://mycall.aprsradio.online). Set this when "
        "running behind a reverse proxy so the browser Origin header matches "
        "a known value. Leave empty for auto-detection (recommended for "
        "direct LAN deployments such as DigiPi).",
    ),
    cfg.ListOpt(
        "allowed_origins",
        default=[],
        help="Explicit list of CORS Origins that are permitted to open a "
        "WebSocket connection (e.g. http://192.168.1.10:8001,"
        "https://mycall.aprsradio.online). When non-empty this list "
        "completely replaces the auto-detected origins. Use this only "
        "when the automatic detection and public_url options are "
        "insufficient for your deployment.",
    ),
]

ALL_OPTS = extension_opts


def register_opts(cfg):
    cfg.register_group(extension_group)
    cfg.register_opts(ALL_OPTS, group=extension_group)


def list_opts():
    return {
        extension_group.name: extension_opts,
    }
