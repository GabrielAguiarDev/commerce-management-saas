import * as api from './reportsApi';
import { toReport } from './reportsAdapter';
import type { DateRange } from './reportsPeriod';
import type { ReportPeriod, Report } from './reportsTypes';

export async function getReport(
  tenantId: string,
  period: ReportPeriod,
  range: DateRange,
): Promise<Report | null> {
  const raw = await api.fetchReport(tenantId, range);
  // Plano sem o módulo `reports` simplesmente não tem relatório — a tela nem é
  // alcançável. Devolver `null` em vez de lançar mantém o useCase simples.
  return raw ? toReport(raw, period, range) : null;
}
