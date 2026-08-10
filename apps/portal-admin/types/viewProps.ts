import type { AdminActions, AdminOptions, AdminState, Customer } from "./types";

/** What every view needs — the shape `useAdmin()` hands back. */
export interface ViewProps {
  s: AdminState;
  a: AdminActions;
  /** Customers after the empty-state switch — empty when previewing empties. */
  cs: Customer[];
  empty: boolean;
  options: AdminOptions;
  /**
   * A tela é estreita o bastante para o painel se desenhar como celular: a
   * barra lateral vira gaveta, as tabelas viram cartões e o diálogo vira folha.
   *
   * Vem daqui, e não de uma `@media`, porque o painel se veste com `style`
   * inline — não há folha de estilo onde uma consulta de mídia pudesse morar.
   * Derivado de `s.screenWidth`, medido em `AdminProvider`.
   */
  isMobile: boolean;
  isDesktop: boolean;
  /**
   * Largura intermediária: cabe mais que num celular, mas não a tabela larga do
   * Financeiro nem os dois painéis do Suporte lado a lado.
   */
  compact: boolean;
}
