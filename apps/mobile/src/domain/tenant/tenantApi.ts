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
 * ⚠️ HOJE ISTO FALHA POR FALTA DE POLÍTICA. Não existe policy de UPDATE em
 * `tenants` para o dono — verificado no levantamento do portal: a escrita passa
 * sem erro e afeta ZERO linhas. Por isso a checagem explícita abaixo: sem ela,
 * a tela diria "salvo" e o nome voltaria ao antigo no próximo carregamento, que
 * é o pior desfecho possível.
 *
 * A correção é no banco, não aqui:
 *   create policy "dono atualiza o próprio negócio" on tenants
 *     for update using (id = current_tenant_id())
 *     with check (id = current_tenant_id());
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
