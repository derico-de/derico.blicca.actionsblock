"""Delete the orphan block_api record."""

import logging

from plone.registry.interfaces import IRegistry
from zope.component import getUtility

from plone.blicca.auroraeditor.blockaddons import BLOCKADDON_PREFIX


logger = logging.getLogger(__name__)

RECORD_NAME = "derico.blicca.actionsblock.actions"


def upgrade(context):
    """Delete the ``block_api`` record the retired field left, if any.

    Upgrade from profile version 1002 to 1003.
    """
    logger.info("Running upgrade step: Delete the block_api record")
    key = f"{BLOCKADDON_PREFIX}/{RECORD_NAME}.block_api"
    records = getUtility(IRegistry).records
    if key in records:
        del records[key]
        logger.info("Deleted the %s record.", key)
