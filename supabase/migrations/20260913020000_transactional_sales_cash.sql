-- =====================================================================
-- INTEGRIDADE TRANSACIONAL DE VENDAS E CAIXA (após autorização de equipe)
--
-- 1. `create_sale` valida cada item antes de gravar qualquer linha.
-- 2. Estorno e desfazer estorno passam por uma única RPC transacional.
-- 3. Editar estorna a venda original e cria a substituta na mesma transação.
-- 4. Um índice parcial torna impossível haver dois caixas abertos no tenant.
--
-- Esta migration não altera o fluxo fiscal.
-- =====================================================================

-- A UI esconde módulos sem acesso, mas uma sessão autenticada também pode
-- chamar uma RPC diretamente. Esta checagem reúne plano, perfil ativo e papel
-- em uma trava que as funções de venda aplicam antes de tocar nas tabelas.
-- `app` inclui vendas no mobile; por isso o chamador pode aceitar esse bundle
-- somente para o módulo `sales`.
create or replace function public.current_actor_can_use_module(
  p_module_key text,
  p_allow_app_bundle boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(
      public.has_module(p_module_key)
      or (p_allow_app_bundle and public.has_module('app')),
      false
    )
    and exists (
      select 1
        from public.profiles p
        join public.roles r
          on r.id = p.role_id
         and r.tenant_id = p.tenant_id
       where p.id = auth.uid()
         and p.tenant_id = public.current_tenant_id()
         and p.status = 'active'
         and coalesce(p.is_platform_admin, false) = false
         and (
           r.is_owner = true
           or case jsonb_typeof(r.permissions)
             when 'array' then r.permissions ? p_module_key
             when 'object' then coalesce(r.permissions->'modules', '[]'::jsonb) ? p_module_key
             else false
           end
         )
    );
$$;

revoke all on function public.current_actor_can_use_module(text, boolean) from public, anon;
grant execute on function public.current_actor_can_use_module(text, boolean) to authenticated;

comment on function public.current_actor_can_use_module(text, boolean) is
  'Confirma módulo do plano e permissão do papel para o perfil customer ativo da sessão.';

-- Mesma assinatura da versão anterior: portal e fila offline continuam
-- compatíveis, inclusive com o UUID gerado no aparelho.
create or replace function public.create_sale(
  p_payment_method    text,
  p_items             jsonb,
  p_customer_document text default null,
  p_customer_name     text default null,
  p_sold_at           timestamptz default null,
  p_id                uuid default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant     uuid;
  v_sale       uuid;
  v_total      numeric := 0;
  v_item       jsonb;
  v_clean_items jsonb := '[]'::jsonb;
  v_name       text;
  v_product    uuid;
  v_product_raw text;
  v_quantity   numeric;
  v_unit_price numeric;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception using errcode = '42501', message = 'sem tenant na sessão';
  end if;

  if not public.current_actor_can_use_module('sales', true) then
    raise exception using errcode = '42501', message = 'sem permissão para vendas';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = 'os itens da venda precisam ser uma lista';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'a venda precisa de pelo menos um item';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = '22023', message = 'item da venda inválido';
    end if;

    if jsonb_typeof(v_item->'product_name') is distinct from 'string' then
      raise exception using errcode = '22023', message = 'o nome do item é obrigatório';
    end if;

    v_name := nullif(btrim(v_item->>'product_name'), '');
    if v_name is null then
      raise exception using errcode = '22023', message = 'o nome do item é obrigatório';
    end if;

    if jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or jsonb_typeof(v_item->'unit_price') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'quantidade ou preço inválido';
    end if;

    begin
      v_quantity := (v_item->>'quantity')::numeric;
      v_unit_price := (v_item->>'unit_price')::numeric;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'quantidade ou preço inválido';
    end;

    if v_quantity is null
       or v_quantity::text in ('NaN', 'Infinity', '-Infinity')
       or v_quantity <= 0 then
      raise exception using errcode = '22023', message = 'a quantidade do item precisa ser maior que zero';
    end if;

    if v_unit_price is null
       or v_unit_price::text in ('NaN', 'Infinity', '-Infinity')
       or v_unit_price < 0
       or v_unit_price <> round(v_unit_price, 2) then
      raise exception using errcode = '22023', message = 'o preço do item precisa ser não negativo e ter no máximo dois decimais';
    end if;

    v_product_raw := nullif(btrim(v_item->>'product_id'), '');
    v_product := null;

    if v_item ? 'product_id'
       and jsonb_typeof(v_item->'product_id') not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'produto inválido na venda';
    end if;

    if v_product_raw is not null then
      begin
        v_product := v_product_raw::uuid;
      exception
        when invalid_text_representation then
          raise exception using errcode = '22023', message = 'produto inválido na venda';
      end;

      -- A FK confirma que o UUID existe; esta checagem adicional confirma que
      -- ele pertence ao MESMO tenant. Sem ela, um UUID conhecido de outro
      -- negócio poderia ser ligado ao snapshot da venda.
      perform 1
        from public.products
       where id = v_product
         and tenant_id = v_tenant;

      if not found then
        raise exception using errcode = '23503', message = 'produto não encontrado neste negócio';
      end if;
    end if;

    v_clean_items := v_clean_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product,
      'product_name', v_name,
      'quantity', v_quantity,
      'unit_price', v_unit_price
    ));
    v_total := v_total + round(v_quantity * v_unit_price, 2);
  end loop;

  insert into public.sales (
    id, tenant_id, user_id, total, payment_method, status, sold_at,
    customer_document, customer_name
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    v_tenant, auth.uid(), v_total, p_payment_method, 'completed',
    coalesce(p_sold_at, now()),
    nullif(regexp_replace(coalesce(p_customer_document, ''), '\D', '', 'g'), ''),
    nullif(btrim(coalesce(p_customer_name, '')), '')
  )
  returning id into v_sale;

  insert into public.sale_items (
    tenant_id, sale_id, product_id, product_name, quantity, unit_price, subtotal
  )
  select
    v_tenant,
    v_sale,
    nullif(i->>'product_id', '')::uuid,
    i->>'product_name',
    (i->>'quantity')::numeric,
    (i->>'unit_price')::numeric,
    round((i->>'quantity')::numeric * (i->>'unit_price')::numeric, 2)
  from jsonb_array_elements(v_clean_items) as i;

  return v_sale;
end;
$$;

comment on function public.create_sale(text, jsonb, text, text, timestamptz, uuid) is
  'Cria venda e itens atomicamente, aceita id do aparelho e valida nome, quantidade, preço e vínculo do produto com o tenant.';

revoke all on function public.create_sale(text, jsonb, text, text, timestamptz, uuid) from public, anon;
grant execute on function public.create_sale(text, jsonb, text, text, timestamptz, uuid) to authenticated;

-- A ligação torna a substituição repetível: depois do commit, um retry acha a
-- venda já criada em vez de estornar/movimentar estoque uma segunda vez.
alter table public.sales
  add column if not exists replaces_sale_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'sales_replaces_sale_id_fkey'
       and conrelid = 'public.sales'::regclass
  ) then
    alter table public.sales
      add constraint sales_replaces_sale_id_fkey
      foreign key (replaces_sale_id)
      references public.sales(id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists sales_one_replacement_per_sale
  on public.sales (replaces_sale_id)
  where replaces_sale_id is not null;

-- Retorna `true` somente quando esta chamada fez a transição. Um retry depois
-- de commit retorna `false` e não move o estoque outra vez.
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

  return true;
end;
$$;

comment on function public.set_sale_refunded(uuid, boolean) is
  'Estorna ou desfaz o estorno junto com todos os movimentos de estoque, sob lock da venda; retries no estado final são no-op.';

revoke all on function public.set_sale_refunded(uuid, boolean) from public, anon;
grant execute on function public.set_sale_refunded(uuid, boolean) to authenticated;

-- Editar preserva a venda original como estornada e cria outra linha. O lock
-- serializa duas tentativas concorrentes; `replaces_sale_id` identifica o
-- resultado de uma tentativa que já terminou, tornando o retry um no-op.
create or replace function public.replace_sale(
  p_sale_id           uuid,
  p_payment_method    text,
  p_items             jsonb,
  p_customer_document text default null,
  p_customer_name     text default null,
  p_sold_at           timestamptz default null,
  p_id                uuid default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant      uuid;
  v_status      text;
  v_replacement uuid;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception using errcode = '42501', message = 'sem tenant na sessão';
  end if;

  if not public.current_actor_can_use_module('sales', true) then
    raise exception using errcode = '42501', message = 'sem permissão para vendas';
  end if;

  -- Este lock cobre tanto o primeiro edit quanto retries concorrentes. Quando
  -- a segunda chamada entrar, ela já enxergará o vínculo criado pela primeira.
  select status
    into v_status
    from public.sales
   where id = p_sale_id
     and tenant_id = v_tenant
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'venda não encontrada';
  end if;

  select id
    into v_replacement
    from public.sales
   where tenant_id = v_tenant
     and replaces_sale_id = p_sale_id
   limit 1;

  if v_replacement is not null then
    return jsonb_build_object('sale_id', v_replacement, 'changed', false);
  end if;

  if coalesce(v_status, 'completed') <> 'completed' then
    raise exception using errcode = '22023', message = 'somente uma venda completa pode ser editada';
  end if;

  -- As duas funções são SECURITY INVOKER e participam desta mesma transação.
  -- Qualquer falha ao validar/criar os novos itens também desfaz o estorno.
  perform public.set_sale_refunded(p_sale_id, true);

  v_replacement := public.create_sale(
    p_payment_method => p_payment_method,
    p_items => p_items,
    p_customer_document => p_customer_document,
    p_customer_name => p_customer_name,
    p_sold_at => p_sold_at,
    p_id => p_id
  );

  update public.sales
     set replaces_sale_id = p_sale_id
   where id = v_replacement
     and tenant_id = v_tenant;

  if not found then
    raise exception using errcode = 'P0002', message = 'venda substituta não encontrada';
  end if;

  return jsonb_build_object('sale_id', v_replacement, 'changed', true);
end;
$$;

comment on function public.replace_sale(uuid, text, jsonb, text, text, timestamptz, uuid) is
  'Estorna uma venda e cria sua substituta atomicamente; retries retornam a substituta já vinculada sem repetir movimentos de estoque.';

revoke all on function public.replace_sale(uuid, text, jsonb, text, text, timestamptz, uuid) from public, anon;
grant execute on function public.replace_sale(uuid, text, jsonb, text, text, timestamptz, uuid) to authenticated;

-- O check na aplicação melhora a mensagem, mas somente o índice fecha a
-- corrida entre dois aparelhos tentando abrir caixa ao mesmo tempo.
do $$
begin
  if exists (
    select 1
      from public.cash_registers
     where status = 'open'
     group by tenant_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'há tenant com mais de um caixa aberto; feche os turnos duplicados antes de aplicar esta migration';
  end if;
end;
$$;

create unique index if not exists cash_registers_one_open_per_tenant
  on public.cash_registers (tenant_id)
  where status = 'open';
