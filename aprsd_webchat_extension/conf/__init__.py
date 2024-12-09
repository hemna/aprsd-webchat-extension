from oslo_config import cfg

from aprsd_webchat_extension.conf import main


CONF = cfg.CONF
main.register_opts(CONF)
