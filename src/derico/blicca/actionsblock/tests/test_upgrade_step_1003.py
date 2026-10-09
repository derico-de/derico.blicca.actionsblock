"""Tests for upgrade step 1002 -> 1003.

Block add-ons are checked by the names their bundles import (ADR 0024 in
plone.blicca.auroraeditor): the `block_api` field left `IAuroraBlockAddon`,
and the record an installed site still holds for it goes.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons
from plone.registry import field
from plone.registry import Record
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

from .test_setup import RECORD_NAME


PROFILE = "derico.blicca.actionsblock:default"
PREFIX = f"{blockaddons.BLOCKADDON_PREFIX}/{RECORD_NAME}"
KEY = f"{PREFIX}.block_api"


class TestUpgrade1003:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        self.registry = getUtility(IRegistry)

    def _upgrade(self):
        from derico.blicca.actionsblock.upgrades.v1003 import upgrade

        upgrade(self.setup_tool)

    def test_upgrade_handler_importable(self):
        from derico.blicca.actionsblock.upgrades.v1003 import upgrade

        assert callable(upgrade)

    def test_upgrade_deletes_the_orphan_block_api_record(self):
        """A site at 1002: the record still carries block_api."""
        self.registry.records[KEY] = Record(field.TextLine(title="old"), "2.0")
        self._upgrade()
        assert KEY not in self.registry.records

    def test_upgrade_without_the_record_changes_nothing(self):
        assert KEY not in self.registry.records
        before = sorted(self.registry.records.keys())
        self._upgrade()
        assert sorted(self.registry.records.keys()) == before

    def test_upgrade_leaves_the_rest_of_the_record_alone(self):
        self.registry.records[KEY] = Record(field.TextLine(title="old"), "2.0")
        self._upgrade()
        from .test_setup import block_addon_records

        record = block_addon_records()[RECORD_NAME]
        assert record.bundle == "++plone++derico.blicca.actionsblock/actions-block.js"

    def test_reaches_the_profile_version(self):
        self.setup_tool.setLastVersionForProfile(PROFILE, "1002")
        self.setup_tool.upgradeProfile(PROFILE, dest="1003")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1003",)
