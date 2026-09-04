/**
 * The rules that decide what renders, on the editor side. The Python suite
 * (`tests/test_actions_data.py`) holds the same rules on the other side and
 * reads this module's tables to keep the two level.
 */
import { describe, expect, it } from 'vitest';

import {
  CATEGORIES,
  CATEGORY_IDS,
  DEFAULT_CATEGORY,
  DERIVED_KEYS,
  catalog,
  categoryLabel,
  effectiveCategory,
  entries,
  itemClass,
  screenLink,
  title,
} from '../src/actions/data';

describe('the tables', () => {
  it('offer the six stock categories, in sidebar order', () => {
    expect(CATEGORY_IDS).toEqual([
      'site_actions',
      'portal_tabs',
      'user',
      'document_actions',
      'object',
      'object_buttons',
    ]);
    for (const [, label] of CATEGORIES) expect(label).toBeTruthy();
  });

  it('default to a category that is offered', () => {
    expect(CATEGORY_IDS).toContain(DEFAULT_CATEGORY);
  });

  it('name the one derived key', () => {
    expect(DERIVED_KEYS).toEqual(['catalog']);
  });
});

describe('effectiveCategory', () => {
  it('is the stored one when offered', () => {
    expect(effectiveCategory({ category: 'user' })).toBe('user');
    expect(effectiveCategory({ category: ' user ' })).toBe('user');
  });

  it.each([undefined, null, '', 'bogus', 42, ['user'], 'User'])(
    'falls back to the default for %s',
    (stored) => {
      expect(effectiveCategory({ category: stored })).toBe('site_actions');
    },
  );

  it('has a label for every offered category and none for anything else', () => {
    for (const id of CATEGORY_IDS) expect(categoryLabel(id)).toBeTruthy();
    expect(categoryLabel('bogus')).toBe('');
  });
});

describe('screenLink', () => {
  it.each([
    '/sitemap',
    'sitemap',
    'http://nohost/plone/sitemap',
    'HTTPS://example.org/x',
    'mailto:md@derico.de',
    'tel:+49123',
  ])('passes %s', (value) => {
    expect(screenLink(value)).toBe(value);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example/x'])(
    'rejects %s',
    (value) => {
      expect(screenLink(value)).toBe('');
    },
  );

  it.each([undefined, null, '', '  ', 42, [], {}, true])('answers absent for %s', (value) => {
    expect(screenLink(value)).toBe('');
  });
});

describe('catalog', () => {
  it('is null for a node the server never serialized', () => {
    // `null`, not `{}`: the editor tells "never derived" from "derived and
    // empty" by it, and only the first is worth a fetch.
    expect(catalog({})).toBeNull();
    expect(catalog({ catalog: null })).toBeNull();
    expect(catalog({ catalog: 'x' })).toBeNull();
    expect(catalog({ catalog: [] })).toBeNull();
  });

  it('is the object when one is there, however empty', () => {
    expect(catalog({ catalog: {} })).toEqual({});
  });
});

describe('entries', () => {
  it('reads the stored category out of the whole catalog', () => {
    expect(
      entries({
        category: 'user',
        catalog: {
          site_actions: [{ id: 'sitemap', title: 'Site Map', url: '/sitemap' }],
          user: [{ id: 'login', title: 'Log in', url: '/login' }],
        },
      }),
    ).toEqual([
      { id: 'login', title: 'Log in', href: '/login', css: 'actions-item actions-item-login' },
    ]);
  });

  it('answers nothing without a catalog or a category in it', () => {
    expect(entries({})).toEqual([]);
    expect(entries({ catalog: { site_actions: 'x' } })).toEqual([]);
    expect(entries({ category: 'user', catalog: { site_actions: [] } })).toEqual([]);
  });

  it('drops half rows and rows of the wrong shape', () => {
    const rows = entries({
      catalog: {
        site_actions: [
          { id: 'a', title: '', url: '/a' },
          { id: 'b', title: 'B' },
          { id: 'c', title: 'C', url: 'javascript:x' },
          'd',
          null,
          { id: 'e', title: ' E ', url: ' /e ' },
        ],
      },
    });
    expect(rows).toEqual([{ id: 'e', title: 'E', href: '/e', css: 'actions-item actions-item-e' }]);
  });

  it.each([
    ['sitemap', 'actions-item actions-item-sitemap'],
    ['folderContents', 'actions-item actions-item-folderContents'],
    ['index_html', 'actions-item actions-item-index_html'],
    ['site map', 'actions-item'],
    ['a.b', 'actions-item'],
    ['', 'actions-item'],
    [undefined, 'actions-item'],
  ])('classes id %s as %s', (id, css) => {
    expect(itemClass(id)).toBe(css);
  });
});

describe('title', () => {
  it('is the trimmed string, or nothing', () => {
    expect(title({ title: '  More ' })).toBe('More');
    expect(title({ title: 42 })).toBe('');
    expect(title({})).toBe('');
  });
});
