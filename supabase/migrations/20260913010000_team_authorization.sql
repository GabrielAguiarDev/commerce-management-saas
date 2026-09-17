-- =====================================================================
-- TEAM AUTHORIZATION — server-side guardrails for roles and profiles.
--
-- The portals also validate these rules before writing. These triggers are the
-- final lock for direct PostgREST calls made with a valid customer session.
-- =====================================================================

create or replace function public.current_actor_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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

revoke all on function public.current_actor_is_owner() from public;
grant execute on function public.current_actor_is_owner() to authenticated;

create or replace function public.guard_customer_role_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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

drop trigger if exists guard_customer_role_write on public.roles;
create trigger guard_customer_role_write
  before insert or update or delete on public.roles
  for each row execute function public.guard_customer_role_write();

create or replace function public.guard_customer_profile_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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

drop trigger if exists guard_customer_profile_write on public.profiles;
create trigger guard_customer_profile_write
  before insert or update or delete on public.profiles
  for each row execute function public.guard_customer_profile_write();

comment on function public.current_actor_is_owner() is
  'True only for an active, non-platform profile whose role is the owner role of the current tenant.';
comment on function public.guard_customer_role_write() is
  'Prevents customer sessions from creating owner roles or changing roles outside their tenant.';
comment on function public.guard_customer_profile_write() is
  'Protects profile identity, tenant, role, platform-admin and status fields from non-owner customer sessions.';
