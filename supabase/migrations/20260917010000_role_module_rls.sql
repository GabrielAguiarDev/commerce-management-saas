-- =====================================================================
-- AUTORIZAÇÃO POR PAPEL E MÓDULO NO BANCO (domínios usados pelo mobile)
--
-- Até aqui, o RLS destas tabelas isolava por TENANT, e a checagem de papel e
-- módulo vivia na UI, no proxy do portal e em algumas RPCs
-- (`current_actor_can_use_module`, 20260913020000). Uma sessão válida de um
-- balconista conseguia, por PostgREST direto, ler custos, apagar produtos ou
-- mexer no caixa. Esta migration fecha isso no banco.
--
-- ┌─ COMO ─────────────────────────────────────────────────────────────────┐
-- │ 1. Policies RESTRICTIVE por operação. Elas se somam (AND) às policies   │
-- │    permissivas de tenant que já existem — não é preciso conhecer nem    │
-- │    reescrever essas policies, e o isolamento por tenant continua sendo  │
-- │    delas. As restritivas repetem `tenant_id = current_tenant_id()` como │
-- │    segunda trava.                                                       │
-- │ 2. Triggers de guarda em `products`, `stock_movements`,                 │
-- │    `cash_registers` e `cash_movements`. RLS não vale dentro de função   │
-- │    SECURITY DEFINER (o dono ignora RLS), e `apply_stock_movement` /     │
-- │    `close_cash_register` foram criadas fora deste diretório — não dá    │
-- │    para garantir aqui como estão declaradas. Trigger dispara nos dois   │
-- │    casos. A identidade vem do JWT da requisição, não de `current_user`, │
-- │    porque dentro de uma função DEFINER `current_user` é o dono dela.    │
-- │ 3. As views de relatório ganham um filtro de módulo por fora da         │
-- │    definição atual (que não está versionada), preservando colunas e     │
-- │    opções (`security_invoker`).                                         │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- MATRIZ (chaves de `modules.key`; `app` libera só `sales` e `products`):
--
--   tabela            | SELECT                      | INSERT            | UPDATE                  | DELETE
--   ------------------+-----------------------------+-------------------+-------------------------+---------
--   sales, sale_items | sales, reports, cash        | sales             | sales                   | sales
--   products          | products, stock, sales,     | products          | products; stock (saldo/ | products
--                     | reports                     |                   | custo); sales (saldo,   |
--                     |                             |                   | só via venda/estorno)   |
--   stock_movements   | stock, reports (+ contexto  | stock; sales (só  | stock                   | stock
--                     | de venda)                   | via venda/estorno)|                         |
--   costs             | costs, reports              | costs; stock com  | costs                   | costs
--                     |                             | origin = 'stock'  |                         |
--   cash_registers,   | cash                        | cash              | cash                    | cash
--   cash_movements    |                             |                   |                         |
--   support_tickets,  | membro ativo do tenant (sem módulo: suporte é base de todo usuário)
--   support_messages  | cliente não grava mensagem como 'support'/'admin'
--
-- Sempre liberados: `service_role` (BYPASSRLS + guarda reconhece o JWT),
-- conexão direta sem JWT (migrations, cron) e admin da plataforma.
-- Escritas feitas por TRIGGER do próprio banco (ex.: a baixa de estoque ao
-- inserir `sale_items`) herdam a autorização do comando que as disparou.
--
-- Esta migration NÃO toca no fluxo fiscal (`fiscal_*`, `enqueue_fiscal_document`).
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Pré-condições. Falhar aqui é melhor do que criar policy que só quebra
--    em tempo de consulta, ou que não vale nada porque o RLS está desligado.
-- ---------------------------------------------------------------------
do $$
declare
  v_missing text;
begin
  select string_agg(f, ', ')
    into v_missing
    from unnest(array[
      'public.current_tenant_id()',
      'public.is_platform_admin()',
      'public.has_module(text)',
      'public.current_actor_can_use_module(text, boolean)'
    ]) as f
   where to_regprocedure(f) is null;

  if v_missing is not null then
    raise exception using message = format('funções ausentes: %s', v_missing);
  end if;

  select string_agg(format('%s.%s', r.t, r.c), ', ')
    into v_missing
    from (values
      ('sales', 'tenant_id'),
      ('sale_items', 'tenant_id'),
      ('products', 'tenant_id'),
      ('products', 'stock_quantity'),
      ('products', 'cost'),
      ('stock_movements', 'tenant_id'),
      ('costs', 'tenant_id'),
      ('costs', 'origin'),
      ('cash_registers', 'tenant_id'),
      ('cash_movements', 'tenant_id'),
      ('support_tickets', 'tenant_id'),
      ('support_messages', 'tenant_id'),
      ('support_messages', 'sender_side')
    ) as r(t, c)
   where not exists (
     select 1
       from information_schema.columns ic
      where ic.table_schema = 'public'
        and ic.table_name = r.t
        and ic.column_name = r.c
   );

  if v_missing is not null then
    raise exception using message = format('colunas ausentes: %s', v_missing);
  end if;

  select string_agg(t, ', ')
    into v_missing
    from unnest(array[
      'sales', 'sale_items', 'products', 'stock_movements', 'costs',
      'cash_registers', 'cash_movements', 'support_tickets', 'support_messages'
    ]) as t
   where not exists (
     select 1
       from pg_class c
      where c.oid = to_regclass('public.' || t)
        and c.relrowsecurity
   );

  if v_missing is not null then
    raise exception using
      message = format('RLS desligado (ou tabela ausente): %s', v_missing),
      hint = 'Policies restritivas não têm efeito sem RLS, e ligá-lo aqui '
             'sem as policies permissivas de tenant bloquearia tudo.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Funções auxiliares
-- ---------------------------------------------------------------------

-- Chamador de backend confiável: chave `service_role` ou conexão direta sem
-- requisição (migration, cron, SQL editor). Lê o JWT e não `current_user`:
-- dentro de uma função SECURITY DEFINER, `current_user` vira o dono da função
-- mesmo quando quem chamou é um balconista.
create or replace function public.request_is_trusted_backend()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when v.jwt_role = 'service_role' then true
    when v.jwt_role is null then
      auth.uid() is null
      and session_user not in ('authenticator', 'anon', 'authenticated')
    else false
  end
  from (
    select coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
      nullif(current_setting('request.jwt.claim.role', true), '')
    ) as jwt_role
  ) as v;
$$;

revoke all on function public.request_is_trusted_backend() from public, anon;
grant execute on function public.request_is_trusted_backend() to authenticated, service_role;

comment on function public.request_is_trusted_backend() is
  'True para JWT service_role ou conexão direta sem requisição PostgREST. Baseada no JWT, e não em current_user, para continuar correta dentro de funções SECURITY DEFINER.';

-- Qualquer um dos módulos. `app` só libera `sales` e `products`: é o que o
-- aplicativo precisa para vender e manter o catálogo.
create or replace function public.current_actor_can_use_any_module(p_module_keys text[])
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    bool_or(public.current_actor_can_use_module(k, k in ('sales', 'products'))),
    false
  )
  from unnest(p_module_keys) as k;
$$;

revoke all on function public.current_actor_can_use_any_module(text[]) from public, anon;
grant execute on function public.current_actor_can_use_any_module(text[]) to authenticated;

comment on function public.current_actor_can_use_any_module(text[]) is
  'True se o perfil customer ativo pode usar ao menos um dos módulos (plano + papel). O bundle app vale apenas para sales e products.';

-- Versão para views: também libera backend confiável e admin da plataforma.
-- SECURITY DEFINER para que quem consulta a view não precise de EXECUTE nas
-- funções internas (em view, o privilégio de função é checado no chamador).
create or replace function public.current_actor_can_access_modules(p_module_keys text[])
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.request_is_trusted_backend() then
    return true;
  end if;
  if public.is_platform_admin() then
    return true;
  end if;
  return public.current_actor_can_use_any_module(p_module_keys);
end;
$$;

revoke all on function public.current_actor_can_access_modules(text[]) from public, anon;
grant execute on function public.current_actor_can_access_modules(text[]) to authenticated, service_role;

comment on function public.current_actor_can_access_modules(text[]) is
  'Gate das views de relatório: backend confiável, admin da plataforma ou perfil com um dos módulos.';

-- Suporte é base: não depende de plano nem de papel, só de pertencer ao
-- tenant com acesso ativo.
create or replace function public.current_actor_is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.tenant_id = public.current_tenant_id()
       and p.status = 'active'
       and coalesce(p.is_platform_admin, false) = false
  );
$$;

revoke all on function public.current_actor_is_active_member() from public, anon;
grant execute on function public.current_actor_is_active_member() to authenticated;

comment on function public.current_actor_is_active_member() is
  'True para perfil customer ativo do tenant da sessão, sem exigir módulo.';

-- Marca transacional ligada por `set_sale_refunded` enquanto ela devolve ou
-- baixa estoque. Cliente PostgREST não consegue definir GUCs arbitrárias; o
-- valor volta ao vazio no fim da transação (set_config local).
create or replace function public.sale_stock_context_active()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(current_setting('aguiar.sale_stock_context', true), '') <> '';
$$;

revoke all on function public.sale_stock_context_active() from public, anon;
grant execute on function public.sale_stock_context_active() to authenticated, service_role;

comment on function public.sale_stock_context_active() is
  'True apenas dentro de set_sale_refunded, enquanto ela move estoque da venda.';

-- ---------------------------------------------------------------------
-- 2. Policies restritivas
--
-- Geradas por um helper temporário para que as nove tabelas usem exatamente
-- o mesmo formato. Cada `(select ...)` é avaliado uma vez por comando
-- (initPlan), e não por linha.
-- ---------------------------------------------------------------------
create function pg_temp.module_gate(p_modules text[])
returns text
language sql
immutable
as $$
  select format(
    '((select public.is_platform_admin()) or (tenant_id = (select public.current_tenant_id()) and (select public.current_actor_can_use_any_module(%L::text[]))))',
    p_modules
  );
$$;

create function pg_temp.set_role_module_policies(
  p_table  text,
  p_select text,
  p_insert text,
  p_update text,
  p_delete text
)
returns void
language plpgsql
as $$
begin
  execute format('drop policy if exists role_module_select on public.%I', p_table);
  execute format('drop policy if exists role_module_insert on public.%I', p_table);
  execute format('drop policy if exists role_module_update on public.%I', p_table);
  execute format('drop policy if exists role_module_delete on public.%I', p_table);
  execute format('drop policy if exists role_module_deny_anon on public.%I', p_table);

  execute format(
    'create policy role_module_select on public.%I as restrictive for select to authenticated using (%s)',
    p_table, p_select);
  execute format(
    'create policy role_module_insert on public.%I as restrictive for insert to authenticated with check (%s)',
    p_table, p_insert);
  execute format(
    'create policy role_module_update on public.%I as restrictive for update to authenticated using (%s) with check (%s)',
    p_table, p_update, p_update);
  execute format(
    'create policy role_module_delete on public.%I as restrictive for delete to authenticated using (%s)',
    p_table, p_delete);
  -- Nenhuma tela usa estas tabelas sem sessão.
  execute format(
    'create policy role_module_deny_anon on public.%I as restrictive for all to anon using (false) with check (false)',
    p_table);
end;
$$;

do $$
declare
  -- Escrita emitida por trigger do banco (depth > 0 durante o comando
  -- aninhado). O comando de fora já passou pela própria policy.
  c_nested constant text := '(pg_trigger_depth() > 0)';
  c_sale_ctx constant text :=
    '((select public.sale_stock_context_active()) and ' || pg_temp.module_gate(array['sales']) || ')';
  c_member constant text :=
    '((select public.is_platform_admin()) or (tenant_id = (select public.current_tenant_id()) and (select public.current_actor_is_active_member())))';
begin
  -- Vendas. O caixa lê vendas para a conferência do turno; relatórios, para
  -- os agregados.
  perform pg_temp.set_role_module_policies(
    'sales',
    pg_temp.module_gate(array['sales', 'reports', 'cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['sales']),
    c_nested || ' or ' || pg_temp.module_gate(array['sales']),
    c_nested || ' or ' || pg_temp.module_gate(array['sales'])
  );

  perform pg_temp.set_role_module_policies(
    'sale_items',
    pg_temp.module_gate(array['sales', 'reports', 'cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['sales']),
    c_nested || ' or ' || pg_temp.module_gate(array['sales']),
    c_nested || ' or ' || pg_temp.module_gate(array['sales'])
  );

  -- Produtos. O PDV lê o catálogo; estoque lê para movimentar; relatórios
  -- leem o custo. UPDATE admite estoque e vendas no RLS, e o trigger da
  -- seção 3 restringe QUAIS colunas cada um pode mudar.
  perform pg_temp.set_role_module_policies(
    'products',
    pg_temp.module_gate(array['products', 'stock', 'sales', 'reports']),
    c_nested || ' or ' || pg_temp.module_gate(array['products']),
    c_nested || ' or ' || pg_temp.module_gate(array['products', 'stock', 'sales']),
    c_nested || ' or ' || pg_temp.module_gate(array['products'])
  );

  -- Movimentações. Vendas só gravam dentro do estorno (contexto) ou pela
  -- baixa automática do trigger de `sale_items` (aninhado). A leitura também
  -- aceita esses dois caminhos, para um eventual INSERT ... RETURNING dentro
  -- de `apply_stock_movement`.
  perform pg_temp.set_role_module_policies(
    'stock_movements',
    c_nested || ' or ' || c_sale_ctx || ' or ' || pg_temp.module_gate(array['stock', 'reports']),
    c_nested || ' or ' || c_sale_ctx || ' or ' || pg_temp.module_gate(array['stock']),
    c_nested || ' or ' || pg_temp.module_gate(array['stock']),
    c_nested || ' or ' || pg_temp.module_gate(array['stock'])
  );

  -- Custos. A entrada de estoque com custo lança a compra direto em `costs`
  -- (portal e app), por isso estoque insere — mas só com origin = 'stock'.
  perform pg_temp.set_role_module_policies(
    'costs',
    pg_temp.module_gate(array['costs', 'reports']),
    c_nested || ' or ' || pg_temp.module_gate(array['costs'])
      || ' or (origin = ''stock'' and ' || pg_temp.module_gate(array['stock']) || ')',
    c_nested || ' or ' || pg_temp.module_gate(array['costs']),
    c_nested || ' or ' || pg_temp.module_gate(array['costs'])
  );

  -- Caixa.
  perform pg_temp.set_role_module_policies(
    'cash_registers',
    pg_temp.module_gate(array['cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['cash'])
  );

  perform pg_temp.set_role_module_policies(
    'cash_movements',
    pg_temp.module_gate(array['cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['cash']),
    c_nested || ' or ' || pg_temp.module_gate(array['cash'])
  );

  -- Suporte: qualquer membro ativo, com ou sem módulo/`app`. O cliente pode
  -- gravar como 'client' ou 'system' (o portal registra mudança de status),
  -- nunca como a equipe de suporte. O admin da plataforma passa pelo gate.
  perform pg_temp.set_role_module_policies(
    'support_tickets',
    c_member,
    c_member,
    c_member,
    c_member
  );

  perform pg_temp.set_role_module_policies(
    'support_messages',
    c_member,
    '((select public.is_platform_admin()) or ('
      || c_member || ' and sender_side in (''client'', ''system'')))',
    c_member,
    c_member
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Guardas por trigger (valem também dentro de SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- Produtos: quem tem `products` faz tudo. Sem ele:
--   * `stock` pode mudar saldo e custo (entrada de mercadoria);
--   * `sales` pode mudar só o saldo, e só dentro do estorno.
-- A comparação é feita sobre o JSON da linha, então colunas novas ficam
-- protegidas por padrão.
create or replace function public.guard_product_module_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant  uuid;
  v_changed text[];
begin
  if public.request_is_trusted_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- Escrita disparada por outro trigger (ex.: baixa ao inserir sale_items).
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if public.is_platform_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_tenant := public.current_tenant_id();

  if tg_op <> 'INSERT' then
    if v_tenant is null or old.tenant_id is distinct from v_tenant then
      raise exception using errcode = '42501', message = 'produto de outro negócio';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    if v_tenant is null or new.tenant_id is distinct from v_tenant then
      raise exception using errcode = '42501', message = 'produto de outro negócio';
    end if;
  end if;

  if public.current_actor_can_use_any_module(array['products']) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key), '{}'::text[])
      into v_changed
      from jsonb_each(to_jsonb(new)) as n
      join jsonb_each(to_jsonb(old)) as o on o.key = n.key
     where n.value is distinct from o.value;

    if v_changed <@ array['stock_quantity', 'cost', 'updated_at']
       and public.current_actor_can_use_any_module(array['stock']) then
      return new;
    end if;

    if v_changed <@ array['stock_quantity', 'updated_at']
       and public.sale_stock_context_active()
       and public.current_actor_can_use_any_module(array['sales']) then
      return new;
    end if;
  end if;

  raise exception using errcode = '42501', message = 'sem permissão para alterar produtos';
end;
$$;

comment on function public.guard_product_module_write() is
  'Restringe escrita em products por módulo e coluna, inclusive quando a escrita parte de função SECURITY DEFINER.';

drop trigger if exists guard_product_module_write on public.products;
create trigger guard_product_module_write
  before insert or update or delete on public.products
  for each row execute function public.guard_product_module_write();

-- Movimentações: `stock` faz tudo; `sales` só insere dentro do estorno.
create or replace function public.guard_stock_movement_module_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  if public.request_is_trusted_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if public.is_platform_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_tenant := public.current_tenant_id();

  if tg_op <> 'INSERT' then
    if v_tenant is null or old.tenant_id is distinct from v_tenant then
      raise exception using errcode = '42501', message = 'movimentação de outro negócio';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    if v_tenant is null or new.tenant_id is distinct from v_tenant then
      raise exception using errcode = '42501', message = 'movimentação de outro negócio';
    end if;
  end if;

  if public.current_actor_can_use_any_module(array['stock']) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if public.sale_stock_context_active()
       and public.current_actor_can_use_any_module(array['sales']) then
      return new;
    end if;
  end if;

  raise exception using errcode = '42501', message = 'sem permissão para movimentar estoque';
end;
$$;

comment on function public.guard_stock_movement_module_write() is
  'Exige o módulo stock para movimentar estoque; vendas só movimentam dentro de set_sale_refunded ou pelo trigger de sale_items.';

drop trigger if exists guard_stock_movement_module_write on public.stock_movements;
create trigger guard_stock_movement_module_write
  before insert or update or delete on public.stock_movements
  for each row execute function public.guard_stock_movement_module_write();

-- Caixa: cobre `close_cash_register` qualquer que seja o modo de segurança.
create or replace function public.guard_cash_module_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  if public.request_is_trusted_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if public.is_platform_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_tenant := public.current_tenant_id();

  if tg_op <> 'INSERT' then
    if v_tenant is null or old.tenant_id is distinct from v_tenant then
      raise exception using errcode = '42501', message = 'caixa de outro negócio';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    if v_tenant is null or new.tenant_id is distinct from v_tenant then
      raise exception using errcode = '42501', message = 'caixa de outro negócio';
    end if;
  end if;

  if public.current_actor_can_use_any_module(array['cash']) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  raise exception using errcode = '42501', message = 'sem permissão para o caixa';
end;
$$;

comment on function public.guard_cash_module_write() is
  'Exige o módulo cash para escrever em cash_registers e cash_movements, inclusive via SECURITY DEFINER.';

drop trigger if exists guard_cash_module_write on public.cash_registers;
create trigger guard_cash_module_write
  before insert or update or delete on public.cash_registers
  for each row execute function public.guard_cash_module_write();

drop trigger if exists guard_cash_module_write on public.cash_movements;
create trigger guard_cash_module_write
  before insert or update or delete on public.cash_movements
  for each row execute function public.guard_cash_module_write();

-- Triggers não recebem EXECUTE do chamador, mas deixar as funções fora da
-- API evita que apareçam como RPC.
revoke all on function public.guard_product_module_write() from public, anon, authenticated;
revoke all on function public.guard_stock_movement_module_write() from public, anon, authenticated;
revoke all on function public.guard_cash_module_write() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. set_sale_refunded — mesmo corpo de 20260913020000, agora marcando o
--    contexto de estorno enquanto move o estoque. Sem a marca, um perfil só
--    com `sales` seria barrado pelas guardas da seção 3 ao estornar.
-- ---------------------------------------------------------------------
create or replace function public.set_sale_refunded(
  p_sale_id uuid,
  p_refunded boolean
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
  v_status text;
  v_target text;
  v_sign numeric;
  v_item record;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception using errcode = '42501', message = 'sem tenant na sessão';
  end if;

  if not public.current_actor_can_use_module('sales', true) then
    raise exception using errcode = '42501', message = 'sem permissão para vendas';
  end if;

  if p_refunded is null then
    raise exception using errcode = '22023', message = 'o estado do estorno é obrigatório';
  end if;

  select status
    into v_status
    from public.sales
   where id = p_sale_id
     and tenant_id = v_tenant
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'venda não encontrada';
  end if;

  if p_refunded then
    if v_status = 'refunded' then
      return false;
    end if;
    if coalesce(v_status, 'completed') <> 'completed' then
      raise exception using errcode = '22023', message = 'estado atual da venda não permite estorno';
    end if;
    v_target := 'refunded';
    v_sign := 1;
  else
    -- Vendas antigas sem status são semanticamente completas neste sistema.
    if coalesce(v_status, 'completed') = 'completed' then
      return false;
    end if;
    if v_status <> 'refunded' then
      raise exception using errcode = '22023', message = 'estado atual da venda não permite desfazer o estorno';
    end if;

    -- Uma edição deixa a linha antiga estornada como trilha de auditoria.
    -- Reativá-la faria original e substituta contarem ao mesmo tempo.
    if exists (
      select 1
        from public.sales
       where tenant_id = v_tenant
         and replaces_sale_id = p_sale_id
    ) then
      raise exception using
        errcode = '22023',
        message = 'uma venda substituída não pode ter o estorno desfeito';
    end if;

    v_target := 'completed';
    v_sign := -1;
  end if;

  update public.sales
     set status = v_target
   where id = p_sale_id
     and tenant_id = v_tenant;

  -- A autorização de vendas já foi conferida acima; a marca vale só durante
  -- o laço e é limpa logo depois (e de todo jeito some no fim da transação).
  perform set_config('aguiar.sale_stock_context', p_sale_id::text, true);

  for v_item in
    select si.product_id, si.quantity, p.tracks_stock
      from public.sale_items si
      left join public.products p
        on p.id = si.product_id
       and p.tenant_id = v_tenant
     where si.sale_id = p_sale_id
       and si.tenant_id = v_tenant
  loop
    if v_item.product_id is null then
      continue;
    end if;

    -- Produto não visível/não pertencente ao tenant é corrupção de vínculo;
    -- não conclui o estorno deixando o estoque sem ajuste.
    if v_item.tracks_stock is null then
      raise exception using errcode = '23503', message = 'produto da venda não encontrado neste negócio';
    end if;

    if v_item.tracks_stock then
      perform public.apply_stock_movement(
        p_product_id => v_item.product_id,
        p_type => 'adjustment',
        p_quantity => v_sign * v_item.quantity,
        p_reason => case when p_refunded
          then 'Devolução por estorno'
          else 'Baixa por estorno desfeito'
        end,
        p_sale_id => p_sale_id,
        p_unit_cost => null
      );
    end if;
  end loop;

  perform set_config('aguiar.sale_stock_context', '', true);

  return true;
end;
$$;

comment on function public.set_sale_refunded(uuid, boolean) is
  'Estorna ou desfaz o estorno junto com todos os movimentos de estoque, sob lock da venda; retries no estado final são no-op. Marca aguiar.sale_stock_context durante a movimentação.';

revoke all on function public.set_sale_refunded(uuid, boolean) from public, anon;
grant execute on function public.set_sale_refunded(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Views de relatório
--
-- As definições não estão versionadas. Em vez de reescrevê-las às cegas, a
-- definição atual é embrulhada num filtro de módulo. `create or replace view`
-- substitui as opções da view, então as atuais (ex.: security_invoker) são
-- repassadas. Reaplicar não embrulha duas vezes.
-- Se a view for security_invoker, as policies da seção 2 também valem nela
-- (ex.: `v_monthly_result` mostra receita só para quem lê vendas).
-- ---------------------------------------------------------------------
do $$
declare
  r      record;
  v_def  text;
  v_opts text[];
  v_kind "char";
begin
  for r in
    select *
      from (values
        ('v_daily_sales',    array['sales', 'reports', 'cash']),
        ('v_product_sales',  array['sales', 'reports']),
        ('v_monthly_result', array['costs', 'reports']),
        ('v_stock_alerts',   array['stock', 'products', 'reports'])
      ) as t(view_name, modules)
  loop
    v_def := null;
    v_opts := null;
    v_kind := null;

    select pg_get_viewdef(c.oid), c.reloptions, c.relkind
      into v_def, v_opts, v_kind
      from pg_class c
     where c.oid = to_regclass('public.' || r.view_name);

    if v_kind is null then
      raise notice 'view public.% não existe; nada a filtrar', r.view_name;
      continue;
    end if;

    if v_kind <> 'v' then
      raise notice 'public.% não é uma view simples (relkind %); não alterada', r.view_name, v_kind;
      continue;
    end if;

    if v_def like '%current_actor_can_access_modules%' then
      continue;
    end if;

    v_def := regexp_replace(btrim(v_def), ';\s*$', '');

    execute format(
      'create or replace view public.%I %s as select gated.* from (%s) as gated where (select public.current_actor_can_access_modules(%L::text[]))',
      r.view_name,
      case
        when v_opts is null or cardinality(v_opts) = 0 then ''
        else 'with (' || array_to_string(v_opts, ', ') || ')'
      end,
      v_def,
      r.modules
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Grants das funções de domínio criadas fora deste diretório.
--    Nada muda para `authenticated` e `service_role`; `anon` e PUBLIC perdem
--    EXECUTE. As funções SECURITY DEFINER encontradas são listadas no log:
--    nelas o RLS acima não vale, e a proteção de escrita vem das guardas da
--    seção 3.
-- ---------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) as sig,
           p.prosecdef
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('apply_stock_movement', 'close_cash_register', 'expected_cash_for_register')
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);

    if f.prosecdef then
      raise notice '% é SECURITY DEFINER: leitura não passa pelo RLS de módulo; escrita coberta pelas guardas', f.sig;
    end if;
  end loop;
end;
$$;
