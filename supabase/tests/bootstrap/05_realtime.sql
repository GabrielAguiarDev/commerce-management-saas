-- =====================================================================
-- AMBIENTE DE TESTE — o pedaço do Realtime que o banco enxerga.
--
-- Na plataforma, `realtime.messages`, `realtime.topic()` e `realtime.send()`
-- são criados pelo serviço Realtime, não pela imagem do Postgres — no
-- container efêmero o schema `realtime` existe, mas vazio. Este dublê tem a
-- mesma assinatura e o mesmo comportamento que importam aos testes:
--
--   * `realtime.send(payload, event, topic, private)` grava uma linha em
--     `realtime.messages` com `extension = 'broadcast'` (é dali que o serviço
--     lê o que distribuir) e NUNCA derruba a transação de quem chamou — na
--     plataforma, uma falha vira WARNING;
--   * `realtime.topic()` lê a GUC `realtime.topic`, que o serviço define ao
--     autorizar a entrada de alguém num canal privado. Autorizar é rodar as
--     policies de `realtime.messages` como aquele usuário, com o tópico na GUC:
--     é exatamente o que os testes fazem com `set_config`.
--
-- Nada aqui vai para a produção.
-- =====================================================================

create schema if not exists realtime;
grant usage on schema realtime to anon, authenticated, service_role, postgres;

create table if not exists realtime.messages (
  id          uuid        not null default gen_random_uuid(),
  topic       text        not null,
  extension   text        not null,
  payload     jsonb,
  event       text,
  private     boolean     default false,
  updated_at  timestamp   not null default now(),
  inserted_at timestamp   not null default now(),
  primary key (id)
);
alter table realtime.messages enable row level security;
grant select, insert on realtime.messages to anon, authenticated;
grant all on realtime.messages to service_role, postgres;

create or replace function realtime.topic()
returns text
language sql
stable
as $$
  select nullif(current_setting('realtime.topic', true), '')::text;
$$;

create or replace function realtime.send(
  payload jsonb,
  event   text,
  topic   text,
  private boolean default true
)
returns void
language plpgsql
as $$
begin
  begin
    insert into realtime.messages (payload, event, topic, private, extension)
    values (payload, event, topic, private, 'broadcast');
  exception when others then
    raise warning 'ErrorSendingBroadcastMessage: %', sqlerrm;
  end;
end;
$$;

grant execute on function realtime.topic() to anon, authenticated, service_role, postgres;
grant execute on function realtime.send(jsonb, text, text, boolean) to postgres, service_role;
