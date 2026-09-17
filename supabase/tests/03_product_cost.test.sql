-- products.cost: só se lê por v_product_costs, e só quem pode.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(16);

-- Vendedor
select tests.login('seller_a');
select throws_ok($$ select cost from products $$, '42501', null, 'vendedor: SELECT cost é recusado');
select throws_ok($$ select * from products $$, '42501', null, 'vendedor: SELECT * é recusado');
select throws_ok($$ select p.name, p.cost from sale_items si join products p on p.id = si.product_id $$, '42501', null, 'vendedor: join lendo cost é recusado');
select lives_ok($$ select id, name, price, stock_quantity from products $$, 'vendedor: colunas explícitas funcionam');
select is_empty($$ select * from v_product_costs $$, 'vendedor: v_product_costs vazia');
select is_empty(
  $$ select 1 from v_product_costs where tenant_id = tests.tenant('a') or true $$,
  'vendedor: filtro do chamador não fura a view (security_barrier)'
);

-- Estoque
select tests.login('stock_a');
select throws_ok($$ select cost from products $$, '42501', null, 'estoque: SELECT cost direto continua recusado');
select results_eq(
  $$ select product_id, cost from v_product_costs order by product_id $$,
  $$ values (tests.product('a1'), 4.00::numeric(10,2)), (tests.product('a2'), 20.00::numeric(10,2)) $$,
  'estoque: lê o custo dos produtos do próprio negócio'
);

-- Dono grava o custo sem precisar lê-lo na mesma instrução
select tests.login('owner_a');
select lives_ok($$ update products set cost = 5.25 where id = tests.product('a1') $$, 'dono: grava o custo');
select throws_ok($$ update products set cost = 6 where id = tests.product('a1') returning * $$, '42501', null, 'dono: returning * é recusado');
select is(
  (select cost from v_product_costs where product_id = tests.product('a1')),
  5.25::numeric(10,2),
  'dono: v_product_costs mostra o valor gravado'
);

-- Bundle app
select tests.login('owner_b');
select is_empty($$ select * from v_product_costs $$, 'app: v_product_costs vazia');

-- Admin da plataforma e backend enxergam tudo
select tests.logout();
select is((select count(*)::int from v_product_costs), 4, 'backend (conexão direta): todos os produtos');
select tests.login_service();
select is((select count(*)::int from v_product_costs), 4, 'service_role: todos os produtos');
select lives_ok($$ select cost from products $$, 'service_role: lê products.cost direto');

-- Anônimo
select tests.logout();
set local role anon;
select throws_ok($$ select * from v_product_costs $$, '42501', null, 'anon: sem acesso à view');

select * from finish();
rollback;
