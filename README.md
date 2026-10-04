# derico.blicca.actionsblock

An **Actions** block for the Aurora editor in [Plone](https://plone.org) Blicca.
Blicca is the former Plone Classic UI. The block lists one category of the
site's Plone actions as links: site actions, portal tabs, user actions,
document actions, object actions or object buttons. The author picks the
category and an optional heading; Plone computes the links for whoever is
looking at the page.

Typical uses: the site actions (Site Map, Accessibility, Contact) in a
footer, the portal tabs as a header bar, or a "Log in / Log out" line built
from the user actions.

The block needs [plone.blicca.auroraeditor](https://github.com/derico-de/plone.blicca.auroraeditor),
which brings the Aurora editor to Blicca. Its editor half is also a plain
Aurora block package, `@derico/aurora-actions-block`, that can be used in an
Aurora frontend directly, see [Using the block in Aurora](#using-the-block-in-aurora).

## Features

- **Six categories**: the stock `portal_actions` categories every Plone site has.
- **Optional heading** above the list.
- **Always current.** Only the category and the heading are stored. The links
  are computed on every page load for the current user and context, exactly
  as Plone's `@actions` REST endpoint computes them.
- **Live preview in the editor**, also for a freshly inserted block.
- **One markup, one stylesheet** for the public page, the editor canvas and
  an Aurora frontend.
- **Themeable** through nine `--actions-*` CSS custom properties.
- **Block width and background colour** come from the editor's regular block
  styling controls.

## Requirements

- Plone 6.0 or later
- `plone.blicca.auroraeditor` 1.0.0a2 or later

The JavaScript bundle is committed to the package. No Node is needed at
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
panel, or apply the `derico.blicca.actionsblock:default` profile. Uninstalling
removes the block registration again.

## Using the block

1. Insert the **Actions** block in the Aurora editor.
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
4. Pick a block width and, if the site offers a palette, a background colour.

Without a category the block lists the site actions.

The editor previews the actions *you* get on that page. Plone hides actions
the current user may not use, so a visitor may see fewer or different links:
an editor sees "Log out" where an anonymous visitor sees "Log in". A category
that holds nothing for the current user renders an empty block.

## Rendered markup

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
- The heading and the list are left out when they have nothing to show.
- Each item gets an `actions-item-<id>` class named after the action's id
  (`sitemap`, `contact`, `folderContents`, ...), so a theme can style or hide
  a single action or attach an icon to it.
- Block width and background classes are added by the host on a wrapper
  around this markup, as for every Aurora block.

Icons are not rendered. A theme that wants icons can key on the per-item class.

## How it works

The block stores two fields, `category` and `title`. The links come from the
server:

1. On every load, a `plone.restapi` block serialization transformer computes
   the actions of all six categories for the current user and context and
   injects them into the block data as `catalog`. Each entry is
   `{id, title, url}` with the title translated.
2. On save, a matching deserialization transformer strips `catalog` again, so
   it is never persisted and cannot go stale.
3. The renderer reads the chosen category from the catalog and prints the
   links.

The whole catalog is injected, not only the chosen category, so switching the
category in the sidebar updates the preview without a round trip. The
transformers are registered for any context, so they also run where blocks
are stored on content without the `IBlocks` behavior or in a field other
than `blocks`.

Two renderers emit the same markup: a Chameleon template registered as the
`@@aurora-block-actions` view for the public page, and a React `view`
component for the editor canvas and for Aurora frontends. Both read the
shared fixture `tests/anatomy-cases.json` in their test suites, so they
cannot drift apart unnoticed.

Rows without a title or without a usable URL are skipped. A URL must be a
plain path or use `http`, `https`, `mailto` or `tel`, because block data
travels in JSON that anyone with API access can write.

## Theming

Nine CSS custom properties are the whole styling interface. Set them on
`:root` or on your theme's own scope root; they inherit into the block. Do
not override the block's rules directly: the stylesheet is `@scope`-wrapped,
and a scoped declaration wins over an unscoped one of equal specificity.

The block declares none of these properties. Every default is spelled at its
point of use as `var(--actions-x, <default>)`, so a value set on `:root`
inherits in and wins without specificity games.

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

- The padding defaults to `0` because the host's block wrapper already pads
  a block with a background colour.
- The list direction is a theme decision, not an author choice.
- The block sets no focus outline, so the host's own `:focus-visible` style
  reaches the links.

Adding a property is a minor release. Removing or renaming a property, or
changing a default, is a breaking change.

## Using the block in Aurora

The editor half lives in `bundle-src/` as the npm package
`@derico/aurora-actions-block` (not yet published). It registers the block
and its select widget through the usual `install(config)` entry point and
uses only upstream Aurora widgets.

- **The Python package must still be installed on the backend.** The React
  `view` reads the `catalog` the server injects. Without it the block renders
  an empty `<nav>`.
- **The editor preview of a new block is anonymous.** The fallback fetch of
  `@actions` for a freshly inserted block is a plain same-origin `fetch`.
  Under Blicca the session cookie authenticates it. In Aurora the API token
  does not reach it, so the preview shows what an anonymous visitor gets
  until the block is saved and reloaded.
- **Bring your own styling.** The stylesheet is scoped to the Blicca roots
  and does not apply in an Aurora frontend.

## Development

The JavaScript build output is committed into
`src/derico/blicca/actionsblock/static/`. Rebuild and commit it whenever
`bundle-src/src/` changes; CI fails when the committed bundle does not match
the source.

```bash
cd bundle-src
pnpm install
pnpm build        # writes ../src/derico/blicca/actionsblock/static/actions-block.{js,css}
pnpm test         # reads the built bundle, so build first
pnpm typecheck
```

```bash
uv run --extra test pytest
```

`test/seam-lockstep.test.ts` checks that the property table in this README
matches the stylesheet literally, so keep the two in step.

Every change to a GenericSetup profile XML file needs an upgrade step, even
in an alpha release. Scaffold it with `plonecli add upgrade_step`.

## License

GPL-2.0-or-later

## Author

Maik Derstappen, [derico](https://derico.de), <md@derico.de>
