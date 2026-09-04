/**
 * The Actions block's one sidebar widget and its registration.
 *
 * The key is **namespaced**. `registerWidget` writes into one global
 * last-wins map, so a block claiming a generic key (`select`, `choices`)
 * changes every other block's fields in the host. `key: 'widget'` puts it
 * where `Field.tsx`'s `getWidgetByName` looks — the lane a schema selects
 * with `widget: 'actions_select'`.
 */
import { ActionsSelectWidget } from './SelectWidget';

export { ActionsSelectWidget } from './SelectWidget';

type WidgetRegistrar = {
  registerWidget: (options: { key: string; definition: unknown }) => void;
};

/** Schema `widget:` value → component. */
export const ACTIONS_WIDGETS = {
  actions_select: ActionsSelectWidget,
} as const;

/**
 * Registered from `install()`, against the config the loader hands us —
 * never the imported singleton — so a host that composes more than one
 * registry gets its widgets on the one it is building.
 */
export function registerActionsWidgets<T extends WidgetRegistrar>(config: T): T {
  config.registerWidget({ key: 'widget', definition: { ...ACTIONS_WIDGETS } });
  return config;
}
