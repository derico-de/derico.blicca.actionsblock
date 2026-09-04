/**
 * The Actions block's Aurora half — the npm entry point (`exports: "."`) and
 * the bundle entry the Vite lib build compiles into the Python package's
 * `static/actions-block.js`. One record, one bundle, one `install()`.
 *
 * One record per bundle is not tidiness: `loadBlockAddons` calls
 * `install(config)` per REGISTRY RECORD with no dedupe, so a shared bundle
 * registering several blocks would let one record's install re-register a
 * block another record had disabled (block add-on contract §1.3).
 *
 * Deliberately absent: `defaultBlockWidth`. The schema offers `blockWidth`
 * instead, and contract §1.4 makes declaring both a contradiction.
 */
import ActionsEdit from './actions/ActionsEdit';
import ActionsIcon from './actions/ActionsIcon';
import ActionsView from './actions/ActionsView';
import ActionsSchema, { ACTIONS_BLOCK_TYPE } from './actions/schema';
import { registerActionsWidgets } from './widgets';
import './styles.css';

/**
 * `@type: actions`. Aurora ships no block of that name, so registration
 * (last-wins by weight) replaces nothing.
 *
 * SILENT-DROP GATE: an entry missing a well-formed `id` or `title` vanishes
 * from the slash menu with no error, and an `icon` given as a string breaks
 * the menu outright. Check those three first if the block "doesn't appear".
 */
export const ActionsBlockInfo = {
  id: ACTIONS_BLOCK_TYPE,
  title: 'Actions',
  edit: ActionsEdit,
  view: ActionsView,
  blockSchema: ActionsSchema,
  icon: ActionsIcon,
  category: 'actions',
};

// The loader convention (block add-on contract §1): default-export an
// install function that registers the block and RETURNS the config.
export default function install(config: any) {
  // Before the block entry, so a host that reads the registry the moment a
  // block appears finds the widget its schema names already present.
  registerActionsWidgets(config);
  config.blocks.blocksConfig[ACTIONS_BLOCK_TYPE] = ActionsBlockInfo;
  return config;
}

export { ACTIONS_BLOCK_TYPE, ActionsEdit, ActionsIcon, ActionsSchema, ActionsView };
