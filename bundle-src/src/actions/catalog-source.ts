/**
 * Where the CANVAS gets a catalog for a node the server has never serialized.
 *
 * A loaded node carries `catalog` — the server derived it (§5.3) and both
 * renderers read it. A freshly inserted block carries nothing, and would be
 * a blank box until the author saved and reloaded. So the editor, and only
 * the editor, fetches the same rows the serializer would have injected:
 * `plone.restapi`'s `@actions` service on the object being edited, which is
 * computed by the same `plone_context_state.actions()` call the transformer
 * uses (held level by `test_actions_transform.TestRestapiParity`).
 *
 * The `view` never fetches. In Aurora proper it IS the public rendering, and
 * a public rendering that fetches after mount would flash empty on the
 * server-rendered page; there, as here, the catalog arrives with the content
 * when the Python add-on is installed on the backend. Where it is not, the
 * view draws the empty root — a stated deferral, not a bug.
 *
 * What is Blicca-specific here, and what is not:
 *
 * - `config.settings.apiPath` is a `@plone/types` Settings field, set by
 *   both hosts.
 * - The path of the object being edited is read off `location`: Blicca
 *   edits at `<object>/@@aurora-edit`, Aurora at `<object>/edit`. Neither
 *   host hands a block component its content URL, and this is the one
 *   fact both edit surfaces share.
 * - The fetch is same-origin with cookies, which is what authenticates it
 *   under Blicca (the classic session cookie) and makes it anonymous under
 *   Aurora, whose token never reaches a plain `fetch`. Anonymous is still a
 *   truthful preview of what a visitor gets; the author's own view arrives
 *   on the next load, from the serializer.
 */
import { useEffect, useState } from 'react';
import config from '@plone/registry';

import { catalog as storedCatalog, type ActionsData } from './data';

export type Catalog = Record<string, unknown>;

type Location = { origin: string; pathname: string };

/** The edit-route suffixes the two hosts put after the object's path. */
const EDIT_SUFFIX = /\/(?:@@aurora-edit|edit)\/?$/;

/** `config.settings.apiPath`, or `''`. */
export function apiPath(): string {
  const settings = (config as { settings?: { apiPath?: unknown } }).settings;
  const value = settings?.apiPath;
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

/**
 * The `@actions` URL for the object being edited, or `null` when the host
 * has not said where its API is.
 *
 * Under Blicca `apiPath` is the portal URL and the page lives under the same
 * prefix (`/Plone/doc/@@aurora-edit` against `http://host/Plone`), so the
 * portal's own path is stripped before the object's path is appended —
 * otherwise the prefix would appear twice. Under Aurora the app's routes
 * carry no such prefix and nothing is stripped.
 */
export function actionsEndpoint(location: Location, base: string): string | null {
  const root = base.replace(/\/+$/, '');
  if (!root) return null;
  let rootPath = '';
  try {
    rootPath = new URL(root, location.origin).pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
  let path = location.pathname.replace(EDIT_SUFFIX, '').replace(/\/+$/, '');
  if (rootPath && path === rootPath) path = '';
  else if (rootPath && path.startsWith(`${rootPath}/`)) path = path.slice(rootPath.length);
  return `${root}${path}/@actions`;
}

const inflight = new Map<string, Promise<Catalog | null>>();

/** One request per URL per page load, shared by every block on the canvas. */
export function fetchCatalog(url: string): Promise<Catalog | null> {
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) =>
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Catalog)
          : null,
      )
      .catch(() => null);
    inflight.set(url, pending);
  }
  return pending;
}

/** Test seam: forget every cached request. */
export function resetCatalogCache() {
  inflight.clear();
}

export type CatalogState =
  /** The node carries the server's catalog; nothing was fetched. */
  | 'stored'
  | 'loading'
  /** The canvas fetched one for a never-serialized node. */
  | 'fetched'
  /** Nothing to show: no API path, a failed request, or a malformed body. */
  | 'failed';

/**
 * The catalog the canvas should draw, and where it came from.
 *
 * Rung 0: the stored one, whenever the node carries it — including an EMPTY
 * category, which is the server saying this user has no such actions here.
 * Rung 1: a fetch, once, for a node with no catalog at all.
 */
export function useCatalog(data: ActionsData): {
  catalog: Catalog | null;
  state: CatalogState;
} {
  const stored = storedCatalog(data);
  const [fetched, setFetched] = useState<{ url: string; catalog: Catalog | null } | null>(
    null,
  );
  const endpoint =
    stored || typeof globalThis.location === 'undefined'
      ? null
      : actionsEndpoint(globalThis.location, apiPath());

  useEffect(() => {
    if (!endpoint) return;
    let live = true;
    fetchCatalog(endpoint).then((result) => {
      if (live) setFetched({ url: endpoint, catalog: result });
    });
    return () => {
      live = false;
    };
  }, [endpoint]);

  if (stored) return { catalog: stored, state: 'stored' };
  if (!endpoint) return { catalog: null, state: 'failed' };
  if (!fetched || fetched.url !== endpoint) return { catalog: null, state: 'loading' };
  return fetched.catalog
    ? { catalog: fetched.catalog, state: 'fetched' }
    : { catalog: null, state: 'failed' };
}
