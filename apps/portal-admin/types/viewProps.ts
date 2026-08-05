import type { AdminActions, AdminOptions, AdminState, Customer } from "./types";

/** What every view needs — the shape `useAdmin()` hands back. */
export interface ViewProps {
  s: AdminState;
  a: AdminActions;
  /** Customers after the empty-state switch — empty when previewing empties. */
  cs: Customer[];
  empty: boolean;
  options: AdminOptions;
}
