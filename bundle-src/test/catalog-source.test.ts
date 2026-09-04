/**
 * Where the canvas gets a catalog for a never-serialized node: the endpoint
 * derivation for both hosts' edit routes, and the one-request-per-URL cache.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { actionsEndpoint, fetchCatalog, resetCatalogCache } from '../src/actions/catalog-source';

describe('actionsEndpoint', () => {
  const at = (origin: string, pathname: string) => ({ origin, pathname });

  it('strips the portal prefix and the Blicca edit suffix', () => {
    // Blicca: apiPath is the portal URL, and the page lives under it.
    expect(
      actionsEndpoint(at('http://host', '/Plone/folder/doc/@@aurora-edit'), 'http://host/Plone'),
    ).toBe('http://host/Plone/folder/doc/@actions');
  });

  it('handles the portal root itself', () => {
    expect(actionsEndpoint(at('http://host', '/Plone/@@aurora-edit'), 'http://host/Plone')).toBe(
      'http://host/Plone/@actions',
    );
  });

  it('strips the Aurora edit suffix and adds no prefix twice', () => {
    // Aurora: the app's routes carry no portal prefix; apiPath is the backend.
    expect(actionsEndpoint(at('http://app', '/folder/doc/edit'), 'http://backend/Plone')).toBe(
      'http://backend/Plone/folder/doc/@actions',
    );
    expect(actionsEndpoint(at('http://app', '/folder/doc/edit'), '/++api++')).toBe(
      '/++api++/folder/doc/@actions',
    );
  });

  it('leaves a page named edit alone when it is not the suffix', () => {
    expect(actionsEndpoint(at('http://app', '/edit/doc/edit'), 'http://backend')).toBe(
      'http://backend/edit/doc/@actions',
    );
  });

  it('tolerates trailing slashes on both inputs', () => {
    expect(
      actionsEndpoint(at('http://host', '/Plone/doc/@@aurora-edit/'), 'http://host/Plone/'),
    ).toBe('http://host/Plone/doc/@actions');
  });

  it('answers null when the host has not said where its API is', () => {
    expect(actionsEndpoint(at('http://host', '/Plone/doc/@@aurora-edit'), '')).toBeNull();
  });
});

describe('fetchCatalog', () => {
  afterEach(() => {
    resetCatalogCache();
    vi.unstubAllGlobals();
  });

  const respond = (body: unknown, ok = true) =>
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) }));

  it('returns the body when it is an object', async () => {
    const fetch = respond({ site_actions: [] });
    vi.stubGlobal('fetch', fetch);
    await expect(fetchCatalog('http://x/@actions')).resolves.toEqual({ site_actions: [] });
    expect(fetch).toHaveBeenCalledWith('http://x/@actions', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
  });

  it('asks once per URL, however many blocks ask', async () => {
    const fetch = respond({});
    vi.stubGlobal('fetch', fetch);
    await Promise.all([fetchCatalog('http://x/@actions'), fetchCatalog('http://x/@actions')]);
    await fetchCatalog('http://x/@actions');
    expect(fetch).toHaveBeenCalledTimes(1);
    await fetchCatalog('http://y/@actions');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a failed response', respond({}, false)],
    ['a body that is not an object', respond([1, 2])],
    ['a rejected request', vi.fn(() => Promise.reject(new Error('offline')))],
  ])('answers null for %s', async (_what, fetch) => {
    vi.stubGlobal('fetch', fetch);
    await expect(fetchCatalog('http://x/@actions')).resolves.toBeNull();
  });
});
