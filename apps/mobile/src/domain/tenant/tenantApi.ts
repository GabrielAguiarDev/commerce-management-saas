import { supabase } from '@services/supabase';

import type { ActivityAPI, TeamMemberAPI, TenantAPI, TenantUpdateAPI } from './tenantApiTypes';

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
 * Três leituras em UMA ida: `tenants` embute `plans` pela FK `tenants.plan →
 * plans.key`, e `v_active_modules` vai em paralelo. Encadear com `await`
 * somaria os tempos de ida e volta; num app de balcão isso aparece.
 */
export async function fetchTenant(tenantId: string): Promise<TenantAPI | null> {
  const [tenantResult, modulesResult] = await Promise.all([
    supabase
      .from('tenants')
      // O `select` PRECISA ser uma string literal: o PostgREST infere o tipo do
      // texto, e uma concatenação vira `string` — aí o resultado perde a forma
      // e o TypeScript para de ajudar.
      .select('id, name, segment, phone, status, plan, monthly_fee, plans(name)')
      .eq('id', tenantId)
      .maybeSingle(),
    supabase.from('v_active_modules').select('key, name, is_access'),
  ]);

  if (tenantResult.error) throw tenantResult.error;
  if (modulesResult.error) throw modulesResult.error;

  const row = tenantResult.data;
  if (!row) return null;

  // O PostgREST devolve o embed como objeto ou array conforme a cardinalidade
  // que ele infere da FK. Aceitar as duas formas evita que o nome do plano
  // suma da tela se alguém mexer no relacionamento.
  const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;

  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    phone: row.phone,
    status: row.status,
    plan: row.plan,
    plan_name: (plan as { name?: string } | null)?.name ?? null,
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
      full_name: p.full_name ?? 'Sem nome',
      role_name: role?.name ?? null,
      access_summary: role?.is_owner ? 'Acesso total' : (role?.name ?? null),
    };
  });
}

/**
 * O feed de atividades.
 *
 * ⚠️ SEMPRE VAZIO HOJE: a tabela `activity_log` (quem, o quê, quando, sobre
 * qual registro) ainda não existe no banco — está na lista do que falta criar
 * em `docs/api/portal-client-pendencias.md` §3.3.
 *
 * Devolver lista vazia é honesto: a tela mostra o estado vazio dela. A
 * alternativa — sintetizar "atividades" a partir de vendas e movimentações —
 * pareceria um log de auditoria sem ser um, e alguém acabaria confiando nisso
 * para saber quem fez o quê.
 */
export async function listActivities(tenantId: string): Promise<ActivityAPI[]> {
  void tenantId;
  return [];
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
