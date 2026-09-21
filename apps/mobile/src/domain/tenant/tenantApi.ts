import { supabase } from '@services/supabase';

import type { ActivityAPI, TeamMemberAPI, TenantAPI, TenantUpdateAPI } from './tenantApiTypes';

/**
 * As formas de pagamento são uma preferência DO NEGÓCIO. A linha pode não
 * existir ainda; nesse caso o service aplica o mesmo padrão do banco.
 */
export async function fetchAcceptedPaymentMethods(tenantId: string): Promise<string[] | null> {
  void tenantId; // O RLS já limita a leitura ao tenant da sessão.

  const { data, error } = await supabase
    .from('tenant_settings')
    .select('accepted_payment_methods')
    .maybeSingle();

  if (error) throw error;
  return (data?.accepted_payment_methods as string[] | null | undefined) ?? null;
}

/**
 * `upsert` é obrigatório: a ausência da linha significa "valores padrão", e
 * a primeira alteração é justamente quem precisa criá-la.
 */
export async function upsertAcceptedPaymentMethods(
  tenantId: string,
  methods: readonly string[],
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .upsert(
      { tenant_id: tenantId, accepted_payment_methods: [...methods] },
      { onConflict: 'tenant_id' },
    )
    .select('accepted_payment_methods')
    .maybeSingle();

  if (error) throw error;
  return (data?.accepted_payment_methods as string[] | null | undefined) ?? null;
}

/**
 * FRONTEIRA DE REDE do domínio `tenant`.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 *
 * REGRA QUE VALE PARA TODO ESTE ARQUIVO (e para todos os outros `*Api.ts`):
 * nenhuma consulta filtra por `tenant_id`. Quem isola é o RLS, com o token do
 * usuário logado. Escrever o `where` à mão daria a falsa impressão de que a
 * segurança está na consulta, quando está na política do banco — e no dia em
 * que alguém esquecesse o filtro, a falsa impressão viraria vazamento.
 *
 * O `tenantId` que estas funções recebem serve só para EXIBIR e para escolher
 * caminho na interface. A única exceção é `fetchTenant`, onde o `.eq('id', …)`
 * escolhe UMA linha — e ainda assim o RLS já garantiria que só existe uma.
 */

/**
 * O negócio, o plano e os módulos ativos.
 *
 * Três leituras em paralelo. Encadear com `await` somaria os tempos de ida e
 * volta; num app de balcão isso aparece.
 *
 * `plans` NÃO vai como embed de `tenants`: não existe FK `tenants.plan →
 * plans.key`, e o PostgREST recusa a consulta inteira (PGRST200) quando o
 * relacionamento não existe. Foi o que deixava o app sem nenhum módulo — o
 * tenant não carregava e as capacidades caíam todas para `false`. O catálogo
 * de planos é pequeno e legível por qualquer sessão autenticada; o nome sai
 * dele pela chave. E ele é só rótulo: se falhar, a tela cai na chave do plano
 * em vez de perder os módulos junto.
 */
export async function fetchTenant(tenantId: string): Promise<TenantAPI | null> {
  const [tenantResult, modulesResult, plansResult] = await Promise.all([
    supabase
      .from('tenants')
      // O `select` PRECISA ser uma string literal: o PostgREST infere o tipo do
      // texto, e uma concatenação vira `string` — aí o resultado perde a forma
      // e o TypeScript para de ajudar.
      .select('id, name, segment, phone, status, plan, monthly_fee')
      .eq('id', tenantId)
      .maybeSingle(),
    supabase.from('v_active_modules').select('key, name, is_access'),
    supabase.from('plans').select('key, name'),
  ]);

  if (tenantResult.error) throw tenantResult.error;
  if (modulesResult.error) throw modulesResult.error;

  const row = tenantResult.data;
  if (!row) return null;

  const plan = (plansResult.data ?? []).find((p) => p.key === row.plan);

  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    phone: row.phone,
    status: row.status,
    plan: row.plan,
    plan_name: plan?.name ?? null,
    monthly_fee: row.monthly_fee,
    // Não existe coluna de renovação em `tenants`. Ver tenantApiTypes.ts.
    renews_at: null,
    modules: modulesResult.data ?? [],
  };
}

/**
 * A equipe do negócio.
 *
 * O e-mail NÃO vem: ele vive em `auth.users`, fora do alcance do RLS deste
 * app. É a mesma limitação que o portal tem (ver `portal-client-pendencias.md`
 * §2.4) — resolver exige uma coluna em `profiles` ou uma view que o exponha.
 * O `access_summary` sai do nome do papel, porque `roles.permissions` é um
 * jsonb cujo resumo legível é decisão de UI, não de rede.
 */
export async function listTeam(tenantId: string): Promise<TeamMemberAPI[]> {
  void tenantId; // O RLS já limita ao tenant do usuário logado.

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, status, roles(name, is_owner)')
    .order('full_name');

  if (error) throw error;

  return (data ?? []).map((p) => {
    const role = (Array.isArray(p.roles) ? p.roles[0] : p.roles) as {
      name?: string;
      is_owner?: boolean;
    } | null;

    return {
      id: p.id,
      full_name: p.full_name ?? null,
      role_name: role?.name ?? null,
      is_owner: role?.is_owner === true,
    };
  });
}

/**
 * O feed de atividades — `activity_log`.
 *
 * FUNCIONA DESDE 28/08/2026. Antes devolvia lista vazia porque a tabela não
 * existia, e sintetizar "atividades" a partir de vendas e movimentações
 * pareceria um log de auditoria sem ser um — alguém acabaria confiando nisso
 * para saber quem fez o quê.
 *
 * As linhas vêm do MESMO log que o portal escreve e lê. Uma venda feita no
 * balcão pelo app e uma feita no portal entram com a mesma chave de ação e
 * aparecem nas duas telas.
 *
 * SEM `.eq('tenant_id', ...)`: quem isola é o RLS. O `tenantId` fica no
 * parâmetro porque é ele que compõe a chave do cache no react-query — trocar
 * de negócio precisa trocar de cache.
 *
 * O teto de 30 é a TELA: `activity_log` só cresce, e esta é uma aba de
 * configurações, não um relatório de auditoria.
 */
export async function listActivities(tenantId: string): Promise<ActivityAPI[]> {
  void tenantId;

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, actor_name, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as ActivityAPI[];
}

/**
 * Salvar nome e telefone do negócio.
 *
 * FUNCIONA DESDE 26/08/2026. Até então não existia policy de UPDATE em
 * `tenants` para o dono: a escrita passava sem erro e afetava ZERO linhas, e a
 * tela avisava em vez de fingir que salvou. Quem destravou foi a migration
 * `20260826000000_tenant_update_policy.sql`.
 *
 * A CHECAGEM DE ZERO LINHAS ABAIXO FICA. Ela não era um remendo para a
 * política ausente — é o que separa "o banco recusou" de "salvou", e o
 * PostgREST não distingue os dois sozinho: RLS que barra um UPDATE devolve
 * sucesso com zero linhas, igualzinho a um `id` que não existe. Sem ela,
 * qualquer recusa futura (uma policy revista, um tenant trocado na sessão)
 * voltaria a aparecer como "salvo" e o nome voltaria ao antigo na carga
 * seguinte — o pior desfecho possível, e o mais difícil de rastrear.
 *
 * O QUE O BANCO NÃO DEIXA MAIS MEXER: `plan`, `monthly_fee` e `status`. Um
 * trigger os devolve aos valores antigos quando quem escreve é o comércio, e
 * não a plataforma. Mandar um deles daqui não dá erro — simplesmente não tem
 * efeito.
 */
export async function updateTenant(
  tenantId: string,
  payload: TenantUpdateAPI,
): Promise<TenantAPI | null> {
  const { data, error } = await supabase
    .from('tenants')
    .update({ name: payload.name, phone: payload.phone })
    .eq('id', tenantId)
    .select('id');

  if (error) throw error;

  // Zero linhas = o RLS recusou em silêncio. `null` faz o service traduzir em
  // erro de domínio, e a tela avisa em vez de fingir que salvou.
  if (!data || data.length === 0) return null;

  return fetchTenant(tenantId);
}
