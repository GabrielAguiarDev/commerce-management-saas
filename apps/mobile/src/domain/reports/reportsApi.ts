import { REPORTS_API } from '@data/reports';
import { delay } from '@services/mockLatency';

import type { ReportAPI } from './reportsApiTypes';

/**
 * FRONTEIRA DE REDE dos relatórios.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 *
 * `periodo` já entra na assinatura, mesmo o mock ignorando: é o parâmetro que
 * a consulta real vai precisar, e deixá-lo de fora agora significaria mexer em
 * useCase e tela depois.
 */
export async function fetchReport(
  tenantId: string,
  period: string,
): Promise<ReportAPI | null> {
  await delay(280);
  const base = REPORTS_API[tenantId];
  return base ? { ...base, period: period } : null;
}
