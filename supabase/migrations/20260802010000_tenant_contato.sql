-- =====================================================================
-- Cidade e telefone do cliente.
--
-- MOTIVO: o formulário de cadastro do painel já pedia "Cidade / UF" e
-- "Telefone / contato", mas `tenants` não tinha onde guardar — os dois campos
-- iam no FormData e eram descartados em silêncio. Ou o banco passa a guardar,
-- ou os campos saem da tela; guardar é o que a operação quer.
-- =====================================================================

alter table public.tenants
  add column if not exists city  text,
  add column if not exists phone text;

comment on column public.tenants.city  is 'Cidade / UF do comércio, informada no cadastro.';
comment on column public.tenants.phone is 'Telefone de contato do responsável.';

-- ---------------------------------------------------------------------
-- `admin_create_tenant` passa a receber os dois campos novos.
--
-- Precisa de DROP antes: o Postgres não deixa `create or replace` mudar a
-- lista de parâmetros de uma função — ele criaria uma sobrecarga nova e
-- deixaria a antiga de pé, e aí a aplicação poderia chamar qualquer uma das
-- duas dependendo de como o PostgREST resolvesse os argumentos.
--
-- Os parâmetros novos têm DEFAULT NULL para a função continuar aceitando uma
-- chamada sem eles enquanto a aplicação não é atualizada.
-- ---------------------------------------------------------------------
drop function if exists public.admin_create_tenant(uuid, text, text, text, text, numeric, text[]);

create or replace function public.admin_create_tenant(
  p_user_id     uuid,
  p_name        text,
  p_segment     text,
  p_owner_name  text,
  p_plan        text,
  p_monthly_fee numeric,
  p_module_keys text[],
  p_city        text default null,
  p_phone       text default null
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

  -- O plano precisa existir e estar vigente no catálogo `plans`. Antes esta
  -- checagem era uma lista fixa ('free','paid','custom') aqui dentro — o que
  -- barrava qualquer plano criado pela tela de Planos.
  if not exists (select 1 from public.plans pl where pl.key = p_plan and pl.is_active) then
    raise exception 'plano inválido ou inativo: %', p_plan;
  end if;

  if coalesce(array_length(p_module_keys, 1), 0) = 0 then
    raise exception 'nenhum módulo informado para o plano %', p_plan;
  end if;

  -- Toda chave precisa existir no catálogo `modules`.
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
  insert into public.tenants (name, segment, status, plan, monthly_fee, city, phone)
  values (
    btrim(p_name),
    nullif(btrim(p_segment), ''),
    'active',
    p_plan,
    p_monthly_fee,
    nullif(btrim(p_city), ''),
    nullif(btrim(p_phone), '')
  )
  returning id into v_tenant_id;

  ------------------------------------------------------------------
  -- 2. O papel "Dono" — acesso total dentro deste tenant (e só dele).
  ------------------------------------------------------------------
  insert into public.roles (tenant_id, name, permissions, is_owner)
  values (v_tenant_id, 'Dono', '{"all": true}'::jsonb, true)
  returning id into v_role_id;

  ------------------------------------------------------------------
  -- 3. O perfil, ligando usuário do Auth ↔ tenant ↔ papel.
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
-- Quem pode executar — REFEITO PARA A ASSINATURA NOVA.
--
-- O DROP acima levou junto os grants da assinatura antiga, e uma função nova
-- nasce executável por PUBLIC. Numa função SECURITY DEFINER isso é uma porta
-- dos fundos: qualquer usuário logado criaria tenants à vontade. Sem este
-- bloco, a migration abriria exatamente o buraco que a original fechava.
-- ---------------------------------------------------------------------
revoke all on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[], text, text) from public;
revoke all on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[], text, text) from anon;
revoke all on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[], text, text) from authenticated;
grant execute on function public.admin_create_tenant(uuid, text, text, text, text, numeric, text[], text, text) to service_role;

comment on function public.admin_create_tenant is
  'Cria tenant + papel Dono + profile + módulos numa transação. Só a service_role executa (painel admin).';

-- ---------------------------------------------------------------------
-- `admin_update_tenant` também deixa de validar o plano contra uma lista
-- fixa. Mesmo motivo: a oferta agora mora em `plans`.
-- ---------------------------------------------------------------------
create or replace function public.admin_update_tenant(
  p_tenant_id   uuid,
  p_plan        text,
  p_monthly_fee numeric,
  p_module_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_faltando text[];
begin
  if not public.is_platform_admin() then
    raise exception 'apenas o administrador da plataforma pode alterar clientes';
  end if;

  if p_tenant_id is null then
    raise exception 'cliente é obrigatório';
  end if;

  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'cliente não encontrado';
  end if;

  if not exists (select 1 from public.plans pl where pl.key = p_plan and pl.is_active) then
    raise exception 'plano inválido ou inativo: %', p_plan;
  end if;

  if coalesce(array_length(p_module_keys, 1), 0) = 0 then
    raise exception 'nenhum módulo informado para o plano %', p_plan;
  end if;

  select array_agg(k)
    into v_faltando
    from unnest(p_module_keys) as k
   where not exists (select 1 from public.modules m where m.key = k);

  if v_faltando is not null then
    raise exception 'módulos inexistentes no catálogo: %', array_to_string(v_faltando, ', ');
  end if;

  update public.tenants
     set plan        = p_plan,
         monthly_fee = p_monthly_fee
   where id = p_tenant_id;

  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select p_tenant_id, k, true
    from unnest(p_module_keys) as k
  on conflict (tenant_id, module_key) do update set enabled = true;

  update public.tenant_modules
     set enabled = false
   where tenant_id = p_tenant_id
     and not (module_key = any (p_module_keys));
end;
$$;
