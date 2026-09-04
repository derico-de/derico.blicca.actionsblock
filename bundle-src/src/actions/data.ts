/**
 * Reading the Actions block's stored JSON — the one place the rules that
 * decide *what renders* live on this side of the block.
 *
 * The **server half (`actions_data.py`) implements the same rules against
 * the same data**: two renderers in two languages, one scope-wrapped
 * stylesheet dressing both. A change here is a change to both, and the
 * anatomy fixture plus the Python parity test are what catch a one-sided
 * edit.
 *
 * Nothing here computes an action. What both renderers read is the
 * `catalog` the server's serializer injects at load time — every offered
 * category mapped to the rows the current user gets on the current context —
 * and strips again on save. The canvas only ever *fetches* one (see
 * `catalog-source.ts`) when it holds a node the server has never serialized.
 */

/** Everything the two renderers read. `unknown`, because nothing is required. */
export type ActionsData = {
  category?: unknown;
  title?: unknown;
  /** Injected by the server's serializer; never authored, never persisted. */
  catalog?: unknown;
};

export type Entry = { id: string; title: string; href: string; css: string };

/**
 * The categories the sidebar offers, in sidebar order, with the label the
 * `<nav>` announces. Plone's six stock `portal_actions` categories; a site
 * may carry more, but the block only offers what every site has.
 * PARITY: `actions_data.CATEGORIES`. Extended together or not at all.
 */
export const CATEGORIES = [
  ['site_actions', 'Site actions'],
  ['portal_tabs', 'Portal tabs'],
  ['user', 'User actions'],
  ['document_actions', 'Document actions'],
  ['object', 'Object actions'],
  ['object_buttons', 'Object buttons'],
] as const;

export type Category = (typeof CATEGORIES)[number][0];

export const CATEGORY_IDS: readonly string[] = CATEGORIES.map(([id]) => id);

/**
 * A category that was never stored, or is not one the block offers, renders
 * the site actions. Applied in BOTH renderers rather than trusted from the
 * schema's `default`, which is spread into the widget as a prop and is not
 * reliably written to the node.
 */
export const DEFAULT_CATEGORY = 'site_actions';

/**
 * The schemes an action URL may carry. The catalog is derived data the
 * server computed, but it travels inside a JSON node anyone with API access
 * can hand-author, so the renderers screen it like typed input. An
 * allowlist, not a blocklist. PARITY with `actions_data.LINK_SCHEMES`.
 */
export const LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const;

/**
 * Every key the serializer injects and the deserializer strips, named on
 * this side so it can be held level with the Python spelling
 * (`actions_transform.DERIVED_FIELDS`). The schema suite reads it to assert
 * that no derived key is ever offered to an author.
 */
export const DERIVED_KEYS = ['catalog'] as const;

/** An action id that may become a class modifier. */
const SLUG = /^[A-Za-z0-9_-]+$/;

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * `value` if it is a usable URL of an allowed scheme, `''` otherwise. A value
 * with no scheme at all is a path and passes; `//host/x` is rejected.
 */
export function screenLink(value: unknown): string {
  const raw = text(value);
  if (!raw || raw.startsWith('//')) return '';
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!scheme) return raw;
  return (LINK_SCHEMES as readonly string[]).includes(scheme[1].toLowerCase())
    ? raw
    : '';
}

/**
 * The category that renders: the stored one if offered, else the default.
 * Emitted on the root as `has--category--<value>` ALWAYS.
 */
export function effectiveCategory(data: ActionsData): Category {
  const stored = text(data.category);
  return (CATEGORY_IDS.includes(stored) ? stored : DEFAULT_CATEGORY) as Category;
}

/** The label a category is announced by (the `<nav>`'s `aria-label`). */
export function categoryLabel(category: string): string {
  const row = CATEGORIES.find(([id]) => id === category);
  return row ? row[1] : '';
}

/** The optional heading above the list. Plain text. */
export function title(data: ActionsData): string {
  return text(data.title);
}

/**
 * The derived catalog, or `null` when the node carries none — which is every
 * node the server has never serialized: a freshly inserted block, an
 * API-authored one, a fixture. `null` rather than `{}` so the editor can tell
 * "never derived" from "derived and empty" (`catalog-source.ts`).
 */
export function catalog(data: ActionsData): Record<string, unknown> | null {
  const value = data.catalog;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** `actions-item` plus a per-action modifier when the id is a slug. */
export function itemClass(actionId: unknown): string {
  const slug = text(actionId);
  return slug && SLUG.test(slug) ? `actions-item actions-item-${slug}` : 'actions-item';
}

/**
 * The rows that render, in catalog order. A row without a title and a row
 * without a usable URL both render nothing — a link that goes nowhere is
 * worse than an absent one — and a URL that fails the screen is treated
 * exactly as no URL.
 */
export function entries(data: ActionsData): Entry[] {
  const rows = catalog(data)?.[effectiveCategory(data)];
  if (!Array.isArray(rows)) return [];
  const found: Entry[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const label = text(record.title);
    const href = screenLink(record.url);
    if (!label || !href) continue;
    found.push({
      id: text(record.id),
      title: label,
      href,
      css: itemClass(record.id),
    });
  }
  return found;
}
