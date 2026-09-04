# The catalog is the server's, whole, and the canvas only ever fetches it once

The Actions block renders links it does not author: which actions a
[[action category]] holds depends on the site, the page, the user's
permissions and whether they are logged in. Three designs were open for where
that answer comes from.

1. **Each renderer computes its own.** The Chameleon template asks
   `plone_context_state` at render time; the React `view` fetches `@actions`
   after mount. Simple, and wrong twice over: the two surfaces would run
   different code against different requests (a server render is the
   visitor's, a client fetch is whoever holds the browser), and in Aurora
   proper a public rendering that fetches after mount flashes empty on the
   server-rendered page.
2. **The server derives the chosen category's rows** as a derived key, with
   a provenance stamp naming the category they were computed for, as the
   Promo block stamps its image. Parity by construction, but switching the
   category in the sidebar leaves the canvas with rows about the previous
   choice until the next save.
3. **The server derives the whole catalog** — every offered category — as one
   derived key, `catalog`, and both renderers read it as data.

The block takes the third. The derived set then depends on the context and the
user alone, never on a stored field, so it needs no stamp: nothing an author
can change in the sidebar makes it stale, and switching the category is
instant. Six categories cost a few hundred bytes per block per load, and the
computation is the one Plone already does for its own viewlets. The rows are
computed the way `plone.restapi`'s `@actions` service computes them, minus
`icon`, and `test_actions_transform.TestRestapiParity` holds the two level.

One case is not covered by a stored catalog: a block the server has never
serialized, which is every freshly inserted one. Rather than a blank box until
the first save, the canvas — and only the canvas — fetches `@actions` for the
object being edited, once per page, and previews from that. That fetch is the
same computation the serializer runs, so what it shows is what the next load
will carry. The `view` never fetches: in Aurora proper it is the public
rendering, and where the backend lacks this add-on it draws the empty root —
a stated deferral under the Blicca-first doctrine, not a bug to be papered
over with a client-side request.

Consequences the reader should expect:

- The catalog is **per user and per context**: the canvas shows the author's
  own rows and says so. The public page is always the visitor's.
- A hand-authored `catalog` in a node is **replaced on load** and **stripped
  on save**; the renderers still screen every URL, because the key travels
  inside a JSON node anyone with API access can write.
- Adding a category to the block means adding it to the table on both sides
  (`actions_data.CATEGORIES` and `data.ts`), which the parity test enforces,
  and nothing else: the transformer derives whatever the table names.
