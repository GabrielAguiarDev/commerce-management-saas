begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(16);

-- Trava usada só no teste de atomicidade (o último): despesa acima de 1000
-- falha no INSERT de `costs`, depois do movimento e do saldo.
alter table public.costs add constraint tmp_block_purchase check (amount < 1000) not valid;

select tests.login('stock_a');

select is(
  (record_stock_purchase(tests.product('a1'), 10, 3.33, '  NF 123  ', '2026-09-28',
                         'f4000000-0000-4000-8000-000000000001') ->> 'created')::boolean,
  true,
  'estoquista registra a compra'
);

select results_eq(
  $$ select type, quantity, unit_cost, reason, user_id
       from stock_movements
      where product_id = tests.product('a1') $$,
  $$ values ('in'::text, 10::numeric(10,3), 3.33::numeric(10,2), 'NF 123'::text, tests.uid('stock_a')) $$,
  'grava um movimento de entrada com custo e motivo'
);

-- Leitura como superusuário: `authenticated` não lê `products.cost`.
reset role;
select results_eq(
  $$ select stock_quantity, cost from products where id = tests.product('a1') $$,
  $$ values (110::numeric(10,3), 3.33::numeric(10,2)) $$,
  'saldo sobe e o custo do produto passa a ser o último pago'
);
select results_eq(
  $$ select description, type, category, amount, origin, is_recurring, cost_date,
            stock_movement_id = (select id from stock_movements where product_id = tests.product('a1'))
       from costs
      where id = 'f4000000-0000-4000-8000-000000000001' $$,
  $$ values ('Compra — Ração 1kg'::text, 'variable'::text, 'Materiais'::text, 33.30::numeric(10,2),
             'stock'::text, false, '2026-09-28'::date, true) $$,
  'a despesa entra arredondada em centavos e ligada ao movimento'
);

select tests.login('stock_a');
select is(
  (record_stock_purchase(tests.product('a1'), 10, 3.33, 'NF 123', '2026-09-28',
                         'f4000000-0000-4000-8000-000000000001') ->> 'created')::boolean,
  false,
  'reenvio idêntico é confirmado sem refazer'
);
select is(
  (select count(*)::int from stock_movements where product_id = tests.product('a1')),
  1,
  'reenvio não duplica o movimento'
);

select throws_ok(
  $$ select record_stock_purchase(tests.product('a1'), 11, 3.33, null, null,
                                  'f4000000-0000-4000-8000-000000000001') $$,
  '23505', null,
  'mesmo id com outra quantidade é rejeitado'
);

select throws_ok(
  $$ select record_stock_purchase(tests.product('a2'), 1, 5) $$,
  '22023', 'este produto não controla estoque',
  'serviço sem estoque é rejeitado'
);
select throws_ok(
  $$ select record_stock_purchase(tests.product('a1'), 0, 5) $$,
  '22023', null,
  'quantidade zero é rejeitada'
);
select throws_ok(
  $$ select record_stock_purchase(tests.product('a1'), 1, 0) $$,
  '22023', null,
  'custo zero é rejeitado (entrada sem custo segue por apply_stock_movement)'
);
select throws_ok(
  $$ select record_stock_purchase(tests.product('c1'), 1, 5) $$,
  '22023', 'produto não encontrado',
  'produto de outro negócio parece inexistente'
);

select tests.login('seller_a');
select throws_ok(
  $$ select record_stock_purchase(tests.product('a1'), 1, 5) $$,
  '42501', null,
  'vendedor sem módulo de estoque não compra mercadoria'
);

select tests.login('owner_c');
select throws_ok(
  $$ select record_stock_purchase(tests.product('c1'), 1, 5, null, null,
                                  'f4000000-0000-4000-8000-000000000001') $$,
  '23505', null,
  'outro negócio não confirma um id alheio como reenvio'
);
select is(
  (select stock_quantity from products where id = tests.product('c1')),
  50::numeric(10,3),
  'a colisão não mexe no saldo do outro negócio'
);

-- Atomicidade: se a despesa falhar, movimento e saldo voltam junto.
select tests.login('owner_a');

select throws_ok(
  $$ select record_stock_purchase(tests.product('a1'), 1000, 5) $$,
  '23514', null,
  'falha na despesa derruba a compra inteira'
);
select results_eq(
  $$ select (select stock_quantity from products where id = tests.product('a1')),
            (select count(*)::int from stock_movements where product_id = tests.product('a1')) $$,
  $$ values (110::numeric(10,3), 1) $$,
  'nem movimento nem saldo ficam para trás'
);

select * from finish();
rollback;
