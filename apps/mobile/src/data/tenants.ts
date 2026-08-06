import type { ActivityAPI, TeamMemberAPI, TenantAPI } from '@domain/tenant/tenantApiTypes';

/**
 * Fixtures no FORMATO CRU DA API (inglês, snake_case, campos anuláveis).
 *
 * Por que não já no formato de domínio: se o mock devolvesse `Tenant` pronto, o
 * adapter viraria enfeite e só ganharia corpo no dia em que o Supabase entrasse
 * — o dia de maior risco. Devolvendo o formato cru, todo dado do app atravessa
 * o adapter desde agora, e a virada é trocar o corpo do Api por um `select`.
 *
 * TRÊS TENANTS de propósito, e é assim que os três estados de topo do protótipo
 * (login → app, e login → bloqueio) continuam alcançáveis sem os chips de demo:
 * o perfil vem do e-mail com que se entra, não de um botão flutuante.
 */

export const ID_PETSHOP = 'tnt_petshop_amigo';
export const ID_ACARAJE = 'tnt_acaraje_da_rita';
export const ID_SEM_APP = 'tnt_mercadinho_esquina';

const MOD = {
  sales: { key: 'sales', name: 'Vendas', is_access: false },
  products: { key: 'products', name: 'Produtos', is_access: false },
  stock: { key: 'stock', name: 'Estoque', is_access: false },
  cash: { key: 'cash', name: 'Caixa', is_access: false },
  costs: { key: 'costs', name: 'Custos', is_access: false },
  reports: { key: 'reports', name: 'Relatórios', is_access: false },
  support: { key: 'support', name: 'Suporte', is_access: false },
  app: { key: 'app', name: 'Aplicativo', is_access: true },
} as const;

export const TENANTS_API: Record<string, TenantAPI> = {
  [ID_PETSHOP]: {
    id: ID_PETSHOP,
    name: 'Petshop Amigo',
    segment: 'Pet',
    contact_phone: '(71) 98123-4455',
    status: 'active',
    plan: 'paid',
    plan_name: 'Plano Completo',
    monthly_fee: 189.9,
    renews_at: '2026-08-12T00:00:00.000Z',
    modules: [
      MOD.sales,
      MOD.products,
      MOD.cash,
      MOD.stock,
      MOD.costs,
      MOD.reports,
      MOD.support,
      MOD.app,
    ],
  },

  [ID_ACARAJE]: {
    id: ID_ACARAJE,
    name: 'Acarajé da Rita',
    segment: 'Alimentação',
    contact_phone: '(71) 99640-2211',
    status: 'active',
    plan: 'paid',
    plan_name: 'Plano Essencial',
    // Sem `plan_name`? O adapter cai na chave. Aqui o nome existe.
    monthly_fee: 59.9,
    renews_at: '2026-08-12T00:00:00.000Z',
    modules: [MOD.sales, MOD.products, MOD.costs, MOD.support, MOD.app],
  },

  // Plano sem o módulo de ACESSO `app`: entra e cai na tela de bloqueio.
  [ID_SEM_APP]: {
    id: ID_SEM_APP,
    name: 'Mercadinho da Esquina',
    segment: 'Varejo',
    contact_phone: null,
    status: 'active',
    plan: 'free',
    plan_name: null,
    monthly_fee: null,
    renews_at: null,
    modules: [MOD.sales, MOD.products, MOD.costs, MOD.support],
  },
};

export const EQUIPE_API: Record<string, TeamMemberAPI[]> = {
  [ID_PETSHOP]: [
    { id: 'usr_maria', full_name: 'Maria Aguiar', role_name: 'Dona', access_summary: 'tudo' },
    {
      id: 'usr_lucas',
      full_name: 'Lucas Prado',
      role_name: 'Vendedor',
      access_summary: 'vender, produtos',
    },
    {
      id: 'usr_ana',
      full_name: 'Ana Beatriz',
      role_name: 'Financeiro',
      access_summary: 'custos, relatórios',
    },
  ],
  [ID_ACARAJE]: [
    { id: 'usr_rita', full_name: 'Rita Andrade', role_name: 'Dona', access_summary: 'tudo' },
    { id: 'usr_jonas', full_name: 'Jonas Silva', role_name: 'Ajudante', access_summary: 'só vender' },
  ],
  [ID_SEM_APP]: [
    { id: 'usr_joao', full_name: 'João Bastos', role_name: 'Dono', access_summary: 'tudo' },
  ],
};

export const ATIVIDADES_API: Record<string, ActivityAPI[]> = {
  [ID_PETSHOP]: [
    {
      id: 'act_1',
      description: 'Lucas registrou uma venda de R$ 102,00',
      happened_label: 'hoje, 10:20',
    },
    { id: 'act_2', description: 'Maria abriu o caixa com R$ 150,00', happened_label: 'hoje, 08:12' },
    {
      id: 'act_3',
      description: 'Ana lançou o custo "Energia elétrica"',
      happened_label: 'ontem, 19:04',
    },
  ],
  [ID_ACARAJE]: [
    {
      id: 'act_4',
      description: 'Jonas registrou uma venda de R$ 24,00',
      happened_label: 'hoje, 11:42',
    },
    {
      id: 'act_5',
      description: 'Rita lançou o custo "Feira da semana"',
      happened_label: 'ontem, 18:30',
    },
  ],
  [ID_SEM_APP]: [],
};
