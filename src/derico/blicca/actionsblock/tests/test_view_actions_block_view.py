"""Tests for ActionsBlockView view."""
import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from zope.component import getMultiAdapter
from zope.interface import alsoProvides
from zope.publisher.browser import TestRequest

from derico.blicca.actionsblock.interfaces import IDericoBliccaActionsblockLayer
from derico.blicca.actionsblock.testing import INTEGRATION_TESTING


class TestViewActionsBlockView:
    """Test ActionsBlockView view."""

    layer = INTEGRATION_TESTING

    def _make_request(self):
        """A request carrying the addon browser layer."""
        request = TestRequest()
        alsoProvides(request, IDericoBliccaActionsblockLayer)
        return request

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.context = api.content.create(
            container=self.portal,
            type="Document",
            id="test-document",
            title="Test Document",
        )

    def test_view_registered(self):
        """Test view is registered."""
        request = self._make_request()
        view = getMultiAdapter(
            (self.context, request),
            name="aurora-block-actions",
        )
        assert view is not None

    def test_view_name(self):
        """Test view __name__."""
        request = self._make_request()
        view = getMultiAdapter(
            (self.context, request),
            name="aurora-block-actions",
        )
        assert view.__name__ == "aurora-block-actions"
