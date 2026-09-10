# derico.blicca.actionsblock

The Actions block: one category of the site's actions, listed as links,
placed in the flow of a page or a footer. A Blicca block add-on (block add-on
contract §3.1) whose editor half is the Aurora npm package
`@derico/aurora-actions-block` (publishing it is a later step). Generic by
intent — derico.de is its first consumer, not its subject.

## Language

**Actions block**:
A block that lists the actions of ONE [[action category]] as links, with an
optional heading. It stores the category and the heading and nothing else;
what the list contains is Plone's, computed for the visitor on the page. Stored
`@type: actions`.
_Avoid_: menu block (a menu is authored; this is derived), navigation block
(only one of its six categories is navigation), site actions block (one
category named after the whole).

**Action category**:
One of Plone's `portal_actions` categories. The block offers the six every
site has — `site_actions`, `portal_tabs`, `user`, `document_actions`,
`object`, `object_buttons` — in that sidebar order, each with the label the
`<nav>` is announced by. A site may define more; the block does not offer
what a second site would lack.
_Avoid_: action type, action group, tab (that is the `object` category's
classic rendering, not a category).

**Effective category**:
The category that renders: the stored one if the block offers it, else the
[[default category]]. Emitted on the root as `has--category--<value>` always,
so a hand-authored node with an unknown category still renders something an
author recognises.

**Default category**:
`site_actions`. Applied by both renderers themselves, never trusted from the
schema's `default` key, which is spread into the widget as a prop and not
reliably written to the node.

**Catalog**:
The [[derived key]]: every offered category mapped to its rows — `{id, title,
url}` — for the current user on the current context, injected by the block's
serialization transformer at load and stripped at save. The WHOLE catalog,
not the chosen category's rows, so the derived set depends on context and
user alone and switching the category in the sidebar is instant. Both
renderers read it as data; neither computes an action (ADR 0001).
_Avoid_: actions (ambiguous with the block and the category), cache (nothing
is invalidated; it is recomputed on every load), items.

**Row**:
One action inside the [[catalog]]: `id`, `title` (translated), `url`
(absolute, as Plone computed it for the request). The subset of
`plone.restapi`'s `@actions` row that the renderers read; `icon` is left out
because neither renderer can draw one. A row renders only with a title AND a
URL that passes the scheme screen; anything else renders nothing.

**Derived key**:
A key the block's serializer computes onto a stored node at load and its
deserializer strips at save, so it is never on disk. Here there is one,
`catalog`. It belongs to the server alone; no client code writes one; an
author is never offered one in the sidebar.

**Fallback fetch**:
The canvas's one exception to reading the [[catalog]] from the node: a block
the server has never serialized — freshly inserted — carries none, so the
editor fetches `@actions` for the object being edited, once per page, and
previews from that. The object is the edit URL with its view name removed —
any `@@<view>`, so every Blicca edit surface works, the ones this package has
never heard of included. The `view` never fetches; in Aurora proper it is the
public rendering. Under Blicca the fetch is authenticated by the session
cookie; under Aurora it is anonymous, which is a truthful preview of a
visitor's list.
_Avoid_: live preview (the stored catalog is just as live), refresh.

**Theme seam**:
The nine `--actions-*` custom properties a host theme sets to make the block
its own, with defaults at their point of use and declared nowhere, so a
theme's `:root` value inherits in and wins without escalation. Orientation
(`--actions-direction`) is a seam axis, not stored data: a theme decides once
whether its action lists are bars or menus.
