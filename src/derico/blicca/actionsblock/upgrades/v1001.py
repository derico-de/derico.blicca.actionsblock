"""Register the Actions block add-on record."""
import logging

from .base import reload_gs_profile

logger = logging.getLogger(__name__)


def upgrade(context):
    """Import the IAuroraBlockAddon record that makes the committed actions bundle discoverable

    Upgrade from profile version 1000 to 1001.
    """
    logger.info("Running upgrade step: Register the Actions block add-on record")
    reload_gs_profile(context)
