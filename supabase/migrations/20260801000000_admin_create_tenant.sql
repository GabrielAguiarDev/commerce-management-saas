-- =====================================================================
-- admin_create_tenant — cria um cliente completo numa ÚNICA transação.
--
-- Motivo de existir: criar um cliente toca quatro tabelas (tenants, roles,
-- profiles, tenant_modules). Se isso fosse feito em quatro chamadas separadas
-- pela aplicação, uma falha no meio deixaria um cliente pela metade — um
-- tenant sem módulos, ou um usuário sem perfil. Dentro de uma função, ou tudo
-- é gravado, ou nada é: qualquer RAISE desfaz o que já tinha sido feito.
--
-- O usuário no Auth é criado ANTES, pela Server Action, porque só a API de
-- administração do Auth cria usuário. Se esta função falhar, a Server Action
-- apaga esse usuário para não deixar órfão (ver app/clientes/actions.ts).
--
-- SUPOSIÇÕES sobre o schema — confira e ajuste se divergir do seu banco:
--   * roles.permissions é jsonb;
--   * tenants.status e profiles.status usam 'active';
--   * profiles.id referencia auth.users(id).
-- =====================================================================

create or replace function public.admin_create_tenant(
  p_user_id     uuid,
  p_name        text,
  p_segment     text,
  p_owner_name  text,
  p_plan        text,
  p_monthly_fee numeric,
  p_module_keys text[]
)
returns uuid
language plpgsql
-- SECURITY DEFINER: roda com os privilégios do dono da função, para poder
-- escrever nas quatro tabelas sem depender do RLS de quem chamou.
security definer
-- search_path fixo: impede que um schema malicioso no caminho de busca
-- sequestre os nomes de tabela usados abaixo.
set search_path = public, pg_temp
as $$
declare
  v_tenant_id uuid;
  v_role_id   uuid;
  v_faltando  text[];
begin
  ------------------------------------------------------------------
  -- 0. Validação dos argumentos. Falhar aqui é barato; falhar depois
  --    de criar meio cliente, não.
  ------------------------------------------------------------------
  if p_user_id is null then
    raise exception 'usuário do Auth é obrigatório';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'nome do negócio é obrigatório';
  end if;

  if p_plan not in ('free', 'paid', 'custom') then
    raise exception 'plano inválido: %', p_plan;
  end if;

  if coalesce(array_length(p_module_keys, 1), 0) = 0 then
    raise exception 'nenhum módulo informado para o plano %', p_plan;
  end if;

  -- Toda chave precisa existir no catálogo `modules`. Uma chave errada em
  -- lib/planos.ts vira erro na hora, e não um cliente sem o módulo.
  select array_agg(k)
    into v_faltando
    from unnest(p_module_keys) as k
   where not exists (select 1 from public.modules m where m.key = k);

  if v_faltando is not null then
    raise exception 'módulos inexistentes no catálogo: %', array_to_string(v_faltando, ', ');
  end if;

  ------------------------------------------------------------------
  -- 1. O tenant (o negócio).
  ------------------------------------------------------------------
  insert into public.tenants (name, segment, status, plan, monthly_fee)
  values (btrim(p_name), nullif(btrim(p_segment), ''), 'active', p_plan, p_monthly_fee)
  returning id into v_tenant_id;

  ------------------------------------------------------------------
  -- 2. O papel "Dono" — acesso total dentro deste tenant (e só dele).
  ------------------------------------------------------------------
  insert into public.roles (tenant_id, name, permissions, is_owner)
  values (v_tenant_id, 'Dono', '{"all": true}'::jsonb, true)
  returning id into v_role_id;

  ------------------------------------------------------------------
  -- 3. O perfil, ligando usuário do Auth ↔ tenant ↔ papel.
  --
  --    is_platform_admin = false: este é o dono de UM comércio, não da
  --    plataforma. Passar true aqui daria acesso a todos os clientes.
  --
  --    ON CONFLICT porque muitos projetos têm um trigger que já cria uma
  --    linha em profiles quando nasce um usuário no Auth; neste caso a
  --    função completa a linha em vez de estourar.
  ------------------------------------------------------------------
  insert into public.profiles (id, tenant_id, role_id, full_name, is_platform_admin, status)
  values (p_user_id, v_tenant_id, v_role_id, nullif(btrim(p_owner_name), ''), false, 'active')
  on conflict (id) do update
    set tenant_id         = excluded.tenant_id,
        role_id           = excluded.role_id,
        full_name         = coalesce(excluded.full_name, public.profiles.full_name),
        is_platform_admin = false,
        status            = excluded.status;

  ------------------------------------------------------------------
  -- 4. Os módulos do plano.
  ------------------------------------------------------------------
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select v_tenant_id, k, true
    from unnest(p_module_keys) as k;

  return v_tenant_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Quem pode executar.
--
-- SECURITY DEFINER + permissão aberta seria uma porta dos fundos: qualquer
-- usuário logado criaria tenants à vontade. Então: ninguém pode, exceto a
-- service_role — que só existe no servidor do painel admin.
-- ---------------------------------------------------------------------
revoke all on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[]) from public;
revoke all on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[]) from anon;
revoke all on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[]) from authenticated;
grant execute on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[]) to service_role;

comment on function public.admin_create_tenant is
  'Cria tenant + papel Dono + profile + módulos numa transação. Só a service_role executa (painel admin).';
