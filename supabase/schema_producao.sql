


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_create_tenant"("p_user_id" "uuid", "p_name" "text", "p_segment" "text", "p_owner_name" "text", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[], "p_city" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_tenant_id uuid;
  v_role_id   uuid;
  v_faltando  text[];
begin
  ------------------------------------------------------------------
  -- 0. Validação dos argumentos. Falhar aqui é barato; falhar depois
  --    de criar meio cliente, não.
  ------------------------------------------------------------------
  if p_user_id is null then
    raise exception 'usuário do Auth é obrigatório';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'nome do negócio é obrigatório';
  end if;

  -- O plano precisa existir e estar vigente no catálogo `plans`. Antes esta
  -- checagem era uma lista fixa ('free','paid','custom') aqui dentro — o que
  -- barrava qualquer plano criado pela tela de Planos.
  if not exists (select 1 from public.plans pl where pl.key = p_plan and pl.is_active) then
    raise exception 'plano inválido ou inativo: %', p_plan;
  end if;

  if coalesce(array_length(p_module_keys, 1), 0) = 0 then
    raise exception 'nenhum módulo informado para o plano %', p_plan;
  end if;

  -- Toda chave precisa existir no catálogo `modules`.
  select array_agg(k)
    into v_faltando
    from unnest(p_module_keys) as k
   where not exists (select 1 from public.modules m where m.key = k);

  if v_faltando is not null then
    raise exception 'módulos inexistentes no catálogo: %', array_to_string(v_faltando, ', ');
  end if;

  ------------------------------------------------------------------
  -- 1. O tenant (o negócio).
  ------------------------------------------------------------------
  insert into public.tenants (name, segment, status, plan, monthly_fee, city, phone)
  values (
    btrim(p_name),
    nullif(btrim(p_segment), ''),
    'active',
    p_plan,
    p_monthly_fee,
    nullif(btrim(p_city), ''),
    nullif(btrim(p_phone), '')
  )
  returning id into v_tenant_id;

  ------------------------------------------------------------------
  -- 2. O papel "Dono" — acesso total dentro deste tenant (e só dele).
  ------------------------------------------------------------------
  insert into public.roles (tenant_id, name, permissions, is_owner)
  values (v_tenant_id, 'Dono', '{"all": true}'::jsonb, true)
  returning id into v_role_id;

  ------------------------------------------------------------------
  -- 3. O perfil, ligando usuário do Auth ↔ tenant ↔ papel.
  ------------------------------------------------------------------
  insert into public.profiles (id, tenant_id, role_id, full_name, is_platform_admin, status)
  values (p_user_id, v_tenant_id, v_role_id, nullif(btrim(p_owner_name), ''), false, 'active')
  on conflict (id) do update
    set tenant_id         = excluded.tenant_id,
        role_id           = excluded.role_id,
        full_name         = coalesce(excluded.full_name, public.profiles.full_name),
        is_platform_admin = false,
        status            = excluded.status;

  ------------------------------------------------------------------
  -- 4. Os módulos do plano.
  ------------------------------------------------------------------
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select v_tenant_id, k, true
    from unnest(p_module_keys) as k;

  return v_tenant_id;
end;
$$;


ALTER FUNCTION "public"."admin_create_tenant"("p_user_id" "uuid", "p_name" "text", "p_segment" "text", "p_owner_name" "text", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[], "p_city" "text", "p_phone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_create_tenant"("p_user_id" "uuid", "p_name" "text", "p_segment" "text", "p_owner_name" "text", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[], "p_city" "text", "p_phone" "text") IS 'Cria tenant + papel Dono + profile + módulos numa transação. Só a service_role executa (painel admin).';



CREATE OR REPLACE FUNCTION "public"."admin_delete_tenant"("p_tenant_id" "uuid") RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_usuarios uuid[];
begin
  if not public.is_platform_admin() then
    raise exception 'apenas o administrador da plataforma pode excluir clientes';
  end if;

  if p_tenant_id is null then
    raise exception 'cliente é obrigatório';
  end if;

  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'cliente não encontrado';
  end if;

  -- Guarda os usuários ANTES de apagar os perfis, senão o vínculo se perde.
  select coalesce(array_agg(p.id), '{}')
    into v_usuarios
    from public.profiles p
   where p.tenant_id = p_tenant_id;

  -- Filho sempre antes do pai. A ordem abaixo segue as chaves estrangeiras
  -- reais do schema, e algumas não são óbvias:
  --   * `costs.stock_movement_id` → custos ANTES de movimentos de estoque;
  --   * `cash_movements.cash_register_id` → movimentos ANTES do caixa;
  --   * `stock_movements.sale_id` → estoque ANTES de vendas;
  --   * `profiles.role_id` → perfis ANTES de papéis.
  delete from public.cash_movements   where tenant_id = p_tenant_id;
  delete from public.cash_registers   where tenant_id = p_tenant_id;
  delete from public.costs            where tenant_id = p_tenant_id;
  delete from public.sale_items       where tenant_id = p_tenant_id;
  delete from public.stock_movements  where tenant_id = p_tenant_id;
  delete from public.sales            where tenant_id = p_tenant_id;
  delete from public.products         where tenant_id = p_tenant_id;
  delete from public.support_messages where tenant_id = p_tenant_id;
  delete from public.support_tickets  where tenant_id = p_tenant_id;
  delete from public.tenant_modules   where tenant_id = p_tenant_id;
  delete from public.profiles         where tenant_id = p_tenant_id;
  delete from public.roles            where tenant_id = p_tenant_id;
  delete from public.tenants          where id        = p_tenant_id;

  return v_usuarios;
end;
$$;


ALTER FUNCTION "public"."admin_delete_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_tenant"("p_tenant_id" "uuid", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_faltando text[];
begin
  if not public.is_platform_admin() then
    raise exception 'apenas o administrador da plataforma pode alterar clientes';
  end if;

  if p_tenant_id is null then
    raise exception 'cliente é obrigatório';
  end if;

  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'cliente não encontrado';
  end if;

  if not exists (select 1 from public.plans pl where pl.key = p_plan and pl.is_active) then
    raise exception 'plano inválido ou inativo: %', p_plan;
  end if;

  if coalesce(array_length(p_module_keys, 1), 0) = 0 then
    raise exception 'nenhum módulo informado para o plano %', p_plan;
  end if;

  select array_agg(k)
    into v_faltando
    from unnest(p_module_keys) as k
   where not exists (select 1 from public.modules m where m.key = k);

  if v_faltando is not null then
    raise exception 'módulos inexistentes no catálogo: %', array_to_string(v_faltando, ', ');
  end if;

  update public.tenants
     set plan        = p_plan,
         monthly_fee = p_monthly_fee
   where id = p_tenant_id;

  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select p_tenant_id, k, true
    from unnest(p_module_keys) as k
  on conflict (tenant_id, module_key) do update set enabled = true;

  update public.tenant_modules
     set enabled = false
   where tenant_id = p_tenant_id
     and not (module_key = any (p_module_keys));
end;
$$;


ALTER FUNCTION "public"."admin_update_tenant"("p_tenant_id" "uuid", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_stock_movement"("p_product_id" "uuid", "p_type" "text", "p_quantity" numeric, "p_reason" "text" DEFAULT NULL::"text", "p_unit_cost" numeric DEFAULT NULL::numeric, "p_sale_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tenant_id uuid;
begin
  -- pega o tenant do produto (garante coerência)
  select tenant_id into v_tenant_id from public.products where id = p_product_id;

  -- registra a movimentação
  insert into public.stock_movements
    (tenant_id, product_id, user_id, type, quantity, unit_cost, reason, sale_id)
  values
    (v_tenant_id, p_product_id, auth.uid(), p_type, p_quantity, p_unit_cost, p_reason, p_sale_id);

  -- atualiza a quantidade atual no produto (só se ele controla estoque)
  update public.products
     set stock_quantity = coalesce(stock_quantity, 0) + p_quantity
   where id = p_product_id and tracks_stock = true;
end;
$$;


ALTER FUNCTION "public"."apply_stock_movement"("p_product_id" "uuid", "p_type" "text", "p_quantity" numeric, "p_reason" "text", "p_unit_cost" numeric, "p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_cash_register"("p_register_id" "uuid", "p_counted_cash" numeric, "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_expected numeric;
begin
  v_expected := public.expected_cash_for_register(p_register_id);

  update public.cash_registers
     set status        = 'closed',
         closed_by     = auth.uid(),
         expected_cash = v_expected,
         counted_cash  = p_counted_cash,
         difference    = p_counted_cash - v_expected,
         closing_note  = p_note,
         closed_at     = now()
   where id = p_register_id and status = 'open';
end;
$$;


ALTER FUNCTION "public"."close_cash_register"("p_register_id" "uuid", "p_counted_cash" numeric, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cost_from_stock_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_product_name text;
begin
  -- só entradas (type='entry') com custo informado geram custo
  if new.type = 'entry' and new.unit_cost is not null and new.quantity > 0 then
    select name into v_product_name from public.products where id = new.product_id;

    insert into public.costs
      (tenant_id, description, type, category, amount, origin, stock_movement_id, cost_date)
    values
      (new.tenant_id,
       coalesce(v_product_name, 'Mercadoria') || ' · ' || new.quantity || ' un',
       'variable',
       'Mercadoria',
       new.unit_cost * new.quantity,   -- custo total da entrada
       'stock',
       new.id,
       current_date);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."cost_from_stock_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cost_series_context_active"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select coalesce(current_setting('aguiar.cost_series_context', true), '') <> '';
$$;


ALTER FUNCTION "public"."cost_series_context_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale"("p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text" DEFAULT NULL::"text", "p_customer_name" "text" DEFAULT NULL::"text", "p_sold_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."create_sale"("p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_sale"("p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") IS 'Cria venda e itens atomicamente, aceita id do aparelho e valida nome, quantidade, preço e vínculo do produto com o tenant.';



CREATE OR REPLACE FUNCTION "public"."current_actor_can_access_modules"("p_module_keys" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."current_actor_can_access_modules"("p_module_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_actor_can_access_modules"("p_module_keys" "text"[]) IS 'Gate das views de relatório: backend confiável, admin da plataforma ou perfil com um dos módulos.';



CREATE OR REPLACE FUNCTION "public"."current_actor_can_use_any_module"("p_module_keys" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select coalesce(
    bool_or(public.current_actor_can_use_module(k, k in ('sales', 'products'))),
    false
  )
  from unnest(p_module_keys) as k;
$$;


ALTER FUNCTION "public"."current_actor_can_use_any_module"("p_module_keys" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_actor_can_use_any_module"("p_module_keys" "text"[]) IS 'True se o perfil customer ativo pode usar ao menos um dos módulos (plano + papel). O bundle app vale apenas para sales e products.';



CREATE OR REPLACE FUNCTION "public"."current_actor_can_use_module"("p_module_key" "text", "p_allow_app_bundle" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."current_actor_can_use_module"("p_module_key" "text", "p_allow_app_bundle" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_actor_can_use_module"("p_module_key" "text", "p_allow_app_bundle" boolean) IS 'Confirma módulo do plano e permissão do papel para o perfil customer ativo da sessão.';



CREATE OR REPLACE FUNCTION "public"."current_actor_is_active_member"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.tenant_id = public.current_tenant_id()
       and p.status = 'active'
       and coalesce(p.is_platform_admin, false) = false
  );
$$;


ALTER FUNCTION "public"."current_actor_is_active_member"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_actor_is_active_member"() IS 'True para perfil customer ativo do tenant da sessão, sem exigir módulo.';



CREATE OR REPLACE FUNCTION "public"."current_actor_is_owner"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
      from public.profiles p
      join public.roles r on r.id = p.role_id and r.tenant_id = p.tenant_id
     where p.id = auth.uid()
       and p.tenant_id = public.current_tenant_id()
       and p.status = 'active'
       and coalesce(p.is_platform_admin, false) = false
       and r.is_owner = true
  );
$$;


ALTER FUNCTION "public"."current_actor_is_owner"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_actor_is_owner"() IS 'True only for an active, non-platform profile whose role is the owner role of the current tenant.';



CREATE OR REPLACE FUNCTION "public"."current_actor_product_cost_scope"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if public.request_is_trusted_backend() then
    return 'all';
  end if;
  if public.is_platform_admin() then
    return 'all';
  end if;
  if public.current_actor_can_use_module('products', false)
     or public.current_actor_can_use_any_module(array['costs', 'stock', 'reports']) then
    return 'tenant';
  end if;
  return 'none';
end;
$$;


ALTER FUNCTION "public"."current_actor_product_cost_scope"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_actor_product_cost_scope"() IS 'Escopo de leitura de products.cost: all (backend/admin), tenant (products sem bundle app, costs, stock ou reports) ou none.';



CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tenant_id from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deduct_stock_on_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- só baixa se o produto existe e controla estoque
  if new.product_id is not null then
    perform public.apply_stock_movement(
      new.product_id,
      'sale',
      -new.quantity,              -- negativo: sai do estoque
      'Venda',
      null,
      new.sale_id
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."deduct_stock_on_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_manual_cost"("p_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."delete_manual_cost"("p_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_manual_cost"("p_id" "uuid") IS 'Exclui custo avulso; em serie mensal, encerra na competencia escolhida e preserva as anteriores.';



CREATE OR REPLACE FUNCTION "public"."enqueue_fiscal_document"("p_sale_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_tenant  uuid;
  v_cfg     public.tenant_fiscal_settings%rowtype;
  v_doc     uuid;
  v_goods   int;
  v_existing uuid;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception 'sem tenant na sessão';
  end if;

  -- A venda tem de ser deste tenant. A checagem é explícita porque esta
  -- função é `security definer` — aqui dentro o RLS não protege mais.
  if not exists (
    select 1 from public.sales s
     where s.id = p_sale_id and s.tenant_id = v_tenant
  ) then
    raise exception 'venda não encontrada';
  end if;

  select * into v_cfg
    from public.tenant_fiscal_settings
   where tenant_id = v_tenant;

  -- Sem cadastro fiscal não há o que enfileirar. Não é erro: é o estado
  -- de todo cliente que ainda não configurou. Devolver null deixa a
  -- venda seguir sem nota, que é exatamente o comportamento desejado.
  if v_cfg.tenant_id is null or v_cfg.tax_id is null then
    return null;
  end if;

  -- Já existe documento vivo para esta venda? Reemitir criaria uma
  -- segunda nota para a mesma venda — o erro mais caro desta área.
  -- Só um documento REJEITADO pode ser refeito.
  select id into v_existing
    from public.fiscal_documents
   where sale_id = p_sale_id
     and status <> 'rejected'
   limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- SERVIÇO NÃO ENTRA EM NFC-e. Banho, consulta e afins vão em NFS-e, que
  -- é municipal e ainda não é emitida aqui. Uma venda só de serviços não
  -- gera documento nenhum; uma venda mista gera a NFC-e das mercadorias
  -- (a NFS-e da outra metade fica para quando existir).
  select count(*) into v_goods
    from public.sale_items si
    left join public.products p on p.id = si.product_id
   where si.sale_id = p_sale_id
     and coalesce(p.is_service, false) = false;

  if v_goods = 0 then
    return null;
  end if;

  insert into public.fiscal_documents (
    tenant_id, sale_id, model, environment, series, status, reference
  )
  values (
    v_tenant,
    p_sale_id,
    '65',
    v_cfg.environment,
    v_cfg.nfce_series,
    'pending',
    -- A `ref` da Focus: única para sempre neste CNPJ. O id do documento
    -- serve bem — é uuid, nasce com a linha e nunca se repete.
    'af-' || replace(gen_random_uuid()::text, '-', '')
  )
  returning id into v_doc;

  return v_doc;
end;
$$;


ALTER FUNCTION "public"."enqueue_fiscal_document"("p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expected_cash_for_register"("p_register_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."expected_cash_for_register"("p_register_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."expected_cash_for_register"("p_register_id" "uuid") IS 'Dinheiro esperado na gaveta: abertura + vendas em dinheiro do turno + reforços (deposit) - sangrias (withdrawal). Só backend, admin ou perfil do negócio com o módulo cash.';



CREATE OR REPLACE FUNCTION "public"."fill_profile_email_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
begin
  if new.email is null then
    select lower(u.email)
      into new.email
      from auth.users u
     where u.id = new.id;
  else
    new.email := lower(btrim(new.email));
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."fill_profile_email_from_auth"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fill_profile_email_from_auth"() IS 'Preenche o e-mail do perfil a partir de auth.users em inserções privilegiadas.';



CREATE OR REPLACE FUNCTION "public"."fiscal_document_payload"("p_document_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_doc  public.fiscal_documents%rowtype;
  v_cfg  public.tenant_fiscal_settings%rowtype;
  v_sale public.sales%rowtype;
  v_out  jsonb;
begin
  select * into v_doc from public.fiscal_documents where id = p_document_id;
  if v_doc.id is null then
    raise exception 'documento não encontrado';
  end if;

  select * into v_cfg from public.tenant_fiscal_settings where tenant_id = v_doc.tenant_id;
  select * into v_sale from public.sales where id = v_doc.sale_id;

  select jsonb_build_object(
    'document', jsonb_build_object(
      'id',          v_doc.id,
      'reference',   v_doc.reference,
      'model',       v_doc.model,
      'environment', v_doc.environment,
      'series',      v_doc.series,
      'attempts',    v_doc.attempts
    ),
    'emitter', jsonb_build_object(
      'tax_id',      v_cfg.tax_id,
      'legal_name',  v_cfg.legal_name,
      'state_code',  v_cfg.state_code,
      'tax_regime',  v_cfg.tax_regime
    ),
    'sale', jsonb_build_object(
      'id',                v_sale.id,
      'sold_at',           v_sale.sold_at,
      'total',             v_sale.total,
      'payment_method',    v_sale.payment_method,
      'customer_document', v_sale.customer_document,
      'customer_name',     v_sale.customer_name
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'number',      row_number() over (order by si.id),
          'code',        coalesce(nullif(p.barcode, ''), si.product_id::text, 'AVULSO'),
          'description', si.product_name,
          'quantity',    si.quantity,
          'unit_price',  si.unit_price,
          'total',       si.subtotal,
          -- A HERANÇA, resolvida aqui: o campo do produto vence; vazio
          -- cai no padrão do negócio. Mesma regra da tela.
          'ncm',         coalesce(nullif(p.ncm, ''), v_cfg.default_ncm),
          'cest',        nullif(p.cest, ''),
          'cfop',        coalesce(nullif(p.cfop, ''), v_cfg.default_cfop),
          'icms_code',   coalesce(nullif(p.icms_code, ''), v_cfg.default_icms_code),
          'origin',      coalesce(p.origin, v_cfg.default_origin, 0),
          'unit',        coalesce(nullif(p.unit, ''), 'un'),
          'tax_unit',    coalesce(nullif(p.tax_unit, ''), upper(coalesce(nullif(p.unit, ''), 'un'))),
          'gtin',        nullif(p.gtin, '')
        )
        order by si.id
      )
      from public.sale_items si
      left join public.products p on p.id = si.product_id
      where si.sale_id = v_doc.sale_id
        -- Serviço fica de fora: ele não entra em NFC-e.
        and coalesce(p.is_service, false) = false
    ), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;


ALTER FUNCTION "public"."fiscal_document_payload"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recurring_costs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."generate_recurring_costs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_recurring_costs"() IS 'Materializa custos mensais ate a competencia atual; idempotente por (recurrence_id, competence) e ajusta dias 29/30/31 ao fim do mes.';



CREATE OR REPLACE FUNCTION "public"."guard_cash_module_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."guard_cash_module_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_cash_module_write"() IS 'Exige o módulo cash para escrever em cash_registers e cash_movements, inclusive via SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."guard_cost_recurrence"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."guard_cost_recurrence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_customer_profile_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_target_is_owner boolean;
  v_new_role_valid boolean;
  v_sensitive_change boolean;
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres')
     or public.is_platform_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- Customer sessions never create or delete identities. Those flows require
  -- a privileged invitation/removal service so Auth and public data agree.
  if tg_op in ('INSERT', 'DELETE') then
    raise exception using message = 'Cadastro e remoção de usuários exigem o serviço de equipe.';
  end if;

  v_sensitive_change :=
    new.id is distinct from old.id
    or new.tenant_id is distinct from old.tenant_id
    or new.role_id is distinct from old.role_id
    or new.status is distinct from old.status
    or new.is_platform_admin is distinct from old.is_platform_admin;

  -- Self-service fields such as ui_theme remain writable under their existing
  -- RLS policy; only identity and access changes pass through the owner gate.
  if not v_sensitive_change then
    return new;
  end if;

  if not public.current_actor_is_owner() then
    raise exception using message = 'Operação permitida apenas ao dono do negócio.';
  end if;

  select coalesce(r.is_owner, false)
    into v_target_is_owner
    from public.roles r
   where r.id = old.role_id
     and r.tenant_id = old.tenant_id;

  if old.tenant_id is distinct from public.current_tenant_id()
     or coalesce(v_target_is_owner, false) then
    raise exception using message = 'O acesso do dono não pode ser alterado.';
  end if;

  select exists (
    select 1
      from public.roles r
     where r.id = new.role_id
       and r.tenant_id = old.tenant_id
       and r.is_owner = false
  ) into v_new_role_valid;

  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.is_platform_admin is distinct from old.is_platform_admin
     or new.status is null
     or new.status not in ('active', 'suspended')
     or not v_new_role_valid then
    raise exception using message = 'Perfil ou tipo de acesso inválido para este negócio.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_customer_profile_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_customer_profile_write"() IS 'Protects profile identity, tenant, role, platform-admin and status fields from non-owner customer sessions.';



CREATE OR REPLACE FUNCTION "public"."guard_customer_role_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres')
     or public.is_platform_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if not public.current_actor_is_owner() then
    raise exception using message = 'Operação permitida apenas ao dono do negócio.';
  end if;

  if tg_op <> 'INSERT' then
    if old.tenant_id is distinct from public.current_tenant_id()
       or old.is_owner then
      raise exception using message = 'O tipo de acesso do dono não pode ser alterado.';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    if new.tenant_id is distinct from public.current_tenant_id()
       or new.is_owner then
      raise exception using message = 'Tipo de acesso inválido para este negócio.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_customer_role_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_customer_role_write"() IS 'Prevents customer sessions from creating owner roles or changing roles outside their tenant.';



CREATE OR REPLACE FUNCTION "public"."guard_product_module_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."guard_product_module_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_product_module_write"() IS 'Restringe escrita em products por módulo e coluna, inclusive quando a escrita parte de função SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."guard_profile_email_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres')
     or public.is_platform_admin() then
    return new;
  end if;

  if new.email is distinct from old.email then
    raise exception using
      errcode = '42501',
      message = 'O e-mail de acesso só pode ser alterado pelo serviço de equipe.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_profile_email_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_profile_email_write"() IS 'Impede sessões comuns de divergirem profiles.email do endereço administrado pelo Auth.';



CREATE OR REPLACE FUNCTION "public"."guard_stock_movement_module_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."guard_stock_movement_module_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_stock_movement_module_write"() IS 'Exige o módulo stock para movimentar estoque; vendas só movimentam dentro de set_sale_refunded ou pelo trigger de sale_items.';



CREATE OR REPLACE FUNCTION "public"."guard_support_message_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."guard_support_message_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_support_message_write"() IS 'Impede sessão comum de forjar autor/lado, mudar conteúdo ou ligar mensagem a chamado de outro tenant em support_messages.';



CREATE OR REPLACE FUNCTION "public"."has_module"("p_module_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.tenant_modules tm
    where tm.tenant_id = current_tenant_id()
      and tm.module_key = p_module_key
      and tm.enabled = true
  );
$$;


ALTER FUNCTION "public"."has_module"("p_module_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_tenant_cost_series"("p_tenant" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select pg_advisory_xact_lock(hashtext('aguiar.cost_series'), hashtext(p_tenant::text));
$$;


ALTER FUNCTION "public"."lock_tenant_cost_series"("p_tenant" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_summary" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_tenant uuid;
  v_actor  uuid;
  v_name   text;
  v_id     uuid;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    return null;
  end if;

  v_actor := auth.uid();

  select full_name into v_name
    from public.profiles
   where id = v_actor;

  insert into public.activity_log (tenant_id, actor_id, actor_name, action, entity_id, summary, metadata)
  values (v_tenant, v_actor, v_name, p_action, p_entity_id, p_summary, p_metadata)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid", "p_summary" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid", "p_summary" "text", "p_metadata" "jsonb") IS 'Grava uma linha em activity_log carimbando tenant, autor e horário a partir da sessão. Devolve NULL (sem erro) quando não há tenant, para nunca derrubar a operação que a chamou.';



CREATE OR REPLACE FUNCTION "public"."mark_fiscal_document"("p_document_id" "uuid", "p_status" "text", "p_protocol" "text" DEFAULT NULL::"text", "p_access_key" "text" DEFAULT NULL::"text", "p_number" bigint DEFAULT NULL::bigint, "p_series" smallint DEFAULT NULL::smallint, "p_xml_url" "text" DEFAULT NULL::"text", "p_danfe_url" "text" DEFAULT NULL::"text", "p_rejection_reason" "text" DEFAULT NULL::"text", "p_provider" "text" DEFAULT NULL::"text", "p_provider_ref" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update public.fiscal_documents
     set status           = p_status,
         protocol         = coalesce(p_protocol, protocol),
         access_key       = coalesce(p_access_key, access_key),
         number           = coalesce(p_number, number),
         series           = coalesce(p_series, series),
         xml_url          = coalesce(p_xml_url, xml_url),
         danfe_url        = coalesce(p_danfe_url, danfe_url),
         -- Zera a rejeição quando a nota passa: manter o texto de um erro
         -- já superado faria a tela contar uma história errada.
         rejection_reason = case when p_status = 'authorized' then null
                                 else coalesce(p_rejection_reason, rejection_reason) end,
         authorized_at    = case when p_status = 'authorized' then coalesce(authorized_at, now())
                                 else authorized_at end,
         provider         = coalesce(p_provider, provider),
         provider_ref     = coalesce(p_provider_ref, provider_ref),
         attempts         = attempts + 1
   where id = p_document_id;
end;
$$;


ALTER FUNCTION "public"."mark_fiscal_document"("p_document_id" "uuid", "p_status" "text", "p_protocol" "text", "p_access_key" "text", "p_number" bigint, "p_series" smallint, "p_xml_url" "text", "p_danfe_url" "text", "p_rejection_reason" "text", "p_provider" "text", "p_provider_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_sale_payment_method"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.payment_method = 'debit_card' then
    new.payment_method := 'debit';
  elsif new.payment_method = 'credit_card' then
    new.payment_method := 'credit';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."normalize_sale_payment_method"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_sale_payment_method"() IS 'Traduz as grafias de cartão que o app mobile gravava antes da unificação (debit_card/credit_card) para o vocabulário canônico, para que uma versão antiga do app em campo continue conseguindo registrar venda depois do CHECK.';



CREATE OR REPLACE FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select p.price
    from public.plans p
    left join public.plan_showcase s on s.plan_key = p.key
   where p.key = p_plan_key
     and p.is_active
     and coalesce(s.visible, true)
$$;


ALTER FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") IS 'Preço de um plano PUBLICADO, lido de plans.price. Devolve null para plano inativo ou com cartão oculto. plans continua fechada a anon.';



CREATE OR REPLACE FUNCTION "public"."plan_showcase_touch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."plan_showcase_touch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_whatsapp_contact"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  -- `value` é JSONB. `#>> '{}'` extrai o escalar como TEXTO — sem isso, um
  -- valor guardado como string JSON voltaria com as aspas ("5573...") e o
  -- link do WhatsApp sairia com aspas dentro do número.
  select value #>> '{}'
    from public.platform_settings
   where key = 'whatsapp_contact'
$$;


ALTER FUNCTION "public"."platform_whatsapp_contact"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."platform_whatsapp_contact"() IS 'Telefone de WhatsApp do suporte, em formato internacional só com dígitos. Exposto a anon E authenticated: o app mobile precisa dele na tela de login, antes de haver sessão. A tabela platform_settings continua restrita ao admin.';



CREATE OR REPLACE FUNCTION "public"."recurring_cost_date"("p_competence" "date", "p_anchor_day" integer) RETURNS "date"
    LANGUAGE "sql" IMMUTABLE STRICT
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."recurring_cost_date"("p_competence" "date", "p_anchor_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recurring_cost_today"() RETURNS "date"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;


ALTER FUNCTION "public"."recurring_cost_today"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_sale"("p_sale_id" "uuid", "p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text" DEFAULT NULL::"text", "p_customer_name" "text" DEFAULT NULL::"text", "p_sold_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."replace_sale"("p_sale_id" "uuid", "p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_sale"("p_sale_id" "uuid", "p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") IS 'Estorna uma venda e cria sua substituta atomicamente; retries retornam a substituta já vinculada sem repetir movimentos de estoque.';



CREATE OR REPLACE FUNCTION "public"."request_is_trusted_backend"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."request_is_trusted_backend"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."request_is_trusted_backend"() IS 'True para JWT service_role ou conexão direta sem requisição PostgREST. Baseada no JWT, e não em current_user, para continuar correta dentro de funções SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."sale_stock_context_active"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select coalesce(current_setting('aguiar.sale_stock_context', true), '') <> '';
$$;


ALTER FUNCTION "public"."sale_stock_context_active"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sale_stock_context_active"() IS 'True apenas dentro de set_sale_refunded, enquanto ela move estoque da venda.';



CREATE OR REPLACE FUNCTION "public"."save_manual_cost"("p_id" "uuid", "p_description" "text", "p_type" "text", "p_category" "text", "p_amount" numeric, "p_cost_date" "date", "p_is_recurring" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."save_manual_cost"("p_id" "uuid", "p_description" "text", "p_type" "text", "p_category" "text", "p_amount" numeric, "p_cost_date" "date", "p_is_recurring" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_manual_cost"("p_id" "uuid", "p_description" "text", "p_type" "text", "p_category" "text", "p_amount" numeric, "p_cost_date" "date", "p_is_recurring" boolean) IS 'Cria/edita custo manual e sua serie mensal; edicao recorrente vale da competencia escolhida em diante.';



CREATE OR REPLACE FUNCTION "public"."set_fiscal_credentials"("p_csc_id" "text" DEFAULT NULL::"text", "p_csc_token" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_tenant uuid;
begin
  v_tenant := public.current_tenant_id();

  if v_tenant is null then
    raise exception 'sem tenant na sessão';
  end if;

  insert into public.fiscal_credentials (tenant_id, csc_id, csc_token)
  values (v_tenant, nullif(btrim(p_csc_id), ''), nullif(btrim(p_csc_token), ''))
  on conflict (tenant_id) do update
    set csc_id     = coalesce(nullif(btrim(p_csc_id), ''),    public.fiscal_credentials.csc_id),
        csc_token  = coalesce(nullif(btrim(p_csc_token), ''), public.fiscal_credentials.csc_token),
        updated_at = now();
end;
$$;


ALTER FUNCTION "public"."set_fiscal_credentials"("p_csc_id" "text", "p_csc_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sale_refunded"("p_sale_id" "uuid", "p_refunded" boolean) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."set_sale_refunded"("p_sale_id" "uuid", "p_refunded" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_sale_refunded"("p_sale_id" "uuid", "p_refunded" boolean) IS 'Estorna ou desfaz o estorno junto com todos os movimentos de estoque, sob lock da venda; retries no estado final são no-op. Marca aguiar.sale_stock_context durante a movimentação.';



CREATE OR REPLACE FUNCTION "public"."sync_product_column_grants"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
    into v_cols
    from pg_attribute a
   where a.attrelid = 'public.products'::regclass
     and a.attnum > 0
     and not a.attisdropped
     and a.attname <> 'cost';

  -- SELECT de tabela vale para todas as colunas e anularia o revoke abaixo.
  execute 'revoke select on table public.products from public, anon, authenticated';
  execute 'revoke select (cost) on table public.products from public, anon, authenticated';
  execute format('grant select (%s) on table public.products to authenticated', v_cols);
end;
$$;


ALTER FUNCTION "public"."sync_product_column_grants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_product_column_grants"() IS 'Concede SELECT em todas as colunas de products, menos cost, para authenticated. Rodar após adicionar coluna em products.';



CREATE OR REPLACE FUNCTION "public"."tenants_guard_commercial_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- A chave de serviço e o acesso direto ao banco passam inteiros: são os
  -- caminhos administrativos, e a trava aqui existe contra o cliente do
  -- comércio, não contra a plataforma.
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return new;
  end if;

  if public.is_platform_admin() then
    return new;
  end if;

  -- Para todo o resto, as colunas comerciais são as que já estavam lá. Devolver
  -- o valor antigo em vez de levantar erro é deliberado: as telas mandam
  -- apenas os quatro campos permitidos, então nada legítimo chega aqui com
  -- estas colunas — e o que chega é tentativa, que não merece uma mensagem
  -- explicando o que foi barrado.
  new.id          := old.id;
  new.plan        := old.plan;
  new.monthly_fee := old.monthly_fee;
  new.status      := old.status;
  new.created_at  := old.created_at;

  return new;
end;
$$;


ALTER FUNCTION "public"."tenants_guard_commercial_columns"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tenants_guard_commercial_columns"() IS 'Congela id, plan, monthly_fee, status e created_at de tenants quando quem atualiza é o próprio comércio. A policy "dono atualiza o próprio negócio" depende desta trava para não virar escalada de privilégio.';



CREATE OR REPLACE FUNCTION "public"."touch_tenant_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_tenant_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_ticket_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.support_tickets
     set last_message_at = new.created_at,
         -- se o cliente responde um chamado resolvido, reabre
         status = case
                    when status = 'resolved' and new.sender_side = 'client'
                    then 'open'
                    else status
                  end
   where id = new.ticket_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_ticket_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text",
    "action" "text" NOT NULL,
    "entity_id" "uuid",
    "summary" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_log_action_check" CHECK (("action" ~ '^[a-z_]+\.[a-z_]+$'::"text"))
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_log" IS 'Quem fez o quê no portal. Só a função log_activity grava; não há UPDATE nem DELETE para quem tem sessão.';



CREATE TABLE IF NOT EXISTS "public"."cash_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "cash_register_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cash_movements_type_vocab_check" CHECK (("type" = ANY ('{withdrawal,deposit}'::"text"[])))
);


ALTER TABLE "public"."cash_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_registers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "opened_by" "uuid",
    "closed_by" "uuid",
    "opening_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "expected_cash" numeric(10,2),
    "counted_cash" numeric(10,2),
    "difference" numeric(10,2),
    "closing_note" "text",
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    CONSTRAINT "cash_registers_status_vocab_check" CHECK (("status" = ANY ('{open,closed}'::"text"[])))
);


ALTER TABLE "public"."cash_registers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_recurrence_series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "description" "text" NOT NULL,
    "category" "text",
    "amount" numeric NOT NULL,
    "anchor_day" smallint NOT NULL,
    "starts_on" "date" NOT NULL,
    "generated_through" "date",
    "active" boolean DEFAULT true NOT NULL,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cost_recurrence_series_anchor_day_check" CHECK ((("anchor_day" >= 1) AND ("anchor_day" <= 31)))
);


ALTER TABLE "public"."cost_recurrence_series" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "description" "text" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text",
    "amount" numeric(10,2) NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "origin" "text" DEFAULT 'manual'::"text" NOT NULL,
    "stock_movement_id" "uuid",
    "cost_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recurrence_id" "uuid",
    "competence" "date",
    CONSTRAINT "costs_origin_vocab_check" CHECK (("origin" = ANY ('{manual,stock}'::"text"[]))),
    CONSTRAINT "costs_recurrence_competence_pair_check" CHECK (((("recurrence_id" IS NULL) AND ("competence" IS NULL)) OR (("recurrence_id" IS NOT NULL) AND ("competence" IS NOT NULL) AND ("competence" = ("date_trunc"('month'::"text", ("competence")::timestamp with time zone))::"date")))),
    CONSTRAINT "costs_type_vocab_check" CHECK (("type" = ANY ('{fixed,variable}'::"text"[])))
);


ALTER TABLE "public"."costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fiscal_credentials" (
    "tenant_id" "uuid" NOT NULL,
    "csc_id" "text",
    "csc_token" "text",
    "certificate_ref" "text",
    "certificate_expires_at" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fiscal_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."fiscal_credentials" IS 'SEGREDOS fiscais. Sem policy de select: nem o dono do tenant lê. Escrita só por set_fiscal_credentials().';



CREATE TABLE IF NOT EXISTS "public"."fiscal_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sale_id" "uuid",
    "model" "text" NOT NULL,
    "environment" "text" NOT NULL,
    "series" smallint,
    "number" bigint,
    "access_key" "text",
    "protocol" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "authorized_at" timestamp with time zone,
    "xml_url" "text",
    "danfe_url" "text",
    "provider" "text",
    "provider_ref" "text",
    "attempts" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference" "text",
    CONSTRAINT "fiscal_documents_access_key_check" CHECK ((("access_key" IS NULL) OR ("access_key" ~ '^\d{44}$'::"text"))),
    CONSTRAINT "fiscal_documents_environment_check" CHECK (("environment" = ANY (ARRAY['homologation'::"text", 'production'::"text"]))),
    CONSTRAINT "fiscal_documents_model_check" CHECK (("model" = ANY (ARRAY['55'::"text", '65'::"text", 'nfse'::"text"]))),
    CONSTRAINT "fiscal_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'authorized'::"text", 'rejected'::"text", 'cancelled'::"text", 'denied'::"text"])))
);


ALTER TABLE "public"."fiscal_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."fiscal_documents" IS 'Um por documento fiscal. Preenchida a partir da fase 2; na fase 1 existe para a tela dizer "não emitida".';



CREATE TABLE IF NOT EXISTS "public"."fiscal_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "justification" "text",
    "protocol" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fiscal_events_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'accepted'::"text", 'rejected'::"text"]))),
    CONSTRAINT "fiscal_events_type_check" CHECK (("type" = ANY (ARRAY['cancellation'::"text", 'correction'::"text", 'disablement'::"text"])))
);


ALTER TABLE "public"."fiscal_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_access" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_showcase" (
    "plan_key" "text" NOT NULL,
    "cta_label_pt" "text" DEFAULT ''::"text" NOT NULL,
    "cta_label_en" "text" DEFAULT ''::"text" NOT NULL,
    "price_unit_pt" "text" DEFAULT ''::"text" NOT NULL,
    "price_unit_en" "text" DEFAULT ''::"text" NOT NULL,
    "features_pt" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "features_en" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "visible" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_showcase" OWNER TO "postgres";


COMMENT ON TABLE "public"."plan_showcase" IS 'Apresentação dos planos na landing page: itens, texto do botão, unidade do preço, destaque, ordem e publicação. Título, descrição e preço NÃO moram aqui — vêm de plans na leitura, para não haver duas verdades.';



COMMENT ON COLUMN "public"."plan_showcase"."plan_key" IS 'O plano real anunciado por este cartão. É a PK: um cartão por plano, e nenhum cartão sem plano — é dele que sai o preço exibido.';



COMMENT ON COLUMN "public"."plan_showcase"."price_unit_pt" IS 'O que vem depois do número: "/ mês, para sempre". O número em si vem de plans.price.';



COMMENT ON COLUMN "public"."plan_showcase"."featured" IS 'Etiqueta "Recomendado" e cartão em petrol na landing.';



COMMENT ON COLUMN "public"."plan_showcase"."sort_order" IS 'Ordem na página. Não tem relação com plans.sort_order, que ordena o catálogo do console.';



CREATE TABLE IF NOT EXISTS "public"."plans" (
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2),
    "is_custom" boolean DEFAULT false NOT NULL,
    "module_keys" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."plan_showcase_public" WITH ("security_barrier"='true') AS
 SELECT "p"."name" AS "title",
    COALESCE("p"."description", ''::"text") AS "subtitle",
    COALESCE("s"."cta_label_pt", ''::"text") AS "cta_label_pt",
    COALESCE("s"."cta_label_en", ''::"text") AS "cta_label_en",
    COALESCE("s"."price_unit_pt", ''::"text") AS "price_unit_pt",
    COALESCE("s"."price_unit_en", ''::"text") AS "price_unit_en",
    COALESCE("s"."features_pt", '{}'::"text"[]) AS "features_pt",
    COALESCE("s"."features_en", '{}'::"text"[]) AS "features_en",
    COALESCE("s"."featured", false) AS "featured",
    COALESCE("s"."sort_order", "p"."sort_order") AS "sort_order",
    "public"."plan_showcase_price"("p"."key") AS "price"
   FROM ("public"."plans" "p"
     LEFT JOIN "public"."plan_showcase" "s" ON (("s"."plan_key" = "p"."key")))
  WHERE ("p"."is_active" AND COALESCE("s"."visible", true));


ALTER VIEW "public"."plan_showcase_public" OWNER TO "postgres";


COMMENT ON VIEW "public"."plan_showcase_public" IS 'A vitrine como a landing a lê. Título e descrição vêm de plans; itens, botão, unidade, destaque e ordem vêm de plan_showcase; o preço vem de plans.price. SECURITY DEFINER: expõe só estas colunas e nunca module_keys, is_custom ou plano inativo/oculto.';



CREATE TABLE IF NOT EXISTS "public"."platform_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "reference_month" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "due_date" "date",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "cost" numeric(10,2),
    "category" "text",
    "barcode" "text",
    "unit" "text" DEFAULT 'un'::"text",
    "is_service" boolean DEFAULT false NOT NULL,
    "is_favorite" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stock_quantity" numeric(10,3) DEFAULT 0,
    "stock_min" numeric(10,3) DEFAULT 0,
    "tracks_stock" boolean DEFAULT true,
    "ncm" "text",
    "cest" "text",
    "origin" smallint,
    "gtin" "text",
    "tax_unit" "text",
    "cfop" "text",
    "icms_code" "text",
    "pis_cst" "text",
    "cofins_cst" "text",
    "trib_class" "text",
    "ibs_cst" "text",
    "cbs_cst" "text",
    CONSTRAINT "products_cest_format" CHECK ((("cest" IS NULL) OR ("cest" ~ '^\d{7}$'::"text"))),
    CONSTRAINT "products_cfop_format" CHECK ((("cfop" IS NULL) OR ("cfop" ~ '^\d{4}$'::"text"))),
    CONSTRAINT "products_gtin_format" CHECK ((("gtin" IS NULL) OR ("gtin" = 'SEM GTIN'::"text") OR ("gtin" ~ '^\d{8}$|^\d{12,14}$'::"text"))),
    CONSTRAINT "products_ncm_format" CHECK ((("ncm" IS NULL) OR ("ncm" ~ '^\d{8}$'::"text"))),
    CONSTRAINT "products_origin_range" CHECK ((("origin" IS NULL) OR (("origin" >= 0) AND ("origin" <= 8))))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."cost" IS 'Custo unitário. Sem SELECT para authenticated: ler por public.v_product_costs.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "role_id" "uuid",
    "full_name" "text",
    "is_platform_admin" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ui_theme" "text",
    "email" "text",
    CONSTRAINT "profiles_status_vocab_check" CHECK (("status" = ANY ('{active,suspended}'::"text"[]))),
    CONSTRAINT "profiles_ui_theme_check" CHECK ((("ui_theme" IS NULL) OR ("ui_theme" = ANY (ARRAY['light'::"text", 'dark'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."ui_theme" IS 'Tema escolhido por ESTA pessoa no portal. NULL = nunca escolheu, que não é o mesmo que "claro".';



COMMENT ON COLUMN "public"."profiles"."email" IS 'Cópia normalizada do e-mail do Auth para exibição dentro da equipe do mesmo tenant.';



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_owner" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "total" numeric(10,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "sold_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_document" "text",
    "customer_name" "text",
    "replaces_sale_id" "uuid",
    CONSTRAINT "sales_customer_document_format" CHECK ((("customer_document" IS NULL) OR ("customer_document" ~ '^\d{11}$|^\d{14}$'::"text"))),
    CONSTRAINT "sales_payment_method_vocab_check" CHECK (("payment_method" = ANY ('{cash,pix,debit,credit}'::"text"[]))),
    CONSTRAINT "sales_status_vocab_check" CHECK (("status" = ANY ('{completed,refunded}'::"text"[])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "unit_cost" numeric(10,2),
    "reason" "text",
    "sale_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_movements_type_vocab_check" CHECK (("type" = ANY ('{in,out,adjustment,sale}'::"text"[])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_side" "text" NOT NULL,
    "body" "text" NOT NULL,
    "attachment_url" "text",
    "read_by_recipient" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_messages_sender_side_vocab_check" CHECK (("sender_side" = ANY ('{client,support,admin,system}'::"text"[])))
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "opened_by" "uuid",
    "subject" "text" NOT NULL,
    "category" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_tickets_priority_vocab_check" CHECK (("priority" = ANY ('{low,normal,high,urgent}'::"text"[]))),
    CONSTRAINT "support_tickets_status_vocab_check" CHECK (("status" = ANY ('{open,in_progress,waiting_client,resolved}'::"text"[])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_fiscal_settings" (
    "tenant_id" "uuid" NOT NULL,
    "legal_name" "text",
    "tax_id" "text",
    "state_registration" "text",
    "state_registration_exempt" boolean DEFAULT false NOT NULL,
    "city_registration" "text",
    "tax_regime" smallint,
    "street" "text",
    "street_number" "text",
    "complement" "text",
    "district" "text",
    "zip_code" "text",
    "city_name" "text",
    "state_code" "text",
    "city_ibge_code" "text",
    "environment" "text" DEFAULT 'homologation'::"text" NOT NULL,
    "nfce_series" smallint DEFAULT 1 NOT NULL,
    "nfe_series" smallint DEFAULT 1 NOT NULL,
    "default_ncm" "text",
    "default_cfop" "text",
    "default_icms_code" "text",
    "default_pis_cst" "text",
    "default_cofins_cst" "text",
    "default_origin" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_fiscal_settings_city_ibge_code_check" CHECK ((("city_ibge_code" IS NULL) OR ("city_ibge_code" ~ '^\d{7}$'::"text"))),
    CONSTRAINT "tenant_fiscal_settings_default_cfop_check" CHECK ((("default_cfop" IS NULL) OR ("default_cfop" ~ '^\d{4}$'::"text"))),
    CONSTRAINT "tenant_fiscal_settings_default_ncm_check" CHECK ((("default_ncm" IS NULL) OR ("default_ncm" ~ '^\d{8}$'::"text"))),
    CONSTRAINT "tenant_fiscal_settings_default_origin_check" CHECK ((("default_origin" >= 0) AND ("default_origin" <= 8))),
    CONSTRAINT "tenant_fiscal_settings_environment_check" CHECK (("environment" = ANY (ARRAY['homologation'::"text", 'production'::"text"]))),
    CONSTRAINT "tenant_fiscal_settings_nfce_series_check" CHECK ((("nfce_series" >= 1) AND ("nfce_series" <= 999))),
    CONSTRAINT "tenant_fiscal_settings_nfe_series_check" CHECK ((("nfe_series" >= 1) AND ("nfe_series" <= 999))),
    CONSTRAINT "tenant_fiscal_settings_state_code_check" CHECK ((("state_code" IS NULL) OR ("state_code" ~ '^[A-Z]{2}$'::"text"))),
    CONSTRAINT "tenant_fiscal_settings_tax_id_format" CHECK ((("tax_id" IS NULL) OR ("tax_id" ~ '^\d{11}$'::"text") OR ("tax_id" ~ '^\d{14}$'::"text"))),
    CONSTRAINT "tenant_fiscal_settings_tax_regime_check" CHECK ((("tax_regime" >= 1) AND ("tax_regime" <= 4))),
    CONSTRAINT "tenant_fiscal_settings_zip_format" CHECK ((("zip_code" IS NULL) OR ("zip_code" ~ '^\d{8}$'::"text")))
);


ALTER TABLE "public"."tenant_fiscal_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_fiscal_settings" IS 'Dados do emitente e padrões fiscais do catálogo. Um por tenant. Sem segredo — ver fiscal_credentials.';



CREATE TABLE IF NOT EXISTS "public"."tenant_modules" (
    "tenant_id" "uuid" NOT NULL,
    "module_key" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_settings" (
    "tenant_id" "uuid" NOT NULL,
    "accepted_payment_methods" "text"[] DEFAULT ARRAY['cash'::"text", 'pix'::"text", 'debit'::"text", 'credit'::"text"] NOT NULL,
    "print_receipt" boolean DEFAULT true NOT NULL,
    "ask_customer" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_settings_accepted_payment_methods_check" CHECK ((("array_length"("accepted_payment_methods", 1) >= 1) AND ("accepted_payment_methods" <@ ARRAY['cash'::"text", 'pix'::"text", 'debit'::"text", 'credit'::"text"])))
);


ALTER TABLE "public"."tenant_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_settings" IS 'Preferências de uso do negócio (Configurações › Preferências no portal do cliente). Uma linha por tenant; a ausência da linha significa "tudo no padrão", e é por isso que a leitura do portal trata NULL e linha ausente do mesmo jeito.';



COMMENT ON COLUMN "public"."tenant_settings"."accepted_payment_methods" IS 'As formas que aparecem no seletor do PDV. Mesmo vocabulário de sales.payment_method — ver 20260828000000_state_column_checks.sql.';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "segment" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "monthly_fee" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "city" "text",
    "phone" "text",
    "logo_path" "text",
    CONSTRAINT "tenants_status_vocab_check" CHECK (("status" = ANY ('{active,inactive}'::"text"[])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."city" IS 'Cidade / UF do comércio, informada no cadastro.';



COMMENT ON COLUMN "public"."tenants"."phone" IS 'Telefone de contato do responsável.';



COMMENT ON COLUMN "public"."tenants"."logo_path" IS 'Caminho do arquivo no bucket tenant-logos, no formato <tenant_id>/<arquivo>. NULL = usa as iniciais do nome. Guarda o caminho e não a URL de propósito — ver 20260828030000_storage_buckets.sql §4.';



CREATE OR REPLACE VIEW "public"."v_active_modules" WITH ("security_invoker"='true') AS
 SELECT "tm"."tenant_id",
    "m"."key",
    "m"."name",
    "m"."description",
    "m"."is_access"
   FROM ("public"."tenant_modules" "tm"
     JOIN "public"."modules" "m" ON (("m"."key" = "tm"."module_key")))
  WHERE ("tm"."enabled" = true);


ALTER VIEW "public"."v_active_modules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_daily_sales" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "day",
    "sales_count",
    "revenue",
    "cash_total",
    "pix_total",
    "debit_total",
    "credit_total"
   FROM ( SELECT "sales"."tenant_id",
            "date"("sales"."sold_at") AS "day",
            "count"(*) AS "sales_count",
            "sum"("sales"."total") AS "revenue",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'cash'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "cash_total",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'pix'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "pix_total",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'debit'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "debit_total",
            "sum"(
                CASE
                    WHEN ("sales"."payment_method" = 'credit'::"text") THEN "sales"."total"
                    ELSE (0)::numeric
                END) AS "credit_total"
           FROM "public"."sales"
          WHERE ("sales"."status" = 'completed'::"text")
          GROUP BY "sales"."tenant_id", ("date"("sales"."sold_at"))) "gated"
  WHERE ( SELECT "public"."current_actor_can_access_modules"('{sales,reports,cash}'::"text"[]) AS "current_actor_can_access_modules");


ALTER VIEW "public"."v_daily_sales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_fiscal_credentials_status" AS
 SELECT "tenant_id",
    "csc_id",
    ("csc_token" IS NOT NULL) AS "csc_token_set",
    ("certificate_ref" IS NOT NULL) AS "certificate_set",
    "certificate_expires_at",
    "updated_at"
   FROM "public"."fiscal_credentials" "c"
  WHERE ("tenant_id" = "public"."current_tenant_id"());


ALTER VIEW "public"."v_fiscal_credentials_status" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_monthly_result" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "month",
    "revenue",
    "total_costs",
    "fixed_costs",
    "variable_costs",
    "profit"
   FROM ( WITH "sales_m" AS (
                 SELECT "sales"."tenant_id",
                    ("date_trunc"('month'::"text", "sales"."sold_at"))::"date" AS "month",
                    "sum"("sales"."total") AS "revenue"
                   FROM "public"."sales"
                  WHERE ("sales"."status" = 'completed'::"text")
                  GROUP BY "sales"."tenant_id", (("date_trunc"('month'::"text", "sales"."sold_at"))::"date")
                ), "costs_m" AS (
                 SELECT "costs"."tenant_id",
                    ("date_trunc"('month'::"text", ("costs"."cost_date")::timestamp with time zone))::"date" AS "month",
                    "sum"("costs"."amount") AS "total_costs",
                    "sum"(
                        CASE
                            WHEN ("costs"."type" = 'fixed'::"text") THEN "costs"."amount"
                            ELSE (0)::numeric
                        END) AS "fixed_costs",
                    "sum"(
                        CASE
                            WHEN ("costs"."type" = 'variable'::"text") THEN "costs"."amount"
                            ELSE (0)::numeric
                        END) AS "variable_costs"
                   FROM "public"."costs"
                  GROUP BY "costs"."tenant_id", (("date_trunc"('month'::"text", ("costs"."cost_date")::timestamp with time zone))::"date")
                )
         SELECT COALESCE("s"."tenant_id", "c"."tenant_id") AS "tenant_id",
            COALESCE("s"."month", "c"."month") AS "month",
            COALESCE("s"."revenue", (0)::numeric) AS "revenue",
            COALESCE("c"."total_costs", (0)::numeric) AS "total_costs",
            COALESCE("c"."fixed_costs", (0)::numeric) AS "fixed_costs",
            COALESCE("c"."variable_costs", (0)::numeric) AS "variable_costs",
            (COALESCE("s"."revenue", (0)::numeric) - COALESCE("c"."total_costs", (0)::numeric)) AS "profit"
           FROM ("sales_m" "s"
             FULL JOIN "costs_m" "c" ON ((("s"."tenant_id" = "c"."tenant_id") AND ("s"."month" = "c"."month"))))) "gated"
  WHERE ( SELECT "public"."current_actor_can_access_modules"('{costs,reports}'::"text"[]) AS "current_actor_can_access_modules");


ALTER VIEW "public"."v_monthly_result" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_product_costs" WITH ("security_invoker"='false', "security_barrier"='true') AS
 SELECT "id" AS "product_id",
    "tenant_id",
    "cost"
   FROM "public"."products" "p"
  WHERE
        CASE ( SELECT "public"."current_actor_product_cost_scope"() AS "current_actor_product_cost_scope")
            WHEN 'all'::"text" THEN true
            WHEN 'tenant'::"text" THEN ("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id"))
            ELSE false
        END;


ALTER VIEW "public"."v_product_costs" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_product_costs" IS 'Custo dos produtos. Vazia para quem não tem products (sem bundle app), costs, stock ou reports. Única leitura de products.cost com sessão.';



CREATE OR REPLACE VIEW "public"."v_product_sales" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "product_id",
    "product_name",
    "sold_at",
    "qty_sold",
    "total_sold"
   FROM ( SELECT "si"."tenant_id",
            "si"."product_id",
            "si"."product_name",
            "s"."sold_at",
            "sum"("si"."quantity") AS "qty_sold",
            "sum"("si"."subtotal") AS "total_sold"
           FROM ("public"."sale_items" "si"
             JOIN "public"."sales" "s" ON (("s"."id" = "si"."sale_id")))
          WHERE ("s"."status" = 'completed'::"text")
          GROUP BY "si"."tenant_id", "si"."product_id", "si"."product_name", "s"."sold_at") "gated"
  WHERE ( SELECT "public"."current_actor_can_access_modules"('{sales,reports}'::"text"[]) AS "current_actor_can_access_modules");


ALTER VIEW "public"."v_product_sales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stock_alerts" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "product_id",
    "name",
    "stock_quantity",
    "stock_min",
    "situation"
   FROM ( SELECT "products"."tenant_id",
            "products"."id" AS "product_id",
            "products"."name",
            "products"."stock_quantity",
            "products"."stock_min",
                CASE
                    WHEN ("products"."stock_quantity" <= (0)::numeric) THEN 'zeroed'::"text"
                    WHEN ("products"."stock_quantity" <= "products"."stock_min") THEN 'low'::"text"
                    ELSE 'ok'::"text"
                END AS "situation"
           FROM "public"."products"
          WHERE (("products"."tracks_stock" = true) AND ("products"."is_active" = true) AND ("products"."stock_quantity" <= "products"."stock_min"))) "gated"
  WHERE ( SELECT "public"."current_actor_can_access_modules"('{stock,products,reports}'::"text"[]) AS "current_actor_can_access_modules");


ALTER VIEW "public"."v_stock_alerts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_recurrence_series"
    ADD CONSTRAINT "cost_recurrence_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_credentials"
    ADD CONSTRAINT "fiscal_credentials_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."fiscal_documents"
    ADD CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_events"
    ADD CONSTRAINT "fiscal_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."plan_showcase"
    ADD CONSTRAINT "plan_showcase_pkey" PRIMARY KEY ("plan_key");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."platform_payments"
    ADD CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_payments"
    ADD CONSTRAINT "platform_payments_tenant_id_reference_month_key" UNIQUE ("tenant_id", "reference_month");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_fiscal_settings"
    ADD CONSTRAINT "tenant_fiscal_settings_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_pkey" PRIMARY KEY ("tenant_id", "module_key");



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_log_tenant_recent_idx" ON "public"."activity_log" USING "btree" ("tenant_id", "created_at" DESC);



CREATE UNIQUE INDEX "cash_registers_one_open_per_tenant" ON "public"."cash_registers" USING "btree" ("tenant_id") WHERE ("status" = 'open'::"text");



CREATE INDEX "cost_recurrence_series_tenant_active_idx" ON "public"."cost_recurrence_series" USING "btree" ("tenant_id", "active");



CREATE UNIQUE INDEX "costs_one_recurrence_per_competence_idx" ON "public"."costs" USING "btree" ("recurrence_id", "competence") WHERE ("recurrence_id" IS NOT NULL);



CREATE INDEX "costs_tenant_competence_idx" ON "public"."costs" USING "btree" ("tenant_id", "competence" DESC) WHERE ("competence" IS NOT NULL);



CREATE UNIQUE INDEX "fiscal_documents_access_key_uidx" ON "public"."fiscal_documents" USING "btree" ("access_key") WHERE ("access_key" IS NOT NULL);



CREATE INDEX "fiscal_documents_pending_idx" ON "public"."fiscal_documents" USING "btree" ("tenant_id", "status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE UNIQUE INDEX "fiscal_documents_reference_uidx" ON "public"."fiscal_documents" USING "btree" ("reference") WHERE ("reference" IS NOT NULL);



CREATE INDEX "fiscal_documents_sale_idx" ON "public"."fiscal_documents" USING "btree" ("sale_id") WHERE ("sale_id" IS NOT NULL);



CREATE INDEX "fiscal_documents_tenant_created_idx" ON "public"."fiscal_documents" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "fiscal_events_document_idx" ON "public"."fiscal_events" USING "btree" ("document_id", "created_at" DESC);



CREATE INDEX "idx_cash_mov_register" ON "public"."cash_movements" USING "btree" ("cash_register_id");



CREATE INDEX "idx_cash_reg_tenant" ON "public"."cash_registers" USING "btree" ("tenant_id", "opened_at");



CREATE INDEX "idx_costs_tenant" ON "public"."costs" USING "btree" ("tenant_id", "cost_date");



CREATE INDEX "idx_messages_ticket" ON "public"."support_messages" USING "btree" ("ticket_id", "created_at");



CREATE INDEX "idx_payments_month" ON "public"."platform_payments" USING "btree" ("reference_month");



CREATE INDEX "idx_payments_tenant" ON "public"."platform_payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_products_barcode" ON "public"."products" USING "btree" ("tenant_id", "barcode");



CREATE INDEX "idx_products_tenant" ON "public"."products" USING "btree" ("tenant_id");



CREATE INDEX "idx_sale_items_sale" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_items_tenant" ON "public"."sale_items" USING "btree" ("tenant_id");



CREATE INDEX "idx_sales_tenant" ON "public"."sales" USING "btree" ("tenant_id", "sold_at");



CREATE INDEX "idx_stock_mov_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_mov_tenant" ON "public"."stock_movements" USING "btree" ("tenant_id", "created_at");



CREATE INDEX "idx_tickets_status" ON "public"."support_tickets" USING "btree" ("status");



CREATE INDEX "idx_tickets_tenant" ON "public"."support_tickets" USING "btree" ("tenant_id", "last_message_at");



CREATE UNIQUE INDEX "profiles_email_unique" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "sales_one_replacement_per_sale" ON "public"."sales" USING "btree" ("replaces_sale_id") WHERE ("replaces_sale_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "costs_guard_recurrence" BEFORE INSERT OR DELETE OR UPDATE ON "public"."costs" FOR EACH ROW EXECUTE FUNCTION "public"."guard_cost_recurrence"();



CREATE OR REPLACE TRIGGER "fill_profile_email_from_auth" BEFORE INSERT OR UPDATE OF "id", "email" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."fill_profile_email_from_auth"();



CREATE OR REPLACE TRIGGER "fiscal_documents_touch" BEFORE UPDATE ON "public"."fiscal_documents" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "guard_cash_module_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."cash_movements" FOR EACH ROW EXECUTE FUNCTION "public"."guard_cash_module_write"();



CREATE OR REPLACE TRIGGER "guard_cash_module_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."cash_registers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_cash_module_write"();



CREATE OR REPLACE TRIGGER "guard_customer_profile_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_customer_profile_write"();



CREATE OR REPLACE TRIGGER "guard_customer_role_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_customer_role_write"();



CREATE OR REPLACE TRIGGER "guard_product_module_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."guard_product_module_write"();



CREATE OR REPLACE TRIGGER "guard_profile_email_write" BEFORE UPDATE OF "email" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_email_write"();



CREATE OR REPLACE TRIGGER "guard_stock_movement_module_write" BEFORE INSERT OR DELETE OR UPDATE ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."guard_stock_movement_module_write"();



CREATE OR REPLACE TRIGGER "guard_support_message_write" BEFORE INSERT OR UPDATE ON "public"."support_messages" FOR EACH ROW EXECUTE FUNCTION "public"."guard_support_message_write"();



CREATE OR REPLACE TRIGGER "plan_showcase_touch" BEFORE UPDATE ON "public"."plan_showcase" FOR EACH ROW EXECUTE FUNCTION "public"."plan_showcase_touch"();



CREATE OR REPLACE TRIGGER "sales_normalize_payment_method" BEFORE INSERT OR UPDATE OF "payment_method" ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_sale_payment_method"();



CREATE OR REPLACE TRIGGER "tenant_fiscal_settings_touch" BEFORE UPDATE ON "public"."tenant_fiscal_settings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "tenant_settings_touch" BEFORE UPDATE ON "public"."tenant_settings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_tenant_settings"();



CREATE OR REPLACE TRIGGER "tenants_guard_commercial_columns" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."tenants_guard_commercial_columns"();



CREATE OR REPLACE TRIGGER "trg_cost_from_stock" AFTER INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."cost_from_stock_entry"();



CREATE OR REPLACE TRIGGER "trg_deduct_stock" AFTER INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."deduct_stock_on_sale"();



CREATE OR REPLACE TRIGGER "trg_touch_ticket" AFTER INSERT ON "public"."support_messages" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ticket_on_message"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_recurrence_series"
    ADD CONSTRAINT "cost_recurrence_series_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_recurrence_id_fkey" FOREIGN KEY ("recurrence_id") REFERENCES "public"."cost_recurrence_series"("id");



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "public"."stock_movements"("id");



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."fiscal_credentials"
    ADD CONSTRAINT "fiscal_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_documents"
    ADD CONSTRAINT "fiscal_documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fiscal_documents"
    ADD CONSTRAINT "fiscal_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_events"
    ADD CONSTRAINT "fiscal_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."fiscal_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_events"
    ADD CONSTRAINT "fiscal_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_showcase"
    ADD CONSTRAINT "plan_showcase_plan_key_fkey" FOREIGN KEY ("plan_key") REFERENCES "public"."plans"("key") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_payments"
    ADD CONSTRAINT "platform_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_replaces_sale_id_fkey" FOREIGN KEY ("replaces_sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_fiscal_settings"
    ADD CONSTRAINT "tenant_fiscal_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "public"."modules"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_modules"
    ADD CONSTRAINT "tenant_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_mov_tenant_all" ON "public"."cash_movements" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."cash_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_reg_tenant_all" ON "public"."cash_registers" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."cash_registers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_recurrence_series" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cost_recurrence_series_select_own_tenant" ON "public"."cost_recurrence_series" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."costs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "costs_tenant_all" ON "public"."costs" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "dono atualiza o proprio negocio" ON "public"."tenants" FOR UPDATE TO "authenticated" USING (("id" = "public"."current_tenant_id"())) WITH CHECK (("id" = "public"."current_tenant_id"()));



CREATE POLICY "dono atualiza o próprio negócio" ON "public"."tenants" FOR UPDATE TO "authenticated" USING (("id" = "public"."current_tenant_id"())) WITH CHECK (("id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."fiscal_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_tenant_all" ON "public"."support_messages" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_read" ON "public"."modules" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "payments_admin_only" ON "public"."platform_payments" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



ALTER TABLE "public"."plan_showcase" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_showcase_admin_all" ON "public"."plan_showcase" TO "authenticated" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans_admin_manage" ON "public"."plans" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "plans_read" ON "public"."plans" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."platform_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_tenant_all" ON "public"."products" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "profiles_owner_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_owner"() AS "current_actor_is_owner"))) WITH CHECK ((("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_owner"() AS "current_actor_is_owner")));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"() OR ("id" = "auth"."uid"())));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "role_module_delete" ON "public"."cash_movements" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."cash_registers" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."costs" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{costs}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."products" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{products}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."sale_items" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."sales" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."stock_movements" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{stock}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_delete" ON "public"."support_messages" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



CREATE POLICY "role_module_delete" ON "public"."support_tickets" AS RESTRICTIVE FOR DELETE TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



CREATE POLICY "role_module_deny_anon" ON "public"."cash_movements" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."cash_registers" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."costs" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."products" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."sale_items" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."sales" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."stock_movements" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."support_messages" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_deny_anon" ON "public"."support_tickets" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "role_module_insert" ON "public"."cash_movements" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_insert" ON "public"."cash_registers" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_insert" ON "public"."costs" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{costs}'::"text"[]) AS "current_actor_can_use_any_module"))) OR (("origin" = 'stock'::"text") AND (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{stock}'::"text"[]) AS "current_actor_can_use_any_module"))))));



CREATE POLICY "role_module_insert" ON "public"."products" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{products}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_insert" ON "public"."sale_items" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_insert" ON "public"."sales" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_insert" ON "public"."stock_movements" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."sale_stock_context_active"() AS "sale_stock_context_active") AND (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{stock}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_insert" ON "public"."support_messages" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))) AND ("sender_side" = ANY (ARRAY['client'::"text", 'system'::"text"])))));



CREATE POLICY "role_module_insert" ON "public"."support_tickets" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



CREATE POLICY "role_module_select" ON "public"."cash_movements" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."cash_registers" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."cost_recurrence_series" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"(ARRAY['costs'::"text", 'reports'::"text"]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."costs" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{costs,reports}'::"text"[]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."products" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{products,stock,sales,reports}'::"text"[]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."sale_items" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales,reports,cash}'::"text"[]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."sales" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales,reports,cash}'::"text"[]) AS "current_actor_can_use_any_module"))));



CREATE POLICY "role_module_select" ON "public"."stock_movements" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."sale_stock_context_active"() AS "sale_stock_context_active") AND (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{stock,reports}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_select" ON "public"."support_messages" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



CREATE POLICY "role_module_select" ON "public"."support_tickets" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



CREATE POLICY "role_module_update" ON "public"."cash_movements" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."cash_registers" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{cash}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."costs" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{costs}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{costs}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."products" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{products,stock,sales}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{products,stock,sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."sale_items" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."sales" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{sales}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."stock_movements" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{stock}'::"text"[]) AS "current_actor_can_use_any_module"))))) WITH CHECK ((("pg_trigger_depth"() > 0) OR (( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_can_use_any_module"('{stock}'::"text"[]) AS "current_actor_can_use_any_module")))));



CREATE POLICY "role_module_update" ON "public"."support_messages" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member")))) WITH CHECK ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



CREATE POLICY "role_module_update" ON "public"."support_tickets" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member")))) WITH CHECK ((( SELECT "public"."is_platform_admin"() AS "is_platform_admin") OR (("tenant_id" = ( SELECT "public"."current_tenant_id"() AS "current_tenant_id")) AND ( SELECT "public"."current_actor_is_active_member"() AS "current_actor_is_active_member"))));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_manage" ON "public"."roles" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "roles_select" ON "public"."roles" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_items_tenant_all" ON "public"."sale_items" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_tenant_all" ON "public"."sales" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "settings_admin_only" ON "public"."platform_settings" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "stock_mov_tenant_all" ON "public"."stock_movements" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant escreve as proprias preferencias" ON "public"."tenant_settings" TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant escreve o proprio cadastro fiscal" ON "public"."tenant_fiscal_settings" TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant le as proprias preferencias" ON "public"."tenant_settings" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tenant le o proprio cadastro fiscal" ON "public"."tenant_fiscal_settings" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tenant le o proprio historico" ON "public"."activity_log" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tenant le os proprios documentos fiscais" ON "public"."fiscal_documents" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tenant le os proprios eventos fiscais" ON "public"."fiscal_events" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tenant_admin_all" ON "public"."tenants" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



ALTER TABLE "public"."tenant_fiscal_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_isolation_select" ON "public"."tenants" FOR SELECT USING ((("id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



ALTER TABLE "public"."tenant_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_tenant_all" ON "public"."support_tickets" USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"())) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));



CREATE POLICY "tmodules_admin_all" ON "public"."tenant_modules" USING ("public"."is_platform_admin"()) WITH CHECK ("public"."is_platform_admin"());



CREATE POLICY "tmodules_select" ON "public"."tenant_modules" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) OR "public"."is_platform_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."admin_create_tenant"("p_user_id" "uuid", "p_name" "text", "p_segment" "text", "p_owner_name" "text", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[], "p_city" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_create_tenant"("p_user_id" "uuid", "p_name" "text", "p_segment" "text", "p_owner_name" "text", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[], "p_city" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_tenant"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_tenant"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_tenant"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_tenant"("p_tenant_id" "uuid", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_tenant"("p_tenant_id" "uuid", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_tenant"("p_tenant_id" "uuid", "p_plan" "text", "p_monthly_fee" numeric, "p_module_keys" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_stock_movement"("p_product_id" "uuid", "p_type" "text", "p_quantity" numeric, "p_reason" "text", "p_unit_cost" numeric, "p_sale_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_stock_movement"("p_product_id" "uuid", "p_type" "text", "p_quantity" numeric, "p_reason" "text", "p_unit_cost" numeric, "p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_stock_movement"("p_product_id" "uuid", "p_type" "text", "p_quantity" numeric, "p_reason" "text", "p_unit_cost" numeric, "p_sale_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."close_cash_register"("p_register_id" "uuid", "p_counted_cash" numeric, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_cash_register"("p_register_id" "uuid", "p_counted_cash" numeric, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_cash_register"("p_register_id" "uuid", "p_counted_cash" numeric, "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cost_from_stock_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."cost_from_stock_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cost_from_stock_entry"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cost_series_context_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cost_series_context_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cost_series_context_active"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_sale"("p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_sale"("p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale"("p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_actor_can_access_modules"("p_module_keys" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_actor_can_access_modules"("p_module_keys" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_actor_can_access_modules"("p_module_keys" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_actor_can_use_any_module"("p_module_keys" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_actor_can_use_any_module"("p_module_keys" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_actor_can_use_any_module"("p_module_keys" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_actor_can_use_module"("p_module_key" "text", "p_allow_app_bundle" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_actor_can_use_module"("p_module_key" "text", "p_allow_app_bundle" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_actor_can_use_module"("p_module_key" "text", "p_allow_app_bundle" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_actor_is_active_member"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_actor_is_active_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_actor_is_active_member"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_actor_is_owner"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_actor_is_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_actor_is_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_actor_is_owner"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_actor_product_cost_scope"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_actor_product_cost_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_actor_product_cost_scope"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deduct_stock_on_sale"() TO "anon";
GRANT ALL ON FUNCTION "public"."deduct_stock_on_sale"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."deduct_stock_on_sale"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_manual_cost"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_manual_cost"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_manual_cost"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_fiscal_document"("p_sale_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_fiscal_document"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_fiscal_document"("p_sale_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expected_cash_for_register"("p_register_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expected_cash_for_register"("p_register_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expected_cash_for_register"("p_register_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fill_profile_email_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."fill_profile_email_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fill_profile_email_from_auth"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fiscal_document_payload"("p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fiscal_document_payload"("p_document_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_recurring_costs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_recurring_costs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recurring_costs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_cash_module_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_cash_module_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_cost_recurrence"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_cost_recurrence"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_cost_recurrence"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_customer_profile_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_customer_profile_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_customer_profile_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_customer_role_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_customer_role_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_customer_role_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_product_module_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_product_module_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_profile_email_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_profile_email_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_profile_email_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_stock_movement_module_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_stock_movement_module_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_support_message_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_support_message_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_module"("p_module_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_module"("p_module_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_module"("p_module_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."lock_tenant_cost_series"("p_tenant" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lock_tenant_cost_series"("p_tenant" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid", "p_summary" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid", "p_summary" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid", "p_summary" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"("p_action" "text", "p_entity_id" "uuid", "p_summary" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_fiscal_document"("p_document_id" "uuid", "p_status" "text", "p_protocol" "text", "p_access_key" "text", "p_number" bigint, "p_series" smallint, "p_xml_url" "text", "p_danfe_url" "text", "p_rejection_reason" "text", "p_provider" "text", "p_provider_ref" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_fiscal_document"("p_document_id" "uuid", "p_status" "text", "p_protocol" "text", "p_access_key" "text", "p_number" bigint, "p_series" smallint, "p_xml_url" "text", "p_danfe_url" "text", "p_rejection_reason" "text", "p_provider" "text", "p_provider_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_sale_payment_method"() TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_sale_payment_method"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_sale_payment_method"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_showcase_price"("p_plan_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."plan_showcase_touch"() TO "anon";
GRANT ALL ON FUNCTION "public"."plan_showcase_touch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."plan_showcase_touch"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_whatsapp_contact"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_whatsapp_contact"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_whatsapp_contact"() TO "service_role";
GRANT ALL ON FUNCTION "public"."platform_whatsapp_contact"() TO "anon";



REVOKE ALL ON FUNCTION "public"."recurring_cost_date"("p_competence" "date", "p_anchor_day" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recurring_cost_date"("p_competence" "date", "p_anchor_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recurring_cost_date"("p_competence" "date", "p_anchor_day" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."recurring_cost_today"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recurring_cost_today"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recurring_cost_today"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_sale"("p_sale_id" "uuid", "p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_sale"("p_sale_id" "uuid", "p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_sale"("p_sale_id" "uuid", "p_payment_method" "text", "p_items" "jsonb", "p_customer_document" "text", "p_customer_name" "text", "p_sold_at" timestamp with time zone, "p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_is_trusted_backend"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_is_trusted_backend"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_is_trusted_backend"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sale_stock_context_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sale_stock_context_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sale_stock_context_active"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_manual_cost"("p_id" "uuid", "p_description" "text", "p_type" "text", "p_category" "text", "p_amount" numeric, "p_cost_date" "date", "p_is_recurring" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_manual_cost"("p_id" "uuid", "p_description" "text", "p_type" "text", "p_category" "text", "p_amount" numeric, "p_cost_date" "date", "p_is_recurring" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_manual_cost"("p_id" "uuid", "p_description" "text", "p_type" "text", "p_category" "text", "p_amount" numeric, "p_cost_date" "date", "p_is_recurring" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_fiscal_credentials"("p_csc_id" "text", "p_csc_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_fiscal_credentials"("p_csc_id" "text", "p_csc_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_fiscal_credentials"("p_csc_id" "text", "p_csc_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_sale_refunded"("p_sale_id" "uuid", "p_refunded" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_sale_refunded"("p_sale_id" "uuid", "p_refunded" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sale_refunded"("p_sale_id" "uuid", "p_refunded" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_product_column_grants"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_product_column_grants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tenants_guard_commercial_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."tenants_guard_commercial_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tenants_guard_commercial_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_tenant_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_tenant_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_tenant_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_ticket_on_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_ticket_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_ticket_on_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."cash_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cash_registers" TO "anon";
GRANT ALL ON TABLE "public"."cash_registers" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_registers" TO "service_role";



GRANT ALL ON TABLE "public"."cost_recurrence_series" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cost_recurrence_series" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_recurrence_series" TO "service_role";



GRANT ALL ON TABLE "public"."costs" TO "anon";
GRANT ALL ON TABLE "public"."costs" TO "authenticated";
GRANT ALL ON TABLE "public"."costs" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_documents" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_documents" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_events" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_events" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_events" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."plan_showcase" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."plan_showcase" TO "authenticated";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."plan_showcase_public" TO "anon";
GRANT ALL ON TABLE "public"."plan_showcase_public" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_showcase_public" TO "service_role";



GRANT ALL ON TABLE "public"."platform_payments" TO "anon";
GRANT ALL ON TABLE "public"."platform_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_payments" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."products" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("tenant_id") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("name") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("price") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("category") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("barcode") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("unit") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("is_service") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("is_favorite") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("is_active") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("stock_quantity") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("stock_min") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("tracks_stock") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("ncm") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("cest") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("origin") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("gtin") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("tax_unit") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("cfop") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("icms_code") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("pis_cst") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("cofins_cst") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("trib_class") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("ibs_cst") ON TABLE "public"."products" TO "authenticated";



GRANT SELECT("cbs_cst") ON TABLE "public"."products" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_fiscal_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_fiscal_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_fiscal_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_modules" TO "anon";
GRANT ALL ON TABLE "public"."tenant_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_modules" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."tenants" TO "authenticated";



GRANT UPDATE("segment") ON TABLE "public"."tenants" TO "authenticated";



GRANT UPDATE("city") ON TABLE "public"."tenants" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."tenants" TO "authenticated";



GRANT UPDATE("logo_path") ON TABLE "public"."tenants" TO "authenticated";



GRANT ALL ON TABLE "public"."v_active_modules" TO "anon";
GRANT ALL ON TABLE "public"."v_active_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."v_active_modules" TO "service_role";



GRANT ALL ON TABLE "public"."v_daily_sales" TO "anon";
GRANT ALL ON TABLE "public"."v_daily_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."v_daily_sales" TO "service_role";



GRANT ALL ON TABLE "public"."v_fiscal_credentials_status" TO "anon";
GRANT ALL ON TABLE "public"."v_fiscal_credentials_status" TO "authenticated";
GRANT ALL ON TABLE "public"."v_fiscal_credentials_status" TO "service_role";



GRANT ALL ON TABLE "public"."v_monthly_result" TO "anon";
GRANT ALL ON TABLE "public"."v_monthly_result" TO "authenticated";
GRANT ALL ON TABLE "public"."v_monthly_result" TO "service_role";



GRANT ALL ON TABLE "public"."v_product_costs" TO "service_role";
GRANT SELECT ON TABLE "public"."v_product_costs" TO "authenticated";



GRANT ALL ON TABLE "public"."v_product_sales" TO "anon";
GRANT ALL ON TABLE "public"."v_product_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."v_product_sales" TO "service_role";



GRANT ALL ON TABLE "public"."v_stock_alerts" TO "anon";
GRANT ALL ON TABLE "public"."v_stock_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stock_alerts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































