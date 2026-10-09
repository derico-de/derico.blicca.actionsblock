"""Upgrade step 1001 -> 1002: historically declared block-api 2.0.

`block_api` is retired (ADR 0024 in plone.blicca.auroraeditor); the step's
registry.xml now carries no values. Held here: the step still reaches 1002,
stays hidden from the control panel, and leaves the record alone.
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
UPGRADE_REGISTRY = PACKAGE / "upgrades" / "1002" / "registry.xml"


def test_upgrade_registry_declares_no_values():
    """Nothing is left to import: the step only keeps the chain intact."""
    # S314: this package's own committed profile XML, not input.
    root = ET.parse(UPGRADE_REGISTRY).getroot()  # noqa: S314
    assert list(root.iter("value")) == []


class TestUpgrade1002:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        self.setup_tool.setLastVersionForProfile(PROFILE, "1001")

    def test_the_upgrade_profile_is_hidden_from_the_control_panel(self):
        assert UPGRADE_PROFILE in hidden_profiles()

    def test_leaves_the_record_alone(self):
        api.portal.set_registry_record(f"{PREFIX}.enabled", False)
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        record = block_addon_records()[RECORD_NAME]
        assert record.enabled is False
        assert record.bundle == "++plone++derico.blicca.actionsblock/actions-block.js"

    def test_reaches_the_profile_version(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1002",)
