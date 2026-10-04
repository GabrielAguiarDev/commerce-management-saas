-- Mensalidade paga no portal: o dono lê e provoca a própria cobrança, mas só a
-- chave de serviço cria tentativa e quita.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(21);

update tenants set monthly_fee = 89.90 where id = tests.tenant('a');
update tenants set monthly_fee = 49.00 where id = tests.tenant('c');
-- O B é o plano gratuito: sem mensalidade.

-- ------------------------------------------------------- a cobrança do mês
select tests.login('owner_a');
select is(
  (select amount from ensure_current_charge()),
  89.90,
  'dono: a cobrança do mês nasce com a mensalidade do negócio'
);
select is(
  (select extract(day from due_date)::int from platform_payments),
  10,
  'vencimento cai no dia padrão'
);
select is(
  (select count(*)::int from (select ensure_current_charge()) x
     cross join platform_payments),
  1,
  'chamar de novo não duplica a cobrança'
);

select tests.login('seller_a');
select is((select id from ensure_current_charge()), null, 'funcionário: não gera cobrança');
select is((select count(*)::int from platform_payments), 0, 'funcionário: não lê cobrança');

select tests.login('owner_b');
select is((select id from ensure_current_charge()), null, 'plano sem mensalidade: nada a cobrar');

select tests.login('owner_c');
select is((select count(*)::int from platform_payments), 0, 'outro negócio não vê a cobrança do A');
select is((select amount from ensure_current_charge()), 49.00, 'cada negócio tem a sua');

-- --------------------------------------------------- o navegador não escreve
select tests.login('owner_a');
select is(
  tests.affected($$ update platform_payments set status = 'paid', paid_at = now() $$),
  0,
  'dono não quita a própria cobrança'
);
select throws_ok(
  $$ insert into platform_payment_attempts (payment_id, tenant_id, method, amount, status)
     select id, tenant_id, 'pix', amount, 'approved' from platform_payments $$,
  '42501', null,
  'dono não cria tentativa'
);
select throws_ok(
  $$ select apply_provider_payment(gen_random_uuid(), '1', 'approved', 'approved') $$,
  '42501', null,
  'dono não executa apply_provider_payment'
);

-- ------------------------------------------------------- a chave de serviço
select tests.login_service();
insert into platform_payment_attempts (id, payment_id, tenant_id, method, amount)
select '74000000-0000-0000-0000-0000000000a1', id, tenant_id, 'pix', amount
  from platform_payments where tenant_id = tests.tenant('a');
insert into platform_payment_attempts (id, payment_id, tenant_id, method, amount)
select '74000000-0000-0000-0000-0000000000a2', id, tenant_id, 'card', amount
  from platform_payments where tenant_id = tests.tenant('a');

select is(
  apply_provider_payment('74000000-0000-0000-0000-0000000000a2', 'mp-2', 'rejected', 'rejected', 'cc_rejected_other_reason'),
  'rejected',
  'cartão recusado fica registrado'
);
select is(
  (select status from platform_payments where tenant_id = tests.tenant('a')),
  'pending',
  'recusa não quita'
);

select is(
  apply_provider_payment('74000000-0000-0000-0000-0000000000a1', 'mp-1', 'approved', 'approved', 'accredited', 0.89, 89.01, now()),
  'approved',
  'Pix aprovado'
);
select results_eq(
  $$ select status, payment_method, provider, provider_payment_id, net_amount
       from platform_payments where tenant_id = tests.tenant('a') $$,
  $$ values ('paid'::text, 'pix'::text, 'mercadopago'::text, 'mp-1'::text, 89.01::numeric(10,2)) $$,
  'aprovação quita a cobrança e guarda como foi paga'
);
select is(
  apply_provider_payment('74000000-0000-0000-0000-0000000000a1', 'mp-1', 'approved', 'approved', 'accredited', 0.89, 89.01, now()),
  'approved',
  'webhook repetido é inofensivo'
);
select throws_ok(
  $$ select apply_provider_payment('74000000-0000-0000-0000-0000000000a1', 'mp-999', 'approved', 'approved') $$,
  null, null,
  'tentativa não troca de pagamento do provedor'
);
select is(
  apply_provider_payment(gen_random_uuid(), 'mp-3', 'approved', 'approved'),
  'unknown',
  'tentativa desconhecida não quita nada'
);

-- --------------------------------------------------------- o dono enxerga
select tests.login('owner_a');
select is(
  (select status from platform_payment_attempts where id = '74000000-0000-0000-0000-0000000000a1'),
  'approved',
  'dono lê as próprias tentativas'
);
select tests.login('owner_c');
select is((select count(*)::int from platform_payment_attempts), 0, 'outro negócio não lê tentativas alheias');

-- ---------------------------------------------------------------- estorno
select tests.login_service();
select apply_provider_payment('74000000-0000-0000-0000-0000000000a1', 'mp-1', 'refunded', 'refunded');
select is(
  (select status from platform_payments where tenant_id = tests.tenant('a')),
  'pending',
  'estorno reabre a cobrança'
);

select * from finish();
rollback;
