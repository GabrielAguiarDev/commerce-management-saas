import { lerCentavos } from '@utils/dinheiro';

import type { CashAdjustmentAPI, CashHistoryAPI, CashShiftAPI } from './cashApiTypes';
import type {
  DiferencaDeFechamento,
  LinhaDeConferencia,
  TipoDeAjuste,
  TurnoAberto,
  TurnoEncerrado,
} from './cashTypes';

function horaLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** O rótulo que o dono usa para "dinheiro vivo" no turno. */
export const FORMA_DINHEIRO = 'Dinheiro';

export function toTurnoAberto(raw: CashShiftAPI): TurnoAberto {
  const recebimentos = raw.method_totals.map((m) => ({
    forma: m.method,
    valorCentavos: m.amount_cents,
  }));

  return {
    id: raw.id,
    abertoEm: horaLocal(raw.opened_at),
    aberturaCentavos: raw.opening_cents,
    gavetaCentavos: raw.drawer_cents,
    vendasEmDinheiroCentavos:
      recebimentos.find((r) => r.forma === FORMA_DINHEIRO)?.valorCentavos ?? 0,
    recebimentos,
  };
}

export function toTurnoEncerrado(raw: CashHistoryAPI): TurnoEncerrado {
  return {
    id: raw.id,
    dataRotulo: raw.date_label,
    periodoRotulo: raw.period_label,
    totalCentavos: raw.total_cents,
    diferencaCentavos: raw.difference_cents ?? 0,
  };
}

export function toAjustePayload(
  turnoId: string,
  tipo: TipoDeAjuste,
  valorCentavos: number,
  motivo: string,
): CashAdjustmentAPI {
  return {
    shift_id: turnoId,
    kind: tipo === 'sangria' ? 'withdrawal' : 'deposit',
    amount_cents: valorCentavos,
    reason: motivo.trim() || null,
  };
}

/**
 * As linhas que o dono confere ao fechar o caixa.
 *
 * NÃO é a lista de formas de pagamento: os dois cartões (débito e crédito)
 * viram UMA linha "Cartão", porque a maquininha entrega um extrato só e é
 * assim que ele confere na prática. E "Dinheiro" não é a venda em dinheiro, é
 * a GAVETA — inclui o troco de abertura e os ajustes de sangria/reforço.
 *
 * Função pura: dado o turno, produz sempre a mesma conferência.
 */
export function linhasDeConferencia(turno: TurnoAberto): LinhaDeConferencia[] {
  const porForma = new Map(turno.recebimentos.map((r) => [r.forma, r.valorCentavos]));

  const cartao = turno.recebimentos
    .filter((r) => r.forma.toLowerCase().startsWith('cartão'))
    .reduce((s, r) => s + r.valorCentavos, 0);

  const linhas: LinhaDeConferencia[] = [
    { forma: FORMA_DINHEIRO, esperadoCentavos: turno.gavetaCentavos },
  ];

  const pix = porForma.get('Pix');
  if (pix !== undefined) linhas.push({ forma: 'Pix', esperadoCentavos: pix });
  if (cartao > 0) linhas.push({ forma: 'Cartão', esperadoCentavos: cartao });

  return linhas;
}

/**
 * A DIFERENÇA DO FECHAMENTO, em tempo real.
 *
 * Soma, para cada linha PREENCHIDA, `conferido − esperado`. Linha em branco é
 * ignorada — e não conta como zero. Se contasse, abrir a gaveta e digitar só o
 * dinheiro acusaria uma falta gigante de Pix e cartão, assustando o dono no
 * meio do fechamento. É o comportamento do protótipo (`difValor`, linha 1139)
 * e é o correto.
 *
 * Enquanto nenhuma linha foi preenchida, `informado` é `false` e a tela mostra
 * R$ 0,00 neutro em vez de um saldo negativo do total do turno.
 */
export function calcularDiferenca(
  linhas: readonly LinhaDeConferencia[],
  conferido: Readonly<Record<string, string>>,
): DiferencaDeFechamento {
  let diferenca = 0;
  let informado = false;

  for (const linha of linhas) {
    const digitado = conferido[linha.forma];
    if (digitado === undefined || digitado.trim() === '') continue;
    informado = true;
    diferenca += (lerCentavos(digitado) ?? 0) - linha.esperadoCentavos;
  }

  return { informado, diferencaCentavos: informado ? diferenca : 0 };
}

/** Rótulo da diferença no histórico: "sem diferença" / "faltou X" / "sobrou X". */
export function rotularDiferenca(
  centavos: number,
  formatar: (c: number) => string,
): { texto: string; tom: 'neutro' | 'atencao' } {
  if (centavos === 0) return { texto: 'sem diferença', tom: 'neutro' };
  if (centavos < 0) return { texto: `faltou ${formatar(-centavos)}`, tom: 'atencao' };
  return { texto: `sobrou ${formatar(centavos)}`, tom: 'atencao' };
}
