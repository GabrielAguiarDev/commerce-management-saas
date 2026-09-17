-- =====================================================================
-- HELPERS DOS TESTES — roda DEPOIS das migrations, só no container efêmero.
--
--   tests.seed()          cria os três negócios e as pessoas abaixo; cada
--                         arquivo de teste chama dentro da própria transação
--                         (que termina em ROLLBACK).
--   tests.login('nome')   simula uma requisição do PostgREST: JWT em
--                         `request.jwt.claims` + `set role authenticated`.
--                         Também zera os marcadores `aguiar.*_context`: no
--                         PostgREST cada requisição é uma transação nova, e
--                         `set_config(..., true)` dura até o FIM DA
--                         TRANSAÇÃO, não até o fim da função que o ligou.
--   tests.logout()        volta a ser o backend (postgres, sem JWT).
--   tests.uid('nome')     o uuid da pessoa.
--   tests.set_today(d)    congela `recurring_cost_today()` na transação.
--
-- Negócios e perfis:
--   A  módulos sales, products, stock, cash, costs, reports (sem `app`)
--      owner_a      Dono
--      seller_a     só vendas              {"modules": ["sales"]}
--      stock_a      só estoque             {"modules": ["stock"]}
--      cashier_a    só caixa               {"modules": ["cash"]}
--      reports_a    só relatórios          ["reports"]  (formato array)
--      suspended_a  vendas, mas suspenso
--   B  só o bundle `app`
--      owner_b      Dono
--      seller_b     {"modules": ["sales", "products"]} via bundle
--   C  todos os módulos, para provar isolamento entre negócios
--      owner_c      Dono
-- =====================================================================

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create table if not exists tests.people (
  name      text primary key,
  id        uuid not null unique,
  tenant_id uuid not null
);
grant select on tests.people to anon, authenticated, service_role;

create or replace function tests.uid(p_name text)
returns uuid
language sql
stable
as $$
  select id from tests.people where name = p_name;
$$;

create or replace function tests.tenant(p_key text)
returns uuid
language sql
immutable
as $$
  select case p_key
    when 'a' then '10000000-0000-0000-0000-00000000000a'::uuid
    when 'b' then '10000000-0000-0000-0000-00000000000b'::uuid
    when 'c' then '10000000-0000-0000-0000-00000000000c'::uuid
  end;
$$;

create or replace function tests.product(p_key text)
returns uuid
language sql
immutable
as $$
  select case p_key
    when 'a1' then 'd0000000-0000-0000-0000-0000000000a1'::uuid  -- controla estoque
    when 'a2' then 'd0000000-0000-0000-0000-0000000000a2'::uuid  -- serviço, sem estoque
    when 'b1' then 'd0000000-0000-0000-0000-0000000000b1'::uuid
    when 'c1' then 'd0000000-0000-0000-0000-0000000000c1'::uuid
  end;
$$;

create or replace function tests.reset_request()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('aguiar.cost_series_context', '', true);
  perform set_config('aguiar.sale_stock_context', '', true);
end;
$$;

create or replace function tests.login(p_name text)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  perform tests.reset_request();
  select id into v_id from tests.people where name = p_name;
  if v_id is null then
    raise exception 'pessoa de teste desconhecida: %', p_name;
  end if;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_id, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

-- A chave de serviço, como o PostgREST a entrega.
create or replace function tests.login_service()
returns void
language plpgsql
as $$
begin
  perform tests.reset_request();
  perform set_config('request.jwt.claims', '{"role": "service_role"}', true);
  execute 'set local role service_role';
end;
$$;

create or replace function tests.logout()
returns void
language plpgsql
as $$
begin
  perform tests.reset_request();
end;
$$;

-- Troca `recurring_cost_today()` por uma leitura de GUC. É DDL dentro da
-- transação do teste: some no ROLLBACK.
create or replace function tests.set_today(p_day date)
returns void
language plpgsql
as $$
begin
  perform set_config('tests.today', p_day::text, true);
  execute $f$
    create or replace function public.recurring_cost_today()
    returns date
    language sql
    stable
    set search_path = public, pg_temp
    as $body$
      select coalesce(
        nullif(current_setting('tests.today', true), '')::date,
        (now() at time zone 'America/Sao_Paulo')::date
      );
    $body$
  $f$;
end;
$$;

-- Quantas linhas de `p_rel` a sessão atual enxerga.
create or replace function tests.visible(p_rel text)
returns integer
language plpgsql
as $$
declare
  v integer;
begin
  execute format('select count(*) from %s', p_rel) into v;
  return v;
end;
$$;

-- Quantas linhas um comando de escrita afetou, na sessão atual.
create or replace function tests.affected(p_sql text)
returns integer
language plpgsql
as $$
declare
  v integer;
begin
  execute p_sql;
  get diagnostics v = row_count;
  return v;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

create or replace function tests.seed()
returns void
language plpgsql
as $$
declare
  v_role uuid;
  r record;
begin
  insert into public.modules (key, name) values
    ('sales', 'Vendas'), ('products', 'Produtos'), ('stock', 'Estoque'),
    ('cash', 'Caixa'), ('costs', 'Custos'), ('reports', 'Relatórios'),
    ('app', 'App')
  on conflict (key) do nothing;

  insert into public.tenants (id, name, plan) values
    (tests.tenant('a'), 'Negócio A', 'paid'),
    (tests.tenant('b'), 'Negócio B', 'free'),
    (tests.tenant('c'), 'Negócio C', 'paid');

  insert into public.tenant_modules (tenant_id, module_key)
  select tests.tenant('a'), k from unnest(array['sales','products','stock','cash','costs','reports']) k
  union all
  select tests.tenant('b'), 'app'
  union all
  select tests.tenant('c'), k from unnest(array['sales','products','stock','cash','costs','reports','app']) k;

  delete from tests.people;
  insert into tests.people (name, id, tenant_id) values
    ('owner_a',     'a0000000-0000-0000-0000-000000000001', tests.tenant('a')),
    ('seller_a',    'a0000000-0000-0000-0000-000000000002', tests.tenant('a')),
    ('stock_a',     'a0000000-0000-0000-0000-000000000003', tests.tenant('a')),
    ('cashier_a',   'a0000000-0000-0000-0000-000000000004', tests.tenant('a')),
    ('reports_a',   'a0000000-0000-0000-0000-000000000005', tests.tenant('a')),
    ('suspended_a', 'a0000000-0000-0000-0000-000000000006', tests.tenant('a')),
    ('owner_b',     'b0000000-0000-0000-0000-000000000001', tests.tenant('b')),
    ('seller_b',    'b0000000-0000-0000-0000-000000000002', tests.tenant('b')),
    ('owner_c',     'c0000000-0000-0000-0000-000000000001', tests.tenant('c'));

  insert into auth.users (id, email)
  select id, upper(name) || '@Example.com' from tests.people;

  for r in
    select * from (values
      ('owner_a',     'Dono',       '{"all": true}'::jsonb,                       true,  'active'),
      ('seller_a',    'Vendedor',   '{"modules": ["sales"]}'::jsonb,              false, 'active'),
      ('stock_a',     'Estoquista', '{"modules": ["stock"]}'::jsonb,              false, 'active'),
      ('cashier_a',   'Caixa',      '{"modules": ["cash"]}'::jsonb,               false, 'active'),
      ('reports_a',   'Gerente',    '["reports"]'::jsonb,                         false, 'active'),
      ('suspended_a', 'Suspenso',   '{"modules": ["sales"]}'::jsonb,              false, 'suspended'),
      ('owner_b',     'Dono',       '{"all": true}'::jsonb,                       true,  'active'),
      ('seller_b',    'Vendedor',   '{"modules": ["sales", "products"]}'::jsonb,  false, 'active'),
      ('owner_c',     'Dono',       '{"all": true}'::jsonb,                       true,  'active')
    ) as v(person, role_name, permissions, is_owner, status)
  loop
    insert into public.roles (tenant_id, name, permissions, is_owner)
    values ((select tenant_id from tests.people where name = r.person), r.role_name, r.permissions, r.is_owner)
    returning id into v_role;

    insert into public.profiles (id, tenant_id, role_id, full_name, status)
    select p.id, p.tenant_id, v_role, initcap(replace(p.name, '_', ' ')), r.status
      from tests.people p
     where p.name = r.person;
  end loop;

  insert into public.products (id, tenant_id, name, price, cost, stock_quantity, tracks_stock, is_service) values
    (tests.product('a1'), tests.tenant('a'), 'Ração 1kg', 10.00, 4.00, 100, true,  false),
    (tests.product('a2'), tests.tenant('a'), 'Banho',     50.00, 20.00,  0, false, true),
    (tests.product('b1'), tests.tenant('b'), 'Café',       5.00, 1.50,  10, true,  false),
    (tests.product('c1'), tests.tenant('c'), 'Pão',        1.00, 0.30,  50, true,  false);
end;
$$;

revoke all on function tests.seed() from anon, authenticated, service_role;
