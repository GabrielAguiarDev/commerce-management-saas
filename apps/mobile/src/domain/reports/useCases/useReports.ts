import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../reportsService';
import { resolveRange, type DateRange } from '../reportsPeriod';
import type { ReportPeriod } from '../reportsTypes';

export const reportsKeys = {
  all: ['reports'] as const,
  /**
   * As DATAS entram na chave, não só o chip: dois Personalizados diferentes
   * são duas consultas, e "Este mês" vira outra chave quando o mês vira.
   */
  porPeriodo: (tenantId: string, period: ReportPeriod, range: DateRange) =>
    [...reportsKeys.all, tenantId, period, range.from, range.to] as const,
};

/** `custom` só vale para o período Personalizado; os outros resolvem sozinhos. */
export function useReports(period: ReportPeriod, custom: DateRange | null = null) {
  const tenantId = useSessionStore((s) => s.tenantId);
  const range = resolveRange(period, custom);

  return useQuery({
    queryKey: reportsKeys.porPeriodo(tenantId ?? 'sem-tenant', period, range),
    queryFn: () => service.getReport(tenantId as string, period, range),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
    // Mantém o relatório anterior visível ao trocar de período, em vez de
    // piscar um esqueleto vazio a cada toque de chip.
    placeholderData: (anterior) => anterior,
  });
}
