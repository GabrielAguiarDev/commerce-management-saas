/**
 * CONTRATO DO BACKEND para autenticação.
 *
 * O formato real do Supabase Auth (`session.access_token`, `session.user`) mais
 * a linha de `profiles` — porque no banco deste projeto a identidade do usuário
 * está PARTIDA EM DOIS:
 *
 *  - `auth.users` (id, e-mail, credenciais) é do Supabase Auth;
 *  - `public.profiles` (tenant_id, role_id, full_name, is_platform_admin) é
 *    nosso, e é onde mora a única coisa que decide se este app abre.
 *
 * ⚠️ CORREÇÃO DE UM PALPITE DA FASE DE MOCK. A versão anterior lia o
 * `tenant_id` de `user.user_metadata`. Não é lá que ele está — e a diferença
 * importa mais do que parece: `user_metadata` é gravável PELO PRÓPRIO USUÁRIO
 * (`supabase.auth.updateUser`), então um cliente mal-intencionado poderia
 * escrever o `tenant_id` de outro negócio e o app acreditaria. `profiles` é
 * protegida por RLS e só o admin escreve. É a mesma leitura que o portal faz em
 * `lib/sessao.ts` — e as duas precisam continuar concordando.
 */

export interface AuthUserAPI {
  id: string;
  /** O Supabase admite usuário sem e-mail (telefone, OAuth). Aqui sempre há. */
  email: string | null;
}

/** `public.profiles` — as colunas que decidem o acesso. */
export interface ProfileAPI {
  id: string;
  /** `null` = usuário do Auth sem negócio associado. Não entra no app. */
  tenant_id: string | null;
  role_id: string | null;
  full_name: string | null;
  /** Admin da plataforma usa o portal-admin, não este app. */
  is_platform_admin: boolean | null;
  /** `'active'` | `'suspended'` — funcionário suspenso não entra. */
  status: string | null;
}

/**
 * O que o `sessionApi` devolve: a sessão do Auth já casada com o perfil.
 *
 * As duas leituras andam juntas porque separá-las criaria um estado
 * intermediário ("autenticado, mas ainda não sei de que negócio") que toda tela
 * teria de saber tratar.
 */
export interface SessionAPI {
  access_token: string;
  /** Segundos desde a época (formato do Supabase), não milissegundos. */
  expires_at: number | null;
  user: AuthUserAPI;
  profile: ProfileAPI;
}

export interface SignInPayloadAPI {
  email: string;
  password: string;
}
