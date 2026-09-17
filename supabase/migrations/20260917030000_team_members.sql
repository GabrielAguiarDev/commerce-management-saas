-- =====================================================================
-- EQUIPE AUTÔNOMA — e-mail visível dentro do próprio tenant.
--
-- O convite e a remoção vivem na Edge Function `team-members`, porque só ela
-- recebe a service_role necessária para administrar auth.users. Esta migration
-- guarda no perfil apenas o e-mail que a tela de equipe precisa mostrar.
-- =====================================================================

alter table public.profiles
  add column if not exists email text;

-- A migration roda com privilégio suficiente para ler auth.users. Assim os
-- perfis antigos (inclusive o dono) já aparecem completos na primeira carga.
update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id
   and u.email is not null
   and p.email is distinct from lower(u.email);

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

create or replace function public.fill_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
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

drop trigger if exists fill_profile_email_from_auth on public.profiles;
create trigger fill_profile_email_from_auth
  before insert or update of id, email on public.profiles
  for each row execute function public.fill_profile_email_from_auth();

-- Sessões comuns podem ler o e-mail sob o RLS existente do perfil, mas não
-- podem forjar/trocar o endereço. Mudança de e-mail pertence ao Auth e a uma
-- rotina privilegiada que atualize as duas fontes juntas.
create or replace function public.guard_profile_email_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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

drop trigger if exists guard_profile_email_write on public.profiles;
create trigger guard_profile_email_write
  before update of email on public.profiles
  for each row execute function public.guard_profile_email_write();

comment on column public.profiles.email is
  'Cópia normalizada do e-mail do Auth para exibição dentro da equipe do mesmo tenant.';
comment on function public.fill_profile_email_from_auth() is
  'Preenche o e-mail do perfil a partir de auth.users em inserções privilegiadas.';
comment on function public.guard_profile_email_write() is
  'Impede sessões comuns de divergirem profiles.email do endereço administrado pelo Auth.';
