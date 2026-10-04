-- =====================================================================
-- MENSALIDADE PAGA NO PORTAL (Mercado Pago)
-- =====================================================================
--
-- Até aqui `platform_payments` era um caderno do admin: ele marcava à mão o
-- que tinha recebido, e o comércio nunca via a própria cobrança. Esta
-- migration é o que permite o dono pagar a mensalidade dentro do portal:
--
--   * `platform_payments` continua sendo A COBRANÇA — uma linha por negócio
--     por mês. Ganha as colunas que dizem como ela foi quitada;
--   * `platform_payment_attempts` é cada TENTATIVA de pagar essa cobrança no
--     Mercado Pago: um Pix gerado, um cartão passado. Uma cobrança pode ter
--     várias (Pix que venceu, cartão recusado) e só uma a quita;
--   * `ensure_current_charge()` faz a cobrança do mês existir quando o dono
--     abre a tela — não há rotina mensal que as gere, e não precisa haver;
--   * `apply_provider_payment()` é o único caminho que quita uma cobrança a
--     partir do provedor, e só a chave de serviço o executa.
--
-- QUEM ESCREVE: nunca o navegador. O dono LÊ as próprias cobranças e
-- tentativas; quem cria tentativa e quita cobrança são as Edge Functions
-- (`billing-checkout`, `mp-webhook`), com a chave de serviço, depois de
-- perguntar ao Mercado Pago o que de fato aconteceu.
--
-- O registro manual do console (`markPaid`/`undoPaid`) continua valendo: é a
-- saída para quem pagou por fora (transferência, dinheiro).
--
-- IDEMPOTENTE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A cobrança ganha o "como foi paga"
-- ---------------------------------------------------------------------
alter table public.platform_payments
  add column if not exists payment_method      text,
  add column if not exists provider            text,
  add column if not exists provider_payment_id text,
  add column if not exists fee_amount          numeric(10,2),
  add column if not exists net_amount          numeric(10,2);

comment on column public.platform_payments.payment_method is
  'pix | card quando paga pelo portal; NULL no registro manual do console.';
comment on column public.platform_payments.provider is
  'mercadopago quando quitada pelo provedor; NULL no registro manual.';
comment on column public.platform_payments.fee_amount is
  'Tarifa que o provedor reteve. net_amount é o que de fato entra na conta.';

-- ---------------------------------------------------------------------
-- 2. As tentativas
-- ---------------------------------------------------------------------
create table if not exists public.platform_payment_attempts (
  id                     uuid primary key default gen_random_uuid(),
  payment_id             uuid not null references public.platform_payments(id) on delete cascade,
  tenant_id              uuid not null references public.tenants(id) on delete cascade,
  created_by             uuid references public.profiles(id) on delete set null,
  method                 text not null,
  amount                 numeric(10,2) not null,
  status                 text not null default 'pending',
  provider               text not null default 'mercadopago',
  provider_payment_id    text,
  provider_status        text,
  provider_status_detail text,
  -- Pix: o "copia e cola", a imagem do QR e até quando ele vale.
  pix_code               text,
  pix_qr_base64          text,
  ticket_url             text,
  expires_at             timestamptz,
  -- Cartão: só o que identifica o cartão para a pessoa. Número e CVV nunca
  -- passam por aqui — quem os recebe é o Mercado Pago, direto do navegador.
  card_brand             text,
  card_last4             text,
  fee_amount             numeric(10,2),
  net_amount             numeric(10,2),
  release_date           timestamptz,
  approved_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint platform_payment_attempts_method_check
    check (method in ('pix', 'card')),
  constraint platform_payment_attempts_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded'))
);

create unique index if not exists platform_payment_attempts_provider_uidx
  on public.platform_payment_attempts (provider, provider_payment_id)
  where provider_payment_id is not null;
create index if not exists platform_payment_attempts_payment_idx
  on public.platform_payment_attempts (payment_id, created_at desc);
create index if not exists platform_payment_attempts_tenant_idx
  on public.platform_payment_attempts (tenant_id, created_at desc);

comment on table public.platform_payment_attempts is
  'Cada tentativa de pagar uma cobrança de platform_payments no provedor. '
  'Escrita só pela chave de serviço (Edge Functions); o dono do negócio lê as suas.';

alter table public.platform_payment_attempts enable row level security;

-- ---------------------------------------------------------------------
-- 3. RLS — o dono lê; ninguém do navegador escreve
-- ---------------------------------------------------------------------
-- `payments_admin_only` (FOR ALL, admin) continua como está. Policies são
-- permissivas e se somam: esta só acrescenta a LEITURA do dono. Funcionário
-- não entra — quanto o negócio paga à plataforma é assunto de quem assina.
drop policy if exists payments_owner_select on public.platform_payments;
create policy payments_owner_select on public.platform_payments
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_actor_is_owner());

drop policy if exists payment_attempts_admin_all on public.platform_payment_attempts;
create policy payment_attempts_admin_all on public.platform_payment_attempts
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists payment_attempts_owner_select on public.platform_payment_attempts;
create policy payment_attempts_owner_select on public.platform_payment_attempts
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_actor_is_owner());

revoke all on public.platform_payment_attempts from anon;
grant select on public.platform_payment_attempts to authenticated;
grant all on public.platform_payment_attempts to service_role;

-- ---------------------------------------------------------------------
-- 4. Dia de vencimento
-- ---------------------------------------------------------------------
-- Um dia só para a plataforma inteira, em `platform_settings`. Fica de 1 a 28
-- para existir em todo mês — dia 31 em fevereiro não vence nunca.
insert into public.platform_settings (key, value)
values ('billing_due_day', '10'::jsonb)
on conflict (key) do nothing;

create or replace function public.billing_due_day()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select least(28, greatest(1, coalesce(
    -- O console grava o dia como texto ("10"), o seed como número (10).
    (select case
              when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric::integer
              when jsonb_typeof(value) = 'string' and (value #>> '{}') ~ '^[0-9]{1,2}$'
                then (value #>> '{}')::integer
            end
       from public.platform_settings
      where key = 'billing_due_day'),
    10
  )));
$$;

comment on function public.billing_due_day() is
  'Dia do mês em que a mensalidade vence (platform_settings.billing_due_day, 1 a 28; padrão 10).';

-- ---------------------------------------------------------------------
-- 5. A cobrança do mês passa a existir quando o dono olha
-- ---------------------------------------------------------------------
-- SECURITY DEFINER porque o dono não tem (nem deve ter) INSERT em
-- `platform_payments`. O que ele pode provocar aqui é exatamente uma linha: a
-- do próprio negócio, do mês corrente, no valor que o console definiu.
--
-- O mês é o do Brasil, não o UTC: às 22h do dia 30 a cobrança ainda é a deste
-- mês para quem está no balcão.
create or replace function public.ensure_current_charge()
returns public.platform_payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_fee    numeric(10,2);
  v_status text;
  v_month  date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  v_row    public.platform_payments;
begin
  if v_tenant is null or not public.current_actor_is_owner() then
    return null;
  end if;

  select monthly_fee, status into v_fee, v_status
    from public.tenants
   where id = v_tenant;

  -- Plano gratuito ou negócio desativado: não há o que cobrar.
  if coalesce(v_fee, 0) <= 0 or v_status is distinct from 'active' then
    return null;
  end if;

  insert into public.platform_payments (tenant_id, amount, reference_month, status, due_date)
  values (v_tenant, v_fee, v_month, 'pending', v_month + (public.billing_due_day() - 1))
  on conflict (tenant_id, reference_month) do nothing;

  -- Linha criada pelo console sem vencimento ganha o vencimento padrão; o
  -- valor de uma cobrança já emitida NÃO acompanha uma mudança de mensalidade.
  update public.platform_payments
     set due_date = v_month + (public.billing_due_day() - 1)
   where tenant_id = v_tenant
     and reference_month = v_month
     and due_date is null
     and status <> 'paid';

  select * into v_row
    from public.platform_payments
   where tenant_id = v_tenant and reference_month = v_month;

  return v_row;
end;
$$;

comment on function public.ensure_current_charge() is
  'Garante a cobrança do mês corrente do negócio do dono logado e a devolve. '
  'NULL para quem não é dono, plano sem mensalidade ou negócio inativo.';

revoke all on function public.ensure_current_charge() from public, anon;
grant execute on function public.ensure_current_charge() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. O que o provedor disse vira estado — só pela chave de serviço
-- ---------------------------------------------------------------------
-- Recebe o retrato do pagamento JÁ consultado no Mercado Pago pela Edge
-- Function. Atualiza a tentativa e, se ela foi aprovada, quita a cobrança.
--
-- Pode ser chamada quantas vezes for (webhook repetido, consulta da tela e
-- webhook chegando juntos): o `for update` enfileira, e quitar o que já está
-- quitado pela mesma tentativa não muda nada.
--
-- Estorno/chargeback de quem tinha quitado reabre a cobrança.
create or replace function public.apply_provider_payment(
  p_attempt_id          uuid,
  p_provider_payment_id text,
  p_status              text,
  p_provider_status     text,
  p_status_detail       text default null,
  p_fee_amount          numeric default null,
  p_net_amount          numeric default null,
  p_approved_at         timestamptz default null,
  p_release_date        timestamptz default null,
  p_card_brand          text default null,
  p_card_last4          text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.platform_payment_attempts;
  v_charge  public.platform_payments;
begin
  if p_status not in ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded') then
    raise exception 'status de tentativa inválido: %', p_status;
  end if;

  select * into v_attempt
    from public.platform_payment_attempts
   where id = p_attempt_id
     for update;

  if not found then
    return 'unknown';
  end if;

  -- Uma tentativa pertence a UM pagamento do provedor. Um id diferente do que
  -- já está gravado é outra coisa tentando se passar por esta.
  if v_attempt.provider_payment_id is not null
     and v_attempt.provider_payment_id <> p_provider_payment_id then
    raise exception 'tentativa % já pertence a outro pagamento do provedor', p_attempt_id;
  end if;

  update public.platform_payment_attempts
     set provider_payment_id    = p_provider_payment_id,
         status                 = p_status,
         provider_status        = p_provider_status,
         provider_status_detail = p_status_detail,
         fee_amount             = coalesce(p_fee_amount, fee_amount),
         net_amount             = coalesce(p_net_amount, net_amount),
         approved_at            = coalesce(p_approved_at, approved_at),
         release_date           = coalesce(p_release_date, release_date),
         card_brand             = coalesce(p_card_brand, card_brand),
         card_last4             = coalesce(p_card_last4, card_last4),
         updated_at             = now()
   where id = p_attempt_id;

  select * into v_charge
    from public.platform_payments
   where id = v_attempt.payment_id
     for update;

  if p_status = 'approved' then
    -- Só quita o que está em aberto. Uma cobrança já paga (por outra tentativa
    -- ou pelo console) fica como está — a tentativa aprovada continua
    -- registrada, e é o admin quem decide o estorno do pagamento em dobro.
    if v_charge.status <> 'paid' then
      update public.platform_payments
         set status              = 'paid',
             paid_at             = coalesce(p_approved_at, now()),
             payment_method      = v_attempt.method,
             provider            = v_attempt.provider,
             provider_payment_id = p_provider_payment_id,
             fee_amount          = p_fee_amount,
             net_amount          = p_net_amount
       where id = v_charge.id;
    end if;
  elsif p_status = 'refunded' then
    if v_charge.status = 'paid' and v_charge.provider_payment_id = p_provider_payment_id then
      update public.platform_payments
         set status              = 'pending',
             paid_at             = null,
             payment_method      = null,
             provider            = null,
             provider_payment_id = null,
             fee_amount          = null,
             net_amount          = null
       where id = v_charge.id;
    end if;
  end if;

  return p_status;
end;
$$;

comment on function public.apply_provider_payment(uuid, text, text, text, text, numeric, numeric, timestamptz, timestamptz, text, text) is
  'Grava na tentativa o que o provedor respondeu e quita (ou reabre) a cobrança. '
  'EXECUTE só para service_role: afirmar que um pagamento foi aprovado não pode partir do navegador.';

revoke all on function public.apply_provider_payment(uuid, text, text, text, text, numeric, numeric, timestamptz, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_provider_payment(uuid, text, text, text, text, numeric, numeric, timestamptz, timestamptz, text, text)
  to service_role;
