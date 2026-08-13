import {
  daysAgoDateOnly,
  daysSince,
  formatDayInput,
  maskDayInput,
  parseDayInput,
  toDateOnly,
  todayDateOnly,
} from '../dates';

/**
 * As réguas de tempo das consultas.
 *
 * Um recorte de data errado não quebra o app — ele mostra o número errado com
 * toda a confiança do mundo. Por isso estes testes existem: são o único aviso
 * de que "vendas de hoje" deixou de significar hoje.
 */

describe('toDateOnly', () => {
  it('usa o fuso LOCAL, não UTC', () => {
    // 6 de agosto às 21h no Brasil (UTC−3) já é dia 7 em UTC. Se a conversão
    // passasse por `toISOString().slice(0, 10)`, um custo lançado à noite
    // cairia no dia seguinte e sumiria do fechamento do mês certo.
    const lateNight = new Date(2026, 7, 6, 21, 30, 0);
    expect(toDateOnly(lateNight)).toBe('2026-08-06');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(toDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('vira o ano corretamente', () => {
    expect(toDateOnly(new Date(2026, 11, 31, 23, 0))).toBe('2026-12-31');
  });
});

describe('daysAgoDateOnly', () => {
  it('0 dias atrás é hoje', () => {
    expect(daysAgoDateOnly(0)).toBe(todayDateOnly());
  });

  it('anda para trás no calendário, atravessando o mês', () => {
    const seteDiasAtras = daysAgoDateOnly(7);
    expect(seteDiasAtras).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(seteDiasAtras < todayDateOnly()).toBe(true);
  });
});

describe('daysSince', () => {
  it('hoje é 0', () => {
    expect(daysSince(new Date().toISOString())).toBe(0);
  });

  it('ontem é 1', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(daysSince(ontem.toISOString())).toBe(1);
  });

  it('data futura não vira negativo', () => {
    // Relógio do aparelho adiantado em relação ao servidor é comum. "Há −2
    // dias" na tela seria pior do que "hoje".
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 2);
    expect(daysSince(amanha.toISOString())).toBe(0);
  });

  it('data inválida vira 0 em vez de NaN', () => {
    expect(daysSince('ontem à tarde')).toBe(0);
  });
});

describe('maskDayInput', () => {
  it('insere as barras conforme digita', () => {
    expect(maskDayInput('1')).toBe('1');
    expect(maskDayInput('13')).toBe('13');
    expect(maskDayInput('1308')).toBe('13/08');
    expect(maskDayInput('13082026')).toBe('13/08/2026');
  });

  it('descarta o que não é dígito e não passa de 8', () => {
    expect(maskDayInput('13/08/2026')).toBe('13/08/2026');
    expect(maskDayInput('13a08b2026999')).toBe('13/08/2026');
  });

  it('apagar até o fim não deixa barra órfã', () => {
    expect(maskDayInput('13/0')).toBe('13/0');
    expect(maskDayInput('13/')).toBe('13');
    expect(maskDayInput('')).toBe('');
  });
});

describe('parseDayInput', () => {
  it('lê dd/mm/aaaa como meia-noite local', () => {
    const date = parseDayInput('13/08/2026');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(13);
    expect(date?.getHours()).toBe(0);
  });

  it('RECUSA data que não existe em vez de estourar para o mês seguinte', () => {
    // Sem a validação, o `Date` do JS devolveria 3 de março sem reclamar — e o
    // filtro traria um período que ninguém pediu.
    expect(parseDayInput('31/02/2026')).toBeNull();
    expect(parseDayInput('32/01/2026')).toBeNull();
    expect(parseDayInput('13/13/2026')).toBeNull();
  });

  it('aceita 29/02 em ano bissexto e recusa fora dele', () => {
    expect(parseDayInput('29/02/2028')).not.toBeNull();
    expect(parseDayInput('29/02/2026')).toBeNull();
  });

  it('recusa incompleto e ano de dois dígitos', () => {
    expect(parseDayInput('13/08')).toBeNull();
    expect(parseDayInput('13/08/26')).toBeNull();
    expect(parseDayInput('')).toBeNull();
  });
});

describe('formatDayInput', () => {
  it('é o caminho de volta do parse', () => {
    expect(formatDayInput(new Date(2026, 7, 3))).toBe('03/08/2026');
    expect(parseDayInput(formatDayInput(new Date(2026, 0, 1)))?.getMonth()).toBe(0);
  });
});
