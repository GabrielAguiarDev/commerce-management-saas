import { RELATORIOS_API } from '@data/relatorios';
import { esperar } from '@services/mockLatency';

import type { ReportAPI } from './reportsApiTypes';

/**
 * FRONTEIRA DE REDE dos relatórios.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 *
 * `periodo` já entra na assinatura, mesmo o mock ignorando: é o parâmetro que
 * a consulta real vai precisar, e deixá-lo de fora agora significaria mexer em
 * useCase e tela depois.
 */
export async function buscarRelatorio(
  tenantId: string,
  periodo: string,
): Promise<ReportAPI | null> {
  await esperar(280);
  const base = RELATORIOS_API[tenantId];
  return base ? { ...base, period: periodo } : null;
}
