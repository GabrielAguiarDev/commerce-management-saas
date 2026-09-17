-- Caixa: um aberto por negócio, esperado com reforço e sangria, fechamento
-- só por quem tem o módulo e só no próprio negócio.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(16);

select tests.login('cashier_a');
insert into cash_registers (id, tenant_id, opened_by, opening_amount)
values ('f0000000-0000-0000-0000-000000000001', tests.tenant('a'), tests.uid('cashier_a'), 100);

select throws_ok(
  $$ insert into cash_registers (tenant_id, opened_by, opening_amount) values (tests.tenant('a'), tests.uid('cashier_a'), 10) $$,
  '23505', null,
  'segundo caixa aberto no mesmo negócio é recusado'
);

select tests.login('owner_c');
select lives_ok(
  $$ insert into cash_registers (id, tenant_id, opened_by, opening_amount) values ('f0000000-0000-0000-0000-00000000000c', tests.tenant('c'), tests.uid('owner_c'), 10) $$,
  'outro negócio abre o próprio caixa ao mesmo tempo'
);
select throws_ok(
  $$ select close_cash_register('f0000000-0000-0000-0000-000000000001', 0) $$,
  '42501', null,
  'dono de C não fecha o caixa de A'
);
select throws_ok(
  $$ select expected_cash_for_register('f0000000-0000-0000-0000-000000000001') $$,
  '42501', null,
  'dono de C não lê o esperado do caixa de A'
);
select throws_ok(
  $$ insert into cash_movements (tenant_id, cash_register_id, type, amount) values (tests.tenant('a'), 'f0000000-0000-0000-0000-000000000001', 'deposit', 1) $$,
  '42501', null,
  'dono de C não lança movimento no caixa de A'
);

select tests.login('cashier_a');
insert into cash_movements (tenant_id, cash_register_id, user_id, type, amount) values
  (tests.tenant('a'), 'f0000000-0000-0000-0000-000000000001', tests.uid('cashier_a'), 'deposit', 50),
  (tests.tenant('a'), 'f0000000-0000-0000-0000-000000000001', tests.uid('cashier_a'), 'withdrawal', 20);
select throws_ok(
  $$ insert into cash_movements (tenant_id, cash_register_id, type, amount) values (tests.tenant('a'), 'f0000000-0000-0000-0000-000000000001', 'reinforcement', 1) $$,
  '23514', null,
  'tipo de movimento fora do vocabulário'
);

select tests.login('seller_a');
select create_sale('cash', '[{"product_name": "Avulso", "quantity": 1, "unit_price": 30}]'::jsonb);
select create_sale('pix',  '[{"product_name": "Avulso", "quantity": 1, "unit_price": 99}]'::jsonb);
select throws_ok(
  $$ insert into cash_movements (tenant_id, cash_register_id, type, amount) values (tests.tenant('a'), 'f0000000-0000-0000-0000-000000000001', 'withdrawal', 1) $$,
  '42501', null,
  'vendedor não faz sangria'
);
select throws_ok(
  $$ select close_cash_register('f0000000-0000-0000-0000-000000000001', 0) $$,
  '42501', null,
  'vendedor não fecha o caixa'
);

select tests.login('cashier_a');
select is(
  expected_cash_for_register('f0000000-0000-0000-0000-000000000001'),
  160::numeric,
  'esperado = abertura 100 + venda em dinheiro 30 + reforço 50 - sangria 20'
);
select throws_ok(
  $$ select expected_cash_for_register('f0000000-0000-0000-0000-0000000000ff') $$,
  'P0002', null,
  'caixa inexistente é erro'
);
select lives_ok(
  $$ select close_cash_register('f0000000-0000-0000-0000-000000000001', 155, 'faltou troco') $$,
  'caixa fecha o turno'
);
select results_eq(
  $$ select status, expected_cash, counted_cash, difference from cash_registers where id = 'f0000000-0000-0000-0000-000000000001' $$,
  $$ values ('closed'::text, 160.00::numeric(10,2), 155.00::numeric(10,2), -5.00::numeric(10,2)) $$,
  'fechamento grava esperado, contado e diferença'
);
select is(
  expected_cash_for_register('f0000000-0000-0000-0000-000000000001'),
  160::numeric,
  'esperado de caixa fechado continua o mesmo'
);
select lives_ok(
  $$ insert into cash_registers (tenant_id, opened_by, opening_amount) values (tests.tenant('a'), tests.uid('cashier_a'), 10) $$,
  'depois de fechar, abre outro'
);

select tests.login('stock_a');
select is(tests.visible('cash_registers'), 0, 'estoque não vê caixa');
select throws_ok(
  $$ select expected_cash_for_register('f0000000-0000-0000-0000-000000000001') $$,
  '42501', null,
  'estoque não lê o esperado do caixa'
);

select * from finish();
rollback;
