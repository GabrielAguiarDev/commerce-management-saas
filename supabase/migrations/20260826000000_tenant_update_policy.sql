-- =====================================================================
-- O dono atualiza os dados do próprio negócio.
--
-- MOTIVO: não existe policy de UPDATE em `tenants` para o dono. A tela
-- Configurações › Dados do negócio NÃO SALVA — no portal e no app ao mesmo
-- tempo. A escrita passa sem erro e afeta ZERO linhas, e é por isso que os dois
-- lados conferem a contagem e devolvem erro em vez de dizer "salvo" (ver
-- `apps/portal-client/app/configuracoes/actions.ts` e
-- `apps/mobile/src/domain/tenant/tenantApi.ts`). Está registrado em
-- `docs/api/portal-client-pendencias.md` §3.4 e em
-- `apps/mobile/DEVELOPMENT.md` §12.
--
-- É a única coisa do sistema que está quebrada para o cliente hoje.
--
-- O QUE O DONO PODE MEXER: nome, ramo, telefone e cidade — os quatro campos que
-- as duas telas mandam. O que ele NÃO pode é `plan`, `monthly_fee` e `status`:
-- sem essa trava, esta policy seria uma escalada de privilégio, porque um
-- `PATCH /rest/v1/tenants` direto passaria a aceitar qualquer coluna e o
-- comércio se colocaria no plano pago sozinho.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Antes de tudo: a função de que a policy depende precisa existir.
--
-- `current_tenant_id()` foi criada fora deste diretório, junto com o resto do
-- RLS, e por isso não há migration que a garanta. Sem esta parada, um banco que
-- não a tenha aceitaria a policy e ela falharia depois, EM TEMPO DE CONSULTA —
-- o que apareceria como "não salva" outra vez, agora sem explicação.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.current_tenant_id()') is null then
    raise exception using
      message = 'public.current_tenant_id() não existe neste banco.',
      hint    = 'É a função que o RLS deste projeto usa para resolver o tenant '
                'da sessão. Crie-a (SECURITY DEFINER, lendo profiles.tenant_id '
                'por auth.uid()) antes de aplicar esta migration.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- A policy.
--
-- `USING` decide QUAIS LINHAS o update enxerga; `WITH CHECK`, como a linha pode
-- ficar depois. As duas com a mesma condição: o dono alcança a própria linha e
-- não pode reescrevê-la apontando para outro tenant.
--
-- `to authenticated` e não `to public`: `anon` não tem o que fazer aqui.
-- ---------------------------------------------------------------------
drop policy if exists "dono atualiza o próprio negócio" on public.tenants;

create policy "dono atualiza o próprio negócio" on public.tenants
  for update
  to authenticated
  using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());

-- ---------------------------------------------------------------------
-- A trava das colunas comerciais.
--
-- POR QUE UM TRIGGER, E NÃO GRANT POR COLUNA: `revoke update ... from
-- authenticated` + `grant update (name, segment, phone, city)` seria o
-- mecanismo natural — e QUEBRARIA O CONSOLE. O administrador da plataforma
-- escreve `tenants.status` pela MESMA role `authenticated`, com o cliente de
-- sessão (`setCustomerStatus`, em `apps/portal-admin/app/clientes/actions.ts`,
-- usa o `supabase` que `requireAdmin` devolve, e não o de `service_role`).
-- Privilégio por coluna vale para a role inteira e não sabe distinguir os dois.
--
-- POR QUE NÃO DENTRO DA POLICY: `WITH CHECK` enxerga a linha nova, nunca a
-- antiga. "As colunas comerciais não mudaram" é uma comparação com OLD, e isso
-- só existe em trigger.
--
-- SEM `security definer`, de propósito: assim `current_user` continua sendo a
-- role de quem chamou, que é o que a primeira condição precisa ler.
-- `is_platform_admin()` já é SECURITY DEFINER por conta própria — é ela que
-- alcança `profiles` por baixo do RLS.
-- ---------------------------------------------------------------------
create or replace function public.tenants_guard_commercial_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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

comment on function public.tenants_guard_commercial_columns() is
  'Congela id, plan, monthly_fee, status e created_at de tenants quando quem '
  'atualiza é o próprio comércio. A policy "dono atualiza o próprio negócio" '
  'depende desta trava para não virar escalada de privilégio.';

drop trigger if exists tenants_guard_commercial_columns on public.tenants;

create trigger tenants_guard_commercial_columns
  before update on public.tenants
  for each row
  execute function public.tenants_guard_commercial_columns();
