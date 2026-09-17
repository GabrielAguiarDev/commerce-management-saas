-- Isolamento entre negócios: o dono de C tem todos os módulos, e mesmo assim
-- não enxerga nem altera nada de A.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(18);

-- Dados de A criados pela própria sessão de A.
select tests.login('owner_a');
select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "Ração", "quantity": 1, "unit_price": 10}]'::jsonb,
                   p_id => 'e0000000-0000-0000-0000-00000000000a');
select save_manual_cost(null, 'Luz', 'fixed', null, 80, current_date, false);
insert into cash_registers (tenant_id, opened_by, opening_amount)
values (tests.tenant('a'), tests.uid('owner_a'), 50);
insert into support_tickets (tenant_id, opened_by, subject)
values (tests.tenant('a'), tests.uid('owner_a'), 'Ajuda');

select tests.login('owner_c');

select is((select count(*)::int from products), 1, 'C vê só o próprio produto');
select is((select count(*)::int from products where tenant_id = tests.tenant('a')), 0, 'C não vê produtos de A');
select is((select count(*)::int from sales where tenant_id = tests.tenant('a')), 0, 'C não vê vendas de A');
select is((select count(*)::int from sale_items where tenant_id = tests.tenant('a')), 0, 'C não vê itens de venda de A');
select is((select count(*)::int from costs where tenant_id = tests.tenant('a')), 0, 'C não vê custos de A');
select is((select count(*)::int from cash_registers where tenant_id = tests.tenant('a')), 0, 'C não vê caixas de A');
select is((select count(*)::int from support_tickets where tenant_id = tests.tenant('a')), 0, 'C não vê chamados de A');
select is((select count(*)::int from profiles where tenant_id = tests.tenant('a')), 0, 'C não vê a equipe de A');
select is((select count(*)::int from roles where tenant_id = tests.tenant('a')), 0, 'C não vê os tipos de acesso de A');
select is((select count(*)::int from tenants), 1, 'C vê só o próprio negócio');
select is(
  (select count(*)::int from v_product_costs where tenant_id = tests.tenant('a')),
  0,
  'v_product_costs não vaza custo de A para C'
);

select is(
  tests.affected($$ update products set price = 99 where id = tests.product('a1') $$),
  0,
  'C não altera produto de A'
);
select throws_ok(
  $$ insert into products (tenant_id, name, price) values (tests.tenant('a'), 'Intruso', 1) $$,
  '42501', null,
  'C não cria produto em A'
);
select throws_ok(
  $$ insert into costs (tenant_id, description, type, amount) values (tests.tenant('a'), 'Intruso', 'fixed', 1) $$,
  '42501', null,
  'C não cria custo em A'
);
select throws_ok(
  $$ select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$,
  '23503', null,
  'create_sale recusa produto de outro negócio'
);
select throws_ok(
  $$ select set_sale_refunded('e0000000-0000-0000-0000-00000000000a', true) $$,
  'P0002', null,
  'C não estorna venda de A'
);
select is(
  tests.affected($$ update tenants set name = 'Hack' where id = tests.tenant('a') $$),
  0,
  'C não renomeia o negócio A'
);

select tests.logout();
set local role anon;
select is((select count(*)::int from sales), 0, 'anon não vê vendas');

select * from finish();
rollback;
