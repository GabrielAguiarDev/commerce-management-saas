import { formatarBRL } from '@utils/dinheiro';

import type { CashHistoryAPI, CashShiftAPI } from '../cashApiTypes';
import {
  calcularDiferenca,
  linhasDeConferencia,
  rotularDiferenca,
  toTurnoAberto,
  toTurnoEncerrado,
} from '../cashAdapter';

const TURNO_API: CashShiftAPI = {
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

const turno = toTurnoAberto(TURNO_API);

describe('toTurnoAberto', () => {
  it('extrai as vendas em dinheiro dos totais por forma', () => {
    expect(turno.vendasEmDinheiroCentavos).toBe(59250);
  });

  it('mantém a gaveta separada das vendas em dinheiro (gaveta inclui abertura)', () => {
    expect(turno.gavetaCentavos).toBe(74250);
    expect(turno.aberturaCentavos).toBe(15000);
    expect(turno.gavetaCentavos).toBe(turno.aberturaCentavos + turno.vendasEmDinheiroCentavos);
  });

  it('não quebra quando não há linha de dinheiro', () => {
    const semDinheiro = toTurnoAberto({
      ...TURNO_API,
      method_totals: [{ method: 'Pix', amount_cents: 100 }],
    });
    expect(semDinheiro.vendasEmDinheiroCentavos).toBe(0);
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
    expect(toTurnoEncerrado(raw).diferencaCentavos).toBe(0);
  });
});

describe('linhasDeConferencia', () => {
  const linhas = linhasDeConferencia(turno);

  it('agrupa débito e crédito numa única linha "Cartão"', () => {
    expect(linhas.map((l) => l.forma)).toEqual(['Dinheiro', 'Pix', 'Cartão']);
    expect(linhas.find((l) => l.forma === 'Cartão')?.esperadoCentavos).toBe(21000 + 15390);
  });

  it('espera a GAVETA no dinheiro, não a venda em dinheiro', () => {
    expect(linhas.find((l) => l.forma === 'Dinheiro')?.esperadoCentavos).toBe(74250);
  });

  it('reproduz os esperados do protótipo (742,50 / 318,00 / 363,90)', () => {
    expect(linhas.map((l) => l.esperadoCentavos)).toEqual([74250, 31800, 36390]);
  });

  it('omite a linha de cartão quando o turno não recebeu cartão', () => {
    const soDinheiro = toTurnoAberto({
      ...TURNO_API,
      method_totals: [{ method: 'Dinheiro', amount_cents: 1000 }],
    });
    expect(linhasDeConferencia(soDinheiro).map((l) => l.forma)).toEqual(['Dinheiro']);
  });
});

describe('calcularDiferenca', () => {
  const linhas = linhasDeConferencia(turno);

  it('não informa nada enquanto nenhum campo foi preenchido', () => {
    expect(calcularDiferenca(linhas, {})).toEqual({ informado: false, diferencaCentavos: 0 });
    expect(calcularDiferenca(linhas, { Dinheiro: '', Pix: '   ' })).toEqual({
      informado: false,
      diferencaCentavos: 0,
    });
  });

  it('IGNORA linha em branco em vez de tratá-la como zero', () => {
    // Se branco valesse zero, conferir só o dinheiro acusaria falta de todo o
    // Pix e cartão e assustaria o dono no meio do fechamento.
    const r = calcularDiferenca(linhas, { Dinheiro: '742,50' });
    expect(r).toEqual({ informado: true, diferencaCentavos: 0 });
  });

  it('acusa a falta quando o conferido é menor', () => {
    const r = calcularDiferenca(linhas, { Dinheiro: '739,50' });
    expect(r.diferencaCentavos).toBe(-300);
  });

  it('acusa a sobra quando o conferido é maior', () => {
    const r = calcularDiferenca(linhas, { Dinheiro: '752,50' });
    expect(r.diferencaCentavos).toBe(1000);
  });

  it('soma as diferenças de todas as linhas preenchidas', () => {
    const r = calcularDiferenca(linhas, {
      Dinheiro: '740,00',
      Pix: '318,00',
      'Cartão': '365,00',
    });
    expect(r.diferencaCentavos).toBe(-250 + 0 + 110);
  });

  it('trata texto sem número como zero conferido, não como NaN', () => {
    const r = calcularDiferenca(linhas, { Dinheiro: 'abc' });
    expect(Number.isNaN(r.diferencaCentavos)).toBe(false);
    expect(r.diferencaCentavos).toBe(-74250);
  });

  it('aceita o formato brasileiro com milhar', () => {
    const r = calcularDiferenca([{ forma: 'Dinheiro', esperadoCentavos: 123456 }], {
      Dinheiro: 'R$ 1.234,56',
    });
    expect(r.diferencaCentavos).toBe(0);
  });
});

describe('rotularDiferenca', () => {
  it('diz "sem diferença" quando bate', () => {
    expect(rotularDiferenca(0, formatarBRL)).toEqual({ texto: 'sem diferença', tom: 'neutro' });
  });

  it('diz quanto faltou, em valor absoluto', () => {
    expect(rotularDiferenca(-300, formatarBRL)).toEqual({
      texto: 'faltou R$ 3,00',
      tom: 'atencao',
    });
  });

  it('diz quanto sobrou', () => {
    expect(rotularDiferenca(500, formatarBRL)).toEqual({
      texto: 'sobrou R$ 5,00',
      tom: 'atencao',
    });
  });
});
