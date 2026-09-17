-- save_manual_cost / delete_manual_cost sobre séries mensais: editar ou
-- excluir vale da competência escolhida em diante e preserva o passado.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(30);

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- Custos de uma série, em ordem: (competência, dia, valor).
create function pg_temp.series(p_name text)
returns table (competence date, cost_date date, amount numeric)
language sql as
$$ select c.competence, c.cost_date, c.amount
     from public.costs c
    where c.recurrence_id = (select s.recurrence_id from public.costs s where s.id = (select id from ids where name = p_name))
    order by c.competence $$;
grant execute on function pg_temp.series(text) to authenticated;

create function pg_temp.cost_at(p_name text, p_competence date)
returns uuid
language sql as
$$ select c.id
     from public.costs c
    where c.recurrence_id = (select s.recurrence_id from public.costs s where s.id = (select id from ids where name = p_name))
      and c.competence = p_competence $$;
grant execute on function pg_temp.cost_at(text, date) to authenticated;

select tests.set_today('2026-06-15');
select tests.login('owner_a');
insert into ids values
  ('net',  save_manual_cost(null, 'Internet', 'fixed', null, 100, '2026-01-10', true)),
  ('rent', save_manual_cost(null, 'Aluguel',  'fixed', null, 900, '2026-01-31', true));

select is((select count(*)::int from pg_temp.series('net')), 6, 'internet: jan a jun');
select is((select count(*)::int from pg_temp.series('rent')), 5, 'aluguel: jan a mai (junho vence dia 30)');

-- ------------------------------------------ editar a partir de abril
select is(
  save_manual_cost(pg_temp.cost_at('net', '2026-04-01'), 'Internet fibra', 'fixed', 'Contas', 120, '2026-04-10', true),
  pg_temp.cost_at('net', '2026-04-01'),
  'edição devolve o id editado'
);
select results_eq(
  $$ select amount from pg_temp.series('net') $$,
  $$ values (100::numeric), (100), (100), (120), (120), (120) $$,
  'jan–mar preservados; abr–jun com o valor novo'
);
select is(
  (select array_agg(distinct c.description) from costs c where c.id in (select pg_temp.cost_at('net', d) from unnest(array['2026-01-01','2026-03-01']::date[]) d)),
  array['Internet'],
  'descrição antiga preservada no passado'
);
select is(
  (select amount from cost_recurrence_series where id = (select recurrence_id from costs where id = (select id from ids where name = 'net'))),
  120::numeric,
  'série passa a gerar o valor novo'
);

-- Editar a ocorrência de fevereiro (dia 28) não muda o dia da série.
select save_manual_cost(pg_temp.cost_at('rent', '2026-02-01'), 'Aluguel', 'fixed', null, 950, '2026-02-28', true);
select is(
  (select anchor_day::int from cost_recurrence_series where id = (select recurrence_id from costs where id = (select id from ids where name = 'rent'))),
  31,
  'dia 31 da série preservado ao editar fevereiro'
);
select results_eq(
  $$ select cost_date, amount from pg_temp.series('rent') $$,
  $$ values ('2026-01-31'::date, 900::numeric), ('2026-02-28', 950), ('2026-03-31', 950), ('2026-04-30', 950), ('2026-05-31', 950) $$,
  'fev em diante com o valor novo, datas no fim do mês'
);

-- ------------------------------------------------ gerar mais tarde
select tests.logout();
select tests.set_today('2026-07-31');
select tests.login('owner_a');
select is(generate_recurring_costs(), 3, 'jul da internet, jun e jul do aluguel');
select is(
  (select amount from pg_temp.series('net') where competence = '2026-07-01'),
  120::numeric,
  'mês gerado depois da edição usa o valor novo'
);

-- --------------------------------------- excluir a partir de maio
select is(delete_manual_cost(pg_temp.cost_at('net', '2026-05-01')), true, 'exclusão da série a partir de maio');
select results_eq(
  $$ select competence from pg_temp.series('net') $$,
  $$ values ('2026-01-01'::date), ('2026-02-01'), ('2026-03-01'), ('2026-04-01') $$,
  'jan–abr preservados; mai em diante apagados'
);
select results_eq(
  $$ select active, ended_at is not null from cost_recurrence_series where id = (select recurrence_id from costs where id = (select id from ids where name = 'net')) $$,
  $$ values (false, true) $$,
  'série encerrada'
);
select tests.logout();
select tests.set_today('2026-12-31');
select tests.login('owner_a');
select is(generate_recurring_costs(), 5, 'só o aluguel continua gerando (ago–dez)');
select is((select count(*)::int from pg_temp.series('net')), 4, 'série encerrada não volta a gerar');

-- Editar competência antiga de série encerrada não a reabre.
select save_manual_cost(pg_temp.cost_at('net', '2026-02-01'), 'Internet', 'fixed', null, 110, '2026-02-10', true);
select is(
  (select active from cost_recurrence_series where id = (select recurrence_id from costs where id = (select id from ids where name = 'net'))),
  false,
  'edição não reabre série encerrada'
);
select is((select count(*)::int from pg_temp.series('net')), 4, 'nem recria meses apagados');

-- ------------------------- desligar a repetição a partir de março
select save_manual_cost(pg_temp.cost_at('rent', '2026-03-01'), 'Aluguel março', 'fixed', null, 999, '2026-03-31', false);
select results_eq(
  $$ select competence from pg_temp.series('rent') $$,
  $$ values ('2026-01-01'::date), ('2026-02-01') $$,
  'série fica só com jan e fev'
);
select results_eq(
  $$ select recurrence_id is null, competence is null, is_recurring, amount from costs where description = 'Aluguel março' $$,
  $$ values (true, true, false, 999::numeric(10,2)) $$,
  'março vira custo avulso'
);
select is(
  (select count(*)::int from costs where description like 'Aluguel%' and cost_date > '2026-03-31'),
  0,
  'meses depois de março apagados'
);

-- ---------------------------------- avulso vira série e volta
insert into ids values ('single', save_manual_cost(null, 'Contador', 'fixed', null, 300, '2026-12-05', false));
select is((select recurrence_id from costs where id = (select id from ids where name = 'single')), null, 'avulso nasce sem série');
select save_manual_cost((select id from ids where name = 'single'), 'Contador', 'fixed', null, 300, '2026-12-05', true);
select results_eq(
  $$ select competence, cost_date from pg_temp.series('single') $$,
  $$ values ('2026-12-01'::date, '2026-12-05'::date) $$,
  'vira série sem duplicar o mês corrente'
);
select is(delete_manual_cost((select id from ids where name = 'single')), true, 'excluir a primeira competência');
select is((select count(*)::int from costs where description = 'Contador'), 0, 'apaga a série inteira');

-- ---------------------------------------------------- validações
select throws_ok($$ select save_manual_cost(null, 'x', 'variable', null, 1, current_date, true) $$, '22023', null, 'custo variável não repete');
select throws_ok($$ select save_manual_cost(null, 'x', 'fixed', null, 0, current_date, false) $$, '22023', null, 'valor zero');
select throws_ok($$ select save_manual_cost(null, '  ', 'fixed', null, 1, current_date, false) $$, '22023', null, 'descrição em branco');
select throws_ok($$ select delete_manual_cost('00000000-0000-0000-0000-000000000000') $$, 'P0002', null, 'custo inexistente');

-- Custo de entrada de estoque não é editável por aqui.
select tests.logout();
insert into costs (id, tenant_id, description, type, amount, origin)
values ('00000000-0000-0000-0000-0000000000cc', tests.tenant('a'), 'Compra', 'variable', 10, 'stock');
select tests.login('owner_a');
select throws_ok($$ select delete_manual_cost('00000000-0000-0000-0000-0000000000cc') $$, '42501', null, 'custo de estoque não se exclui pela RPC');

-- Outro negócio não enxerga o custo.
select tests.login('owner_c');
select throws_ok(
  $$ select delete_manual_cost((select id from ids where name = 'net')) $$,
  'P0002', null,
  'dono de C não exclui custo de A'
);

select * from finish();
rollback;
