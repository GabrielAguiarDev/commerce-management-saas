/**
 * CONTRATO DO BACKEND para autenticação.
 *
 * Modelado no formato do Supabase Auth (`session.access_token`,
 * `user.user_metadata`), para que a troca do mock por
 * `supabase.auth.signInWithPassword` não mude o formato que o adapter recebe.
 */

export interface SignInPayloadAPI {
  email: string;
  password: string;
}

export interface AuthUserAPI {
  id: string;
  email: string | null;
  user_metadata: {
    full_name?: string | null;
    tenant_id?: string | null;
  } | null;
}

export interface SessionAPI {
  access_token: string;
  expires_at: number | null;
  user: AuthUserAPI;
}
