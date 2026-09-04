# Changelog

## 1.0.0a1 (unreleased)

- Initial release: the Actions block (`@type: actions`) — one of Plone's six
  stock action categories listed as links, chosen in the sidebar, with an
  optional heading. Renders under Blicca (`@@aurora-block-actions`) and in
  Aurora proper (the React `view`) from one anatomy and one scope-wrapped
  stylesheet; the catalog of every category is derived on load by the
  server's serialization transformer and never persisted.
