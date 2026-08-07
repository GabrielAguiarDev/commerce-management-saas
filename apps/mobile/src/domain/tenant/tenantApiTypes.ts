/**
 * CONTRATO DO BACKEND para o negócio e seus módulos.
 *
 * Espelha as tabelas reais do projeto `Commerce Management`: `tenants`,
 * `plans`, e a view `v_active_modules`. Inglês, snake_case, colunas anuláveis.
 *
 * ⚠️ `TenantAPI` é um DTO COMPOSTO, não o retrato de uma tabela: o `tenantApi`
 * junta três leituras nele. Isso é de propósito — o adapter e as telas pedem
 * "o negócio", e não deveriam saber que o nome do plano mora noutra tabela.
 * A composição é trabalho da fronteira de rede; a tradução, do adapter.
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
  /** Coluna `tenants.phone` (adicionada em 20260802010000_tenant_contato). */
  phone: string | null;
  status: string;
  /** `tenants.plan` — a CHAVE do plano, que é FK para `plans.key`. */
  plan: string;
  /** `plans.name`, via join. Nulo se o plano sumiu do catálogo. */
  plan_name: string | null;
  monthly_fee: number | null;
  /**
   * ⚠️ SEMPRE `null` HOJE: não existe coluna de renovação em `tenants`.
   *
   * O campo continua no contrato porque a tela de Configurações já sabe
   * escondê-lo quando é nulo, e porque a cobrança é assunto do portal — quando
   * a coluna existir, é só passar a preenchê-la aqui. Inventar uma data
   * calculada seria pior: apareceria como fato na tela do cliente.
   */
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
  phone: string | null;
}
