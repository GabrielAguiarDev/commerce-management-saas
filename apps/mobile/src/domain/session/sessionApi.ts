import { supabase } from '@services/supabase';

import type { ProfileAPI, SessionAPI, SignInPayloadAPI } from './sessionApiTypes';

/**
 * FRONTEIRA DE REDE da autenticação.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 *
 * Duas leituras por sessão, sempre juntas: o Auth diz QUEM é, e `profiles` diz
 * de QUE NEGÓCIO — e o app não funciona sabendo só a primeira metade. Ver o
 * comentário em `sessionApiTypes.ts` sobre por que o `tenant_id` não pode vir
 * do `user_metadata`.
 */

const PROFILE_COLUMNS = 'id, tenant_id, role_id, full_name, is_platform_admin, status';

/**
 * O perfil do usuário logado.
 *
 * Sem `.eq('tenant_id', ...)` e sem qualquer outro filtro de tenant: o RLS já
 * resolve o isolamento. O `.eq('id', userId)` que existe aqui NÃO é segurança —
 * é para escolher UMA linha entre os colegas do mesmo negócio, que o RLS deixa
 * este usuário enxergar de propósito (a tela de Equipe depende disso).
 */
async function fetchProfile(userId: string): Promise<ProfileAPI | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    // `maybeSingle` e não `single`: um usuário do Auth sem linha em `profiles`
    // é um estado real (conta criada no painel e ainda não vinculada a um
    // negócio). Com `single` isso viraria erro de rede — e a tela diria "sem
    // conexão" para quem está perfeitamente conectado.
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** `null` = credencial inválida. Erro de verdade (rede, servidor) sobe. */
export async function signIn(payload: SignInPayloadAPI): Promise<SessionAPI | null> {
  const { data, error } = await supabase.auth.signInWithPassword(payload);

  if (error) {
    // O Supabase responde 400 `invalid_credentials` para e-mail inexistente E
    // para senha errada — de propósito, para não permitir enumerar contas.
    // Mantemos a mesma indistinção: vira `null`, e a tela mostra a mensagem
    // única "e-mail ou senha não conferem".
    if (error.status === 400) return null;
    throw error;
  }

  if (!data.session) return null;

  return {
    access_token: data.session.access_token,
    expires_at: data.session.expires_at ?? null,
    user: { id: data.session.user.id, email: data.session.user.email ?? null },
    // Autenticou mas não tem linha em `profiles`? Isso NÃO é credencial
    // inválida — é conta do Auth ainda não vinculada a um negócio (o painel
    // admin cria as duas coisas em passos separados). Devolver `null` aqui
    // faria o service dizer "e-mail ou senha não conferem" para quem digitou
    // tudo certo, e a pessoa tentaria a senha para sempre.
    //
    // Um perfil VAZIO faz `toSession` lançar `no_tenant`, que é a mensagem
    // correta e o caminho que já derruba a sessão do Supabase. A regra de quem
    // entra continua morando num lugar só: o adapter.
    profile: (await fetchProfile(data.session.user.id)) ?? emptyProfile(data.session.user.id),
  };
}

/** Perfil ausente, no formato que o adapter sabe recusar. */
function emptyProfile(userId: string): ProfileAPI {
  return {
    id: userId,
    tenant_id: null,
    role_id: null,
    full_name: null,
    is_platform_admin: false,
    status: null,
  };
}

/**
 * A sessão já gravada no aparelho, se houver — o caminho do relaunch.
 *
 * `getSession()` lê o armazenamento local e renova o token se estiver vencido;
 * NÃO é uma ida ao servidor para validar. Isso é adequado aqui: quem valida de
 * verdade é o RLS, a cada consulta, com o token. Uma checagem extra contra o
 * servidor no boot só somaria tempo de splash — e falharia sem rede, deslogando
 * quem está apenas no elevador.
 */
export async function getCurrentSession(): Promise<SessionAPI | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;

  const profile = await fetchProfile(data.session.user.id);
  if (!profile) return null;

  return {
    access_token: data.session.access_token,
    expires_at: data.session.expires_at ?? null,
    user: { id: data.session.user.id, email: data.session.user.email ?? null },
    profile,
  };
}

/**
 * O plano deste cliente inclui o aplicativo?
 *
 * `has_module` é uma função do banco que responde sobre o TENANT DO USUÁRIO
 * LOGADO — por isso não recebe `tenant_id`. `app` é um módulo de ACESSO
 * (`is_access = true`): não é uma tela, é a permissão de abrir este app.
 */
export async function hasAppAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module', { p_module_key: 'app' });
  if (error) throw error;
  return data === true;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  // Sem `redirectTo`: o fluxo de redefinir senha ainda não tem tela no app, e
  // apontar para um deep link que não existe deixaria o usuário num beco. O
  // e-mail do Supabase leva para a página padrão do projeto. Quando a tela
  // existir, é aqui que entra o `redirectTo` com o scheme `aguiarone://`.
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/**
 * Avisa quando o Supabase troca de sessão (login, logout, refresh de token,
 * expiração). Devolve a função que cancela a inscrição.
 *
 * O app precisa disto porque a sessão muda SEM o app pedir: o refresh token
 * pode ser revogado no painel, ou vencer depois de dias parado. Sem escutar,
 * o app continuaria mostrando telas de um usuário que o servidor já não
 * reconhece, e cada consulta voltaria vazia — parecendo "negócio sem dados"
 * em vez de "sessão encerrada".
 */
export function onAuthStateChange(handler: (hasSession: boolean) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session !== null);
  });

  return () => data.subscription.unsubscribe();
}
