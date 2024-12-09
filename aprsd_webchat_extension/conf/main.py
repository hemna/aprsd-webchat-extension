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
    cfg.StrOpt(
        "latitude",
        default=None,
        help="Latitude for the GPS Beacon button.  If not set, the button will not be enabled.",
    ),
    cfg.StrOpt(
        "longitude",
        default=None,
        help="Longitude for the GPS Beacon button.  If not set, the button will not be enabled.",
    ),
    cfg.BoolOpt(
        "disable_url_request_logging",
        default=False,
        help="Disable the logging of url requests in the webchat command.",
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
