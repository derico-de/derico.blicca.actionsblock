"""Upgrade step 1001 -> 1002: the block add-on record declares block-api 2.0.

The step imports the registry step from a mini profile that carries only the
new `block_api` value. Held here: that value matches the default profile, and
running the step on a site at 1001 lands it on 2.0 without touching the rest
of the record.
"""

import pathlib
import xml.etree.ElementTree as ET

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons

import derico.blicca.actionsblock

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME
from .test_upgrade_step_1001 import hidden_profiles


PROFILE = "derico.blicca.actionsblock:default"
UPGRADE_PROFILE = "derico.blicca.actionsblock.upgrades:1002"
PREFIX = f"{blockaddons.BLOCKADDON_PREFIX}/{RECORD_NAME}"

PACKAGE = pathlib.Path(derico.blicca.actionsblock.__file__).parent
DEFAULT_REGISTRY = PACKAGE / "profiles" / "default" / "registry.xml"
UPGRADE_REGISTRY = PACKAGE / "upgrades" / "1002" / "registry.xml"


def declared_block_api(path):
    """`block_api` per record prefix in a registry profile."""
    # S314: this package's own committed profile XML, not input.
    root = ET.parse(path).getroot()  # noqa: S314
    return {
        records.get("prefix"): value.text.strip()
        for records in root.iter("records")
        for value in records.iter("value")
        if value.get("key") == "block_api"
    }


class TestUpgradeProfileParity:
    def test_upgrade_declares_what_a_fresh_install_declares(self):
        assert declared_block_api(UPGRADE_REGISTRY) == declared_block_api(DEFAULT_REGISTRY)


class TestUpgrade1002:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        # A site at 1001: the record declares 1.0.
        api.portal.set_registry_record(f"{PREFIX}.block_api", "1.0")
        self.setup_tool.setLastVersionForProfile(PROFILE, "1001")

    def test_the_upgrade_profile_is_hidden_from_the_control_panel(self):
        assert UPGRADE_PROFILE in hidden_profiles()

    def test_declares_block_api_2_0(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert block_addon_records()[RECORD_NAME].block_api == "2.0"

    def test_the_block_loads_again(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        assert statuses[RECORD_NAME].loadable

    def test_leaves_the_rest_of_the_record_alone(self):
        api.portal.set_registry_record(f"{PREFIX}.enabled", False)
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        record = block_addon_records()[RECORD_NAME]
        assert record.enabled is False
        assert record.bundle == "++plone++derico.blicca.actionsblock/actions-block.js"

    def test_reaches_the_profile_version(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1002",)
