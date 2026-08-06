import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../reportsService';
import type { ReportPeriod } from '../reportsTypes';

export const reportsKeys = {
  all: ['reports'] as const,
  /** O período entra na chave: trocar de chip é outra consulta, não refetch. */
  porPeriodo: (tenantId: string, period: ReportPeriod) =>
    [...reportsKeys.all, tenantId, period] as const,
};

export function useReports(period: ReportPeriod) {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: reportsKeys.porPeriodo(tenantId ?? 'sem-tenant', period),
    queryFn: () => service.getReport(tenantId as string, period),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
    // Mantém o relatório anterior visível ao trocar de período, em vez de
    // piscar um esqueleto vazio a cada toque de chip.
    placeholderData: (anterior) => anterior,
  });
}
