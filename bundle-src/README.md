# `@derico/aurora-actions-block`

The Actions block's Aurora half. This is a real npm package (block add-on
contract §1.1: the editor half belongs to the Aurora ecosystem; Blicca
ownership lives only in the Python package) *and* the source for the bundle
committed into `../src/derico/blicca/actionsblock/static/`. Publishing it to
npm is a later step; nothing here changes for it.

Two consumers, one source:

| consumer | artifact | entry |
| --- | --- | --- |
| Blicca `@@aurora-edit` | the scope-wrapped Plone static bundle, runtime-imported per contract §4 | `install(config)` via `blockAddons` |
| Aurora proper | this npm package, a source dependency | `install(config)` from the app's registry config |

## Commands

```bash
pnpm install
pnpm build      # -> ../src/derico/blicca/actionsblock/static/actions-block.{js,css,js.map}
pnpm test       # the harness reads the built artifact: build first
pnpm typecheck
```

**Build artifacts are committed and never built at install time.** There is
no Node on the deploy host; rebuild here and commit the result whenever
`src/` changes.

If `pnpm install` fails with a sqlite "disk I/O error", the store is on a
filesystem it cannot lock — use `pnpm install --store-dir /dev/shm/pnpm-store`.

## Layout

- `src/actions/data.ts` — the rules that decide what renders, spelled once
  per side (`actions_data.py` is the twin; the Python suite reads this file).
- `src/actions/catalog-source.ts` — where the CANVAS gets a catalog for a
  never-serialized node: the `@actions` endpoint for either host's edit route,
  one request per page, and the `useCatalog` ladder.
- `src/actions/ActionsView.tsx` — the markup, and in Aurora the public
  rendering. Reads `data` and nothing else.
- `src/actions/ActionsEdit.tsx` — the view plus the notices.
- `src/actions/schema.ts` — the sidebar form.
- `src/widgets/` — `actions_select`, the namespaced select the category
  field names so it is a select in both hosts (`choices` is Blicca-only).
- `src/styles.css` — the one stylesheet, scope-wrapped by the build.

`vite.config.ts` and `build-plugins/scope-wrap.ts` are the canonical block
add-on build, as the Promo block ships them: ESM lib output, automatic JSX
runtime, the eight promised shared modules external, a build failure if one
leaks in.

## Tests

`test/upstream-registry.ts` installs the five real Aurora installers at the
versions the host pins, so the harness runs against the registry Aurora
builds and none of Blicca's overrides. `test/actions-anatomy.test.tsx` reads
`../tests/anatomy-cases.json`, the fixture the Python suite reads too.
