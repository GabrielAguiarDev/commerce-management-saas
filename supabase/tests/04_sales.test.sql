-- create_sale (idempotência pelo id do aparelho), set_sale_refunded e
-- replace_sale, com o estoque acompanhando cada passo.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(35);

-- Saldo de a1 visto pelo backend (o vendedor lê stock_quantity, mas o
-- helper não depende da sessão).
create function pg_temp.stock_a1() returns numeric
language sql security definer set search_path = public as
$$ select stock_quantity from public.products where id = 'd0000000-0000-0000-0000-0000000000a1' $$;
grant execute on function pg_temp.stock_a1() to authenticated;

select tests.login('seller_a');

-- ------------------------------------------------------------ create_sale
select is(
  create_sale(
    'cash',
    '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "Ração", "quantity": 2, "unit_price": 10},
      {"product_name": "Granel", "quantity": 0.5, "unit_price": 19.99}]'::jsonb,
    p_id => 'e0000000-0000-0000-0000-000000000001'
  ),
  'e0000000-0000-0000-0000-000000000001'::uuid,
  'create_sale devolve o id do aparelho'
);
select is(
  (select total from sales where id = 'e0000000-0000-0000-0000-000000000001'),
  30.00::numeric(10,2),
  'total = soma dos subtotais arredondados (20 + 10,00)'
);
select is(pg_temp.stock_a1(), 98::numeric, 'venda baixa o estoque (100 → 98)');

select throws_ok(
  $$ select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "Ração", "quantity": 2, "unit_price": 10}]'::jsonb,
                        p_id => 'e0000000-0000-0000-0000-000000000001') $$,
  '23505', null,
  'reenvio com o mesmo id bate na chave primária (23505)'
);
select is(pg_temp.stock_a1(), 98::numeric, 'reenvio não baixa o estoque de novo');
select is(
  (select count(*)::int from sale_items where sale_id = 'e0000000-0000-0000-0000-000000000001'),
  2,
  'reenvio não duplica itens'
);

select create_sale('debit_card', '[{"product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb,
                   p_id => 'e0000000-0000-0000-0000-000000000005');
select is(
  (select payment_method from sales where id = 'e0000000-0000-0000-0000-000000000005'),
  'debit',
  'grafia antiga do app (debit_card) vira debit'
);
select throws_ok($$ select create_sale('cash', '[]'::jsonb) $$, '22023', null, 'venda sem itens');
select throws_ok($$ select create_sale('cash', '[{"product_name": "x", "quantity": 0, "unit_price": 1}]'::jsonb) $$, '22023', null, 'quantidade zero');
select throws_ok($$ select create_sale('cash', '[{"product_name": "x", "quantity": 1, "unit_price": 1.001}]'::jsonb) $$, '22023', null, 'preço com três decimais');
select throws_ok($$ select create_sale('cash', '[{"product_name": " ", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '22023', null, 'nome em branco');
select throws_ok($$ select create_sale('cash', '[{"product_id": "abc", "product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '22023', null, 'product_id inválido');
select throws_ok($$ select create_sale('boleto', '[{"product_name": "x", "quantity": 1, "unit_price": 1}]'::jsonb) $$, '23514', null, 'forma de pagamento fora do vocabulário');

-- ------------------------------------------------------ set_sale_refunded
select is(set_sale_refunded('e0000000-0000-0000-0000-000000000001', true), true, 'estorno aplicado');
select is(pg_temp.stock_a1(), 100::numeric, 'estorno devolve o estoque');
select is(set_sale_refunded('e0000000-0000-0000-0000-000000000001', true), false, 'estorno repetido é no-op');
select is(pg_temp.stock_a1(), 100::numeric, 'estorno repetido não devolve de novo');
select is(set_sale_refunded('e0000000-0000-0000-0000-000000000001', false), true, 'estorno desfeito');
select is(pg_temp.stock_a1(), 98::numeric, 'desfazer baixa o estoque de novo');
select is(set_sale_refunded('e0000000-0000-0000-0000-000000000001', false), false, 'desfazer repetido é no-op');
select throws_ok($$ select set_sale_refunded('e0000000-0000-0000-0000-000000000001', null) $$, '22023', null, 'estado nulo é recusado');
select throws_ok(
  $$ insert into stock_movements (tenant_id, product_id, type, quantity) values (tests.tenant('a'), tests.product('a1'), 'adjustment', 5) $$,
  '42501', null,
  'vendedor não movimenta estoque fora do estorno'
);
select throws_ok(
  $$ update products set stock_quantity = 999 where id = tests.product('a1') $$,
  '42501', null,
  'vendedor não altera saldo fora do estorno'
);

-- ----------------------------------------------------------- replace_sale
select is(
  replace_sale('e0000000-0000-0000-0000-000000000001', 'pix',
               '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "Ração", "quantity": 1, "unit_price": 10}]'::jsonb,
               p_id => 'e0000000-0000-0000-0000-000000000002'),
  '{"sale_id": "e0000000-0000-0000-0000-000000000002", "changed": true}'::jsonb,
  'replace_sale cria a substituta'
);
select is(
  (select status from sales where id = 'e0000000-0000-0000-0000-000000000001'),
  'refunded',
  'a original fica estornada'
);
select is(pg_temp.stock_a1(), 99::numeric, 'estoque: devolve 2, baixa 1 (98 → 99)');
select is(
  replace_sale('e0000000-0000-0000-0000-000000000001', 'cash',
               '[{"product_name": "Outra", "quantity": 1, "unit_price": 1}]'::jsonb,
               p_id => 'e0000000-0000-0000-0000-000000000003'),
  '{"sale_id": "e0000000-0000-0000-0000-000000000002", "changed": false}'::jsonb,
  'retry devolve a substituta já criada'
);
select is(
  (select count(*)::int from sales where id = 'e0000000-0000-0000-0000-000000000003'),
  0,
  'retry não cria outra venda'
);
select is(pg_temp.stock_a1(), 99::numeric, 'retry não mexe no estoque');
select throws_ok(
  $$ select set_sale_refunded('e0000000-0000-0000-0000-000000000001', false) $$,
  '22023', null,
  'venda substituída não pode ter o estorno desfeito'
);

-- Falha nos itens novos desfaz o estorno (tudo na mesma transação).
select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000a1", "product_name": "Ração", "quantity": 3, "unit_price": 10}]'::jsonb,
                   p_id => 'e0000000-0000-0000-0000-000000000004');
select throws_ok(
  $$ select replace_sale('e0000000-0000-0000-0000-000000000004', 'cash', '[]'::jsonb) $$,
  '22023', null,
  'replace_sale com itens inválidos falha'
);
select is(
  (select status from sales where id = 'e0000000-0000-0000-0000-000000000004'),
  'completed',
  'e a venda original continua completa'
);
select is(pg_temp.stock_a1(), 96::numeric, 'e o estoque não foi devolvido');

-- Bundle app estorna a própria venda.
select tests.login('seller_b');
select create_sale('cash', '[{"product_id": "d0000000-0000-0000-0000-0000000000b1", "product_name": "Café", "quantity": 4, "unit_price": 5}]'::jsonb,
                   p_id => 'e0000000-0000-0000-0000-00000000000b');
select is(set_sale_refunded('e0000000-0000-0000-0000-00000000000b', true), true, 'app: estorna');

-- Perfis sem vendas
select tests.login('stock_a');
select throws_ok(
  $$ select set_sale_refunded('e0000000-0000-0000-0000-000000000004', true) $$,
  '42501', null,
  'estoque não estorna venda'
);

select * from finish();
rollback;
