/**
 * The slash-menu icon: a short list of links.
 *
 * A React component, NEVER a string — the menu renders `<Icon />` and a
 * string breaks it. `currentColor` throughout, so the menu's own palette
 * drives it.
 */
export function ActionsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="17" r="1" fill="currentColor" />
      <path d="M9 7h10" />
      <path d="M9 12h7" />
      <path d="M9 17h9" />
    </svg>
  );
}

export default ActionsIcon;
