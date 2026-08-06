import {
  formatBRL,
  formatSignedBRL,
  formatAmount,
  parseCents,
  realToCents,
} from '../money';

describe('formatarBRL', () => {
  it('formata com vírgula decimal e ponto de milhar', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(2846000)).toBe('R$ 28.460,00');
  });

  it('mantém duas casas mesmo em valores redondos', () => {
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(700)).toBe('R$ 7,00');
    expect(formatBRL(50)).toBe('R$ 0,50');
  });

  it('reproduz os valores do protótipo', () => {
    expect(formatBRL(127440)).toBe('R$ 1.274,40');
    expect(formatBRL(74250)).toBe('R$ 742,50');
    expect(formatBRL(1246)).toBe('R$ 12,46');
  });

  it('não devolve NaN para entrada inválida', () => {
    expect(formatBRL(Number.NaN)).toBe('R$ 0,00');
    expect(formatBRL(Number.POSITIVE_INFINITY)).toBe('R$ 0,00');
  });

  it('formata negativo com o sinal antes do número', () => {
    expect(formatAmount(-300)).toBe('-3,00');
  });
});

describe('formatarBRLAssinado', () => {
  it('usa o traço tipográfico do design para o negativo, não o hífen ASCII', () => {
    expect(formatSignedBRL(-300)).toBe('−R$ 3,00');
    expect(formatSignedBRL(-300).charCodeAt(0)).toBe(0x2212);
  });

  it('marca o positivo explicitamente', () => {
    expect(formatSignedBRL(1250)).toBe('+R$ 12,50');
    expect(formatSignedBRL(0)).toBe('+R$ 0,00');
  });
});

describe('lerCentavos', () => {
  it('lê o formato brasileiro com milhar e decimal', () => {
    expect(parseCents('1.234,56')).toBe(123456);
    expect(parseCents('R$ 1.234,56')).toBe(123456);
    expect(parseCents('12,5')).toBe(1250);
    expect(parseCents('12,')).toBe(1200);
  });

  it('trata ponto como decimal quando separa até duas casas', () => {
    expect(parseCents('12.50')).toBe(1250);
    expect(parseCents('12.5')).toBe(1250);
  });

  it('trata ponto como milhar quando separa três casas', () => {
    expect(parseCents('1.234')).toBe(123400);
  });

  it('ignora terceira casa decimal em vez de arredondar para cima', () => {
    expect(parseCents('12,999')).toBe(1299);
  });

  it('devolve null — e nunca NaN — para entrada sem dígito', () => {
    expect(parseCents('')).toBeNull();
    expect(parseCents('R$ ')).toBeNull();
    expect(parseCents('abc')).toBeNull();
  });

  it('preserva o sinal negativo', () => {
    expect(parseCents('-45,90')).toBe(-4590);
  });

  it('faz ida e volta com formatarValor', () => {
    for (const c of [0, 1, 99, 100, 12345, 2846000]) {
      expect(parseCents(formatAmount(c))).toBe(c);
    }
  });
});

describe('reaisParaCentavos', () => {
  it('arredonda em vez de truncar o float', () => {
    // 1.1 * 100 dá 110.00000000000001 em ponto flutuante. Sem arredondar, um
    // `| 0` ou `Math.trunc` custaria um centavo em preços quebrados vindos de
    // uma API que ainda mande reais decimais.
    expect(1.1 * 100).not.toBe(110);
    expect(realToCents(1.1)).toBe(110);
    expect(realToCents(189.9)).toBe(18990);
    expect(realToCents(4.5)).toBe(450);
    expect(realToCents(0)).toBe(0);
  });
});
