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
]

ALL_OPTS = extension_opts


def register_opts(cfg):
    cfg.register_group(extension_group)
    cfg.register_opts(ALL_OPTS, group=extension_group)


def list_opts():
    return {
        extension_group.name: extension_opts,
    }
