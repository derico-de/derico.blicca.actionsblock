"""The Actions block's public renderer (``@@aurora-block-actions``).

Registered under the block add-on contract's view-name convention (§5.1):
``BlockDispatchMixin.render_block_data`` resolves
``getMultiAdapter(..., name=f"aurora-block-{block_type}")`` and stamps
``self.data`` (post-transformer) and ``self.block_type`` before calling. The
registry record's ``types`` field never influences dispatch; the view name is
the whole of it, which is why ``test_view_actions_block_view`` asserts the
ZCML name equals ``f"aurora-block-{ACTIONS_BLOCK_TYPE}"``.

**This is the block's other renderer, not a fallback.** The React ``view``
(``bundle-src/src/actions/ActionsView.tsx``) and this template must emit the
same anatomy element for element, because ONE scope-wrapped stylesheet
dresses both surfaces. ``tests/anatomy-cases.json`` at the package root is
read by this suite and the vitest one alike.

Everything rendered comes from the stored node as ``render_block_data`` hands
it over: the ``catalog`` the serializer injected, the stored ``category`` and
``title``. This view computes no action itself — the catalog is the server's
(``actions_transform``), and a node that reaches this renderer without one
draws the empty root, exactly as the canvas does.

Error policy is **inherited**: ``render_block_data`` wraps every block, logging
and emitting a ``block-render-error`` placeholder in production and propagating
in development mode. Nothing here catches anything.
"""

import re

from plone.blicca.auroraeditor.rendering import BaseBlockView

from derico.blicca.actionsblock import actions_data


#: Template indentation, between two tags. Collapsed away — see ``__call__``.
_INDENT = re.compile(r">\s+<")


class ActionsBlockView(BaseBlockView):
    """Render an actions block."""

    @property
    def block(self):
        """The stored node. ``render_block_data`` stamps it before calling."""
        return self.data or {}

    @property
    def category(self):
        """The category that renders — the stored one if offered, else the default."""
        return actions_data.effective_category(self.block)

    @property
    def root_class(self):
        """``.actions-block`` plus the effective category, emitted always.

        The block owns its root; ``block block-actions has--block-width--<w>``
        and any ``has--backgroundColor--`` are the host wrapper's stamp,
        applied outside this markup by the Plate renderer's ``_block_attrs``.
        """
        return f"actions-block has--category--{self.category}"

    @property
    def label(self):
        """What the ``<nav>`` is announced as."""
        return actions_data.category_label(self.category)

    @property
    def title(self):
        """The optional heading. Plain text."""
        return actions_data.title(self.block)

    @property
    def entries(self):
        """The rows that render, each with its final ``href`` and class list."""
        return actions_data.entries(self.block)

    def __call__(self):
        """The template's markup, with its own indentation collapsed away.

        NO WHITESPACE-ONLY TEXT NODES, on either surface. JSX drops
        inter-element whitespace by construction; a readable ZPT template does
        not, and an inter-element newline is a real space in an inline
        formatting context — so one sheet dressing both surfaces would meet
        gaps on one and not the other. Collapsing ``>\\s+<`` is sound because
        every text value goes through ``actions_data.text`` (stripped) and is
        HTML-escaped by ``tal:content``, so no run of whitespace between two
        tags can be authored content.
        """
        return _INDENT.sub("><", self.index().strip())
