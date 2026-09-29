begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(4);

-- A sessão em UTC, como a do PostgREST: é nela que o bug aparecia.
set local timezone = 'UTC';

select tests.login('owner_a');

-- 22:30 em Brasília do dia 09/01 = 01:30 UTC do dia 10/01.
select create_sale('cash',
  jsonb_build_array(jsonb_build_object('product_id', tests.product('a1'), 'product_name', 'Ração 1kg',
                                       'quantity', 1, 'unit_price', 10)),
  null, null, '2026-01-10 01:30:00+00');
-- 22:30 em Brasília do último dia do mês = 01:30 UTC do dia 1º.
select create_sale('pix',
  jsonb_build_array(jsonb_build_object('product_id', tests.product('a1'), 'product_name', 'Ração 1kg',
                                       'quantity', 2, 'unit_price', 10)),
  null, null, '2026-02-01 01:30:00+00');

select results_eq(
  $$ select sales_count::int, revenue from v_daily_sales where day = '2026-01-09' $$,
  $$ values (1, 10.00::numeric) $$,
  'venda das 22h30 conta no dia de Brasília'
);
select is_empty(
  $$ select 1 from v_daily_sales where day = '2026-01-10' $$,
  'e não no dia seguinte do UTC'
);

select results_eq(
  $$ select revenue from v_monthly_result where month = '2026-01-01' $$,
  $$ values (30.00::numeric) $$,
  'venda das 22h30 do último dia do mês fica no mês dela'
);
select is_empty(
  $$ select 1 from v_monthly_result where month = '2026-02-01' and revenue > 0 $$,
  'e não vaza para o mês seguinte'
);

select * from finish();
rollback;
