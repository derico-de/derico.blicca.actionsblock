/**
 * The block, exercised against Aurora proper.
 *
 * Not "verified in Aurora": no Seven app is stood up. What runs here is the
 * registry Aurora builds, from the packages Aurora ships, at the versions
 * this host pins, with **none of Blicca's overrides** — and the block's own
 * `install`, `edit` and `view` on top of it. The honest claim: every field
 * the block declares resolves in Aurora to the widget it was designed for,
 * the block joins Aurora's own blocks without displacing one, and `view`
 * renders every fixture case standalone, reading nothing from the registry.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import config from '@plone/registry';
import { TextField } from '@plone/components/quanta';

import install, { ActionsBlockInfo, ActionsView, ActionsSchema } from '../src/index';
import { ACTIONS_WIDGETS } from '../src/widgets';
import { UPSTREAM_BLOCKS, choicesWidgetOf, installUpstreamRegistry } from './upstream-registry';

const aurora = installUpstreamRegistry(config as any);
install(aurora);

const bundleSourcePath = path.resolve(
  import.meta.dirname,
  '../../src/derico/blicca/actionsblock/static/actions-block.js',
);

const FIXTURES = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../../tests/anatomy-cases.json'), 'utf8'),
) as { cases: Array<{ name: string; data: Record<string, unknown>; html: string }> };

/** `Field.tsx`'s resolution chain, for the attributes the schema uses. */
function resolveWidget(name: string, property: Record<string, any>) {
  const c = aurora as any;
  const byFieldId = c.getWidget(property.id ?? name) ?? null;
  if (byFieldId) return byFieldId;
  if (typeof property.widget === 'string') {
    return c.getWidget(property.widget) ?? c.widgets.default;
  }
  if (property.choices || property.vocabulary) return c.widgets?.choices ?? null;
  if (property.type) return c.getWidget(property.type) ?? null;
  return c.widgets.default;
}

describe('every field resolves to the widget it was designed for', () => {
  const EXPECTED: Record<string, 'ours' | 'upstream' | 'default'> = {
    category: 'ours',
    title: 'default',
    blockWidth: 'upstream',
  };
  const properties = ActionsSchema({ formData: {} }).properties as Record<
    string,
    Record<string, any>
  >;
  const ours = new Set<unknown>(Object.values(ACTIONS_WIDGETS));

  it('declares exactly the fields the table covers', () => {
    expect(Object.keys(properties).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [name, verdict] of Object.entries(EXPECTED)) {
    it(`${name} resolves to ${verdict}`, () => {
      const resolved = resolveWidget(name, properties[name]);
      const isDefault = resolved === (aurora as any).widgets.default;
      if (verdict === 'default') {
        expect(isDefault).toBe(true);
        expect(resolved).toBe(TextField);
      } else {
        expect(resolved).toBeTruthy();
        expect(isDefault).toBe(false);
        expect(ours.has(resolved)).toBe(verdict === 'ours');
      }
    });
  }

  it('leans on no `choices` widget — Aurora registers none', () => {
    expect(choicesWidgetOf(aurora)).toBeUndefined();
    expect(typeof properties.category.widget).toBe('string');
  });

  it('offers no backgroundColor field at all in Aurora', () => {
    const styling = ActionsSchema({ formData: {} }).fieldsets.find((f: any) => f.id === 'styling');
    expect(styling?.fields).toEqual(['blockWidth']);
  });
});

describe('the block joins Aurora rather than displacing it', () => {
  it('leaves upstream’s blocks intact', () => {
    for (const id of UPSTREAM_BLOCKS) {
      expect((aurora as any).blocks.blocksConfig[id]).toBeDefined();
    }
    expect((aurora as any).blocks.blocksConfig.actions).toBe(ActionsBlockInfo);
  });

  it('adds exactly one entry', () => {
    const ids = Object.keys((aurora as any).blocks.blocksConfig);
    expect(ids.filter((id) => !UPSTREAM_BLOCKS.includes(id))).toEqual(['actions']);
  });
});

describe('view renders standalone — in Aurora it IS the public rendering', () => {
  for (const testCase of FIXTURES.cases) {
    it(`renders ${testCase.name}`, () => {
      const { container } = render(<ActionsView data={testCase.data as any} />);
      expect(container.innerHTML).toBeTruthy();
      cleanup();
    });
  }

  it('reads nothing from the registry, which is why it is portable', () => {
    const richest = FIXTURES.cases.find((c) => c.name === 'title-and-list')!;
    const withAurora = render(<ActionsView data={richest.data as any} />).container.innerHTML;
    cleanup();
    const c = aurora as any;
    const savedWidgets = c.widgets;
    const savedBlocks = c.blocks.blocksConfig;
    const savedSettings = c.settings;
    try {
      c.widgets = { default: undefined };
      c.blocks.blocksConfig = {};
      c.settings = {};
      const bare = render(<ActionsView data={richest.data as any} />).container.innerHTML;
      expect(bare).toBe(withAurora);
    } finally {
      c.widgets = savedWidgets;
      c.blocks.blocksConfig = savedBlocks;
      c.settings = savedSettings;
      cleanup();
    }
  });
});

describe('bundle hygiene', () => {
  const source = readFileSync(bundleSourcePath, 'utf8');
  const PROBE_NAME = '.artifact-probe.mjs';
  const PROBE_PATH = path.resolve(import.meta.dirname, PROBE_NAME);
  afterAll(() => rmSync(PROBE_PATH, { force: true }));

  const PROMISED = [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    'jotai',
    'platejs',
    '@plone/registry',
    '@plone/helpers',
  ];

  it('imports only promised modules — anything else means two Reacts', () => {
    const imported = [
      ...new Set(
        [...source.matchAll(/(?:^|\n)\s*import[^'"\n]*["']([^"']+)["']/g)].map((m) => m[1]),
      ),
    ].sort();
    expect(imported).toEqual(['@plone/helpers', '@plone/registry', 'react', 'react/jsx-runtime']);
    for (const specifier of imported) expect(PROMISED).toContain(specifier);
  });

  it('carries none of the Aurora app stack it dev-depends on', () => {
    for (const forbidden of [
      '@plone/cmsui',
      '@plone/components',
      '@plone/blocks',
      '@plone/theming',
      '@plone/layout',
      '@plone/plate',
      'react-router',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('is importable as a plain ESM module whose default export installs', async () => {
    writeFileSync(PROBE_PATH, source.replace(/\/\/# sourceMappingURL=.*/g, ''));
    const specifier = './' + PROBE_NAME;
    const built: any = await import(/* @vite-ignore */ specifier);
    expect(typeof built.default).toBe('function');
    const probe: any = {
      blocks: { blocksConfig: {} },
      widgets: { widget: {} },
      registerWidget: ({ key, definition }: any) => {
        probe.widgets[key] = { ...(probe.widgets[key] ?? {}), ...definition };
      },
      getWidget: () => undefined,
    };
    expect(built.default(probe)).toBe(probe);
    expect(probe.blocks.blocksConfig.actions?.id).toBe('actions');
    expect(typeof probe.widgets.widget.actions_select).toBe('function');
  });
});
