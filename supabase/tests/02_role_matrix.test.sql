-- Matriz de acesso por perfil, dentro do negócio A (e do B, só com o bundle).
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(59);

-- Um pouco de cada coisa em A, lançado pelo dono.
select tests.login('owner_a');
select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "Ração", "quantity": 1, "unit_price": 10}]'::jsonb);
select save_manual_cost(null, 'Luz', 'fixed', null, 80, current_date, false);
insert into cash_registers (tenant_id, opened_by, opening_amount)
values (tests.tenant('a'), tests.uid('owner_a'), 50);
insert into support_tickets (tenant_id, opened_by, subject)
values (tests.tenant('a'), tests.uid('owner_a'), 'Ajuda');

-- ---------------------------------------------------------------- dono
select is(tests.visible('products'), 2, 'dono: produtos');
select is(tests.visible('sales'), 1, 'dono: vendas');
select is(tests.visible('costs'), 1, 'dono: custos');
select is(tests.visible('cash_registers'), 1, 'dono: caixa');
select ok(tests.visible('stock_movements') > 0, 'dono: movimentos de estoque');
select is(tests.visible('v_product_costs'), 2, 'dono: custo dos produtos');
select is(tests.visible('v_daily_sales'), 1, 'dono: vendas por dia');
select ok(tests.visible('v_monthly_result') > 0, 'dono: resultado do mês');
select lives_ok($$ insert into products (tenant_id, name, price) values (tests.tenant('a'), 'Novo', 3) $$, 'dono: cria produto');

-- ---------------------------------------------------------- só vendas
select tests.login('seller_a');
select is(tests.visible('products'), 3, 'vendas: lê o catálogo');
select is(tests.visible('sales'), 1, 'vendas: vendas');
select is(tests.visible('costs'), 0, 'vendas: não vê custos');
select is(tests.visible('cash_registers'), 0, 'vendas: não vê caixa');
select is(tests.visible('stock_movements'), 0, 'vendas: não vê movimentos de estoque');
select is(tests.visible('v_product_costs'), 0, 'vendas: v_product_costs vazia');
select is(tests.visible('v_monthly_result'), 0, 'vendas: não vê resultado do mês');
select is(tests.visible('support_tickets'), 1, 'vendas: vê os chamados do negócio');
select lives_ok($$ select create_sale('pix', '[{"product_name": "Avulso", "quantity": 1, "unit_price": 2}]'::jsonb) $$, 'vendas: vende');
select throws_ok($$ select save_manual_cost(null, 'x', 'fixed', null, 1, current_date, false) $$, '42501', null, 'vendas: não lança custo');
select throws_ok($$ insert into products (tenant_id, name, price) values (tests.tenant('a'), 'x', 1) $$, '42501', null, 'vendas: não cria produto');
select throws_ok($$ update products set price = 1 where id = tests.product('a1') $$, '42501', null, 'vendas: não muda preço');
select throws_ok($$ insert into cash_registers (tenant_id, opening_amount) values (tests.tenant('a'), 1) $$, '42501', null, 'vendas: não abre caixa');

-- --------------------------------------------------------- só estoque
select tests.login('stock_a');
select is(tests.visible('products'), 3, 'estoque: lê o catálogo');
select is(tests.visible('sales'), 0, 'estoque: não vê vendas');
select is(tests.visible('costs'), 0, 'estoque: não vê custos');
select is(tests.visible('cash_registers'), 0, 'estoque: não vê caixa');
select is(tests.visible('v_product_costs'), 3, 'estoque: lê o custo dos produtos');
select ok(tests.visible('stock_movements') > 0, 'estoque: vê movimentos');
select lives_ok($$ select apply_stock_movement(tests.product('a1'), 'in', 5, 'Compra', 4, null) $$, 'estoque: movimenta estoque');
select lives_ok($$ update products set cost = 4.5 where id = tests.product('a1') $$, 'estoque: atualiza custo');
select throws_ok($$ update products set price = 1 where id = tests.product('a1') $$, '42501', null, 'estoque: não muda preço');
select throws_ok($$ select create_sale('cash', '[{"product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '42501', null, 'estoque: não vende');

-- ----------------------------------------------------------- só caixa
select tests.login('cashier_a');
select is(tests.visible('products'), 0, 'caixa: não lê o catálogo');
select is(tests.visible('sales'), 2, 'caixa: vê vendas (conferência)');
select is(tests.visible('costs'), 0, 'caixa: não vê custos');
select is(tests.visible('cash_registers'), 1, 'caixa: vê caixa');
select is(tests.visible('v_product_costs'), 0, 'caixa: v_product_costs vazia');
select throws_ok($$ select create_sale('cash', '[{"product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '42501', null, 'caixa: não vende');

-- ------------------------------------------------------ só relatórios
select tests.login('reports_a');
select is(tests.visible('products'), 3, 'relatórios: lê o catálogo');
select is(tests.visible('sales'), 2, 'relatórios: vê vendas');
select is(tests.visible('costs'), 1, 'relatórios: vê custos');
select is(tests.visible('cash_registers'), 0, 'relatórios: não vê caixa');
select is(tests.visible('v_product_costs'), 3, 'relatórios: lê o custo dos produtos');
select ok(tests.visible('v_monthly_result') > 0, 'relatórios: resultado do mês');
select throws_ok($$ select create_sale('cash', '[{"product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '42501', null, 'relatórios: não vende');
select throws_ok($$ select save_manual_cost(null, 'x', 'fixed', null, 1, current_date, false) $$, '42501', null, 'relatórios: não lança custo pela RPC');
select throws_ok($$ insert into costs (tenant_id, description, type, amount) values (tests.tenant('a'), 'x', 'fixed', 1) $$, '42501', null, 'relatórios: não lança custo direto');

-- -------------------------------------------------------- bundle app
select tests.login('owner_b');
select is(tests.visible('products'), 1, 'app: lê o catálogo');
select is(tests.visible('v_product_costs'), 0, 'app: v_product_costs vazia (bundle não vale para custo)');
select is(tests.visible('costs'), 0, 'app: não vê custos');
select lives_ok($$ select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000b1", "product_name": "Café", "quantity": 1, "unit_price": 5}]'::jsonb) $$, 'app: vende');
select throws_ok($$ select save_manual_cost(null, 'x', 'fixed', null, 1, current_date, false) $$, '42501', null, 'app: não lança custo');
select tests.login('seller_b');
select lives_ok($$ insert into products (tenant_id, name, price) values (tests.tenant('b'), 'Chá', 4) $$, 'app: funcionário com products cria produto');
select is(tests.visible('sales'), 1, 'app: funcionário vê vendas');

-- ----------------------------------------------------------- suspenso
select tests.login('suspended_a');
select is(tests.visible('products'), 0, 'suspenso: não lê o catálogo');
select is(tests.visible('sales'), 0, 'suspenso: não vê vendas');
select is(tests.visible('support_tickets'), 0, 'suspenso: não vê chamados');
select is(tests.visible('v_daily_sales'), 0, 'suspenso: relatório vazio');
select throws_ok($$ select create_sale('cash', '[{"product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '42501', null, 'suspenso: não vende');

select * from finish();
rollback;
