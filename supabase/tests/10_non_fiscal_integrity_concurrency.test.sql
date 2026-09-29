-- Integridade nao fiscal que exige sessoes de banco realmente concorrentes.
-- Este arquivo usa dblink apenas no Postgres efemero de testes.
set search_path = public, extensions, tests;

select tests.seed();
select plan(21);

-- O trigger legado verificava `entry`, valor que o CHECK da tabela nunca
-- aceitou. Ele nao pode ser simplesmente trocado para `in`: portal e mobile
-- ja gravam o custo da compra explicitamente e isso duplicaria a despesa.
select is(
  (select count(*)::int
     from pg_trigger
    where tgrelid = 'public.stock_movements'::regclass
      and tgname = 'trg_cost_from_stock'
      and not tgisinternal),
  0,
  'o trigger morto de custo por entrada foi removido'
);
select is(
  to_regprocedure('public.cost_from_stock_entry()'),
  null::regprocedure,
  'a funcao inacessivel do trigger tambem foi removida'
);

insert into public.stock_movements (
  id, tenant_id, product_id, user_id, type, quantity, unit_cost, reason
) values (
  'f1000000-0000-0000-0000-000000000001',
  tests.tenant('a'), tests.product('a1'), tests.uid('stock_a'),
  'in', 3, 4.25, 'Compra registrada pelo cliente'
);
select is(
  (select count(*)::int from public.costs
    where tenant_id = tests.tenant('a') and origin = 'stock'),
  0,
  'entrada com custo unitario nao cria despesa implicita'
);

-- Simula a escrita explicita feita pelos clientes atuais depois do RPC.
insert into public.costs (
  tenant_id, user_id, description, type, category, amount, origin, cost_date
) values (
  tests.tenant('a'), tests.uid('stock_a'), 'Compra — Racao 1kg',
  'variable', 'Materiais', 12.75, 'stock', current_date
);
select is(
  (select count(*)::int from public.costs
    where tenant_id = tests.tenant('a') and origin = 'stock'),
  1,
  'a escrita explicita do cliente resulta em uma unica despesa'
);
select is(
  (select amount from public.costs
    where tenant_id = tests.tenant('a') and origin = 'stock'),
  12.75::numeric(10,2),
  'a unica despesa preserva quantidade vezes custo unitario'
);

-- Cada helper roda em sua propria transacao dblink. O primeiro segura a
-- chave unica durante pg_sleep; o segundo necessariamente disputa o mesmo
-- indice antes de o primeiro commitar.
create or replace function tests.concurrent_open_cash(
  p_id uuid,
  p_delay_seconds double precision default 0
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
begin
  insert into public.cash_registers (
    id, tenant_id, opened_by, opening_amount, status
  ) values (
    p_id, tests.tenant('a'), tests.uid('cashier_a'), 10, 'open'
  );
  perform pg_sleep(p_delay_seconds);
  return 'inserted';
exception
  when unique_violation then
    return sqlstate;
end;
$$;

create or replace function tests.concurrent_create_sale(
  p_id uuid,
  p_delay_seconds double precision default 0
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', tests.uid('seller_a'),
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true
  );

  perform public.create_sale(
    'cash',
    jsonb_build_array(jsonb_build_object(
      'product_id', tests.product('a1'),
      'product_name', 'Racao 1kg',
      'quantity', 2,
      'unit_price', 10
    )),
    p_id => p_id
  );
  perform pg_sleep(p_delay_seconds);
  return 'inserted';
exception
  when unique_violation then
    return sqlstate;
end;
$$;

create temporary table concurrency_results (
  scenario text not null,
  attempt text not null,
  result text not null
);

select extensions.dblink_connect_u(
  'cash_first',
  'host=127.0.0.1 dbname=postgres user=postgres password=postgres'
);
select extensions.dblink_connect_u(
  'cash_second',
  'host=127.0.0.1 dbname=postgres user=postgres password=postgres'
);
select is(
  extensions.dblink_send_query(
    'cash_first',
    $$select tests.concurrent_open_cash('f2000000-0000-0000-0000-000000000001', 0.75)$$
  ),
  1,
  'primeira abertura concorrente foi enviada'
);
select pg_sleep(0.15);
select is(
  extensions.dblink_send_query(
    'cash_second',
    $$select tests.concurrent_open_cash('f2000000-0000-0000-0000-000000000002', 0)$$
  ),
  1,
  'segunda abertura concorrente foi enviada enquanto a primeira segurava o lock'
);
insert into concurrency_results
select 'cash', 'first', result
  from extensions.dblink_get_result('cash_first') as r(result text);
insert into concurrency_results
select 'cash', 'second', result
  from extensions.dblink_get_result('cash_second') as r(result text);
select extensions.dblink_disconnect('cash_first');
select extensions.dblink_disconnect('cash_second');

select results_eq(
  $$ select result from concurrency_results where scenario = 'cash' order by result $$,
  $$ values ('23505'::text), ('inserted'::text) $$,
  'duas aberturas sobrepostas produzem um sucesso e uma violacao unica'
);
select is(
  (select count(*)::int from public.cash_registers
    where tenant_id = tests.tenant('a') and status = 'open'),
  1,
  'somente um caixa fica aberto depois da corrida'
);

select extensions.dblink_connect_u(
  'sale_first',
  'host=127.0.0.1 dbname=postgres user=postgres password=postgres'
);
select extensions.dblink_connect_u(
  'sale_second',
  'host=127.0.0.1 dbname=postgres user=postgres password=postgres'
);
select is(
  extensions.dblink_send_query(
    'sale_first',
    $$select tests.concurrent_create_sale('e2000000-0000-0000-0000-000000000001', 0.75)$$
  ),
  1,
  'primeira criacao da venda foi enviada'
);
select pg_sleep(0.15);
select is(
  extensions.dblink_send_query(
    'sale_second',
    $$select tests.concurrent_create_sale('e2000000-0000-0000-0000-000000000001', 0)$$
  ),
  1,
  'retry simultaneo com o mesmo id foi enviado durante a primeira transacao'
);
insert into concurrency_results
select 'sale', 'first', result
  from extensions.dblink_get_result('sale_first') as r(result text);
insert into concurrency_results
select 'sale', 'second', result
  from extensions.dblink_get_result('sale_second') as r(result text);
select extensions.dblink_disconnect('sale_first');
select extensions.dblink_disconnect('sale_second');

select results_eq(
  $$ select result from concurrency_results where scenario = 'sale' order by result $$,
  $$ values ('23505'::text), ('inserted'::text) $$,
  'venda e retry sobrepostos produzem um sucesso e um 23505 recuperavel'
);
select is(
  (select count(*)::int from public.sales
    where id = 'e2000000-0000-0000-0000-000000000001'),
  1,
  'a corrida persiste uma unica venda'
);
select is(
  (select count(*)::int from public.sale_items
    where sale_id = 'e2000000-0000-0000-0000-000000000001'),
  1,
  'a corrida persiste os itens uma unica vez'
);
select is(
  (select count(*)::int from public.stock_movements
    where sale_id = 'e2000000-0000-0000-0000-000000000001'),
  1,
  'a corrida baixa o estoque uma unica vez'
);
select is(
  (select stock_quantity from public.products where id = tests.product('a1')),
  98::numeric,
  'a corrida reduz o saldo somente pela venda vencedora'
);

select extensions.dblink_connect_u(
  'sale_retry',
  'host=127.0.0.1 dbname=postgres user=postgres password=postgres'
);
insert into concurrency_results
select 'sale_retry', 'after_commit', result
  from extensions.dblink(
    'sale_retry',
    $$select tests.concurrent_create_sale('e2000000-0000-0000-0000-000000000001', 0)$$
  ) as r(result text);
select extensions.dblink_disconnect('sale_retry');

select is(
  (select result from concurrency_results where scenario = 'sale_retry'),
  '23505',
  'retry depois do commit tambem reconhece o id ja persistido'
);
select is(
  (select count(*)::int from public.sales
    where id = 'e2000000-0000-0000-0000-000000000001'),
  1,
  'retry posterior nao duplica a venda'
);
select is(
  (select count(*)::int from public.sale_items
    where sale_id = 'e2000000-0000-0000-0000-000000000001'),
  1,
  'retry posterior nao duplica itens'
);
select is(
  (select count(*)::int from public.stock_movements
    where sale_id = 'e2000000-0000-0000-0000-000000000001'),
  1,
  'retry posterior nao duplica movimento de estoque'
);
select is(
  (select stock_quantity from public.products where id = tests.product('a1')),
  98::numeric,
  'retry posterior nao baixa o estoque novamente'
);

select * from finish();

-- Este teste precisa commitar fixtures para que outras conexoes as enxerguem;
-- limpe o estado compartilhado em vez de depender de rollback local.
delete from public.tenants
 where id in (tests.tenant('a'), tests.tenant('b'), tests.tenant('c'));
delete from auth.users
 where id in (select id from tests.people);
delete from tests.people;
