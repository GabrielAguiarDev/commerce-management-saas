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

export function EyeIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1.8 9S4.4 3.9 9 3.9 16.2 9 16.2 9 13.6 14.1 9 14.1 1.8 9 1.8 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EyeOffIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M7.2 4.1A7 7 0 0 1 9 3.9c4.6 0 7.2 5.1 7.2 5.1a12.4 12.4 0 0 1-1.9 2.6M11.3 11.2a3.2 3.2 0 0 1-4.5-4.5M4.7 5.3C2.8 6.6 1.8 9 1.8 9s2.6 5.1 7.2 5.1a6.8 6.8 0 0 0 3.7-1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m2.5 2.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
