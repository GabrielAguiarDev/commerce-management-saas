-- generate_recurring_costs: idempotente, respeita o dia programado e ajusta
-- 29/30/31 ao fim do mês (fevereiro inclusive, bissexto ou não).
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(27);

select is(recurring_cost_date('2026-02-01', 31), '2026-02-28'::date, 'dia 31 em fevereiro comum → 28');
select is(recurring_cost_date('2028-02-01', 31), '2028-02-29'::date, 'dia 31 em fevereiro bissexto → 29');
select is(recurring_cost_date('2026-02-01', 29), '2026-02-28'::date, 'dia 29 em fevereiro comum → 28');
select is(recurring_cost_date('2026-04-01', 31), '2026-04-30'::date, 'dia 31 em abril → 30');
select is(recurring_cost_date('2026-01-01', 15), '2026-01-15'::date, 'dia comum não muda');

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

select tests.set_today('2026-03-05');
select tests.login('owner_a');
insert into ids values ('rent', save_manual_cost(null, 'Aluguel', 'fixed', 'Moradia', 1000, '2026-01-31', true));

create function pg_temp.rent_dates() returns date[]
language sql as
$$ select array_agg(c.cost_date order by c.competence)
     from public.costs c
    where c.recurrence_id = (select recurrence_id from public.costs where id = (select id from ids where name = 'rent')) $$;

select is(pg_temp.rent_dates(), array['2026-01-31', '2026-02-28']::date[], 'cria jan e fev (fev no dia 28); março ainda não venceu');
select results_eq(
  $$ select anchor_day::int, generated_through from cost_recurrence_series $$,
  $$ values (31, '2026-02-01'::date) $$,
  'série guarda o dia 31 e até onde gerou'
);
select is(generate_recurring_costs(), 0, 'segunda geração no mesmo dia não cria nada');
select is(pg_temp.rent_dates(), array['2026-01-31', '2026-02-28']::date[], 'e não duplica');
select ok(
  (select bool_and(is_recurring and type = 'fixed' and origin = 'manual') from costs where recurrence_id is not null),
  'ocorrências são fixas, manuais e marcadas como recorrentes'
);

select tests.logout();
select tests.set_today('2026-03-30');
select tests.login('owner_a');
select is(generate_recurring_costs(), 0, 'dia 30: março (dia 31) ainda não venceu');

select tests.logout();
select tests.set_today('2026-03-31');
select tests.login('owner_a');
select is(generate_recurring_costs(), 1, 'dia 31: gera março');
select is(generate_recurring_costs(), 0, 'e só uma vez');

-- Quem não tem custos/relatórios não dispara a geração.
select tests.logout();
select tests.set_today('2026-06-30');
select tests.login('seller_a');
select is(generate_recurring_costs(), 0, 'vendedor não gera');
select tests.login('owner_c');
select is(generate_recurring_costs(), 0, 'outro negócio não gera os custos de A');
select tests.login('reports_a');
select is(generate_recurring_costs(), 3, 'relatórios gera o que está pendente (abr, mai, jun)');
select is(
  pg_temp.rent_dates(),
  array['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']::date[],
  'datas ajustadas ao fim de cada mês'
);

-- Bissexto, com meses em atraso.
select tests.logout();
select tests.set_today('2028-03-01');
select tests.login('owner_a');
insert into ids values ('leap', save_manual_cost(null, 'Seguro', 'fixed', null, 50, '2027-12-31', true));
select is(
  (select array_agg(c.cost_date order by c.competence) from costs c
    where c.recurrence_id = (select recurrence_id from costs where id = (select id from ids where name = 'leap'))),
  array['2027-12-31', '2028-01-31', '2028-02-29']::date[],
  'fevereiro bissexto cai no dia 29'
);
select is(generate_recurring_costs(), 0, 'nada pendente depois da criação');

-- Guardas diretas na tabela, numa "requisição" nova (sem o marcador que
-- save_manual_cost deixou ligado até o fim da transação).
select tests.login('owner_a');
select throws_ok(
  $$ insert into costs (tenant_id, description, type, amount, recurrence_id, competence)
     values (tests.tenant('a'), 'x', 'fixed', 1, (select recurrence_id from costs where id = (select id from ids where name = 'rent')), '2030-01-01') $$,
  '42501', null,
  'não se liga um custo a uma série por fora da RPC'
);
select throws_ok(
  $$ update costs set amount = 1 where id = (select id from ids where name = 'rent') $$,
  '42501', null,
  'não se edita ocorrência de série por fora da RPC'
);
select throws_ok(
  $$ delete from costs where id = (select id from ids where name = 'rent') $$,
  '42501', null,
  'não se apaga ocorrência de série por fora da RPC'
);
select throws_ok(
  $$ insert into cost_recurrence_series (tenant_id, description, amount, anchor_day, starts_on)
     values (tests.tenant('a'), 'x', 1, 1, '2026-01-01') $$,
  '42501', null,
  'sessão não escreve em cost_recurrence_series'
);
insert into costs (tenant_id, description, type, amount, is_recurring)
values (tests.tenant('a'), 'Avulso', 'fixed', 5, true);
select is(
  (select is_recurring from costs where description = 'Avulso'),
  false,
  'is_recurring sem série vira false'
);
select lives_ok(
  $$ update costs set amount = 6 where description = 'Avulso' and tenant_id = tests.tenant('a') $$,
  'custo avulso continua editável direto'
);

select tests.login('owner_c');
select is(tests.visible('cost_recurrence_series'), 0, 'outro negócio não vê as séries de A');
select tests.login('seller_a');
select is(tests.visible('cost_recurrence_series'), 0, 'vendedor não vê séries');

select * from finish();
rollback;
