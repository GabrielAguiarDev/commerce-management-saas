/**
 * CONTRATO DO BACKEND para o negócio e seus módulos.
 *
 * Espelha as tabelas reais do monorepo (`tenants`, `plans`, `modules`,
 * `tenant_modules` / view `v_active_modules`): inglês, snake_case, colunas
 * anuláveis. O mock devolve exatamente ISTO — nunca o modelo de domínio — para
 * que o adapter esteja vivo e testado desde o primeiro dia.
 */

export interface TenantModuleAPI {
  key: string;
  name: string | null;
  /** Módulo de acesso (libera o app), não uma tela. `app` é o único hoje. */
  is_access: boolean | null;
}

export interface TenantAPI {
  id: string;
  name: string;
  segment: string | null;
  contact_phone: string | null;
  status: string;
  plan: string;
  plan_name: string | null;
  monthly_fee: number | null;
  /** ISO 8601. */
  renews_at: string | null;
  modules: TenantModuleAPI[];
}

export interface TeamMemberAPI {
  id: string;
  full_name: string;
  role_name: string | null;
  access_summary: string | null;
}

export interface ActivityAPI {
  id: string;
  description: string;
  happened_label: string;
}

/** Payload de escrita das Configurações › Negócio. */
export interface TenantUpdateAPI {
  name: string;
  contact_phone: string | null;
}
