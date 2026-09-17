-- =====================================================================
-- CUSTOS RECORRENTES MENSAIS
--
-- `costs.is_recurring` era apenas um marcador. A partir daqui cada custo
-- recorrente pertence a uma serie explicita e cada lancamento identifica a
-- competencia mensal que representa.
--
-- A geracao acontece por RPC antes das leituras. Ela nao depende de cron e e
-- repetivel: a chave unica (serie, competencia) e o ON CONFLICT impedem
-- duplicacao inclusive quando duas leituras concorrem ou uma requisicao e
-- repetida. Dias 29/30/31 caem no ultimo dia dos meses mais curtos.
-- =====================================================================

create table if not exists public.cost_recurrence_series (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  created_by   uuid,
  description  text not null,
  category     text,
  amount       numeric not null,
  anchor_day   smallint not null check (anchor_day between 1 and 31),
  starts_on    date not null,
  -- Ultima competencia ja materializada; evita revisitar meses antigos.
  generated_through date,
  active       boolean not null default true,
  ended_at     timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists cost_recurrence_series_tenant_active_idx
  on public.cost_recurrence_series (tenant_id, active);

alter table public.cost_recurrence_series enable row level security;

drop policy if exists cost_recurrence_series_select_own_tenant
  on public.cost_recurrence_series;
create policy cost_recurrence_series_select_own_tenant
  on public.cost_recurrence_series
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- Mesmo gate de leitura de `costs` (20260917010000): quem não tem custos nem
-- relatórios não enxerga as séries, mesmo dentro do próprio tenant.
drop policy if exists role_module_select on public.cost_recurrence_series;
create policy role_module_select
  on public.cost_recurrence_series
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_platform_admin())
    or (
      tenant_id = (select public.current_tenant_id())
      and (select public.current_actor_can_use_any_module(array['costs', 'reports']::text[]))
    )
  );

-- Escritas na serie passam pelas RPCs abaixo, que preservam a historia e
-- aplicam a mesma semantica no portal e no app.
revoke insert, update, delete on public.cost_recurrence_series from authenticated;
grant select on public.cost_recurrence_series to authenticated;

alter table public.cost_recurrence_series
  add column if not exists generated_through date;

alter table public.costs
  add column if not exists recurrence_id uuid,
  add column if not exists competence date;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'costs_recurrence_id_fkey'
       and conrelid = 'public.costs'::regclass
  ) then
    alter table public.costs
      add constraint costs_recurrence_id_fkey
      foreign key (recurrence_id)
      references public.cost_recurrence_series(id)
      -- NO ACTION (checado no fim do comando) e nao RESTRICT: a exclusao do
      -- tenant apaga custos e series em cascata na mesma instrucao.
      on delete no action;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'costs_recurrence_competence_pair_check'
       and conrelid = 'public.costs'::regclass
  ) then
    alter table public.costs
      add constraint costs_recurrence_competence_pair_check
      check (
        (recurrence_id is null and competence is null)
        or
        (recurrence_id is not null and competence is not null and competence = date_trunc('month', competence)::date)
      );
  end if;
end
$$;

create unique index if not exists costs_one_recurrence_per_competence_idx
  on public.costs (recurrence_id, competence)
  where recurrence_id is not null;

create index if not exists costs_tenant_competence_idx
  on public.costs (tenant_id, competence desc)
  where competence is not null;

-- Data "de hoje" das series. O servidor roda em UTC; sem isto uma conta do
-- dia 16 apareceria as 21h do dia 15 para quem esta no Brasil.
create or replace function public.recurring_cost_today()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

revoke all on function public.recurring_cost_today() from public, anon;

-- Cada marcador legado vira sua propria serie, com o UUID do proprio custo
-- (backfill deterministico). Os lancamentos existentes nao sao alterados alem
-- de ganharem serie e competencia.
--
-- Como o portal nunca repetiu nada, quem tinha aluguel mensal pode ter lancado
-- o mesmo custo a cada mes, todos com o marcador. Se cada um virasse uma serie
-- ativa, a primeira leitura geraria o aluguel N vezes. Por isso so o lancamento
-- mais recente de cada descricao (por tenant) continua gerando; os demais viram
-- series ja encerradas, preservadas como historia.
--
-- A geracao automatica comeca no mes atual, sem inventar competencias passadas
-- que o marcador antigo nunca chegou a materializar.
insert into public.cost_recurrence_series (
  id, tenant_id, created_by, description, category, amount,
  anchor_day, starts_on, active, ended_at, created_at, updated_at
)
select
  c.id,
  c.tenant_id,
  c.user_id,
  c.description,
  c.category,
  c.amount,
  extract(day from c.cost_date)::smallint,
  greatest(c.cost_date, public.recurring_cost_today()),
  c.rn = 1,
  case when c.rn = 1 then null else now() end,
  now(),
  now()
from (
  select
    x.*,
    row_number() over (
      partition by x.tenant_id, lower(btrim(x.description))
      order by x.cost_date desc, x.id desc
    ) as rn
  from public.costs x
  where x.is_recurring = true
    and x.origin = 'manual'
    and x.recurrence_id is null
    and nullif(btrim(x.description), '') is not null
    and x.amount > 0
) c
on conflict (id) do nothing;

-- Marcadores que nao viraram serie (descricao vazia/valor invalido) deixam de
-- afirmar uma repeticao que nao existe.
update public.costs c
   set recurrence_id = c.id,
       competence = date_trunc('month', c.cost_date)::date
 where c.is_recurring = true
   and c.origin = 'manual'
   and c.recurrence_id is null
   and exists (
     select 1
       from public.cost_recurrence_series s
     where s.id = c.id
   );

update public.costs c
   set is_recurring = false
 where c.is_recurring = true
   and c.recurrence_id is null;

-- Regra unica de calendario da serie. O dia ancora continua sendo 31 depois
-- de fevereiro; somente a ocorrencia daquele mes e ajustada para 28/29.
create or replace function public.recurring_cost_date(
  p_competence date,
  p_anchor_day integer
)
returns date
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select
    date_trunc('month', p_competence)::date
    + (
      least(
        p_anchor_day,
        extract(
          day from (date_trunc('month', p_competence)::date + interval '1 month - 1 day')
        )::integer
      ) - 1
    );
$$;

revoke all on function public.recurring_cost_date(date, integer) from public, anon;

-- Falha a propria migration se uma alteracao futura quebrar os limites que
-- motivaram a serie explicita.
do $$
begin
  if public.recurring_cost_date(date '2025-02-01', 31) <> date '2025-02-28'
     or public.recurring_cost_date(date '2024-02-01', 30) <> date '2024-02-29'
     or public.recurring_cost_date(date '2026-04-01', 31) <> date '2026-04-30'
     or public.recurring_cost_date(date '2026-03-01', 29) <> date '2026-03-29' then
    raise exception 'regra de calendario dos custos recorrentes invalida';
  end if;
end
$$;

-- Marca transacional ligada somente pelas RPCs desta migration. Cliente
-- PostgREST nao define GUCs arbitrarias, e set_config local volta ao vazio
-- no fim da transacao.
create or replace function public.cost_series_context_active()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(current_setting('aguiar.cost_series_context', true), '') <> '';
$$;

revoke all on function public.cost_series_context_active() from public, anon;
grant execute on function public.cost_series_context_active() to authenticated, service_role;

-- Toda operacao de serie de um tenant passa por este lock transacional antes
-- de travar qualquer linha. Sem ele, duas edicoes de series diferentes (cada
-- uma segurando a sua e depois gerando todas) podiam travar em ordem inversa.
create or replace function public.lock_tenant_cost_series(p_tenant uuid)
returns void
language sql
set search_path = public, pg_temp
as $$
  select pg_advisory_xact_lock(hashtext('aguiar.cost_series'), hashtext(p_tenant::text));
$$;

revoke all on function public.lock_tenant_cost_series(uuid) from public, anon, authenticated;

-- Gera as competencias que faltam desde a ultima geracao ate o mes atual.
--
-- * Idempotente: a chave unica (recurrence_id, competence) com ON CONFLICT DO
--   NOTHING impede duplicar em retry.
-- * Concorrencia: o lock do tenant (e o FOR UPDATE na serie) serializa duas
--   leituras simultaneas e a geracao com edicao/encerramento; uma serie
--   encerrada nao ganha um lancamento atrasado por uma leitura concorrente.
-- * Sem permissao de custos/relatorios a funcao nao faz nada (retorna 0) em
--   vez de falhar: o portal carrega custos junto com o resto da tela.
create or replace function public.generate_recurring_costs()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant   uuid;
  v_today    date := public.recurring_cost_today();
  v_current  date := date_trunc('month', public.recurring_cost_today())::date;
  v_series   public.cost_recurrence_series%rowtype;
  v_month    date;
  v_done     date;
  v_cost_day date;
  v_user     uuid;
  v_rows     integer;
  v_total    integer := 0;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    return 0;
  end if;

  if not public.current_actor_can_use_any_module(array['costs', 'reports']) then
    return 0;
  end if;

  -- Caminho comum: nada a gerar, sem lock nenhum.
  if not exists (
    select 1
      from public.cost_recurrence_series s
     where s.tenant_id = v_tenant
       and s.active = true
       and date_trunc('month', s.starts_on)::date <= v_current
       and (s.generated_through is null or s.generated_through < v_current)
  ) then
    return 0;
  end if;

  perform public.lock_tenant_cost_series(v_tenant);
  perform set_config('aguiar.cost_series_context', 'on', true);

  for v_series in
    select s.*
      from public.cost_recurrence_series s
     where s.tenant_id = v_tenant
       and s.active = true
       and date_trunc('month', s.starts_on)::date <= v_current
       and (s.generated_through is null or s.generated_through < v_current)
     order by s.id
     for update
  loop
    -- Outra transacao pode ter encerrado ou gerado enquanto esperavamos o
    -- lock; o registro relido pelo FOR UPDATE ja reflete isso.
    if not v_series.active
       or (v_series.generated_through is not null and v_series.generated_through >= v_current) then
      continue;
    end if;

    -- O autor original pode ter saido da equipe; nesse caso o lancamento fica
    -- em nome de quem disparou a geracao.
    select p.id into v_user from public.profiles p where p.id = v_series.created_by;
    v_user := coalesce(v_user, auth.uid());

    v_done := v_series.generated_through;

    for v_month in
      select generate_series(
        greatest(
          date_trunc('month', v_series.starts_on)::date,
          coalesce((v_series.generated_through + interval '1 month')::date, '-infinity'::date)
        ),
        v_current,
        interval '1 month'
      )::date
    loop
      v_cost_day := public.recurring_cost_date(v_month, v_series.anchor_day::integer);

      -- A competencia corrente so nasce quando chega o dia programado. Assim
      -- uma conta do dia 30 nao aparece como paga no dia 1; em fevereiro, a
      -- mesma conta vence no dia 28/29 por causa do ajuste acima.
      if v_cost_day > v_today then
        exit;
      end if;

      insert into public.costs (
        tenant_id, user_id, description, type, category, amount,
        is_recurring, origin, cost_date, recurrence_id, competence
      )
      values (
        v_series.tenant_id,
        v_user,
        v_series.description,
        'fixed',
        v_series.category,
        v_series.amount,
        true,
        'manual',
        v_cost_day,
        v_series.id,
        v_month
      )
      on conflict (recurrence_id, competence)
        where recurrence_id is not null
      do nothing;

      get diagnostics v_rows = row_count;
      v_total := v_total + v_rows;
      v_done := v_month;
    end loop;

    if v_done is distinct from v_series.generated_through then
      update public.cost_recurrence_series
         set generated_through = v_done,
             updated_at = now()
       where id = v_series.id;
    end if;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.generate_recurring_costs() from public, anon;
grant execute on function public.generate_recurring_costs() to authenticated;

comment on function public.generate_recurring_costs() is
  'Materializa custos mensais ate a competencia atual; idempotente por (recurrence_id, competence) e ajusta dias 29/30/31 ao fim do mes.';

-- Serie e competencia so mudam pelas RPCs. Uma escrita direta (app antigo,
-- chamada manual a API) nao consegue pendurar um custo em serie alheia nem
-- apagar uma competencia que a proxima leitura geraria de novo.
create or replace function public.guard_cost_recurrence()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.cost_series_context_active()
     or public.request_is_trusted_backend()
     or public.is_platform_admin()
     or pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.recurrence_id is not null then
      raise exception using
        errcode = '42501',
        message = 'custo que repete todo mês só pode ser excluído pelo portal ou app';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.recurrence_id is not null or new.competence is not null then
      raise exception using errcode = '42501', message = 'repetição mensal só pode ser criada pelo portal ou app';
    end if;
  elsif new.recurrence_id is distinct from old.recurrence_id
     or new.competence is distinct from old.competence then
    raise exception using errcode = '42501', message = 'repetição mensal só pode ser alterada pelo portal ou app';
  elsif old.recurrence_id is not null
     and (new.amount, new.description, new.category, new.type, new.cost_date)
         is distinct from (old.amount, old.description, old.category, old.type, old.cost_date) then
    raise exception using errcode = '42501', message = 'custo que repete todo mês só pode ser editado pelo portal ou app';
  end if;

  -- O marcador passa a ser derivado da serie: sem serie, nao ha repeticao.
  new.is_recurring := new.recurrence_id is not null;
  return new;
end;
$$;

drop trigger if exists costs_guard_recurrence on public.costs;
create trigger costs_guard_recurrence
  before insert or update or delete on public.costs
  for each row execute function public.guard_cost_recurrence();

-- Unica porta de criacao/edicao manual usada por portal e mobile.
-- Semantica de edicao:
--   * serie -> serie: altera a competencia escolhida e as seguintes;
--   * serie -> avulso: mantem a escolhida e remove/cancela as seguintes;
--   * avulso -> serie: a competencia do lancamento inicia uma nova serie.
create or replace function public.save_manual_cost(
  p_id           uuid,
  p_description  text,
  p_type         text,
  p_category     text,
  p_amount       numeric,
  p_cost_date    date,
  p_is_recurring boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant     uuid;
  v_cost       public.costs%rowtype;
  v_series_id  uuid;
  v_competence date;
  v_anchor_day integer;
  v_result     uuid;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception using errcode = '42501', message = 'sem empresa na sessão';
  end if;

  -- Sem o bundle `app`: pela matriz de 20260917010000, so `costs` escreve.
  if not public.current_actor_can_use_module('costs') then
    raise exception using errcode = '42501', message = 'sem permissão para custos';
  end if;

  perform public.lock_tenant_cost_series(v_tenant);
  perform set_config('aguiar.cost_series_context', 'on', true);

  p_is_recurring := coalesce(p_is_recurring, false);
  p_description := nullif(btrim(p_description), '');
  p_category := nullif(btrim(p_category), '');

  if p_description is null then
    raise exception using errcode = '22023', message = 'escreva o que foi o gasto';
  end if;
  if p_type is null or p_type not in ('fixed', 'variable') then
    raise exception using errcode = '22023', message = 'tipo de custo inválido';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '22023', message = 'informe um valor maior que zero';
  end if;
  if p_cost_date is null then
    raise exception using errcode = '22023', message = 'informe a data do custo';
  end if;
  if p_is_recurring and p_type <> 'fixed' then
    raise exception using errcode = '22023', message = 'só custo fixo pode repetir todo mês';
  end if;

  v_competence := date_trunc('month', p_cost_date)::date;
  v_anchor_day := extract(day from p_cost_date)::integer;

  if p_id is null then
    if p_is_recurring then
      insert into public.cost_recurrence_series (
        tenant_id, created_by, description, category, amount, anchor_day, starts_on
      )
      values (
        v_tenant, auth.uid(), p_description, p_category, p_amount, v_anchor_day, p_cost_date
      )
      returning id into v_series_id;
    end if;

    insert into public.costs (
      tenant_id, user_id, description, type, category, amount,
      is_recurring, origin, cost_date, recurrence_id, competence
    )
    values (
      v_tenant,
      auth.uid(),
      p_description,
      p_type,
      p_category,
      p_amount,
      p_is_recurring,
      'manual',
      p_cost_date,
      v_series_id,
      case when p_is_recurring then v_competence else null end
    )
    returning id into v_result;

    if p_is_recurring then
      perform public.generate_recurring_costs();
    end if;

    return v_result;
  end if;

  select c.*
    into v_cost
    from public.costs c
   where c.id = p_id
     and c.tenant_id = v_tenant
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'custo não encontrado';
  end if;
  if v_cost.origin = 'stock' then
    raise exception using errcode = '42501', message = 'este custo veio de uma entrada de estoque; ajuste pelo estoque';
  end if;

  if v_cost.recurrence_id is not null then
    -- A linha da serie e travada antes de gerar, editar ou encerrar.
    select s.anchor_day
      into v_anchor_day
      from public.cost_recurrence_series s
     where s.id = v_cost.recurrence_id
       and s.tenant_id = v_tenant
     for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'repetição mensal não encontrada';
    end if;

    if p_is_recurring then
      update public.cost_recurrence_series
         set description = p_description,
             category = p_category,
             amount = p_amount,
             -- A data da ocorrencia pode estar ajustada (31 -> 28). Como a
             -- UI nao oferece mudanca do dia da serie durante a edicao,
             -- preservamos o dia ancora original em vez de transformar o dia
             -- ajustado de fevereiro no novo vencimento de todos os meses.
             anchor_day = v_anchor_day,
             -- Editar uma competencia antiga de serie encerrada nao a
             -- reabre: isso regeraria meses que o usuario removeu.
             updated_at = now()
       where id = v_cost.recurrence_id;

      update public.costs c
         set description = p_description,
             type = 'fixed',
             category = p_category,
             amount = p_amount,
             is_recurring = true,
             cost_date = public.recurring_cost_date(c.competence, v_anchor_day)
       where c.recurrence_id = v_cost.recurrence_id
         and c.competence >= v_cost.competence;

      perform public.generate_recurring_costs();
    else
      update public.cost_recurrence_series
         set active = false,
             ended_at = now(),
             updated_at = now()
       where id = v_cost.recurrence_id
         and active;

      delete from public.costs c
       where c.recurrence_id = v_cost.recurrence_id
         and c.competence > v_cost.competence;

      update public.costs
         set description = p_description,
             type = p_type,
             category = p_category,
             amount = p_amount,
             is_recurring = false,
             cost_date = p_cost_date,
             recurrence_id = null,
             competence = null
       where id = p_id;
    end if;

    return p_id;
  end if;

  if p_is_recurring then
    insert into public.cost_recurrence_series (
      tenant_id, created_by, description, category, amount, anchor_day, starts_on
    )
    values (
      v_tenant,
      auth.uid(),
      p_description,
      p_category,
      p_amount,
      v_anchor_day,
      -- Sem inventar os meses entre um lancamento antigo e hoje.
      greatest(p_cost_date, public.recurring_cost_today())
    )
    returning id into v_series_id;

    update public.costs
       set description = p_description,
           type = 'fixed',
           category = p_category,
           amount = p_amount,
           is_recurring = true,
           cost_date = p_cost_date,
           recurrence_id = v_series_id,
           competence = v_competence
     where id = p_id;

    perform public.generate_recurring_costs();
  else
    update public.costs
       set description = p_description,
           type = p_type,
           category = p_category,
           amount = p_amount,
           is_recurring = false,
           cost_date = p_cost_date
     where id = p_id;
  end if;

  return p_id;
end;
$$;

revoke all on function public.save_manual_cost(uuid, text, text, text, numeric, date, boolean)
  from public, anon;
grant execute on function public.save_manual_cost(uuid, text, text, text, numeric, date, boolean)
  to authenticated;

comment on function public.save_manual_cost(uuid, text, text, text, numeric, date, boolean) is
  'Cria/edita custo manual e sua serie mensal; edicao recorrente vale da competencia escolhida em diante.';

-- Excluir um lancamento recorrente encerra a serie naquela competencia:
-- anteriores ficam como historia; a escolhida e as seguintes saem.
create or replace function public.delete_manual_cost(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
  v_cost   public.costs%rowtype;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception using errcode = '42501', message = 'sem empresa na sessão';
  end if;

  -- Sem o bundle `app`: pela matriz de 20260917010000, so `costs` escreve.
  if not public.current_actor_can_use_module('costs') then
    raise exception using errcode = '42501', message = 'sem permissão para custos';
  end if;

  perform public.lock_tenant_cost_series(v_tenant);
  perform set_config('aguiar.cost_series_context', 'on', true);

  select c.*
    into v_cost
    from public.costs c
   where c.id = p_id
     and c.tenant_id = v_tenant
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'custo não encontrado';
  end if;
  if v_cost.origin = 'stock' then
    raise exception using errcode = '42501', message = 'este custo veio de uma entrada de estoque; ajuste pelo estoque';
  end if;

  if v_cost.recurrence_id is not null then
    perform 1
      from public.cost_recurrence_series s
     where s.id = v_cost.recurrence_id
       and s.tenant_id = v_tenant
     for update;

    update public.cost_recurrence_series
       set active = false,
           ended_at = now(),
           updated_at = now()
     where id = v_cost.recurrence_id
       and active;

    delete from public.costs c
     where c.recurrence_id = v_cost.recurrence_id
       and c.competence >= v_cost.competence;
  else
    delete from public.costs
     where id = p_id
       and tenant_id = v_tenant;
  end if;

  return true;
end;
$$;

revoke all on function public.delete_manual_cost(uuid) from public, anon;
grant execute on function public.delete_manual_cost(uuid) to authenticated;

comment on function public.delete_manual_cost(uuid) is
  'Exclui custo avulso; em serie mensal, encerra na competencia escolhida e preserva as anteriores.';
