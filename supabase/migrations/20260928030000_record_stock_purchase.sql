-- =====================================================================
-- COMPRA DE MERCADORIA EM UMA TRANSAÇÃO: record_stock_purchase
-- =====================================================================
--
-- Até aqui portal e mobile faziam três escritas separadas numa entrada com
-- custo: `apply_stock_movement` (movimento + saldo), depois `products.cost` e
-- depois a despesa em `costs`. O PostgREST não tem transação entre chamadas, e
-- as duas últimas tinham o erro ignorado de propósito — o saldo já tinha
-- subido. Resultado possível: estoque entrou, despesa não, lucro inflado, e a
-- tela dizendo "ok".
--
-- Esta função faz as três dentro da mesma transação, e liga a despesa ao
-- movimento (`costs.stock_movement_id`).
--
-- IDEMPOTÊNCIA: `p_id` (opcional) vira o id da despesa. Reenviar a mesma
-- compra com o mesmo `p_id` devolve `created = false` sem mexer no saldo de
-- novo; o mesmo id com outro produto/quantidade/custo, ou de outro negócio, é
-- `23505`. É o que permite pôr a compra numa fila offline mais tarde.
--
-- SECURITY DEFINER porque lê e grava `products.cost` (coluna sem grant de
-- SELECT para `authenticated` desde 20260917040000). As guardas por trigger de
-- 20260917010000 continuam valendo aqui dentro: `stock` pode inserir o
-- movimento e alterar só saldo/custo do produto. A checagem explícita de
-- módulo abaixo existe para a mensagem ser clara antes de qualquer escrita.
--
-- Não toca no fluxo fiscal. IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

create or replace function public.record_stock_purchase(
  p_product_id uuid,
  p_quantity   numeric,
  p_unit_cost  numeric,
  p_reason     text default null,
  p_cost_date  date default null,
  p_id         uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant   uuid;
  v_product  record;
  v_existing public.costs%rowtype;
  v_movement uuid;
  v_cost     uuid;
  v_amount   numeric;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception using errcode = '42501', message = 'sem empresa na sessão';
  end if;
  if not public.current_actor_can_use_module('stock') then
    raise exception using errcode = '42501', message = 'sem permissão para movimentar estoque';
  end if;

  if p_quantity is null or p_quantity <= 0 or p_quantity::text in ('NaN', 'Infinity') then
    raise exception using errcode = '22023', message = 'informe a quantidade comprada';
  end if;
  if p_unit_cost is null or p_unit_cost <= 0 or p_unit_cost::text in ('NaN', 'Infinity') then
    raise exception using errcode = '22023', message = 'informe o custo unitário';
  end if;
  p_reason := nullif(btrim(p_reason), '');

  -- A trava na linha do produto serializa compras concorrentes do mesmo item
  -- e, com ela, dois reenvios simultâneos do mesmo `p_id`: o segundo só lê
  -- `costs` depois que o primeiro fez commit.
  select p.id, p.name, p.tracks_stock
    into v_product
    from public.products p
   where p.id = p_product_id
     and p.tenant_id = v_tenant
     for update;

  if not found then
    raise exception using errcode = '22023', message = 'produto não encontrado';
  end if;
  if not v_product.tracks_stock then
    raise exception using errcode = '22023', message = 'este produto não controla estoque';
  end if;

  v_amount := round(p_quantity * p_unit_cost, 2);

  if p_id is not null then
    select c.* into v_existing from public.costs c where c.id = p_id;
    if found then
      if v_existing.tenant_id = v_tenant
         and v_existing.origin = 'stock'
         and v_existing.amount = v_amount
         and v_existing.stock_movement_id is not null
         and exists (
           select 1
             from public.stock_movements m
            where m.id = v_existing.stock_movement_id
              and m.product_id = p_product_id
              and m.quantity = p_quantity
              and m.unit_cost = p_unit_cost
         ) then
        return jsonb_build_object(
          'cost_id', p_id,
          'movement_id', v_existing.stock_movement_id,
          'created', false
        );
      end if;
      raise exception using errcode = '23505', message = 'identificador já usado por outro lançamento';
    end if;
  end if;

  insert into public.stock_movements
    (tenant_id, product_id, user_id, type, quantity, unit_cost, reason, sale_id)
  values
    (v_tenant, p_product_id, auth.uid(), 'in', p_quantity, p_unit_cost, p_reason, null)
  returning id into v_movement;

  update public.products
     set stock_quantity = coalesce(stock_quantity, 0) + p_quantity,
         cost = p_unit_cost
   where id = p_product_id;

  insert into public.costs
    (id, tenant_id, user_id, description, type, category, amount,
     is_recurring, origin, cost_date, stock_movement_id)
  values
    (coalesce(p_id, gen_random_uuid()), v_tenant, auth.uid(),
     'Compra — ' || v_product.name, 'variable', 'Materiais', v_amount,
     false, 'stock', coalesce(p_cost_date, current_date), v_movement)
  returning id into v_cost;

  return jsonb_build_object('cost_id', v_cost, 'movement_id', v_movement, 'created', true);
end;
$$;

revoke all on function public.record_stock_purchase(uuid, numeric, numeric, text, date, uuid)
  from public, anon;
grant execute on function public.record_stock_purchase(uuid, numeric, numeric, text, date, uuid)
  to authenticated, service_role;

comment on function public.record_stock_purchase(uuid, numeric, numeric, text, date, uuid) is
  'Entrada de mercadoria com custo: movimento, saldo, custo do produto e despesa numa transação. Reenvio com o mesmo p_id é idempotente.';
