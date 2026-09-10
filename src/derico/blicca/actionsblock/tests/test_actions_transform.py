"""The catalog transformer pair.

The headline tests are ``TestRoundTrip`` — serialize → deserialize returns a
block byte-identical to what went in, because derived data is never
persisted — and ``TestRestapiParity``: the rows this pair injects are the
rows ``plone.restapi``'s ``@actions`` service returns, minus ``icon``, so the
canvas's fallback fetch of that service for a never-serialized node sees
exactly what a serialized node carries.
"""

import copy

import pytest
from plone import api
from plone.app.testing import login
from plone.app.testing import logout
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.restapi.behaviors import IBlocks
from plone.restapi.blocks import iter_block_transform_handlers
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from plone.restapi.services.actions.get import Actions
from zope.annotation.interfaces import IAnnotations
from zope.globalrequest import setRequest
from zope.interface import alsoProvides

from derico.blicca.actionsblock.actions_data import CATEGORY_IDS
from derico.blicca.actionsblock.actions_transform import actions_catalog
from derico.blicca.actionsblock.actions_transform import DERIVED_FIELDS
from derico.blicca.actionsblock.blocks import ACTIONS_BLOCK_TYPE
from derico.blicca.actionsblock.interfaces import IDericoBliccaActionsblockLayer


class ActionsTransformTestCase:
    """A portal holding one document, with the add-on's layer on the request."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaActionsblockLayer)
        # iter_block_transform_handlers looks the adapters up against
        # zope.globalrequest, not against a request handed in.
        setRequest(self.request)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        login(self.portal, TEST_USER_NAME)
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )
        alsoProvides(self.doc, IBlocks)
        yield
        setRequest(None)

    def _transform(self, context, block, interface):
        value = copy.deepcopy(block)
        for handler in iter_block_transform_handlers(context, value, interface):
            value = handler(value)
        return value

    def serialize(self, block, context=None):
        return self._transform(context or self.doc, block, IBlockFieldSerializationTransformer)

    def deserialize(self, block, context=None):
        return self._transform(context or self.doc, block, IBlockFieldDeserializationTransformer)

    def node(self, **fields):
        block = {"@type": ACTIONS_BLOCK_TYPE, "category": "site_actions"}
        block.update(fields)
        return block


class TestSerializer(ActionsTransformTestCase):
    def test_injects_every_offered_category(self):
        out = self.serialize(self.node())
        assert set(out["catalog"]) == set(CATEGORY_IDS)

    def test_rows_carry_exactly_the_keys_the_renderers_read(self):
        out = self.serialize(self.node())
        rows = [row for rows in out["catalog"].values() for row in rows]
        assert rows, "a Manager on a document has actions"
        for row in rows:
            assert set(row) == {"id", "title", "url"}
            assert isinstance(row["title"], str)
            # Raw, as Plone computed it: one stock action carries a leading
            # space in its url expression, and the renderers trim anyway.
            assert row["url"].strip().startswith("http://nohost/plone")

    def test_the_stock_site_actions_are_there(self):
        out = self.serialize(self.node())
        ids = [row["id"] for row in out["catalog"]["site_actions"]]
        assert "sitemap" in ids
        assert "contact" in ids

    def test_object_actions_are_the_contexts(self):
        out = self.serialize(self.node())
        by_id = {row["id"]: row for row in out["catalog"]["object"]}
        assert by_id["edit"]["url"] == f"{self.doc.absolute_url()}/edit"

    def test_the_catalog_is_the_users(self):
        logged_in = self.serialize(self.node())["catalog"]
        assert "logout" in [row["id"] for row in logged_in["user"]]
        assert "delete" in [row["id"] for row in logged_in["object_buttons"]]
        logout()
        # Two per-request caches a real request never carries across a login
        # change, this test's does: `plone_context_state.actions` is memoized
        # on the request, and CMFCore caches the action EXPRESSION CONTEXT
        # (which holds `member`) under `_plone_ec_cache`.
        IAnnotations(self.request).pop("plone.memoize", None)
        self.request.other.pop("_plone_ec_cache", None)
        anonymous = self.serialize(self.node())["catalog"]
        assert "login" in [row["id"] for row in anonymous["user"]]
        assert "delete" not in [row["id"] for row in anonymous["object_buttons"]]

    def test_touches_no_other_field(self):
        node = self.node(title="More", blockWidth="full")
        out = self.serialize(node)
        out.pop("catalog")
        assert out == node

    def test_replaces_a_catalog_already_on_the_node(self):
        forged = self.node(catalog={"site_actions": [{"id": "forged", "title": "F", "url": "/x"}]})
        out = self.serialize(forged)
        assert "forged" not in [row["id"] for row in out["catalog"]["site_actions"]]

    def test_fires_on_the_site_root_too(self):
        out = self.serialize(self.node(), context=self.portal)
        assert "sitemap" in [row["id"] for row in out["catalog"]["site_actions"]]

    def test_leaves_other_block_types_alone(self):
        other = {"@type": "teaser", "title": "x"}
        assert self.serialize(other) == other

    def test_fires_on_a_carrier_that_is_neither(self):
        """A footer carrier: blocks stored on a field, on plain content.

        ``collective.blicca.footerblocks`` renders the inherited footer with
        the *carrier* as context — a language root folder, which carries the
        editable-footer behavior and not ``IBlocks``. A registration narrowed
        to ``IBlocks`` and the site root skips it, and the footer's actions
        block draws its empty root on every page of the site.
        """
        folder = api.content.create(
            container=self.portal, type="Folder", id="carrier", title="A carrier"
        )
        out = self.serialize(self.node(), context=folder)
        assert "sitemap" in [row["id"] for row in out["catalog"]["site_actions"]]


class TestRoundTrip(ActionsTransformTestCase):
    def test_serialize_then_deserialize_is_the_identity(self):
        node = self.node(title="More")
        assert self.deserialize(self.serialize(node)) == node

    def test_deserialize_strips_every_derived_key(self):
        polluted = self.node(**{key: {"x": 1} for key in DERIVED_FIELDS})
        assert self.deserialize(polluted) == self.node()

    def test_deserialize_strips_on_the_site_root_too(self):
        polluted = self.node(catalog={})
        assert self.deserialize(polluted, context=self.portal) == self.node()

    def test_deserialize_strips_on_any_carrier(self):
        folder = api.content.create(
            container=self.portal, type="Folder", id="carrier", title="A carrier"
        )
        polluted = self.node(catalog={})
        assert self.deserialize(polluted, context=folder) == self.node()


class TestRestapiParity(ActionsTransformTestCase):
    """What the canvas fetches equals what the serializer injects."""

    def test_matches_the_actions_service_row_for_row(self):
        service = Actions(self.doc, self.request)(expand=True)["actions"]
        ours = actions_catalog(self.doc, self.request)
        for category in CATEGORY_IDS:
            theirs = [
                {"id": row["id"], "title": row["title"], "url": row["url"]}
                for row in service[category]
            ]
            assert ours[category] == theirs, category
