-- =====================================================================
-- admin_update_tenant / admin_delete_tenant
--
-- Irmãs da `admin_create_tenant` (20260801000000), pelo mesmo motivo: cada
-- uma dessas operações toca mais de uma tabela, e fazer isso em chamadas
-- separadas pela aplicação deixaria o cliente pela metade se uma falhasse no
-- meio. Dentro de uma função, ou tudo grava, ou nada grava.
--
-- DIFERENÇA IMPORTANTE em relação à create: estas conferem a identidade de
-- quem chamou DENTRO do banco, via `is_platform_admin()`. A create depende só
-- da checagem na Server Action porque é chamada com a `service_role` (onde
-- `auth.uid()` é nulo). Estas são chamadas com o cliente de SESSÃO, então dá
-- para exigir a prova aqui também — e vale a pena, porque uma apaga dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Atualizar plano, mensalidade e módulos de um cliente.
--
-- Os módulos são reconciliados, não recriados: um DELETE seguido de INSERT
-- teria uma janela em que o cliente fica sem módulo nenhum, e se o INSERT
-- falhasse fora da transação o cliente perderia tudo. Aqui é
-- "liga os que vieram, desliga o resto" — idempotente e sem janela.
-- ---------------------------------------------------------------------
create or replace function public.admin_update_tenant(
  p_tenant_id   uuid,
  p_plan        text,
  p_monthly_fee numeric,
  p_module_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_faltando text[];
begin
  ------------------------------------------------------------------
  -- 0. Autorização e validação.
  ------------------------------------------------------------------
  if not public.is_platform_admin() then
    raise exception 'apenas o administrador da plataforma pode alterar clientes';
  end if;

  if p_tenant_id is null then
    raise exception 'cliente é obrigatório';
  end if;

  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'cliente não encontrado';
  end if;

  if p_plan not in ('free', 'paid', 'custom') then
    raise exception 'plano inválido: %', p_plan;
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
  -- 1. O tenant.
  ------------------------------------------------------------------
  update public.tenants
     set plan        = p_plan,
         monthly_fee = p_monthly_fee
   where id = p_tenant_id;

  ------------------------------------------------------------------
  -- 2. Liga o que veio na lista (criando a linha se ainda não existir).
  ------------------------------------------------------------------
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select p_tenant_id, k, true
    from unnest(p_module_keys) as k
  on conflict (tenant_id, module_key) do update set enabled = true;

  ------------------------------------------------------------------
  -- 3. Desliga o que ficou de fora. Desligar em vez de apagar preserva a
  --    data em que o módulo foi concedido pela primeira vez.
  ------------------------------------------------------------------
  update public.tenant_modules
     set enabled = false
   where tenant_id = p_tenant_id
     and not (module_key = any (p_module_keys));
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Excluir um cliente e tudo que pertence a ele.
--
-- Os filhos são apagados na ordem explicitamente, sem depender de como cada
-- chave estrangeira foi configurada. Se alguma tiver ON DELETE CASCADE, o
-- DELETE daqui simplesmente não encontra mais nada — é inofensivo. Se nenhuma
-- tiver, continua funcionando. O contrário (contar com o cascade) quebraria
-- com um erro de chave estrangeira na hora errada.
--
-- Devolve os ids dos usuários do Auth que pertenciam ao cliente. O Auth vive
-- fora do alcance desta transação, então quem apaga aquilo é a Server Action,
-- com a `service_role`, depois que esta função retorna.
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_tenant(p_tenant_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
