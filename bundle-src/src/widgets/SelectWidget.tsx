/**
 * `actions_select` — a `<select>` over a schema property's `choices`.
 *
 * `Field.tsx` does have a choices lane (`getWidgetByChoices` →
 * `config.widgets.choices`), but **only the Blicca wrapper registers that
 * slot**; upstream leaves it empty, so a actions field relying on `choices`
 * alone would render a select in `@@aurora-edit` and a bare text input in
 * Aurora proper — the exact silent degradation ticket 02 asked this package
 * to design against. Declaring `widget: 'actions_select'` sidesteps it:
 * `getWidgetByName` sits *above* `getWidgetByChoices` in the resolution
 * chain, so the same field resolves to this widget in both hosts.
 *
 * `BliccaChoicesWidget` is the reference implementation and this is its
 * shape, with three deliberate changes:
 *
 *   1. The label is associated for real. The reference uses
 *      `htmlFor={props.id}`, and the block sidebar never passes `id` — see
 *      `field-shell.tsx`.
 *   2. With nothing stored, the control shows the schema's `default` rather
 *      than the first choice. The Actions seeds nothing at insert time (ticket
 *      03 Q5) and both renderers fall back to `button` themselves, so
 *      showing `default` is what the author will actually get. Displaying it
 *      is **not** storing it: no `onChange` fires on mount.
 *   3. A stored value outside `choices` keeps its own option instead of
 *      vanishing. A controlled select with an unmatched value renders as if
 *      nothing were selected, which would show `Button` over storage that
 *      says otherwise.
 *
 * Controlled, unlike `actions_textarea`: a select has no caret to lose, and
 * reflecting stored state is worth more here than insulation from the
 * round trip.
 */
import { FieldShell, controlClass, type FieldShellProps } from './field-shell';

export type ActionsSelectWidgetProps = FieldShellProps & {
  name?: string;
  /** `[value, label]` pairs, spread from the schema property. */
  choices?: Array<[string, string]>;
  defaultValue?: unknown;
  value?: unknown;
  /** The schema's `default` key — a display fallback, never a stored value. */
  default?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

export function ActionsSelectWidget(props: ActionsSelectWidgetProps) {
  const { label, description, className, choices = [], onChange } = props;

  const stored = asText(props.value ?? props.defaultValue);
  const current = stored || asText(props.default);
  const known = choices.some(([value]) => value === current);

  return (
    <FieldShell
      blockClass="actions-select-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <select
          id={controlId}
          name={props.name}
          required={props.required}
          value={current}
          onChange={(event) => onChange?.(event.target.value)}
          className={controlClass}
        >
          {/* Nothing stored and no default: an explicit empty row, so the
              control does not claim the first choice is selected. */}
          {current === '' ? <option value="" /> : null}
          {/* See change 3 in the module docstring. */}
          {current !== '' && !known ? (
            <option value={current}>{current}</option>
          ) : null}
          {choices.map(([value, choiceLabel]) => (
            <option key={value} value={value}>
              {choiceLabel}
            </option>
          ))}
        </select>
      )}
    />
  );
}

export default ActionsSelectWidget;
