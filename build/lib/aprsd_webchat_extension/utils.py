import logging

import update_checker
from aprsd.conf import log as conf_log
from loguru import logger
from oslo_config import cfg

import aprsd_webchat_extension

# Have to import this to get the setup_logging to work
from aprsd_webchat_extension import conf  # noqa

CONF = cfg.CONF
LOG = logger


def _check_version():
    # check for a newer version
    try:
        check = update_checker.UpdateChecker()
        result = check.check(
            "aprsd-webchat-extension", aprsd_webchat_extension.__version__
        )
        if result:
            # Looks like there is an updated version.
            return 1, result
        else:
            return 0, "APRSD aprsd-webchat-extension extension is up to date"
    except Exception:
        # probably can't get in touch with pypi for some reason
        # Lets put up an error and move on.  We might not
        # have internet in this aprsd deployment.
        return (
            1,
            "Couldn't check for new version of APRSD Extension (aprsd-webchat-extension)",
        )


def setup_logging(loglevel=None, quiet=False):
    if not loglevel:
        CONF.logging.log_level
    else:
        conf_log.LOG_LEVELS[loglevel]

    webserver_list = [
        "werkzeug",
        "werkzeug._internal",
        "socketio",
        "urllib3.connectionpool",
        "chardet",
        "chardet.charsetgroupprober",
        "chardet.eucjpprober",
        "chardet.mbcharsetprober",
    ]

    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        if name in webserver_list:
            logging.getLogger(name).propagate = False

    if CONF.aprsd_webchat_extension.disable_url_request_logging:
        for name in webserver_list:
            logging.getLogger(name).handlers = []
            logging.getLogger(name).propagate = True
            logging.getLogger(name).setLevel(logging.ERROR)
