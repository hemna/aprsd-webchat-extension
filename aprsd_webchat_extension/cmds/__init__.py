import click

from aprsd.cli_helper import AliasedGroup
from aprsd.main import cli


@cli.group(cls=AliasedGroup, aliases=['aprsd-webchat-extension'], help="APRSD Webchat")
@click.pass_context
def aprsd-webchat-extension(ctx):
    pass
