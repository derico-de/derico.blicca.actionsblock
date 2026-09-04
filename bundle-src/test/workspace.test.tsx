/**
 * The workspace stands up, the loader convention is honoured, and the
 * upstream fixture is genuinely Blicca-free.
 */
import { describe, expect, it } from 'vitest';
import config from '@plone/registry';

import install, { ActionsBlockInfo } from '../src/index';
import { ACTIONS_WIDGETS } from '../src/widgets';
import {
  BLICCA_ONLY_REGISTRATIONS,
  choicesWidgetOf,
  installUpstreamRegistry,
} from './upstream-registry';

// A vitest file gets its own module registry, so this singleton is this
// file's alone.
const upstream = installUpstreamRegistry(config as any);

describe('install()', () => {
  it('returns the config — the loader convention requires it', () => {
    expect(install(upstream)).toBe(upstream);
  });

  it('registers the block under @type actions', () => {
    install(upstream);
    expect(upstream.blocks.blocksConfig.actions).toBe(ActionsBlockInfo);
  });

  it('registers the namespaced select widget, and only that', () => {
    install(upstream);
    expect(upstream.getWidget('actions_select')).toBe(ACTIONS_WIDGETS.actions_select);
    expect(Object.keys(ACTIONS_WIDGETS)).toEqual(['actions_select']);
    // The generic keys stay unclaimed: claiming one would change every other
    // block's fields in the host.
    for (const key of ['select', 'textarea']) {
      expect(upstream.getWidget(key)).toBeUndefined();
    }
  });
});

describe('the blocksConfig entry', () => {
  it('has the two fields whose absence silently drops it from the slash menu', () => {
    expect(ActionsBlockInfo.id).toBe('actions');
    expect(ActionsBlockInfo.title).toBe('Actions');
    expect(typeof ActionsBlockInfo.title).toBe('string');
  });

  it('gives icon as a component — a string breaks the slash menu', () => {
    expect(typeof ActionsBlockInfo.icon).toBe('function');
  });

  it('implements both halves', () => {
    expect(typeof ActionsBlockInfo.edit).toBe('function');
    expect(typeof ActionsBlockInfo.view).toBe('function');
    expect(typeof ActionsBlockInfo.blockSchema).toBe('function');
  });

  it('declares no defaultBlockWidth: the schema offers blockWidth instead', () => {
    expect(ActionsBlockInfo).not.toHaveProperty('defaultBlockWidth');
  });
});

describe('the upstream registry fixture', () => {
  it('registers no `choices` widget — it is Blicca-only', () => {
    expect(BLICCA_ONLY_REGISTRATIONS.widgetKeys).toEqual(['choices']);
    expect(choicesWidgetOf(upstream)).toBeUndefined();
  });
});
