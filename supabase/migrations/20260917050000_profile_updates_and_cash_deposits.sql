-- =====================================================================
-- CORREÇÕES ACHADAS PELOS TESTES DE BANCO (supabase/tests)
--
-- (3, no fim do arquivo) `guard_support_message_write` conferia o autor
-- também em UPDATE: o cliente não conseguia marcar como lida uma resposta
-- do suporte/admin que tem `sender_id` preenchido.
--
-- 1. `profiles` não tinha policy de UPDATE para sessão de cliente. As únicas
--    policies eram `profiles_admin_all` (admin da plataforma) e
--    `profiles_select`. Resultado: o RLS filtrava a linha ANTES dos triggers
--    e todo UPDATE do portal afetava zero linhas, sem erro —
--      * `saveTheme` (ui_theme da própria pessoa) respondia "O tema não foi
--        salvo.";
--      * o dono não conseguia suspender/reativar nem trocar o tipo de acesso
--        de um funcionário.
--    As guardas de 20260913010000 (`guard_customer_profile_write`) e
--    20260917030000 (`guard_profile_email_write`) já decidem QUAIS colunas
--    cada um pode mudar; faltava só deixar a linha chegar até elas:
--      * `profiles_self_update`: a própria pessoa (campos de autoatendimento;
--        identidade, papel e status continuam barrados pelo trigger);
--      * `profiles_owner_update`: o dono ativo, dentro do próprio negócio
--        (o trigger impede mexer no próprio dono e trocar de negócio).
--
-- 2. `expected_cash_for_register` somava movimentos `reinforcement`, mas o
--    vocabulário de `cash_movements.type` é `{withdrawal, deposit}`
--    (20260828000000). Todo reforço era ignorado: o esperado saía menor e a
--    diferença gravada por `close_cash_register` saía errada (sobra
--    fantasma do valor do reforço). Além disso a função é SECURITY DEFINER e
--    não conferia o negócio: qualquer sessão que soubesse o uuid lia o
--    esperado do caixa de outro comércio. Agora:
--      * soma `deposit`;
--      * exige backend confiável, admin da plataforma ou perfil do mesmo
--        negócio com o módulo `cash`;
--      * caixa inexistente é erro (P0002) em vez de devolver NULL — antes
--        `close_cash_register` virava um no-op silencioso.
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. UPDATE em profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
  on public.profiles
  for update
  to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_actor_is_owner())
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.current_actor_is_owner())
  );

-- ---------------------------------------------------------------------
-- 2. Esperado do caixa
-- ---------------------------------------------------------------------
create or replace function public.expected_cash_for_register(p_register_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_opening    numeric := 0;
  v_opened_at  timestamptz;
  v_closed_at  timestamptz;
  v_tenant     uuid;
  v_sales_cash numeric := 0;
  v_deposit    numeric := 0;
  v_withdrawal numeric := 0;
begin
  select opening_amount, opened_at, coalesce(closed_at, now()), tenant_id
    into v_opening, v_opened_at, v_closed_at, v_tenant
    from public.cash_registers
   where id = p_register_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'caixa não encontrado';
  end if;

  if not (
    public.request_is_trusted_backend()
    or public.is_platform_admin()
    or (
      v_tenant = public.current_tenant_id()
      and public.current_actor_can_use_any_module(array['cash'])
    )
  ) then
    raise exception using errcode = '42501', message = 'sem permissão para o caixa';
  end if;

  -- vendas em dinheiro durante o turno (não estornadas)
  select coalesce(sum(total), 0)
    into v_sales_cash
    from public.sales
   where tenant_id = v_tenant
     and payment_method = 'cash'
     and status = 'completed'
     and sold_at between v_opened_at and v_closed_at;

  select coalesce(sum(amount) filter (where type = 'deposit'), 0),
         coalesce(sum(amount) filter (where type = 'withdrawal'), 0)
    into v_deposit, v_withdrawal
    from public.cash_movements
   where cash_register_id = p_register_id;

  return v_opening + v_sales_cash + v_deposit - v_withdrawal;
end;
$$;

revoke all on function public.expected_cash_for_register(uuid) from public, anon;
grant execute on function public.expected_cash_for_register(uuid) to authenticated, service_role;

comment on function public.expected_cash_for_register(uuid) is
  'Dinheiro esperado na gaveta: abertura + vendas em dinheiro do turno + reforços (deposit) - sangrias (withdrawal). Só backend, admin ou perfil do negócio com o módulo cash.';

-- ---------------------------------------------------------------------
-- 3. Autor da mensagem de suporte só é conferido no INSERT.
--
-- Em UPDATE a troca de `sender_id` já é barrada acima (identidade imutável);
-- conferir `sender_id = auth.uid()` ali impedia o cliente de marcar como lida
-- qualquer resposta assinada pela equipe (42501 "autor da mensagem inválido").
-- ---------------------------------------------------------------------
create or replace function public.guard_support_message_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_new     jsonb;
  v_changed text[];
begin
  if public.request_is_trusted_backend() then
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if public.is_platform_admin() then
    return new;
  end if;

  v_new := to_jsonb(new);

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key), '{}'::text[])
      into v_changed
      from jsonb_each(v_new) as n
      join jsonb_each(to_jsonb(old)) as o on o.key = n.key
     where n.value is distinct from o.value;

    if v_changed && array[
      'id', 'tenant_id', 'ticket_id', 'sender_id', 'sender_side',
      'body', 'attachment_url', 'created_at'
    ] then
      raise exception using errcode = '42501', message = 'mensagem de suporte não pode ser alterada';
    end if;

    if 'read_by_recipient' = any(v_changed) and old.sender_side = 'client' then
      raise exception using errcode = '42501', message = 'a leitura desta mensagem é marcada pelo suporte';
    end if;
  end if;

  if tg_op = 'INSERT'
     and v_new ? 'sender_id'
     and v_new->>'sender_id' is not null
     and v_new->>'sender_id' is distinct from auth.uid()::text then
    raise exception using errcode = '42501', message = 'autor da mensagem inválido';
  end if;

  if not exists (
    select 1
      from public.support_tickets t
     where t.id = new.ticket_id
       and t.tenant_id = new.tenant_id
  ) then
    raise exception using errcode = '42501', message = 'chamado de outro negócio';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_support_message_write() from public, anon, authenticated;

comment on function public.guard_support_message_write() is
  'Impede sessão comum de forjar autor/lado, mudar conteúdo ou ligar mensagem a chamado de outro tenant em support_messages.';
