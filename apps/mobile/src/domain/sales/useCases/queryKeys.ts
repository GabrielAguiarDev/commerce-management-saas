/**
 * As chaves de cache do domínio de vendas, num arquivo sem hooks.
 *
 * Separadas porque os DOIS useCases precisam das DUAS famílias: fechar uma
 * venda mexe na fila, e sincronizar a fila mexe no faturamento do dia. Se cada
 * arquivo guardasse as suas, um teria de importar o outro — e os dois se
 * importariam em círculo.
 */

export const salesKeys = {
  all: ['vendas'] as const,
  doDia: (tenantId: string) => [...salesKeys.all, 'do-dia', tenantId] as const,
  summary: (tenantId: string) => [...salesKeys.all, 'resumo', tenantId] as const,
  /** O histórico paginado. Fica sob `all` para um estorno invalidar tudo junto. */
  history: (tenantId: string) => [...salesKeys.all, 'historico', tenantId] as const,
  /** O agregado do recorte (contagem e faturamento), por filtro. */
  totals: (tenantId: string) => [...salesKeys.all, 'totais', tenantId] as const,
  /** Uma venda específica — a tela de detalhe. */
  detail: (saleId: string) => [...salesKeys.all, 'detalhe', saleId] as const,
};

export const pendingSalesKeys = {
  all: ['vendas-pendentes'] as const,
  queue: (tenantId: string) => [...pendingSalesKeys.all, tenantId] as const,
};
