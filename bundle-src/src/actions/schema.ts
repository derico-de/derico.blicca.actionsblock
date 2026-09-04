/**
 * The Actions block's sidebar form.
 *
 * Two host facts shape it:
 *
 * 1. The schema function receives `{ props, formData, intl }`, not `{ data }`
 *    (`BlockSettingsForm.tsx` calls `schemaProp({ props, formData, intl })`).
 * 2. `BlockSettingsFormRenderer` keys its fields by ARRAY INDEX and re-runs
 *    this function on every change, so a conditional field must be LAST in
 *    its fieldset or React reuses one field's DOM node for another. The only
 *    conditional field here is the background, and it is last.
 *
 * The category is a `select` in BOTH hosts by declaring `widget:
 * 'actions_select'`: `getWidgetByName` outranks `getWidgetByChoices` in
 * `Field.tsx`, and the `choices` lane is registered by the Blicca wrapper
 * only — a field leaning on `choices` alone would degrade to a single-line
 * text input in Aurora proper.
 */
import { getStyleFieldDefinitionsFromRegistry } from '@plone/helpers';

import { CATEGORIES, DEFAULT_CATEGORY } from './data';

export const ACTIONS_BLOCK_TYPE = 'actions';

const BACKGROUND_FIELD_NAME = 'backgroundColor';

/**
 * Backgrounds are the host's palette, not ours — `backgroundField` returns
 * `null` where the host registers none, so the control is absent in Aurora
 * proper BY MECHANISM rather than by a flag we maintain.
 */
function backgroundField(data: Record<string, unknown>) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: ACTIONS_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME,
  }) as Array<{ name?: unknown; label?: unknown }>;
  const choices = definitions
    .filter((definition) => typeof definition?.name === 'string')
    .map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: 'Background',
    choices,
    ...(choices.some(([name]) => name === 'none') ? { default: 'none' } : {}),
    styleField: true,
  };
}

export function ActionsSchema({
  formData = {},
}: { formData?: Record<string, unknown> } = {}) {
  const background = backgroundField(formData);

  return {
    title: 'Actions',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['category', 'title'],
      },
      {
        id: 'styling',
        title: 'Styling',
        fields: ['blockWidth', ...(background ? [BACKGROUND_FIELD_NAME] : [])],
      },
    ],
    properties: {
      category: {
        title: 'Actions',
        description: 'Which of the site’s action categories to list.',
        widget: 'actions_select',
        choices: CATEGORIES.map(([id, label]) => [id, label]),
        // NOT a storage guarantee — both renderers fall back to it themselves.
        default: DEFAULT_CATEGORY,
      },
      title: {
        title: 'Heading',
        description: 'Optional heading above the list.',
      },
      blockWidth: {
        title: 'Block width',
        widget: 'width',
        default: 'default',
        styleField: true,
      },
      ...(background ? { [BACKGROUND_FIELD_NAME]: background } : {}),
    },
    required: [],
  };
}

export default ActionsSchema;
