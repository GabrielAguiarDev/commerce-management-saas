import type { AdminActions, AdminOpcoes, AdminState, Cliente } from "./types";

/** What every view needs — the shape `useAdmin()` hands back. */
export interface ViewProps {
  s: AdminState;
  a: AdminActions;
  /** Customers after the empty-state switch — empty when previewing empties. */
  cs: Cliente[];
  vazio: boolean;
  opts: AdminOpcoes;
}
