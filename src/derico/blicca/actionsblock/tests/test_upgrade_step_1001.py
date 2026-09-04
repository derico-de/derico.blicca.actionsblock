"""Tests for upgrade step 1000 -> 1001: the block add-on record.

Version 1001 is declarative — it adds one ``IAuroraBlockAddon`` record and
nothing else — so the step is an ``upgradeDepends`` on a mini profile that
carries a copy of ``profiles/default/registry.xml``, narrowed with
``import_steps`` to the registry step alone. Two things can go wrong with
that shape and neither shows up at install time: the wiring can be off, so a
site at 1000 is never offered the upgrade, and the copy can drift from the
default profile. Both are held here.
"""

import pathlib
import xml.etree.ElementTree as ET

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons
from Products.GenericSetup.upgrade import UpgradeDepends

import derico.blicca.actionsblock

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME


PROFILE = "derico.blicca.actionsblock:default"
UPGRADE_PROFILE = "derico.blicca.actionsblock.upgrades:1001"

PACKAGE = pathlib.Path(derico.blicca.actionsblock.__file__).parent
DEFAULT_REGISTRY = PACKAGE / "profiles" / "default" / "registry.xml"
UPGRADE_REGISTRY = PACKAGE / "upgrades" / "1001" / "registry.xml"


def normalized(path):
    """The XML's structure, stripped of comments and whitespace."""

    def walk(elem):
        text = (elem.text or "").strip()
        return (
            elem.tag,
            tuple(sorted(elem.attrib.items())),
            text,
            tuple(walk(child) for child in elem),
        )

    # S314: the two files parsed here are this package's own committed
    # profile XML, not input.
    return walk(ET.parse(path).getroot())  # noqa: S314


class TestUpgradeProfileParity:
    def test_upgrade_registry_matches_the_default_profile(self):
        assert normalized(UPGRADE_REGISTRY) == normalized(DEFAULT_REGISTRY)


class TestUpgrade1001:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")

    def _steps(self):
        return self.setup_tool.listUpgrades(PROFILE, show_old=True)

    def _flat(self):
        found = []
        for step in self._steps():
            found.extend(step if isinstance(step, list) else [step])
        return found

    def test_the_step_is_wired_from_1000_to_1001(self):
        steps = [s for s in self._flat() if s["ssource"] == "1000" and s["sdest"] == "1001"]
        assert len(steps) == 1
        assert isinstance(steps[0]["step"], UpgradeDepends)
        assert steps[0]["step"].import_profile == UPGRADE_PROFILE
        assert steps[0]["step"].import_steps == ["plone.app.registry"]

    def test_the_upgrade_profile_is_hidden_from_the_control_panel(self):
        from derico.blicca.actionsblock.setuphandlers import HiddenProfiles

        assert UPGRADE_PROFILE in HiddenProfiles().getNonInstallableProfiles()

    def test_running_it_on_a_site_at_1000_installs_the_record(self):
        # A site installed before the record existed: version 1000 and no
        # record. Running the step must give it exactly the fresh-install one.
        registry = block_addon_records()
        del registry[RECORD_NAME]
        assert RECORD_NAME not in block_addon_records()
        self.setup_tool.setLastVersionForProfile(PROFILE, "1000")

        self.setup_tool.upgradeProfile(PROFILE, dest="1001")

        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1001",)
        record = block_addon_records()[RECORD_NAME]
        assert record.bundle == "++plone++derico.blicca.actionsblock/actions-block.js"
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        assert statuses[RECORD_NAME].loadable
