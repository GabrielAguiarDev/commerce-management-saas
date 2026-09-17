/** MODELO DE DOMÍNIO dos custos. */

export type CostType = 'fixed' | 'variable';

export interface Cost {
  id: string;
  name: string;
  amountCents: number;
  type: CostType;
  /** "Fixo · todo mês" / "Fixo" / "Variável" — rótulo pronto para o chip. */
  typeLabel: string;
  quando: string;
  /** Pertence a uma série mensal (ativa ou já encerrada). */
  recurring: boolean;
  /** A série ainda lança este custo todo mês. */
  repeating: boolean;
  /** "09/2026": o mês que este lançamento da série representa. */
  competenceLabel: string | null;
  /** Custo gerado automaticamente por uma entrada de estoque. */
  fromStock: boolean;
  /** `YYYY-MM-DD`. */
  costDate: string;
  category: string | null;
}

/** O que a tela de edição deixa mudar. */
export interface CostChanges {
  name: string;
  amountCents: number;
  type: CostType;
  recurring: boolean;
}

export interface MonthlySummary {
  /** "Julho". */
  mes: string;
  /** "1 a 26". */
  period: string;
  entrouCentavos: number;
  saiuCentavos: number;
  sobrouCentavos: number;
}

export type CostFilter = 'all' | 'fixed_only' | 'variable_only';

export type CostErrorCode =
  | 'name_required'
  | 'invalid_amount'
  /** Custo de entrada de estoque: corrige-se pelo estoque, não aqui. */
  | 'from_stock'
  | 'not_found'
  | 'forbidden'
  | 'invalid_data'
  | 'network';

export class CostError extends Error {
  constructor(readonly code: CostErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CustoError';
  }
}
