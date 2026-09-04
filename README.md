# derico.blicca.actionsblock

An Aurora **Actions block** — a list of the site's actions, one category at a
time: site actions, portal tabs, user actions, document actions, object
actions or object buttons. The author picks the category in the sidebar and
optionally gives the list a heading; what the list *contains* is Plone's, for
the visitor looking at it, on the page it is on.

The block is **generic**. derico.de is its first consumer, not its subject.

## Two hosts, one markup

The block renders from two renderers that emit the **same anatomy**:

- a React `view` — the public rendering in Aurora proper, and the canvas
  preview in `@@aurora-edit`;
- a Chameleon template, `@@aurora-block-actions` — the public rendering under
  Blicca.

One scope-wrapped stylesheet dresses both. An element added to one renderer
without a peer in the other is a bug in both, and the fixture suite in
`tests/anatomy-cases.json` — read by the Python and the vitest suites alike —
is what says so.

### Anatomy

```html
<nav class="actions-block has--category--<effective>" aria-label="<label>">
  <h2 class="actions-title">…</h2>                     <!-- only with a heading -->
  <ul class="actions-list">                            <!-- only with rows -->
    <li class="actions-item actions-item-<id>"><a class="actions-link" href="…">…</a></li>
  </ul>
</nav>
```

The root is emitted **always** and carries the *effective* category — the
stored one if the block offers it, else `site_actions` — and that category's
label as the landmark's name. The heading and the list are each conditional
on their own content, so a block with nothing to show is exactly one element.
`actions-item-<id>` is added only when the action id is a plain slug.

`block`, `block-actions`, `has--block-width--<value>` and
`has--backgroundColor--<value>` arrive from the host on the wrapper **outside**
this block's root. The block never emits them.

### The catalog is the server's

The block stores `category` and `title` and nothing else. What the category
contains is **derived on load** by the block's serialization transformer as
`catalog` — every offered category mapped to its `{id, title, url}` rows, for
the current user on the current context — and stripped again on save, so it
is never on disk. Both renderers read it as ordinary data; neither computes an
action itself. The rows are the ones `plone.restapi`'s `@actions` service
returns (minus `icon`), computed the same way, and a test holds the two level.

The whole catalog rather than the chosen category's rows, on purpose: the
derived set then depends on the context and the user alone, never on a stored
field, so switching the category in the sidebar is instant and needs no round
trip. In author-visible terms:

- A block you have **just inserted** carries no catalog. The canvas fetches
  `@actions` for the page once, previews from that, and says so while it
  loads. After the first save the server's catalog arrives with the page.
- The rows are **yours**: an editor sees "Log out" where a visitor sees
  "Log in", and object buttons a visitor never gets. The canvas says so.
- A category with **no rows for you here** renders the empty root, and the
  canvas says why. The public page says nothing.
- `url` is the absolute URL Plone computed for the request, emitted as-is by
  both renderers — it was never stamped by an authoring-time API host, so
  nothing needs flattening under Blicca.

### Where the two surfaces differ

Nowhere in the markup: the fixture holds both renderers to identical
attributes. The canvas drops every `href`, so a click selects the block
rather than navigating away from unsaved work.

## What "works in Aurora" means here

The block is **built against upstream-registered widgets and its own**, and
every field it declares resolves in Aurora to the widget it was designed for
— asserted in `bundle-src/test/aurora-harness.test.tsx` against the registry
the five Aurora installers build, with none of the Blicca wrapper's
overrides. `view` renders every fixture case there reading nothing from the
registry.

What is **not** covered, stated plainly:

- **No Seven app is stood up.** Nothing here proves the block renders in a
  real Aurora page — only that it resolves and renders against the registry
  Aurora builds.
- **The catalog needs the backend add-on.** In Aurora proper `view` is the
  public rendering and it reads `catalog` from the content; that key exists
  only where this Python package is installed on the Plone backend, exactly
  as Aurora's own listing block reads server-injected `items`. Without it the
  block renders the empty root.
- **The canvas fetch is anonymous under Aurora.** It is a plain same-origin
  `fetch`, authenticated by the classic session cookie under Blicca and by
  nothing under Aurora, whose token never reaches it. An anonymous preview is
  still a truthful preview of what a visitor gets.
- **Nothing dresses the block there.** The stylesheet is `@scope`-wrapped to
  roots that exist in Blicca and nowhere in Aurora proper.

## Theming: the seam

The block publishes **nine custom properties**. They are its whole styling
interface: a theme sets properties, never rules.

Set them where they **inherit** into the block — `:root`, or the theme's own
scope root. Never on `.actions-block`, and never with a plain rule: the
block's sheet is `@scope`-wrapped, so at equal specificity a scoped
declaration wins on scope proximity.

**The block declares none of these properties anywhere.** Each default lives
at its point of use as `var(--actions-x, <literal>)`, so a theme's `:root`
value inherits in and wins with no escalation. `bundle-src/test/seam-lockstep.test.ts`
fails if this table and the stylesheet ever disagree.

### The property table

| property | default | what it paints |
|---|---|---|
| `--actions-flow` | `0.5rem` | heading ↔ list |
| `--actions-gap` | `1rem` | between the items |
| `--actions-direction` | `row` | `flex-direction` of the list: `row` for a bar, `column` for a stacked menu |
| `--actions-justify` | `flex-start` | `justify-content` of the list |
| `--actions-padding` | `0` | inner padding of the block root |
| `--actions-title-size` | `1rem` | heading type size |
| `--actions-link-size` | `1rem` | link type size |
| `--actions-link-color` | `currentColor` | link ink |
| `--actions-link-decoration` | `none` | link `text-decoration` at rest; hover always underlines |

Notes:

- **`--actions-padding` defaults to `0` on purpose.** The host's background
  slot already pads the band, so a non-zero default would double-pad every
  banded block.
- **Orientation is a seam axis, not stored data.** A theme decides once
  whether its action lists are bars or menus; an author does not choose per
  block. If per-block orientation is ever wanted, that is a schema field and
  a new anatomy class, decided first.
- **No icons.** Plone actions carry an icon expression; neither renderer can
  draw one without a resolver, and the canvas cannot fetch SVGs. A theme that
  wants icons keys on `actions-item-<id>`.

### Growth policy

- Adding a property is a **minor** release.
- Removing or renaming one is **breaking**.
- **Changing a default is also breaking.** A theme that set nothing is relying
  on the default.

## Installation

Add `derico.blicca.actionsblock` to your project's dependencies:

```python
# In your pyproject.toml
dependencies = [
    "derico.blicca.actionsblock",
]
```

Then install the add-on from Plone's control panel, or apply the
`derico.blicca.actionsblock:default` GenericSetup profile.

## Development

The Python half and the JavaScript half are built separately, and the JS build
output is **committed** into `src/derico/blicca/actionsblock/static/` — Node is a
packaging-time tool here, never an install-time one.

```bash
# JavaScript: the block, its widget, the stylesheet
cd bundle-src
pnpm install
pnpm build        # writes ../src/derico/blicca/actionsblock/static/actions-block.{js,css}
pnpm test         # the harness reads the built artifact: build first
pnpm typecheck
```

The five Aurora installers are **devDependencies**, so the test registry is the
one Aurora actually builds. They ship raw TypeScript and do not typecheck
outside Volto's monorepo, so `tsconfig.json` maps them to
`test/aurora-packages.d.ts` for **type** resolution only.

```bash
# Python: run from the assembly repo's root environment
uv run --no-sync pytest sources/derico.blicca.actionsblock
```

Any GenericSetup profile XML change gets an upgrade step, even in an alpha:
`plonecli add upgrade_step`, narrowed to the affected import step.

The npm package `@derico/aurora-actions-block` is the same `bundle-src/`
workspace; publishing it is a later step.

## License

GPL-2.0-or-later

## Author

Maik Derstappen <md@derico.de>
