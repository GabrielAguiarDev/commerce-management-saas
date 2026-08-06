import { useQuery } from '@tanstack/react-query';

import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../reportsService';
import type { PeriodoRelatorio } from '../reportsTypes';

export const relatoriosKeys = {
  all: ['relatorios'] as const,
  /** O período entra na chave: trocar de chip é outra consulta, não refetch. */
  porPeriodo: (tenantId: string, periodo: PeriodoRelatorio) =>
    [...relatoriosKeys.all, tenantId, periodo] as const,
};

export function useRelatorio(periodo: PeriodoRelatorio) {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: relatoriosKeys.porPeriodo(tenantId ?? 'sem-tenant', periodo),
    queryFn: () => service.obterRelatorio(tenantId as string, periodo),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
    // Mantém o relatório anterior visível ao trocar de período, em vez de
    // piscar um esqueleto vazio a cada toque de chip.
    placeholderData: (anterior) => anterior,
  });
}
