/**
 * The `edit` half: the canvas is a live preview, never an editing surface.
 *
 * Every field is edited in the sidebar. The block is a Plate VOID node, and
 * what it shows is computed by the server, so there is nothing to type into.
 *
 * What the canvas adds is HONESTY, and it is the only reason this component
 * exists: the preview is drawn from whatever catalog the canvas has
 * (`useCatalog` — the server's, or a fetched one for a never-serialized
 * node), and every state in which the preview is not simply "what the
 * visitor gets" is announced, outside the block root and
 * `contentEditable={false}`:
 *
 *  - while the catalog is being fetched;
 *  - when nothing could be fetched, so the empty root is not a fact about
 *    the site but about the preview;
 *  - when the chosen category has no rows for THIS user here, so the block
 *    renders empty on purpose;
 *  - always, that the rows are the author's own — a visitor may get others.
 */
import { useCatalog } from './catalog-source';
import { categoryLabel, effectiveCategory, entries, type ActionsData } from './data';
import ActionsView from './ActionsView';

export type ActionsEditProps = {
  data?: ActionsData;
};

export function ActionsEdit(props: ActionsEditProps) {
  const data = props.data ?? {};
  const { catalog, state } = useCatalog(data);
  const preview: ActionsData = catalog ? { ...data, catalog } : data;
  const label = categoryLabel(effectiveCategory(preview)).toLowerCase();
  const rows = entries(preview);

  const notes: string[] = [];
  if (state === 'loading') {
    notes.push('Loading the actions for this page…');
  } else if (state === 'failed') {
    notes.push(
      'The actions could not be loaded for the preview. Save and reload the page to see them.',
    );
  } else if (!rows.length) {
    notes.push(`No ${label} are available to you here, so the block renders empty.`);
  }

  return (
    <>
      <ActionsView data={preview} isEditMode />
      {notes.map((note) => (
        <p key={note} className="actions-notice" contentEditable={false}>
          {note}
        </p>
      ))}
    </>
  );
}

export default ActionsEdit;
