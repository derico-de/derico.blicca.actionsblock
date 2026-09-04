/**
 * The sidebar form: what it offers, what it never offers, and the invariant
 * that keeps the index-keyed renderer from swapping fields under the author.
 */
import { describe, expect, it } from 'vitest';
import config from '@plone/registry';

import { ActionsSchema, ACTIONS_BLOCK_TYPE } from '../src/actions/schema';
import { CATEGORIES, DEFAULT_CATEGORY, DERIVED_KEYS } from '../src/actions/data';
import { installUpstreamRegistry } from './upstream-registry';

installUpstreamRegistry(config as any);

const schema = ActionsSchema({ formData: {} });
const fields = schema.fieldsets.flatMap((fieldset) => fieldset.fields);

describe('what the sidebar offers', () => {
  it('is the block type the entry registers', () => {
    expect(ACTIONS_BLOCK_TYPE).toBe('actions');
  });

  it('offers the category, the heading and the width', () => {
    expect(fields).toEqual(['category', 'title', 'blockWidth']);
    for (const name of fields) expect(schema.properties).toHaveProperty(name);
  });

  it('offers the category as a select in BOTH hosts', () => {
    // `widget` outranks `choices` in Field.tsx, and only Blicca registers a
    // `choices` widget — a bare `choices` would be a text input in Aurora.
    const category = schema.properties.category;
    expect(category.widget).toBe('actions_select');
    expect(category.choices).toEqual(CATEGORIES.map(([id, label]) => [id, label]));
    expect(category.default).toBe(DEFAULT_CATEGORY);
  });

  it('never offers a derived key', () => {
    for (const key of DERIVED_KEYS) {
      expect(fields).not.toContain(key);
      expect(schema.properties).not.toHaveProperty(key);
    }
  });

  it('requires nothing', () => {
    expect(schema.required).toEqual([]);
  });

  it('offers no background where the host registers no palette', () => {
    // Absent BY MECHANISM: the upstream registry carries no
    // `backgroundColor` style-field definition.
    expect(fields).not.toContain('backgroundColor');
  });
});

describe('the index-keyed renderer invariant', () => {
  it('puts at most one conditional field per fieldset, and last', () => {
    // BlockSettingsFormRenderer keys fields by array index and re-runs the
    // schema on every keystroke, so a field that appears or disappears from
    // the MIDDLE of a fieldset shifts the keys of every later field.
    const withBackground = {
      ...schema,
      fieldsets: schema.fieldsets.map((fieldset) =>
        fieldset.id === 'styling'
          ? { ...fieldset, fields: [...fieldset.fields, 'backgroundColor'] }
          : fieldset,
      ),
    };
    for (const fieldset of withBackground.fieldsets) {
      const bare = schema.fieldsets.find((f) => f.id === fieldset.id)!;
      const conditional = fieldset.fields.filter((name) => !bare.fields.includes(name));
      expect(conditional.length).toBeLessThanOrEqual(1);
      if (conditional.length) {
        expect(fieldset.fields.at(-1)).toBe(conditional[0]);
      }
    }
  });
});
