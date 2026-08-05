/**
 * The few icons that belong to this library's components rather than to a
 * screen.
 *
 * They all draw in `currentColor` and take their size from a prop, so they
 * follow the light/dark theme on their own, with no second copy of the artwork.
 * Navigation and module icons stay in each app, because they speak that
 * product's vocabulary.
 */

export interface IconProps {
  size?: number;
}

export function ChevronDownIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4.5 7 9 11.5 13.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m12 12 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="m5 5 8 8M13 5l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
