"""Actions block serialization transformers: the catalog is the server's.

The block stores a ``category`` and an optional ``title`` and nothing else.
What the category *contains* — which actions the current user gets on the
current context — is computed here at load time and injected as ``catalog``,
a map of every offered category to its rows, and stripped again on save. Both
renderers read it as ordinary data; neither computes an action itself (block
add-on contract §5.3).

The whole catalog rather than the stored category's rows only, on purpose:
the derived set then depends on the context and the user alone, never on a
stored field, so switching the category in the sidebar is instant and needs
no round trip and no provenance stamp. Six categories cost a few hundred
bytes per block per load.

The rows are computed the way ``plone.restapi``'s ``@actions`` service
computes them — ``plone_context_state.actions(category)``, title translated —
so the canvas's fallback fetch of that service for a node the server has never
serialized sees the same rows this pair injects. ``tests/test_actions_transform``
holds the two level.

Registered as ``(context, request)`` subscription adapters providing
``IBlockFieldSerializationTransformer`` / ``IBlockFieldDeserializationTransformer``,
for ANY context, not for ``IBlocks`` content and the site root only. The
catalog depends on the context and the user alone, and the context a block is
serialized against is not always the page carrying it: an inherited footer is
rendered against its *carrier* (a language root folder carries
``collective.volto.footer``'s behavior and not ``IBlocks``), and a field
surface (contract ADR 0015) stores blocks outside the ``blocks`` field
entirely. Narrower registrations do not fail loudly on those — the transformer
simply never runs and the block draws its empty root, on every page of the
site. The ``block_type`` gate is what keeps this from touching anything else.

plone.restapi's ``NestedBlocksVisitor`` recurses into the somersault value
tree, so an actions block nested in a Plate tree is transformed too, on
restapi GET and on classic rendering alike.

Worked example: ``plone.blicca.auroraeditor``'s ``listing_transform.py``.
"""

import logging

from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from plone.restapi.serializer.converters import json_compatible
from zope.component import adapter
from zope.component import getMultiAdapter
from zope.i18n import translate
from zope.interface import implementer
from zope.interface import Interface

from derico.blicca.actionsblock.actions_data import CATEGORIES
from derico.blicca.actionsblock.blocks import ACTIONS_BLOCK_TYPE
from derico.blicca.actionsblock.interfaces import IDericoBliccaActionsblockLayer


logger = logging.getLogger(__name__)

#: Every key this pair injects. The serializer strips these before deriving
#: them and the deserializer strips them before the node is written, so the
#: two directions are spelled once and cannot drift apart.
#: PARITY: ``data.ts`` spells the same tuple as ``DERIVED_KEYS``.
DERIVED_FIELDS = ("catalog",)


def actions_catalog(context, request):
    """Every offered category → its rows for this user on this context.

    Each row is ``{id, title, url}`` — the subset of ``@actions``'s row shape
    the renderers read (``icon`` is left out: neither renderer can draw one
    without a resolver, and a key nobody reads is a key to strip for
    nothing). ``url`` is the absolute URL Plone computed for THIS request, so
    it is emitted as-is by both renderers; it was never stamped by an
    authoring-time API host the way a stored reference would be.
    """
    state = getMultiAdapter((context, request), name="plone_context_state")
    result = {}
    for category, _label in CATEGORIES:
        result[category] = [
            {
                "id": info.get("id", ""),
                "title": translate(info.get("title", ""), context=request),
                "url": info.get("url", ""),
            }
            for info in state.actions(category=category)
        ]
    return result


@implementer(IBlockFieldSerializationTransformer)
@adapter(Interface, IDericoBliccaActionsblockLayer)
class ActionsCatalogSerializer:
    """Inject the catalog for the current user and context."""

    order = 200
    block_type = ACTIONS_BLOCK_TYPE

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_FIELDS:
            # Strip first, derive second: anything already on disk is stale by
            # definition, and a node hand-authored through the API with a
            # catalog of its own must not publish it.
            value.pop(key, None)
        try:
            value["catalog"] = json_compatible(actions_catalog(self.context, self.request))
        except Exception:
            # One broken action expression must not break the whole page's
            # serialization — listing_transform's rule for a broken
            # querystring. The block renders its empty root instead.
            logger.exception(
                "Could not derive the actions catalog on %s",
                "/".join(self.context.getPhysicalPath()),
            )
        return value


@implementer(IBlockFieldDeserializationTransformer)
@adapter(Interface, IDericoBliccaActionsblockLayer)
class ActionsCatalogDeserializer:
    """Strip the derived catalog before the block is persisted.

    Unpaired, the serializer's output would be written back on the next save
    and then go stale the moment an action, a permission or a login changes.
    """

    order = 200
    block_type = ACTIONS_BLOCK_TYPE

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_FIELDS:
            value.pop(key, None)
        return value
