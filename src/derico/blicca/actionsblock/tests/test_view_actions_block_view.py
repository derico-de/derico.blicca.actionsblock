"""The Actions block's public renderer — registration, and the anatomy it emits.

The headline test is ``TestAnatomy``: every case in ``tests/anatomy-cases.json``
at the package root, the same hand-authored cases
``bundle-src/test/actions-anatomy.test.tsx`` holds the React renderer to. The
fixture is read twice over, the same way the vitest suite reads it: exactly,
up to attribute order, and as a skeleton — every attribute but ``class``
removed, text kept — which is the cross-renderer contract.

``TestEndToEnd`` then runs the real pipeline once: the serializer derives the
catalog for a Manager on a document, ``render_block_data`` dispatches, and the
markup carries Plone's own actions.
"""

import json
import re
from pathlib import Path

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor.blockaddons import evaluate
from plone.blicca.auroraeditor.blockaddons import lockstep_gaps
from plone.blicca.auroraeditor.browser.rendering.base import BlockDispatchMixin
from plone.blicca.auroraeditor.rendering import render_blocks
from plone.restapi.behaviors import IBlocks
from zope.component import getMultiAdapter
from zope.globalrequest import setRequest
from zope.interface import alsoProvides
from zope.publisher.browser import TestRequest

from derico.blicca.actionsblock.blocks import ACTIONS_BLOCK_TYPE
from derico.blicca.actionsblock.interfaces import IDericoBliccaActionsblockLayer


VIEW_NAME = f"aurora-block-{ACTIONS_BLOCK_TYPE}"

#: Walked up from this file, not hardcoded: the fixture sits at the package
#: root beside `bundle-src/`, deliberately outside both suites' trees so that
#: neither owns it.
FIXTURE = Path(__file__).resolve().parents[5] / "tests" / "anatomy-cases.json"

CASES = json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]

_TAG = re.compile(r"<([a-z0-9]+)((?:\s+[^\s=>]+(?:=\"[^\"]*\")?)*)\s*(/?)>", re.IGNORECASE)


def _attributes(attrs):
    return re.findall(r'[^\s=]+(?:="[^"]*")?', attrs)


def _rewrite(html, keep):
    def replace(match):
        tag, attrs, close = match.group(1), match.group(2), match.group(3)
        kept = keep(_attributes(attrs))
        return f"<{tag}{' ' + ' '.join(kept) if kept else ''}{close}>"

    return _TAG.sub(replace, html)


def canonical(html):
    """Attribute ORDER normalized away; everything else exact."""
    return _rewrite(html, lambda attrs: sorted(attrs))


def skeleton(html):
    """The cross-renderer contract: tags, ``class`` and text; nothing else."""
    return _rewrite(html, lambda attrs: [a for a in attrs if a.startswith("class=")])


class ActionsViewTestCase:
    """A document to render against, with the add-on's layer on the request."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.context = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )

    def _request(self):
        request = TestRequest()
        alsoProvides(request, IDericoBliccaActionsblockLayer)
        return request

    def render(self, data):
        """The markup ``render_block_data`` would emit for this stored node."""
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        view.block_type = ACTIONS_BLOCK_TYPE
        view.data = dict(data, **{"@type": ACTIONS_BLOCK_TYPE})
        return view()


class TestRegistration(ActionsViewTestCase):
    """The dispatch convention, which is the whole of how a renderer is found."""

    def test_view_name_is_the_dispatch_convention(self):
        # BlockDispatchMixin resolves `aurora-block-<@type>` and nothing else;
        # ZCML cannot interpolate, so the literal there is pinned from here.
        assert VIEW_NAME == "aurora-block-actions"
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        assert view.__name__ == VIEW_NAME

    def test_the_dispatcher_finds_it_rather_than_the_default(self):
        dispatcher = BlockDispatchMixin()
        dispatcher.context = self.context
        dispatcher.request = self._request()
        markup = dispatcher.render_block_data({"@type": ACTIONS_BLOCK_TYPE})
        assert "block-unrendered" not in markup
        assert markup.startswith('<nav class="actions-block ')

    def test_it_closes_the_wrappers_soft_lockstep_gap(self):
        request = self._request()
        statuses = evaluate(self.portal)
        assert [status.name for status in statuses], "no add-on registered at all"
        gaps = lockstep_gaps(self.portal, request, statuses)
        assert [gap for gap in gaps if gap["type"] == ACTIONS_BLOCK_TYPE] == []

    def test_it_renders_for_any_context_including_the_site_root(self):
        # `for="*"`: an actions block can be authored on any blocks container,
        # and on the site root, where a footer renders on every page.
        view = getMultiAdapter((self.portal, self._request()), name=VIEW_NAME)
        view.data = {"@type": ACTIONS_BLOCK_TYPE, "title": "More"}
        assert "actions-title" in view()


class TestAnatomy(ActionsViewTestCase):
    """The shared fixture, held against this renderer."""

    def test_the_fixture_covers_the_states_the_rules_enumerate(self):
        # A floor, not a total: deleting a case is how a renderer stops being
        # held to a rule, and that must not pass unnoticed.
        assert len(CASES) >= 16
        assert len({case["name"] for case in CASES}) == len(CASES)
        assert all(case["note"] for case in CASES)

    @pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
    def test_matches_the_fixture_exactly(self, case):
        assert canonical(self.render(case["data"])) == canonical(case["html"])

    @pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
    def test_matches_the_cross_renderer_skeleton(self, case):
        assert skeleton(self.render(case["data"])) == skeleton(case["html"])

    def test_emits_no_whitespace_between_elements(self):
        # An inter-element newline is a real space in an inline formatting
        # context, and a real line box inside the Plate editable's pre-wrap.
        richest = next(case for case in CASES if case["name"] == "title-and-list")
        assert not re.search(r">\s+<", self.render(richest["data"]))

    def test_escapes_authored_text(self):
        markup = self.render({
            "title": "<b>More</b>",
            "catalog": {
                "site_actions": [
                    {"id": "x", "title": "A & B <i>", "url": "http://nohost/x?a=1&b=2"}
                ]
            },
        })
        assert "<b>" not in markup
        assert "&lt;b&gt;More&lt;/b&gt;" in markup
        assert "A &amp; B &lt;i&gt;" in markup
        assert 'href="http://nohost/x?a=1&amp;b=2"' in markup


class TestEndToEnd(ActionsViewTestCase):
    """The real pipeline: serializer, dispatcher, template."""

    @pytest.fixture(autouse=True)
    def _pipeline(self, integration, _setup):
        # The blocks serializer looks its transformers up against the global
        # request; the layer has to be on THAT request.
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaActionsblockLayer)
        setRequest(self.request)
        alsoProvides(self.context, IBlocks)
        yield
        setRequest(None)

    def _page(self, node):
        blocks = {"b1": dict(node, **{"@type": ACTIONS_BLOCK_TYPE})}
        layout = {"items": ["b1"]}
        return render_blocks(self.context, self.request, blocks, layout)

    def test_a_managers_site_actions_render(self):
        markup = self._page({"category": "site_actions"})
        assert 'class="actions-block has--category--site_actions"' in markup
        assert 'class="actions-item actions-item-sitemap"' in markup
        assert f'href="{self.portal.absolute_url()}/sitemap"' in markup

    def test_the_object_actions_are_the_documents(self):
        markup = self._page({"category": "object"})
        assert "actions-item-edit" in markup
        assert f'href="{self.context.absolute_url()}/edit"' in markup

    def test_a_stored_catalog_is_never_published(self):
        # A hand-authored node claiming rows that do not exist for this user
        # is re-derived on the way to the page.
        markup = self._page({
            "category": "site_actions",
            "catalog": {"site_actions": [{"id": "forged", "title": "Forged", "url": "/x"}]},
        })
        assert "forged" not in markup
        assert "actions-item-sitemap" in markup
