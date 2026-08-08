import {
  CODE_LENGTH,
  DEMO_CODE,
  mascararEmail,
  validarCodigo,
  validarNovaSenha,
} from '../passwordRecovery';
import { SENHA_MINIMA } from '../sessionRules';

/**
 * O que está sob teste aqui SOBREVIVE à troca do mock pelo fluxo real: as
 * regras puras e os códigos de erro. O `setTimeout` que faz de conta que houve
 * rede não é testado de propósito — ele é a parte que vai embora.
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
  it('reclama de incompleto antes de reclamar de errado', () => {
    expect(validarCodigo('12')?.code).toBe('incomplete_code');
  });

  it('recusa o código completo que não confere', () => {
    expect(validarCodigo('9999')?.code).toBe('invalid_code');
  });

  it('aceita o código da simulação', () => {
    expect(validarCodigo(DEMO_CODE)).toBeNull();
    expect(DEMO_CODE).toHaveLength(CODE_LENGTH);
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
