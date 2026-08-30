-- =====================================================================
-- TENANT_SETTINGS — as preferências que a tela mostra e o banco não guardava.
--
-- Hoje, em Configurações › Preferências, as três chaves (formas aceitas,
-- imprimir comprovante, pedir cliente) vivem só no estado do React: valem a
-- sessão e voltam ao padrão no próximo login. A tela diz isso em voz alta, num
-- aviso "Em breve", porque um interruptor que parece salvar e não salva é pior
-- do que um que se assume incompleto. Este arquivo tira o aviso.
--
-- ┌─ POR QUE O TEMA NÃO ESTÁ AQUI ─────────────────────────────────────────┐
-- │ O levantamento listava "tema" junto das outras três. Ele não é a mesma │
-- │ coisa: as três dizem respeito ao NEGÓCIO — que formas o balcão aceita, │
-- │ se sai comprovante — e valem igual para todo mundo que trabalha ali.   │
-- │ Tema é da PESSOA. Numa tabela por tenant, o caixa mudar para escuro    │
-- │ mudaria a tela do dono junto, e um dos dois desfaria a escolha do      │
-- │ outro para sempre.                                                     │
-- │                                                                        │
-- │ Por isso ele vai para `profiles`, no fim deste arquivo — que é onde já │
-- │ mora o que é de cada usuário.                                          │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- 1:1 com `tenants`: a PK É a FK, mesmo desenho de `tenant_fiscal_settings`.
-- Uma preferência não existe sem o negócio a que pertence.
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

create table if not exists public.tenant_settings (
  tenant_id uuid primary key
            references public.tenants(id) on delete cascade,

  -- ── As formas que o balcão aceita ────────────────────────────────
  -- Array e não cinco booleanos: a lista de formas é a mesma de
  -- `sales.payment_method`, e uma coluna por forma obrigaria uma migration
  -- toda vez que uma nova entrasse.
  --
  -- O CHECK garante duas coisas que uma tela sozinha não garante: que só entra
  -- vocabulário conhecido, e que a lista NÃO FICA VAZIA. Zero formas aceitas
  -- deixaria o PDV sem nenhuma opção de pagamento — um caixa que não consegue
  -- fechar venda nenhuma, salvo por um interruptor desligado sem querer.
  accepted_payment_methods text[] not null
    default array['cash', 'pix', 'debit', 'credit']
    check (
      array_length(accepted_payment_methods, 1) >= 1
      and accepted_payment_methods <@ array['cash', 'pix', 'debit', 'credit']
    ),

  -- ── Comportamento do PDV ─────────────────────────────────────────
  -- Os defaults são o que o portal já assume hoje em `initialState`, para
  -- quem nunca abriu Preferências não ver a tela mudar de comportamento no
  -- dia em que esta tabela passar a existir.
  print_receipt boolean not null default true,
  ask_customer  boolean not null default false,

  updated_at timestamptz not null default now()
);

comment on table public.tenant_settings is
  'Preferências de uso do negócio (Configurações › Preferências no portal do cliente). Uma linha por tenant; a ausência da linha significa "tudo no padrão", e é por isso que a leitura do portal trata NULL e linha ausente do mesmo jeito.';

comment on column public.tenant_settings.accepted_payment_methods is
  'As formas que aparecem no seletor do PDV. Mesmo vocabulário de sales.payment_method — ver 20260828000000_state_column_checks.sql.';

-- `updated_at` que se mantém sozinho: deixar para a aplicação significa que a
-- primeira escrita que esquecer deixa a coluna mentindo.
create or replace function public.touch_tenant_settings()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tenant_settings_touch on public.tenant_settings;

create trigger tenant_settings_touch
  before update on public.tenant_settings
  for each row
  execute function public.touch_tenant_settings();

-- ---------------------------------------------------------------------
-- RLS — mesmo desenho de `tenant_fiscal_settings`.
--
-- Nenhuma coluna aqui decide preço, plano ou acesso, então a tabela inteira é
-- do cliente: ele lê e escreve a própria linha, e mais nada.
-- ---------------------------------------------------------------------
alter table public.tenant_settings enable row level security;

drop policy if exists "tenant le as proprias preferencias" on public.tenant_settings;
drop policy if exists "tenant escreve as proprias preferencias" on public.tenant_settings;

create policy "tenant le as proprias preferencias" on public.tenant_settings
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

create policy "tenant escreve as proprias preferencias" on public.tenant_settings
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

grant select, insert, update on public.tenant_settings to authenticated;

-- =====================================================================
-- O TEMA — de cada pessoa, não do negócio.
--
-- Hoje ele nem sobrevive a um F5: `initialState` devolve 'light' toda vez que
-- o provider monta. Uma coluna em `profiles` resolve isso sem misturar a
-- escolha de um funcionário com a do outro.
--
-- NULL significa "nunca escolheu" — e é diferente de 'light'. Quando o portal
-- passar a respeitar o tema do sistema operacional, é o NULL que vai permitir
-- distinguir quem quer claro de quem nunca opinou.
-- =====================================================================
alter table public.profiles
  add column if not exists ui_theme text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_ui_theme_check') then
    alter table public.profiles
      add constraint profiles_ui_theme_check
      check (ui_theme is null or ui_theme in ('light', 'dark'));
  end if;
end $$;

comment on column public.profiles.ui_theme is
  'Tema escolhido por ESTA pessoa no portal. NULL = nunca escolheu, que não é o mesmo que "claro".';
