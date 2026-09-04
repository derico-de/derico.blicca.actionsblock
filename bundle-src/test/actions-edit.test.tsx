/**
 * The canvas: the preview it draws and the notices it adds, in every state
 * the catalog ladder can be in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import config from '@plone/registry';

import ActionsEdit from '../src/actions/ActionsEdit';
import { resetCatalogCache } from '../src/actions/catalog-source';

const CATALOG = {
  site_actions: [{ id: 'sitemap', title: 'Site Map', url: 'http://nohost/plone/sitemap' }],
  user: [],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('with the server’s catalog on the node', () => {
  afterEach(cleanup);

  it('previews the rows, hrefs dropped, and says whose view it is', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { container } = render(<ActionsEdit data={{ catalog: CATALOG }} />);
    expect(container.querySelector('.actions-item-sitemap a')?.getAttribute('href')).toBeNull();
    expect(screen.getByText('Site Map')).toBeTruthy();
    expect(screen.getByText(/Previewed as you/)).toBeTruthy();
    // Nothing to fetch: the node carries the catalog.
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('says why an empty category renders empty', () => {
    render(<ActionsEdit data={{ category: 'user', catalog: CATALOG }} />);
    expect(
      screen.getByText('No user actions are available to you here, so the block renders empty.'),
    ).toBeTruthy();
  });

  it('keeps the notices outside the block root and uneditable', () => {
    const { container } = render(<ActionsEdit data={{ catalog: CATALOG }} />);
    const notice = container.querySelector('.actions-notice')!;
    expect(notice.parentElement).toBe(container);
    expect(notice.getAttribute('contenteditable')).toBe('false');
    expect(container.querySelector('.actions-block .actions-notice')).toBeNull();
  });
});

describe('with a never-serialized node', () => {
  beforeEach(() => {
    resetCatalogCache();
    (config as any).settings.apiPath = 'http://localhost:3000/Plone';
    window.history.pushState({}, '', '/Plone/doc/@@aurora-edit');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    (config as any).settings.apiPath = undefined;
  });

  it('fetches the page’s @actions and then previews the chosen category', async () => {
    const pending = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);

    render(<ActionsEdit data={{ category: 'site_actions' }} />);
    expect(screen.getByText('Loading the actions for this page…')).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/Plone/doc/@actions',
      expect.objectContaining({ credentials: 'same-origin' }),
    );

    await act(async () => {
      pending.resolve({ ok: true, json: () => Promise.resolve(CATALOG) });
      await pending.promise;
    });
    expect(screen.getByText('Site Map')).toBeTruthy();
    expect(screen.getByText(/Previewed as you/)).toBeTruthy();
  });

  it('says so when nothing could be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    render(<ActionsEdit data={{}} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/could not be loaded for the preview/)).toBeTruthy();
  });

  it('says so when the host has not said where its API is', () => {
    (config as any).settings.apiPath = undefined;
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<ActionsEdit data={{}} />);
    expect(screen.getByText(/could not be loaded for the preview/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
