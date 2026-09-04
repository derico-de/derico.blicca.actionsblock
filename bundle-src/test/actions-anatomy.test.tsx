/**
 * The anatomy, held against the React renderer through the shared fixture
 * (`tests/anatomy-cases.json`) the Python suite reads too. Exactly, up to
 * attribute order; as a skeleton (every attribute but `class` dropped); and
 * with every `href` dropped on the editor surface.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import ActionsView from '../src/actions/ActionsView';
import type { ActionsData } from '../src/actions/data';

const FIXTURE = 'tests/anatomy-cases.json';

/** Walked up from the working directory: `import.meta.url` is an http URL under vitest. */
function fixtureFile(): string {
  let directory = process.cwd();
  for (let up = 0; up < 4; up += 1) {
    const candidate = join(directory, FIXTURE);
    if (existsSync(candidate)) return candidate;
    directory = dirname(directory);
  }
  throw new Error(`no ${FIXTURE} above ${process.cwd()}`);
}

type Case = { name: string; note: string; data: ActionsData; html: string };

export const CASES: Case[] = JSON.parse(readFileSync(fixtureFile(), 'utf8')).cases;

const TAG = /<([a-z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*(\/?)>/gi;

const attributesOf = (attrs: string): string[] =>
  attrs.match(/[^\s=]+(?:="[^"]*")?/g) ?? [];

/** Attribute ORDER normalized away; everything else exact. */
export function canonical(html: string): string {
  return html.replace(TAG, (_match, tag: string, attrs: string, close: string) => {
    const sorted = attributesOf(attrs).sort();
    return `<${tag}${sorted.length ? ` ${sorted.join(' ')}` : ''}${close}>`;
  });
}

/** The cross-renderer contract: tags, `class` and text; nothing else. */
export function skeleton(html: string): string {
  return html.replace(TAG, (_match, tag: string, attrs: string, close: string) => {
    const kept = attributesOf(attrs).filter((attr) => attr.startsWith('class='));
    return `<${tag}${kept.length ? ` ${kept.join(' ')}` : ''}${close}>`;
  });
}

const markup = (data: ActionsData, isEditMode?: boolean) =>
  render(<ActionsView data={data} isEditMode={isEditMode} />).container.innerHTML;

describe('the shared anatomy fixture', () => {
  it('covers the states the rules enumerate', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(16);
    expect(new Set(CASES.map((entry) => entry.name)).size).toBe(CASES.length);
    for (const entry of CASES) expect(entry.note, entry.name).toBeTruthy();
  });

  it.each(CASES.map((entry) => [entry.name, entry] as const))(
    'renders %s exactly',
    (_name, entry) => {
      expect(canonical(markup(entry.data))).toBe(canonical(entry.html));
    },
  );

  it.each(CASES.map((entry) => [entry.name, entry] as const))(
    'matches the cross-renderer skeleton for %s',
    (_name, entry) => {
      expect(skeleton(markup(entry.data))).toBe(skeleton(entry.html));
    },
  );

  it('drops every href on the editor surface, and changes nothing else', () => {
    for (const entry of CASES) {
      const expected = entry.html.replace(/ href="[^"]*"/g, '');
      expect(canonical(markup(entry.data, true)), entry.name).toBe(canonical(expected));
    }
  });
});

describe('the rules, restated by hand', () => {
  it('always emits the root with the effective category and its label', () => {
    const { container } = render(<ActionsView data={{ category: 'nope' }} />);
    const root = container.firstElementChild!;
    expect(root.tagName).toBe('NAV');
    expect(root.className).toBe('actions-block has--category--site_actions');
    expect(root.getAttribute('aria-label')).toBe('Site actions');
    expect(root.children.length).toBe(0);
  });

  it('never emits the list empty', () => {
    const { container } = render(
      <ActionsView data={{ category: 'user', catalog: { user: [] } }} />,
    );
    expect(container.querySelector('.actions-list')).toBeNull();
  });

  it('emits no whitespace-only text nodes', () => {
    const richest = CASES.find((entry) => entry.name === 'title-and-list')!;
    expect(markup(richest.data)).not.toMatch(/>\s+</);
  });
});
