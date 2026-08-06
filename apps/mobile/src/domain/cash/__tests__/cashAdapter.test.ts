import { formatBRL } from '@utils/money';

import type { CashHistoryAPI, CashShiftAPI } from '../cashApiTypes';
import {
  computeDifference,
  countRows,
  labelDifference,
  toOpenShift,
  toClosedShift,
} from '../cashAdapter';

const SHIFT_API: CashShiftAPI = {
  id: 'shf_hoje',
  tenant_id: 'tnt_1',
  opened_at: '2026-07-26T08:12:00.000-03:00',
  closed_at: null,
  opening_cents: 15000,
  drawer_cents: 74250,
  method_totals: [
    { method: 'Dinheiro', amount_cents: 59250 },
    { method: 'Pix', amount_cents: 31800 },
    { method: 'Cartão de débito', amount_cents: 21000 },
    { method: 'Cartão de crédito', amount_cents: 15390 },
  ],
};

const shift = toOpenShift(SHIFT_API);

describe('toTurnoAberto', () => {
  it('extrai as vendas em dinheiro dos totais por forma', () => {
    expect(shift.cashSalesCents).toBe(59250);
  });

  it('mantém a gaveta separada das vendas em dinheiro (gaveta inclui abertura)', () => {
    expect(shift.gavetaCentavos).toBe(74250);
    expect(shift.aberturaCentavos).toBe(15000);
    expect(shift.gavetaCentavos).toBe(shift.aberturaCentavos + shift.cashSalesCents);
  });

  it('não quebra quando não há linha de dinheiro', () => {
    const semDinheiro = toOpenShift({
      ...SHIFT_API,
      method_totals: [{ method: 'Pix', amount_cents: 100 }],
    });
    expect(semDinheiro.cashSalesCents).toBe(0);
  });
});

describe('toTurnoEncerrado', () => {
  it('resolve difference_cents nulo para zero', () => {
    const raw: CashHistoryAPI = {
      id: 'shf_23',
      date_label: 'Quarta, 23/07',
      period_label: '08:00 → 17:55',
      total_cents: 124000,
      difference_cents: null,
    };
    expect(toClosedShift(raw).diferencaCentavos).toBe(0);
  });
});

describe('linhasDeConferencia', () => {
  const rows = countRows(shift);

  it('agrupa débito e crédito numa única linha "Cartão"', () => {
    expect(rows.map((l) => l.method)).toEqual(['Dinheiro', 'Pix', 'Cartão']);
    expect(rows.find((l) => l.method === 'Cartão')?.esperadoCentavos).toBe(21000 + 15390);
  });

  it('espera a GAVETA no dinheiro, não a venda em dinheiro', () => {
    expect(rows.find((l) => l.method === 'Dinheiro')?.esperadoCentavos).toBe(74250);
  });

  it('reproduz os esperados do protótipo (742,50 / 318,00 / 363,90)', () => {
    expect(rows.map((l) => l.esperadoCentavos)).toEqual([74250, 31800, 36390]);
  });

  it('omite a linha de cartão quando o turno não recebeu cartão', () => {
    const soDinheiro = toOpenShift({
      ...SHIFT_API,
      method_totals: [{ method: 'Dinheiro', amount_cents: 1000 }],
    });
    expect(countRows(soDinheiro).map((l) => l.method)).toEqual(['Dinheiro']);
  });
});

describe('calcularDiferenca', () => {
  const rows = countRows(shift);

  it('não informa nada enquanto nenhum campo foi preenchido', () => {
    expect(computeDifference(rows, {})).toEqual({ informado: false, diferencaCentavos: 0 });
    expect(computeDifference(rows, { Dinheiro: '', Pix: '   ' })).toEqual({
      informado: false,
      diferencaCentavos: 0,
    });
  });

  it('IGNORA linha em branco em vez de tratá-la como zero', () => {
    // Se branco valesse zero, conferir só o dinheiro acusaria falta de todo o
    // Pix e cartão e assustaria o dono no meio do fechamento.
    const r = computeDifference(rows, { Dinheiro: '742,50' });
    expect(r).toEqual({ informado: true, diferencaCentavos: 0 });
  });

  it('acusa a falta quando o conferido é menor', () => {
    const r = computeDifference(rows, { Dinheiro: '739,50' });
    expect(r.diferencaCentavos).toBe(-300);
  });

  it('acusa a sobra quando o conferido é maior', () => {
    const r = computeDifference(rows, { Dinheiro: '752,50' });
    expect(r.diferencaCentavos).toBe(1000);
  });

  it('soma as diferenças de todas as linhas preenchidas', () => {
    const r = computeDifference(rows, {
      Dinheiro: '740,00',
      Pix: '318,00',
      'Cartão': '365,00',
    });
    expect(r.diferencaCentavos).toBe(-250 + 0 + 110);
  });

  it('trata texto sem número como zero conferido, não como NaN', () => {
    const r = computeDifference(rows, { Dinheiro: 'abc' });
    expect(Number.isNaN(r.diferencaCentavos)).toBe(false);
    expect(r.diferencaCentavos).toBe(-74250);
  });

  it('aceita o formato brasileiro com milhar', () => {
    const r = computeDifference([{ method: 'Dinheiro', esperadoCentavos: 123456 }], {
      Dinheiro: 'R$ 1.234,56',
    });
    expect(r.diferencaCentavos).toBe(0);
  });
});

describe('rotularDiferenca', () => {
  it('diz "sem diferença" quando bate', () => {
    expect(labelDifference(0, formatBRL)).toEqual({ text: 'sem diferença', tone: 'neutral' });
  });

  it('diz quanto faltou, em valor absoluto', () => {
    expect(labelDifference(-300, formatBRL)).toEqual({
      text: 'faltou R$ 3,00',
      tone: 'warning',
    });
  });

  it('diz quanto sobrou', () => {
    expect(labelDifference(500, formatBRL)).toEqual({
      text: 'sobrou R$ 5,00',
      tone: 'warning',
    });
  });
});
