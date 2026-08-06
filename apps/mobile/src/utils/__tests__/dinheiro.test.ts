import {
  formatarBRL,
  formatarBRLAssinado,
  formatarValor,
  lerCentavos,
  reaisParaCentavos,
} from '../dinheiro';

describe('formatarBRL', () => {
  it('formata com vírgula decimal e ponto de milhar', () => {
    expect(formatarBRL(123456)).toBe('R$ 1.234,56');
    expect(formatarBRL(2846000)).toBe('R$ 28.460,00');
  });

  it('mantém duas casas mesmo em valores redondos', () => {
    expect(formatarBRL(0)).toBe('R$ 0,00');
    expect(formatarBRL(700)).toBe('R$ 7,00');
    expect(formatarBRL(50)).toBe('R$ 0,50');
  });

  it('reproduz os valores do protótipo', () => {
    expect(formatarBRL(127440)).toBe('R$ 1.274,40');
    expect(formatarBRL(74250)).toBe('R$ 742,50');
    expect(formatarBRL(1246)).toBe('R$ 12,46');
  });

  it('não devolve NaN para entrada inválida', () => {
    expect(formatarBRL(Number.NaN)).toBe('R$ 0,00');
    expect(formatarBRL(Number.POSITIVE_INFINITY)).toBe('R$ 0,00');
  });

  it('formata negativo com o sinal antes do número', () => {
    expect(formatarValor(-300)).toBe('-3,00');
  });
});

describe('formatarBRLAssinado', () => {
  it('usa o traço tipográfico do design para o negativo, não o hífen ASCII', () => {
    expect(formatarBRLAssinado(-300)).toBe('−R$ 3,00');
    expect(formatarBRLAssinado(-300).charCodeAt(0)).toBe(0x2212);
  });

  it('marca o positivo explicitamente', () => {
    expect(formatarBRLAssinado(1250)).toBe('+R$ 12,50');
    expect(formatarBRLAssinado(0)).toBe('+R$ 0,00');
  });
});

describe('lerCentavos', () => {
  it('lê o formato brasileiro com milhar e decimal', () => {
    expect(lerCentavos('1.234,56')).toBe(123456);
    expect(lerCentavos('R$ 1.234,56')).toBe(123456);
    expect(lerCentavos('12,5')).toBe(1250);
    expect(lerCentavos('12,')).toBe(1200);
  });

  it('trata ponto como decimal quando separa até duas casas', () => {
    expect(lerCentavos('12.50')).toBe(1250);
    expect(lerCentavos('12.5')).toBe(1250);
  });

  it('trata ponto como milhar quando separa três casas', () => {
    expect(lerCentavos('1.234')).toBe(123400);
  });

  it('ignora terceira casa decimal em vez de arredondar para cima', () => {
    expect(lerCentavos('12,999')).toBe(1299);
  });

  it('devolve null — e nunca NaN — para entrada sem dígito', () => {
    expect(lerCentavos('')).toBeNull();
    expect(lerCentavos('R$ ')).toBeNull();
    expect(lerCentavos('abc')).toBeNull();
  });

  it('preserva o sinal negativo', () => {
    expect(lerCentavos('-45,90')).toBe(-4590);
  });

  it('faz ida e volta com formatarValor', () => {
    for (const c of [0, 1, 99, 100, 12345, 2846000]) {
      expect(lerCentavos(formatarValor(c))).toBe(c);
    }
  });
});

describe('reaisParaCentavos', () => {
  it('arredonda em vez de truncar o float', () => {
    // 1.1 * 100 dá 110.00000000000001 em ponto flutuante. Sem arredondar, um
    // `| 0` ou `Math.trunc` custaria um centavo em preços quebrados vindos de
    // uma API que ainda mande reais decimais.
    expect(1.1 * 100).not.toBe(110);
    expect(reaisParaCentavos(1.1)).toBe(110);
    expect(reaisParaCentavos(189.9)).toBe(18990);
    expect(reaisParaCentavos(4.5)).toBe(450);
    expect(reaisParaCentavos(0)).toBe(0);
  });
});
