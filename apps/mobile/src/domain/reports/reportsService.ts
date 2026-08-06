import * as api from './reportsApi';
import { toRelatorio } from './reportsAdapter';
import type { PeriodoRelatorio, Relatorio } from './reportsTypes';

export async function obterRelatorio(
  tenantId: string,
  periodo: PeriodoRelatorio,
): Promise<Relatorio | null> {
  const raw = await api.buscarRelatorio(tenantId, periodo);
  // Plano sem o módulo `reports` simplesmente não tem relatório — a tela nem é
  // alcançável. Devolver `null` em vez de lançar mantém o useCase simples.
  return raw ? toRelatorio(raw, periodo) : null;
}
