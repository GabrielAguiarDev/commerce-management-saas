begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(12);

select tests.login('owner_a');

select is(
  create_manual_cost_idempotent(
    'f3000000-0000-4000-8000-000000000001',
    '  Energia  ', 'fixed', '  Contas  ', 175.50, '2026-09-28'
  ),
  jsonb_build_object(
    'id', 'f3000000-0000-4000-8000-000000000001'::uuid,
    'created', true
  ),
  'primeira tentativa cria o custo com o UUID do cliente'
);

select results_eq(
  $$ select tenant_id, user_id, description, type, category, amount,
            is_recurring, origin, cost_date, recurrence_id
       from costs
      where id = 'f3000000-0000-4000-8000-000000000001' $$,
  $$ values (
       tests.tenant('a'), tests.uid('owner_a'), 'Energia'::text, 'fixed'::text,
       'Contas'::text, 175.50::numeric(10,2), false, 'manual'::text,
       '2026-09-28'::date, null::uuid
     ) $$,
  'a RPC fixa tenant, usuário e invariantes de custo avulso no servidor'
);

select is(
  create_manual_cost_idempotent(
    'f3000000-0000-4000-8000-000000000001',
    'Energia', 'fixed', 'Contas', 175.50, '2026-09-28'
  ),
  jsonb_build_object(
    'id', 'f3000000-0000-4000-8000-000000000001'::uuid,
    'created', false
  ),
  'retry exato confirma o registro sem recriar'
);
select is(
  (select count(*)::int from costs where id = 'f3000000-0000-4000-8000-000000000001'),
  1,
  'retry mantém exatamente uma linha monetária'
);

select throws_ok(
  $$ select create_manual_cost_idempotent(
       'f3000000-0000-4000-8000-000000000001',
       'Energia adulterada', 'fixed', 'Contas', 175.50, '2026-09-28'
     ) $$,
  '23505',
  'identificador já usado por outro custo',
  'mesmo UUID com payload diferente é rejeição permanente'
);
select is(
  (select description from costs where id = 'f3000000-0000-4000-8000-000000000001'),
  'Energia',
  'colisão não altera o lançamento vencedor'
);

select throws_ok(
  $$ select create_manual_cost_idempotent(
       null, 'Água', 'fixed', null, 40, '2026-09-28'
     ) $$,
  '22023', null,
  'UUID do cliente é obrigatório'
);
select throws_ok(
  $$ select create_manual_cost_idempotent(
       'f3000000-0000-4000-8000-000000000002', 'Água', 'fixed', null, 0, '2026-09-28'
     ) $$,
  '22023', null,
  'valor inválido é rejeitado'
);

select tests.login('seller_a');
select throws_ok(
  $$ select create_manual_cost_idempotent(
       'f3000000-0000-4000-8000-000000000003', 'Água', 'fixed', null, 40, '2026-09-28'
     ) $$,
  '42501', null,
  'papel sem módulo de custos não pode criar fila'
);
select is(
  (select count(*)::int from costs where id = 'f3000000-0000-4000-8000-000000000003'),
  0,
  'rejeição de autorização não deixa linha'
);

select tests.login('owner_c');
select throws_ok(
  $$ select create_manual_cost_idempotent(
       'f3000000-0000-4000-8000-000000000001',
       'Energia', 'fixed', 'Contas', 175.50, '2026-09-28'
     ) $$,
  '23505', null,
  'outro tenant não pode confirmar um UUID alheio como retry'
);
select is(
  (select count(*)::int from costs where id = 'f3000000-0000-4000-8000-000000000001'),
  0,
  'RLS continua escondendo o custo do outro tenant'
);

select * from finish();
rollback;
