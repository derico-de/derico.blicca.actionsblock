# Changelog

## 1.0.0a1 (unreleased)

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
