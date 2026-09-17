-- =====================================================================
-- SOBRAS DE AUTORIZAÇÃO (continuação de 20260917010000)
--
-- 1. `products.cost`. RLS filtra LINHA, não coluna: quem lê o catálogo para
--    vender (módulo `sales` ou o bundle `app`) lia também o custo. Agora:
--
--    * `authenticated` perde o SELECT de tabela em `products` e recebe
--      SELECT coluna a coluna, em todas MENOS `cost`. INSERT/UPDATE/DELETE
--      continuam como estavam (gravar o custo não exige poder lê-lo; quem
--      decide quem grava é o trigger `guard_product_module_write`).
--    * O custo passa a ser lido pela view `v_product_costs`
--      (product_id, tenant_id, cost), que só devolve linhas para:
--        - backend confiável e admin da plataforma;
--        - módulo `products` de verdade (sem o bundle `app`): quem mantém o
--          catálogo no portal digita o custo e precisa vê-lo para não
--          apagá-lo ao salvar;
--        - módulos `costs`, `stock` ou `reports` (margem, entrada de
--          mercadoria, relatórios).
--      Sem permissão a view volta VAZIA — não é erro.
--
--    CONSEQUÊNCIAS PARA QUEM LÊ `products` COM SESSÃO:
--      * `select('*')`, `returning *` e embeds `products(*)`/`products(cost)`
--        passam a falhar com 42501. Toda leitura precisa listar colunas.
--      * Coluna NOVA em `products` nasce sem SELECT para `authenticated`.
--        Depois de `alter table products add column ...`, rode
--        `select public.sync_product_column_grants();` na mesma migration.
--      * `service_role` não muda (portal-admin continua lendo o custo).
--
--    Objetos NÃO versionados que dependem do custo são conferidos antes:
--      * view `security_invoker` que lê `products.cost` → a migration PARA
--        (ela quebraria para todo mundo, inclusive o dono);
--      * função SECURITY INVOKER que lê `cost` ou `*` de `products`:
--        `apply_stock_movement` vira SECURITY DEFINER (as guardas de
--        20260917010000 continuam valendo lá dentro, por trigger); qualquer
--        outra → a migration PARA com a lista.
--
-- 2. `support_messages`. A policy de UPDATE de 20260917010000 só exigia ser
--    membro do tenant: uma sessão comum podia trocar `sender_side` para
--    'support' e forjar uma resposta da equipe. Um trigger agora impede o
--    cliente de mudar identidade e conteúdo da mensagem, e de ligar uma
--    mensagem a chamado de outro negócio.
--
-- Esta migration NÃO toca no fluxo fiscal.
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Pré-condições
-- ---------------------------------------------------------------------
do $$
declare
  v_missing text;
begin
  select string_agg(f, ', ')
    into v_missing
    from unnest(array[
      'public.current_tenant_id()',
      'public.is_platform_admin()',
      'public.current_actor_can_use_module(text, boolean)',
      'public.current_actor_can_use_any_module(text[])',
      'public.request_is_trusted_backend()'
    ]) as f
   where to_regprocedure(f) is null;

  if v_missing is not null then
    raise exception using message = format('funções ausentes: %s', v_missing);
  end if;

  select string_agg(format('%s.%s', r.t, r.c), ', ')
    into v_missing
    from (values
      ('products', 'id'),
      ('products', 'tenant_id'),
      ('products', 'cost'),
      ('support_messages', 'tenant_id'),
      ('support_messages', 'ticket_id'),
      ('support_messages', 'sender_side'),
      ('support_tickets', 'id'),
      ('support_tickets', 'tenant_id')
    ) as r(t, c)
   where not exists (
     select 1
       from information_schema.columns ic
      where ic.table_schema = 'public'
        and ic.table_name = r.t
        and ic.column_name = r.c
   );

  if v_missing is not null then
    raise exception using message = format('colunas ausentes: %s', v_missing);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Quem pode ver o custo
-- ---------------------------------------------------------------------

-- 'all'    → backend confiável ou admin da plataforma (todos os tenants);
-- 'tenant' → perfil do tenant com products (sem `app`), costs, stock ou reports;
-- 'none'   → o resto.
create or replace function public.current_actor_product_cost_scope()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.request_is_trusted_backend() then
    return 'all';
  end if;
  if public.is_platform_admin() then
    return 'all';
  end if;
  if public.current_actor_can_use_module('products', false)
     or public.current_actor_can_use_any_module(array['costs', 'stock', 'reports']) then
    return 'tenant';
  end if;
  return 'none';
end;
$$;

revoke all on function public.current_actor_product_cost_scope() from public, anon;
grant execute on function public.current_actor_product_cost_scope() to authenticated, service_role;

comment on function public.current_actor_product_cost_scope() is
  'Escopo de leitura de products.cost: all (backend/admin), tenant (products sem bundle app, costs, stock ou reports) ou none.';

-- ---------------------------------------------------------------------
-- 2. Conferência dos objetos que leem `products.cost`
-- ---------------------------------------------------------------------
do $$
declare
  v_products regclass := to_regclass('public.products');
  v_cost     smallint;
  v_bad      text;
  f          record;
begin
  select a.attnum
    into v_cost
    from pg_attribute a
   where a.attrelid = v_products
     and a.attname = 'cost'
     and not a.attisdropped;

  -- 2a. Views security_invoker que dependem da coluna. Views comuns rodam
  --     com o privilégio do dono e continuam funcionando.
  select string_agg(distinct v.oid::regclass::text, ', ')
    into v_bad
    from pg_depend d
    join pg_rewrite rw on rw.oid = d.objid
    join pg_class v on v.oid = rw.ev_class
   where d.classid = 'pg_rewrite'::regclass
     and d.refclassid = 'pg_class'::regclass
     and d.refobjid = v_products
     and d.refobjsubid = v_cost
     and v.oid <> v_products
     and v.oid is distinct from to_regclass('public.v_product_costs')
     and exists (
       select 1
         from unnest(coalesce(v.reloptions, '{}'::text[])) as o
        where lower(o) in ('security_invoker=true', 'security_invoker=on',
                           'security_invoker=1', 'security_invoker=yes')
     );

  if v_bad is not null then
    raise exception using
      message = format('views security_invoker leem products.cost: %s', v_bad),
      hint = 'Reescreva-as lendo o custo de public.v_product_costs antes de aplicar esta migration.';
  end if;

  -- 2b. Policies que citam a coluna (rodam com o privilégio de quem consulta).
  select string_agg(distinct format('%s on %s', pol.polname, pol.polrelid::regclass), ', ')
    into v_bad
    from pg_depend d
    join pg_policy pol on pol.oid = d.objid
   where d.classid = 'pg_policy'::regclass
     and d.refclassid = 'pg_class'::regclass
     and d.refobjid = v_products
     and d.refobjsubid = v_cost;

  if v_bad is not null then
    raise exception using message = format('policies leem products.cost: %s', v_bad);
  end if;

  -- 2c. Funções SECURITY INVOKER do schema public. O corpo não entra em
  --     pg_depend, então a checagem é textual, por comando: um comando que
  --     cita `products` e também `cost`, `select *`/`returning *` ou um
  --     `x.*`. Falso positivo só faz a migration parar ou tornar
  --     `apply_stock_movement` DEFINER — nunca deixa passar uma leitura.
  v_bad := null;
  for f in
    select p.oid,
           p.proname,
           format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) as sig
      from pg_proc p
      join pg_language l on l.oid = p.prolang
     where p.pronamespace = 'public'::regnamespace
       and p.prokind = 'f'
       and not p.prosecdef
       and l.lanname in ('sql', 'plpgsql')
       -- Criada na seção 3; só mexe em privilégios (reaplicação).
       and p.proname <> 'sync_product_column_grants'
       and exists (
         select 1
           from regexp_split_to_table(pg_get_functiondef(p.oid), ';') as stmt
          where stmt ~* '\mproducts\M'
            and (
              stmt ~* '\mcost\M'
              or stmt ~* '\m(select|returning)\s+([a-z_][a-z0-9_]*\.)?\*'
              or stmt ~* '\m[a-z_][a-z0-9_]*\.\*'
            )
       )
  loop
    if f.proname = 'apply_stock_movement' then
      execute format('alter function %s security definer', f.sig);
      execute format('alter function %s set search_path = public, pg_temp', f.sig);
      raise notice '% passou a SECURITY DEFINER para continuar lendo products.cost; escrita segue coberta pelas guardas de 20260917010000', f.sig;
    else
      v_bad := concat_ws(', ', v_bad, f.sig);
    end if;
  end loop;

  if v_bad is not null then
    raise exception using
      message = format('funções SECURITY INVOKER parecem ler products.cost ou products.*: %s', v_bad),
      hint = 'Revise-as (colunas explícitas ou v_product_costs) antes de aplicar esta migration.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Privilégios de coluna em `products`
-- ---------------------------------------------------------------------

-- Reaplica o SELECT coluna a coluna. Chamar depois de toda coluna nova.
create or replace function public.sync_product_column_grants()
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
    into v_cols
    from pg_attribute a
   where a.attrelid = 'public.products'::regclass
     and a.attnum > 0
     and not a.attisdropped
     and a.attname <> 'cost';

  -- SELECT de tabela vale para todas as colunas e anularia o revoke abaixo.
  execute 'revoke select on table public.products from public, anon, authenticated';
  execute 'revoke select (cost) on table public.products from public, anon, authenticated';
  execute format('grant select (%s) on table public.products to authenticated', v_cols);
end;
$$;

revoke all on function public.sync_product_column_grants() from public, anon, authenticated;

comment on function public.sync_product_column_grants() is
  'Concede SELECT em todas as colunas de products, menos cost, para authenticated. Rodar após adicionar coluna em products.';

select public.sync_product_column_grants();

comment on column public.products.cost is
  'Custo unitário. Sem SELECT para authenticated: ler por public.v_product_costs.';

-- ---------------------------------------------------------------------
-- 4. Leitura do custo
--
-- View comum (roda com o privilégio do dono, que lê a coluna e ignora o RLS);
-- por isso o filtro de tenant está aqui dentro. `security_barrier` impede que
-- um filtro do chamador rode antes dele. O CASE só avalia o tenant quando o
-- escopo pede.
-- ---------------------------------------------------------------------
create or replace view public.v_product_costs
with (security_invoker = false, security_barrier = true)
as
select p.id as product_id,
       p.tenant_id,
       p.cost
  from public.products p
 where case (select public.current_actor_product_cost_scope())
         when 'all' then true
         when 'tenant' then p.tenant_id = (select public.current_tenant_id())
         else false
       end;

revoke all on table public.v_product_costs from public, anon, authenticated;
grant select on table public.v_product_costs to authenticated, service_role;

comment on view public.v_product_costs is
  'Custo dos produtos. Vazia para quem não tem products (sem bundle app), costs, stock ou reports. Única leitura de products.cost com sessão.';

-- ---------------------------------------------------------------------
-- 5. Guarda de `support_messages`
--
-- Para sessão comum (não admin da plataforma, não backend):
--   * INSERT/UPDATE: o chamado precisa ser visível e do mesmo tenant da
--     mensagem (o SELECT abaixo passa pelo RLS de `support_tickets`), e o
--     autor, quando informado, é quem está logado;
--   * UPDATE: identidade e conteúdo são imutáveis, e o cliente não marca
--     como lida a própria mensagem (quem lê é o suporte).
-- As colunas são lidas pelo JSON da linha: `sender_id` pode não existir em
-- todo ambiente sem que o trigger quebre.
-- ---------------------------------------------------------------------
create or replace function public.guard_support_message_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_new     jsonb;
  v_changed text[];
begin
  if public.request_is_trusted_backend() then
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if public.is_platform_admin() then
    return new;
  end if;

  v_new := to_jsonb(new);

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key), '{}'::text[])
      into v_changed
      from jsonb_each(v_new) as n
      join jsonb_each(to_jsonb(old)) as o on o.key = n.key
     where n.value is distinct from o.value;

    if v_changed && array[
      'id', 'tenant_id', 'ticket_id', 'sender_id', 'sender_side',
      'body', 'attachment_url', 'created_at'
    ] then
      raise exception using errcode = '42501', message = 'mensagem de suporte não pode ser alterada';
    end if;

    if 'read_by_recipient' = any(v_changed) and old.sender_side = 'client' then
      raise exception using errcode = '42501', message = 'a leitura desta mensagem é marcada pelo suporte';
    end if;
  end if;

  if v_new ? 'sender_id'
     and v_new->>'sender_id' is not null
     and v_new->>'sender_id' is distinct from auth.uid()::text then
    raise exception using errcode = '42501', message = 'autor da mensagem inválido';
  end if;

  if not exists (
    select 1
      from public.support_tickets t
     where t.id = new.ticket_id
       and t.tenant_id = new.tenant_id
  ) then
    raise exception using errcode = '42501', message = 'chamado de outro negócio';
  end if;

  return new;
end;
$$;

comment on function public.guard_support_message_write() is
  'Impede sessão comum de forjar autor/lado, mudar conteúdo ou ligar mensagem a chamado de outro tenant em support_messages.';

revoke all on function public.guard_support_message_write() from public, anon, authenticated;

drop trigger if exists guard_support_message_write on public.support_messages;
create trigger guard_support_message_write
  before insert or update on public.support_messages
  for each row execute function public.guard_support_message_write();
