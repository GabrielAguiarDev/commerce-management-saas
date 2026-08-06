/** MODELO DE DOMÍNIO dos custos. */

export type CostType = 'fixed' | 'variable';

export interface Cost {
  id: string;
  name: string;
  amountCents: number;
  type: CostType;
  /** "Fixo · todo mês" / "Variável" — rótulo pronto para o chip. */
  typeLabel: string;
  quando: string;
  /** Custo gerado automaticamente por uma entrada de estoque. */
  fromStock: boolean;
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

export type CostErrorCode = 'name_required' | 'invalid_amount' | 'network';

export class CostError extends Error {
  constructor(readonly code: CostErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CustoError';
  }
}
