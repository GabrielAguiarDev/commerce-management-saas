-- =====================================================================
-- AMBIENTE DE TESTE — roda ANTES da baseline, só no container efêmero.
--
-- A imagem `supabase/postgres` já traz o schema `auth`, `auth.users` e os
-- papéis `anon`/`authenticated`/`service_role`. O que ela traz de diferente
-- da produção são as funções `auth.uid()`/`auth.role()`: a versão da imagem
-- lê só `request.jwt.claim.sub`, enquanto a do GoTrue (a que roda no
-- projeto) lê também o JSON `request.jwt.claims` — que é como o PostgREST
-- atual entrega o JWT e como os testes simulam a sessão.
--
-- Nada aqui vai para a produção.
-- =====================================================================

create schema if not exists auth;

-- Stub mínimo, só se a imagem um dia deixar de criar a tabela.
create table if not exists auth.users (
  id    uuid primary key,
  email varchar(255)
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )::text;
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;

create extension if not exists pgtap with schema extensions;

-- A imagem vem com ALTER DEFAULT PRIVILEGES concedendo tudo a anon,
-- authenticated e service_role no schema public. O dump da produção já traz
-- os GRANTs explícitos de cada objeto (e reaplica os defaults no fim); com os
-- defaults da imagem ativos durante a carga, todo objeto ganharia privilégios
-- que a produção não tem (ex.: anon executando create_sale, authenticated
-- com SELECT de tabela em products). Zerados aqui, a carga reproduz as ACLs
-- da produção.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
