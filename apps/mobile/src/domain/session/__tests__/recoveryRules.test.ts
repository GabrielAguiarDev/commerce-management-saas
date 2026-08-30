import {
  CODE_LENGTH,
  mascararEmail,
  validarCodigo,
  validarNovaSenha,
} from '../recoveryRules';
import { SENHA_MINIMA } from '../sessionRules';

/**
 * As REGRAS PURAS da recuperação — as mesmas de quando o fluxo era simulado, e
 * é por isso que elas viviam separadas do mock.
 *
 * O que fala com o Supabase (`recoveryApi`, `recoveryService`) não é testado
 * aqui: exercitá-lo exigiria dublê de rede, e o que ele faz é encaminhar
 * chamada e traduzir mensagem de erro — não há regra de negócio escondida
 * dentro.
 */

describe('mascararEmail', () => {
  it('mostra as duas primeiras letras e o domínio inteiro', () => {
    expect(mascararEmail('gabriel@gmail.com')).toBe('ga••••@gmail.com');
  });

  it('não deixa o tamanho da parte local vazar na contagem de pontos', () => {
    const curto = mascararEmail('ab@x.com.br');
    const longo = mascararEmail('abcdefghijklmno@x.com.br');
    expect(curto.split('@')[0]).toBe(longo.split('@')[0]);
  });

  it('normaliza espaço e maiúscula antes de mascarar', () => {
    expect(mascararEmail('  GABRIEL@Gmail.com ')).toBe('ga••••@gmail.com');
  });

  it('usa o ÚLTIMO arroba — o primeiro pode fazer parte da parte local citada', () => {
    expect(mascararEmail('"a@b"@dominio.com')).toBe('"a••••@dominio.com');
  });

  it('devolve como veio o que não tem arroba, em vez de inventar máscara', () => {
    expect(mascararEmail('sem-arroba')).toBe('sem-arroba');
  });
});

describe('validarCodigo', () => {
  it('recusa o código incompleto sem gastar uma ida à rede', () => {
    expect(validarCodigo('12')?.code).toBe('incomplete_code');
  });

  /**
   * Quem diz se o código CONFERE é o servidor — este aparelho não tem o número
   * que foi para o e-mail. Um código completo passa daqui e só é recusado na
   * volta da rede, com `invalid_code`.
   */
  it('deixa passar qualquer código completo: a conferência é do servidor', () => {
    expect(validarCodigo('9'.repeat(CODE_LENGTH))).toBeNull();
  });
});

describe('validarNovaSenha', () => {
  it('reclama do TAMANHO antes da diferença: é o problema real', () => {
    expect(validarNovaSenha('123', '123')?.code).toBe('short_password');
    expect(validarNovaSenha('123', '456')?.code).toBe('short_password');
  });

  it('recusa duas senhas longas que não conferem', () => {
    expect(validarNovaSenha('senhaforte', 'senhaforta')?.code).toBe('password_mismatch');
  });

  it('aceita duas senhas iguais no tamanho mínimo', () => {
    const senha = 'a'.repeat(SENHA_MINIMA);
    expect(validarNovaSenha(senha, senha)).toBeNull();
  });
});
