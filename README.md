# derico.blicca.actionsblock

An **Actions block** for the Aurora block editor in Plone 6. It lists one
category of your site's Plone actions as links: site actions, portal tabs,
user actions, document actions, object actions or object buttons. Drop it into
a page or a footer, pick the category in the sidebar, optionally give it a
heading, and Plone fills in the links for whoever is looking at the page.

Typical uses:

- a footer with the site actions (Site Map, Accessibility, Contact);
- a header bar with the portal tabs;
- a "Log in / Log out / Preferences" line built from the user actions;
- an editor toolbar built from the object actions (Contents, History, Sharing, ...)
  or the object buttons (Cut, Copy, Paste, ...).

The block works with [plone.blicca.auroraeditor](https://github.com/derico-de/plone.blicca.auroraeditor),
which brings the Aurora editor and server-side rendering of Aurora blocks to
classic Plone 6. The editor half is also a plain Aurora block package
(`@derico/aurora-actions-block`) that can be used in an Aurora frontend
directly, see [Using the block in Aurora](#using-the-block-in-aurora).

## Features

- **Six categories to choose from**: the stock `portal_actions` categories
  every Plone site has. The category is a select box in the sidebar.
- **Optional heading** above the list.
- **Always current.** The links are not stored with the page. They are
  computed on every page load for the current visitor on the current context,
  exactly as Plone's own `@actions` REST endpoint computes them. Adding an
  action in `portal_actions`, changing a permission or logging in changes
  the list immediately.
- **Live preview in the editor.** A freshly inserted block previews the
  actions of the page being edited before it is ever saved, and tells the
  author when the list is being loaded, when it is empty for them, and that
  visitors may get a different list.
- **Same markup on every surface.** The public page, the Aurora editor canvas
  and an Aurora frontend all render the same HTML, dressed by one stylesheet.
- **Themeable through CSS custom properties.** Nine `--actions-*` properties
  control layout, spacing and link styling. A theme sets properties, never
  rules.
- **Block width and background** come from the host's regular block styling
  controls.
- **No client-side computation of actions.** The block never decides what a
  visitor may see. The server does.

## Requirements

- Plone 6.0 or later
- `plone.blicca.auroraeditor` 1.0.0a2 or later

The JavaScript bundle is committed to the package. Nothing needs Node at
install time.

## Installation

Add the package to your project's dependencies:

```toml
# pyproject.toml
dependencies = [
    "derico.blicca.actionsblock",
]
```

Then install **Derico Blicca Actionsblock** from Plone's Add-ons control
panel, or apply the `derico.blicca.actionsblock:default` GenericSetup
profile. The profile registers the block with the Aurora editor for that
site. Uninstalling removes the registration again.

## Using the block

1. Open a page in the Aurora editor and insert the **Actions** block.
2. In the sidebar, choose which actions to list:

   | Category | What it holds in a stock Plone site |
   |---|---|
   | Site actions | Site Map, Accessibility, Contact |
   | Portal tabs | Home, plus the top-level navigation tabs |
   | User actions | Log in, Register, Preferences, Dashboard, Site Setup, Undo, Log out |
   | Document actions | RSS feed, Print this, Edit with external application |
   | Object actions | Contents, History, Sharing, Rules, Syndication |
   | Object buttons | Cut, Copy, Paste, Delete, Rename, URL Management |

3. Optionally enter a heading.
4. Pick a block width and, if the theme offers one, a background colour.

Only the category and the heading are stored with the page. If no category
was chosen, the block lists the site actions.

The editor previews the block with the actions *you* get on that page. Since
Plone hides actions the current user is not allowed to use, a visitor may see
fewer links, or different ones: an editor sees "Log out" where an anonymous
visitor sees "Log in". The canvas says so under the block. A category that
holds nothing for the current user renders an empty block on the public page.

## Rendered markup

Both renderers emit exactly this structure:

```html
<nav class="actions-block has--category--site_actions" aria-label="Site actions">
  <h2 class="actions-title">Heading</h2>              <!-- only with a heading -->
  <ul class="actions-list">                            <!-- only with links -->
    <li class="actions-item actions-item-sitemap">
      <a class="actions-link" href="https://example.org/sitemap">Site Map</a>
    </li>
  </ul>
</nav>
```

- The `<nav>` root is always emitted. It carries the category as a modifier
  class and the category's label as its accessible name.
- The heading and the list are each left out when they have nothing to show.
- Each item gets an `actions-item-<id>` class named after the action's id
  (`sitemap`, `contact`, `folderContents`, ...), so a theme can style or hide
  a single action, or attach an icon to it.
- The block width and background classes (`block`, `block-actions`,
  `has--block-width--*`, `has--backgroundColor--*`) are added by the host on
  a wrapper around this markup, as for every Aurora block.

Icons are not rendered. Plone actions carry an icon expression, but the block
does not resolve it. A theme that wants icons can key on the per-item class.

## How it works

The block stores two fields, `category` and `title`. The links come from the
server:

1. On every load of a page, a `plone.restapi` block serialization transformer
   computes the actions for **all six categories** for the current user on
   the current context and injects them into the block data as `catalog`.
   Each entry is `{id, title, url}` with the title already translated and the
   URL as Plone computed it for the request.
2. On save, a matching deserialization transformer strips `catalog` again, so
   it is never written to the database and can never go stale.
3. The renderer reads the chosen category out of the catalog and prints the
   links. It does no computation of its own.

The whole catalog is injected rather than only the chosen category. This
keeps the derived data independent of the stored fields, so switching the
category in the sidebar updates the preview instantly without a round trip.

The transformers are registered for content with the `IBlocks` behavior and
for the site root, so a block stored on the site root (a footer, for
example) is filled in on every page.

There are two renderers that produce the same markup:

- a Chameleon template, registered as the `@@aurora-block-actions` view, for
  the public page rendered by Blicca;
- a React `view` component, used for the preview in the editor canvas and for
  the public rendering in an Aurora frontend.

One `@scope`-wrapped stylesheet styles both. A shared fixture file,
`tests/anatomy-cases.json`, is read by the Python test suite and the vitest
suite alike, so the two renderers cannot drift apart unnoticed.

Rows without a title or without a usable URL are skipped. URLs are screened
against an allowlist of schemes (`http`, `https`, `mailto`, `tel`, or a plain
path), because the block data travels inside JSON that anyone with API
access can write.

## Theming

The block is styled through nine CSS custom properties. They are the entire
styling interface: set properties on `:root` or on your theme's own scope
root, where they inherit into the block. Do not set them on `.actions-block`
itself and do not override the block's rules directly. The block's stylesheet
is `@scope`-wrapped, and a scoped declaration wins over an unscoped one of
equal specificity, so a plain rule in the theme would lose.

The block declares none of these properties. Every default is spelled at its
point of use as `var(--actions-x, <default>)`, so a value set on `:root`
inherits in and wins without any specificity games.

| property | default | what it controls |
|---|---|---|
| `--actions-flow` | `0.5rem` | gap between heading and list |
| `--actions-gap` | `1rem` | gap between the items |
| `--actions-direction` | `row` | `flex-direction` of the list: `row` for a bar, `column` for a stacked menu |
| `--actions-justify` | `flex-start` | `justify-content` of the list |
| `--actions-padding` | `0` | inner padding of the block root |
| `--actions-title-size` | `1rem` | heading font size |
| `--actions-link-size` | `1rem` | link font size |
| `--actions-link-color` | `currentColor` | link colour |
| `--actions-link-decoration` | `none` | link `text-decoration` at rest; hover always underlines |

Example, a stacked footer menu with smaller links:

```css
:root {
  --actions-direction: column;
  --actions-gap: 0.25rem;
  --actions-link-size: 0.875rem;
  --actions-link-color: var(--my-footer-link-color);
}
```

Notes:

- The padding defaults to `0` because the host's background band already
  pads the block. A non-zero default would double the padding of every block
  with a background.
- The list direction is a theme decision, not an author choice: a theme
  decides once whether its action lists are bars or menus.
- The block sets no focus outline, so the host's own `:focus-visible` style
  reaches the links.

Versioning of this interface: adding a property is a minor release. Removing
or renaming a property, or changing a default, is a breaking change.

## Using the block in Aurora

The editor half lives in `bundle-src/` as the npm package
`@derico/aurora-actions-block` (not yet published). It registers the block
and its select widget through the usual `install(config)` entry point and
uses only upstream Aurora widgets, so it works without the Blicca wrapper.

Things to know when using it in an Aurora frontend:

- **The Python package must still be installed on the backend.** The React
  `view` reads the `catalog` the server injects. Without the backend add-on
  the block renders its empty `<nav>`.
- **The editor preview of a new block is anonymous.** The fallback fetch of
  `@actions` for a freshly inserted block is a plain same-origin `fetch`.
  Under Blicca the session cookie authenticates it. In Aurora the API token
  does not reach it, so the preview shows what an anonymous visitor gets
  until the block is saved and reloaded.
- **Bring your own styling.** The stylesheet is scoped to the Blicca roots
  and does not apply in an Aurora frontend.

## Development

The package has a Python half and a JavaScript half. The JavaScript build
output is committed into `src/derico/blicca/actionsblock/static/`; rebuild
and commit it whenever the sources in `bundle-src/src/` change.

```bash
# JavaScript: the block, its widget and the stylesheet
cd bundle-src
pnpm install
pnpm build        # writes ../src/derico/blicca/actionsblock/static/actions-block.{js,css}
pnpm test         # the tests read the built bundle, so build first
pnpm typecheck
```

```bash
# Python, from an environment that has the test extras installed
uv run pytest
```

The JavaScript tests run the block against the real Aurora registry, built
by the upstream Aurora installers pinned as dev dependencies. Among them,
`test/seam-lockstep.test.ts` checks that the property table in this README
matches the stylesheet literally, so keep the two in step.

Every change to a GenericSetup profile XML file needs an upgrade step, even
in an alpha release. Scaffold it with `plonecli add upgrade_step`.

## License

GPL-2.0-or-later

## Author

Maik Derstappen, [derico](https://derico.de), <md@derico.de>
