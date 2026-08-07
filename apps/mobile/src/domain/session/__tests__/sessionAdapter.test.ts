import { toSession, toSignInPayload } from '../sessionAdapter';
import type { SessionAPI } from '../sessionApiTypes';
import { AuthError } from '../sessionTypes';

/**
 * A REGRA DE QUEM PODE USAR O APP mora no adapter, e é a mesma do portal
 * (`apps/portal-client/lib/sessao.ts`): precisa ter `tenant_id` e não pode ser
 * admin de plataforma. Estes testes são a rede de segurança dela — é a única
 * lógica do app onde um `false` a mais deixa entrar quem não devia.
 */

const base: SessionAPI = {
  access_token: 'jwt.abc.123',
  expires_at: 1_800_000_000,
  user: { id: 'usr_1', email: 'dono@petshopamigofiel.com.br' },
  profile: {
    id: 'usr_1',
    tenant_id: 'tnt_1',
    role_id: 'rol_1',
    full_name: 'Maria Souza',
    is_platform_admin: false,
    status: 'active',
  },
};

describe('toSession', () => {
  it('traduz a sessão do Auth + perfil para o modelo de domínio', () => {
    const s = toSession(base);
    expect(s.user.id).toBe('usr_1');
    expect(s.user.email).toBe('dono@petshopamigofiel.com.br');
    expect(s.user.name).toBe('Maria Souza');
    expect(s.tenantId).toBe('tnt_1');
    expect(s.roleId).toBe('rol_1');
  });

  it('deriva as iniciais aqui — a tela não deve saber fazer isso', () => {
    // Uma letra só: é o que o avatar do design mostra (`initials` usa max = 1).
    expect(toSession(base).user.initials).toBe('M');
  });

  it('cai no usuário do e-mail quando o perfil não tem nome', () => {
    const s = toSession({ ...base, profile: { ...base.profile, full_name: null } });
    expect(s.user.name).toBe('dono');
  });

  it('trata nome só de espaços como ausente', () => {
    const s = toSession({ ...base, profile: { ...base.profile, full_name: '   ' } });
    expect(s.user.name).toBe('dono');
  });

  it('não quebra com usuário sem e-mail nem nome', () => {
    const s = toSession({
      ...base,
      user: { id: 'usr_2', email: null },
      profile: { ...base.profile, full_name: null },
    });
    expect(s.user.name).toBe('Você');
    expect(s.user.email).toBe('');
  });

  /* ------------------------------------------------------------------ */
  /* As negativas de acesso                                              */
  /* ------------------------------------------------------------------ */

  it('barra usuário sem tenant_id — não existe app sem negócio', () => {
    expect(() => toSession({ ...base, profile: { ...base.profile, tenant_id: null } })).toThrow(
      AuthError,
    );

    try {
      toSession({ ...base, profile: { ...base.profile, tenant_id: null } });
    } catch (e) {
      expect((e as AuthError).code).toBe('no_tenant');
    }
  });

  it('barra admin de plataforma — ele usa o painel, não o app', () => {
    try {
      toSession({ ...base, profile: { ...base.profile, is_platform_admin: true } });
      throw new Error('deveria ter barrado');
    } catch (e) {
      expect((e as AuthError).code).toBe('platform_admin');
    }
  });

  it('admin de plataforma é barrado ANTES da checagem de tenant', () => {
    // Um admin COM tenant_id ainda assim não entra. A ordem importa: se a
    // pergunta do tenant viesse primeiro, este caso passaria batido.
    try {
      toSession({
        ...base,
        profile: { ...base.profile, is_platform_admin: true, tenant_id: 'tnt_9' },
      });
      throw new Error('deveria ter barrado');
    } catch (e) {
      expect((e as AuthError).code).toBe('platform_admin');
    }
  });

  it('barra perfil suspenso', () => {
    try {
      toSession({ ...base, profile: { ...base.profile, status: 'suspended' } });
      throw new Error('deveria ter barrado');
    } catch (e) {
      expect((e as AuthError).code).toBe('suspended');
    }
  });

  it('status nulo é tratado como ativo', () => {
    // A coluna aceita nulo. Um perfil antigo sem status preenchido não pode
    // ficar trancado para fora do app.
    expect(() =>
      toSession({ ...base, profile: { ...base.profile, status: null } }),
    ).not.toThrow();
  });

  it('is_platform_admin nulo é tratado como falso', () => {
    expect(() =>
      toSession({ ...base, profile: { ...base.profile, is_platform_admin: null } }),
    ).not.toThrow();
  });
});

describe('toSignInPayload', () => {
  it('normaliza o e-mail: sem espaços e em minúsculas', () => {
    // O teclado do celular capitaliza a primeira letra sozinho, e o Supabase
    // trata o e-mail como sensível a maiúsculas no login.
    expect(toSignInPayload('  Dono@Petshop.com.BR ', 'senha123')).toEqual({
      email: 'dono@petshop.com.br',
      password: 'senha123',
    });
  });

  it('não mexe na senha — espaço em senha é caractere válido', () => {
    expect(toSignInPayload('a@b.com', '  senha  ').password).toBe('  senha  ');
  });
});
