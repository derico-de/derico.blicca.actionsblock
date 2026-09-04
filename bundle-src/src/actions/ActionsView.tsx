/**
 * The Actions block's markup — and in Aurora proper, its PUBLIC rendering.
 * `view` is the block's other renderer, and the Chameleon template in
 * `views/actions_block_view.pt` must emit the same anatomy element for
 * element, because ONE scope-wrapped stylesheet dresses both surfaces.
 *
 * - **The root is our own `<nav class="actions-block">`**, never the host's
 *   `.block-actions` wrapper stamp: the wrapper is the host's and this block
 *   has two hosts. It is emitted ALWAYS, with the EFFECTIVE category and its
 *   label, so a node with nothing to show is exactly one element.
 * - **Every element inside is conditional on its own content**, and the
 *   list is never emitted empty.
 * - **It reads only `data`** — the stored `category` and `title`, and the
 *   `catalog` the server injected. No registry, no fetch: that is what makes
 *   it portable across hosts and honest under server rendering.
 *
 * NO WHITESPACE-ONLY TEXT NODES. The Plate editable computes
 * `white-space: pre-wrap`, which inherits in and turns every newline between
 * two elements into a real line box. JSX drops inter-element whitespace, so
 * this file is safe by construction; the template strips its indentation.
 */
import {
  categoryLabel,
  effectiveCategory,
  entries,
  title,
  type ActionsData,
} from './data';

export type ActionsViewProps = {
  data?: ActionsData;
  /**
   * Set by `edit`. It suppresses `href` on every anchor and nothing else: a
   * live `href` in the canvas navigates away from unsaved work. Dropping the
   * attribute leaves an `<a>` that is neither focusable nor clickable while
   * keeping the element, its tag and its classes identical — so the
   * stylesheet must never select on `[href]`.
   */
  isEditMode?: boolean;
};

export function ActionsView({ data = {}, isEditMode }: ActionsViewProps) {
  const category = effectiveCategory(data);
  const heading = title(data);
  const rows = entries(data);

  return (
    <nav
      className={`actions-block has--category--${category}`}
      aria-label={categoryLabel(category)}
    >
      {heading ? <h2 className="actions-title">{heading}</h2> : null}
      {rows.length ? (
        <ul className="actions-list">
          {rows.map((row, index) => (
            <li key={`${row.id}:${index}`} className={row.css}>
              <a className="actions-link" {...(isEditMode ? {} : { href: row.href })}>
                {row.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}

export default ActionsView;
