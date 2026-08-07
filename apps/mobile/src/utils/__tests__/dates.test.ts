import { daysAgoDateOnly, daysSince, toDateOnly, todayDateOnly } from '../dates';

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
