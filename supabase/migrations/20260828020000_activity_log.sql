-- =====================================================================
-- ACTIVITY_LOG — "O que aconteceu no portal".
--
-- A tela existe (Configurações › Equipe) e hoje mostra só um aviso: o
-- histórico não é gravado em lugar nenhum. O app mobile tem a mesma tela, e o
-- `tenantApi.listActivities` devolve lista vazia de propósito, com um comentário
-- que vale repetir aqui: sintetizar "atividades" a partir de vendas e
-- movimentações pareceria um log de auditoria sem ser um, e alguém acabaria
-- confiando nisso para saber quem fez o quê.
--
-- ┌─ O NAVEGADOR NÃO ESCREVE NESTA TABELA ─────────────────────────────────┐
-- │ Não há policy de INSERT. Quem grava é `public.log_activity`, uma       │
-- │ função `security definer` que carimba tenant, autor e horário a partir │
-- │ da SESSÃO — o chamador não escolhe nenhum dos três.                    │
-- │                                                                        │
-- │ A diferença importa: com INSERT livre, qualquer um com a chave anon e  │
-- │ uma sessão poderia gravar "Fulano excluiu o produto X" com o nome de   │
-- │ outra pessoa. Um log que a parte auditada consegue forjar não serve    │
-- │ para auditar ninguém.                                                  │
-- │                                                                        │
-- │ Pelo mesmo motivo NÃO existe policy de UPDATE nem de DELETE. Log que   │
-- │ se edita não é log. A limpeza por idade, quando precisar existir, é    │
-- │ trabalho de uma rotina com `service_role`, não de quem usa o portal.   │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,

  -- ── Quem ─────────────────────────────────────────────────────────
  -- `on delete set null`: o funcionário sai da empresa, o registro do que ele
  -- fez FICA. Um `cascade` aqui apagaria o histórico junto com a pessoa, que é
  -- exatamente o contrário do que um log serve para fazer.
  actor_id   uuid references public.profiles(id) on delete set null,

  -- O nome COMO ERA NA HORA. Redundante de propósito: `profiles.full_name` é
  -- editável e a pessoa pode ser removida, e um log que muda de autor
  -- retroativamente — ou que perde o nome — deixa de ser prova de coisa
  -- nenhuma.
  actor_name text,

  -- ── O quê ────────────────────────────────────────────────────────
  -- Chave estável, em inglês, no formato `entidade.verbo`: 'sale.created',
  -- 'stock.adjusted', 'employee.suspended'. É ela que a tela traduz — o texto
  -- em português nunca é gravado, senão mudar o rótulo reescreveria o passado.
  action     text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),

  -- Sobre qual registro. Sem FK de propósito: aponta para tabelas diferentes
  -- conforme a ação, e o alvo pode ter sido apagado depois — e o log do que
  -- foi apagado é o mais importante de todos.
  entity_id  uuid,

  -- ── Detalhe ──────────────────────────────────────────────────────
  -- O que a tela mostra além do rótulo da ação: "Ração Golden 15kg",
  -- "de R$ 89,00 para R$ 94,00". Texto pronto porque o log é histórico, e
  -- reconstruir a descrição a partir dos dados de hoje daria a descrição de
  -- hoje para um evento de ontem.
  summary    text,

  -- Espaço para o que ainda não se sabe que vai precisar. Sem esquema fixo,
  -- e sem nada que a tela dependa: se a tela precisar, vira coluna.
  metadata   jsonb,

  created_at timestamptz not null default now()
);

comment on table public.activity_log is
  'Quem fez o quê no portal. Só a função log_activity grava; não há UPDATE nem DELETE para quem tem sessão.';

-- O índice que a tela usa: as N mais recentes DESTE tenant. Sem ele, a
-- consulta varre a tabela inteira, e ela só cresce.
create index if not exists activity_log_tenant_recent_idx
  on public.activity_log (tenant_id, created_at desc);

-- ---------------------------------------------------------------------
-- RLS: leitura para o próprio tenant. Escrita, por ninguém com sessão.
-- ---------------------------------------------------------------------
alter table public.activity_log enable row level security;

drop policy if exists "tenant le o proprio historico" on public.activity_log;

create policy "tenant le o proprio historico" on public.activity_log
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

-- Só SELECT. A ausência de insert/update/delete aqui é a trava descrita no
-- cabeçalho, e não um esquecimento.
grant select on public.activity_log to authenticated;

-- ---------------------------------------------------------------------
-- LOG_ACTIVITY — a única porta de escrita.
--
-- `security definer` para poder inserir numa tabela onde `authenticated` não
-- tem INSERT. O chamador informa apenas O QUE aconteceu; quem, de qual negócio
-- e quando saem da sessão.
--
-- NÃO LANÇA EXCEÇÃO QUANDO NÃO HÁ TENANT. Esta função é chamada de dentro das
-- Server Actions, DEPOIS de a operação principal ter sido gravada. Se ela
-- estourasse, uma falha ao registrar o log derrubaria a resposta de uma venda
-- que já está no banco — o portal diria "não foi possível registrar a venda"
-- sobre uma venda registrada, que é a pior mentira possível numa tela de
-- balcão. Log é secundário: quando não dá para gravar, não grava.
-- ---------------------------------------------------------------------
create or replace function public.log_activity(
  p_action    text,
  p_entity_id uuid default null,
  p_summary   text default null,
  p_metadata  jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

comment on function public.log_activity is
  'Grava uma linha em activity_log carimbando tenant, autor e horário a partir da sessão. Devolve NULL (sem erro) quando não há tenant, para nunca derrubar a operação que a chamou.';

revoke all on function public.log_activity(text, uuid, text, jsonb) from public;
grant execute on function public.log_activity(text, uuid, text, jsonb) to authenticated;
