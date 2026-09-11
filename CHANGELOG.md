# Changelog

## 1.0.0a1 (unreleased)

- The uninstall and upgrade profiles are out of the Add-ons control panel
  again. `HiddenProfiles` named them all along, but the `INonInstallable`
  utility was never registered in `configure.zcml` — and the panel (and
  `GET /@addons`) only ever sees the class through that registration, so the
  list was inert and `derico.blicca.actionsblock.upgrades` was offered as an installable
  add-on of its own. Installing an upgrade profile by hand imports its XML
  without moving the recorded profile version, leaving the site behind what it
  actually has. The test reads the list out of the utility registry now,
  where the control panel reads it, instead of instantiating the class — which
  is why it stayed green through all of this.

- Render on every edit surface and every carrier, not only on a page's own
  `@@aurora-edit`. The catalog transformers are registered for any context
  (an inherited footer is serialized against its carrier, which need not have
  the `IBlocks` behavior), and the canvas strips any `@@<view>` from the path
  before asking `@actions` (`@@edit-footer`, `@@edit-metadata`, and whatever
  comes next). Both defects showed as an actions block with nothing in it.

- Initial release: the Actions block (`@type: actions`) — one of Plone's six
  stock action categories listed as links, chosen in the sidebar, with an
  optional heading. Renders under Blicca (`@@aurora-block-actions`) and in
  Aurora proper (the React `view`) from one anatomy and one scope-wrapped
  stylesheet; the catalog of every category is derived on load by the
  server's serialization transformer and never persisted.
