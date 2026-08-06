import { toAjustePayload, toTurnoAberto, toTurnoEncerrado } from './cashAdapter';
import * as api from './cashApi';
import {
  CaixaError,
  type TipoDeAjuste,
  type TurnoAberto,
  type TurnoEncerrado,
} from './cashTypes';

/** AS REGRAS do caixa. */

function normalizar(erro: unknown): never {
  if (erro instanceof CaixaError) throw erro;
  throw new CaixaError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function obterTurnoAberto(tenantId: string): Promise<TurnoAberto | null> {
  try {
    const raw = await api.buscarTurnoAberto(tenantId);
    // Caixa fechado é um estado legítimo da tela, não um erro.
    return raw ? toTurnoAberto(raw) : null;
  } catch (e) {
    return normalizar(e);
  }
}

export async function obterHistorico(tenantId: string): Promise<TurnoEncerrado[]> {
  try {
    return (await api.listarHistorico(tenantId)).map(toTurnoEncerrado);
  } catch (e) {
    return normalizar(e);
  }
}

/** Abertura padrão do troco quando o dono só toca "Abrir caixa". */
export const ABERTURA_PADRAO_CENTAVOS = 15000;

export async function abrirCaixa(
  tenantId: string,
  aberturaCentavos = ABERTURA_PADRAO_CENTAVOS,
): Promise<TurnoAberto> {
  if (aberturaCentavos < 0) throw new CaixaError('valor_invalido');
  try {
    return toTurnoAberto(await api.abrirTurno(tenantId, aberturaCentavos));
  } catch (e) {
    return normalizar(e);
  }
}

/**
 * Sangria / reforço.
 *
 * Valor precisa ser positivo: o SINAL é decidido pelo tipo do ajuste, não pelo
 * que o dono digitou. Deixar "-50" numa sangria viraria um reforço silencioso.
 */
export async function registrarAjuste(
  tenantId: string,
  turnoId: string,
  tipo: TipoDeAjuste,
  valorCentavos: number,
  motivo: string,
): Promise<TurnoAberto> {
  if (valorCentavos <= 0) throw new CaixaError('valor_invalido');

  try {
    const raw = await api.registrarAjuste(
      tenantId,
      toAjustePayload(turnoId, tipo, valorCentavos, motivo),
    );
    if (!raw) throw new CaixaError('caixa_fechado');
    return toTurnoAberto(raw);
  } catch (e) {
    return normalizar(e);
  }
}

export async function fecharCaixa(
  tenantId: string,
  diferencaCentavos: number,
): Promise<TurnoEncerrado> {
  try {
    const raw = await api.fecharTurno(tenantId, diferencaCentavos);
    if (!raw) throw new CaixaError('caixa_fechado');
    return toTurnoEncerrado(raw);
  } catch (e) {
    return normalizar(e);
  }
}
