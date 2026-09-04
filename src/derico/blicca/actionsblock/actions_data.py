"""Reading the Actions block's stored JSON — the Python twin of ``actions/data.ts``.

The block has two renderers in two languages — the React ``view`` and the
Chameleon template — and one scope-wrapped stylesheet dresses both, so the
rules that decide *what renders* are spelled twice, once per side. This module
is the server's spelling; the editor's is ``bundle-src/src/actions/data.ts``.
A change to either is a change to both, and ``tests/test_actions_data.py``
reads the TS file to hold the two tables level.

Deliberately free of Plone imports. Everything here is a pure function of one
stored block dict — the *derivation* of the catalog, which needs a context and
a request, lives in ``actions_transform``.

What the two sides read is the same thing: the ``catalog`` key the server's
serializer injects at load time, mapping every offered category to the action
rows the current user gets on the current context. Neither renderer computes
an action itself; the catalog is the server's alone (block add-on contract
§5.3), and the canvas only ever *fetches* one when it holds a node the server
has never serialized.
"""

import re


#: The categories the sidebar offers, in sidebar order, with the label the
#: ``<nav>`` announces. These are Plone's six stock ``portal_actions``
#: categories (``Products/CMFPlone/profiles/default/actions.xml``); a site may
#: carry more, but the block only offers what every site has.
#: PARITY: ``data.ts`` spells the same table. Extended together or not at all.
CATEGORIES = (
    ("site_actions", "Site actions"),
    ("portal_tabs", "Portal tabs"),
    ("user", "User actions"),
    ("document_actions", "Document actions"),
    ("object", "Object actions"),
    ("object_buttons", "Object buttons"),
)

CATEGORY_IDS = tuple(category for category, _label in CATEGORIES)

#: A category that was never stored, or is not one the block offers, renders
#: the site actions. Applied in BOTH renderers rather than trusted from the
#: schema's ``default`` key, which is spread into the widget as a prop and is
#: not reliably written to the node.
DEFAULT_CATEGORY = "site_actions"

#: The schemes an action URL may carry. The catalog is derived data the
#: server computed, but it travels inside a JSON node that anyone with API
#: access can hand-author, so the renderers screen it like typed input. An
#: allowlist, not a blocklist: a blocklist fails open on the scheme nobody
#: thought of. PARITY with ``data.ts``.
LINK_SCHEMES = ("http", "https", "mailto", "tel")

_SCHEME = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.-]*):")

#: An action id that may become a class modifier. Plone's own ids are plain
#: identifiers (``sitemap``, ``folderContents``); anything else gets no
#: per-action class rather than an escaped one.
_SLUG = re.compile(r"^[A-Za-z0-9_-]+$")


def text(value):
    """A stored value as a stripped string, or ``''``.

    Nothing in the schema is ``required``, so every reader answers "absent"
    for anything at all. Stripping is also what makes the template's
    whitespace normalization sound — see ``ActionsBlockView.__call__``.
    """
    return value.strip() if isinstance(value, str) else ""


def screen_link(value):
    """``value`` if it is a usable URL of an allowed scheme, ``''`` otherwise.

    A value with no scheme at all is a path and passes. ``//host/x`` is
    rejected: it is a protocol-relative URL wearing a path's clothes, and the
    scheme it inherits is never screened.
    """
    raw = text(value)
    if not raw or raw.startswith("//"):
        return ""
    match = _SCHEME.match(raw)
    if match is None:
        return raw
    return raw if match.group(1).lower() in LINK_SCHEMES else ""


def effective_category(data):
    """The category that renders: the stored one if offered, else the default.

    Emitted on the root as ``has--category--<value>`` ALWAYS, so the sheet has
    one selector family and a node with a category the block does not offer
    still renders something an author can recognise.
    """
    stored = text((data or {}).get("category"))
    return stored if stored in CATEGORY_IDS else DEFAULT_CATEGORY


def category_label(category):
    """The label a category is announced by (the ``<nav>``'s ``aria-label``)."""
    return dict(CATEGORIES).get(category, "")


def title(data):
    """The optional heading above the list. Plain text."""
    return text((data or {}).get("title"))


def catalog(data):
    """The derived catalog, or ``{}`` when the node carries none.

    Absent for every node the server has not serialized — a freshly inserted
    block, an API-authored one, a test fixture — and for a node whose
    derivation failed. Both renderers draw the empty root then.
    """
    value = (data or {}).get("catalog")
    return value if isinstance(value, dict) else {}


def item_class(action_id):
    """``actions-item`` plus a per-action modifier when the id is a slug."""
    slug = text(action_id)
    if slug and _SLUG.match(slug):
        return f"actions-item actions-item-{slug}"
    return "actions-item"


def entries(data):
    """The rows that render, in catalog order: ``{id, title, href, css}``.

    A row without a title and a row without a usable URL both render nothing,
    because a link that goes nowhere is worse than an absent one — and a row
    whose URL fails the screen is treated exactly as one with no URL.
    """
    rows = catalog(data).get(effective_category(data))
    if not isinstance(rows, list):
        return []
    found = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        label = text(row.get("title"))
        href = screen_link(row.get("url"))
        if not label or not href:
            continue
        found.append({
            "id": text(row.get("id")),
            "title": label,
            "href": href,
            "css": item_class(row.get("id")),
        })
    return found
