import type { CostAPI, CostCreateAPI, MonthSummaryAPI } from './costsApiTypes';
import type { Custo, FiltroCusto, ResumoDoMes, TipoDeCusto } from './costsTypes';

function toTipo(kind: string): TipoDeCusto {
  // Qualquer valor desconhecido cai em variável: um custo classificado errado
  // ainda aparece na lista; um custo descartado por enum novo some sem aviso.
  return kind === 'fixed' ? 'fixo' : 'variavel';
}

export function toCusto(raw: CostAPI): Custo {
  const tipo = toTipo(raw.kind);
  return {
    id: raw.id,
    nome: raw.name,
    valorCentavos: raw.amount_cents ?? 0,
    tipo,
    rotuloTipo: tipo === 'fixo' ? 'Fixo · todo mês' : 'Variável',
    quando: raw.due_label ?? '—',
    veioDoEstoque: raw.from_stock === true,
  };
}

/**
 * `MonthSummaryAPI` → `ResumoDoMes`.
 *
 * "Sobrou" é DERIVADO (entrou − saiu), não lido do servidor. Se viesse pronto,
 * existiriam duas contas para o mesmo número e um dia elas discordariam na
 * tela — que é exatamente o tipo de erro que destrói a confiança do dono nos
 * próprios relatórios.
 */
export function toResumoDoMes(raw: MonthSummaryAPI): ResumoDoMes {
  const entrou = raw.income_cents ?? 0;
  const saiu = raw.expense_cents ?? 0;
  return {
    mes: raw.month_label,
    periodo: raw.range_label,
    entrouCentavos: entrou,
    saiuCentavos: saiu,
    sobrouCentavos: entrou - saiu,
  };
}

export function toCustoPayload(tenantId: string, nome: string, valorCentavos: number): CostCreateAPI {
  return { tenant_id: tenantId, name: nome.trim(), amount_cents: valorCentavos, kind: 'variable' };
}

/** Seletor puro dos chips Todos / Fixos / Variáveis. */
export function filtrarCustos(custos: Custo[], filtro: FiltroCusto): Custo[] {
  if (filtro === 'todos') return custos;
  const alvo: TipoDeCusto = filtro === 'fixos' ? 'fixo' : 'variavel';
  return custos.filter((c) => c.tipo === alvo);
}
