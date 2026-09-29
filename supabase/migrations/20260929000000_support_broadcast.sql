-- db-test: reaplicar
-- =====================================================================
-- SUPORTE EM TEMPO REAL — de `postgres_changes` para Broadcast do banco.
--
-- A fase 1 (20260928000000) pôs as tabelas na publicação e os clientes
-- escutavam `postgres_changes`. Funciona, mas não escala: para CADA mudança o
-- serviço Realtime confere o RLS da linha para CADA inscrito, em série, antes
-- de entregar. Com N clientes conectados, uma mensagem custa N checagens de
-- policy. E o evento só servia de aviso: o cliente relia a conversa por HTTP.
--
-- Agora o banco PUBLICA o que mudou, uma vez, num tópico por negócio:
--
--   support:tenant:<tenant_id>   o negócio (app e portal do cliente)
--   support:admin                a plataforma (portal admin)
--
-- com a mensagem inteira no payload — o cliente põe no cache sem ir ao banco.
-- A autorização acontece UMA vez, na entrada do canal (policy abaixo em
-- `realtime.messages`), e não a cada mensagem.
--
-- QUEM ESCUTA: a mesma regra de leitura de `support_messages` /
-- `support_tickets` (20260917010000): membro ATIVO do próprio negócio, ou
-- admin da plataforma. Não há mensagem que o cliente não possa ver (sem nota
-- interna), então o payload não vaza nada que um SELECT não entregaria.
-- Ninguém PUBLICA nesses tópicos a partir do cliente: não existe policy de
-- INSERT para eles — só o trigger, como dono da função, envia.
--
-- A PUBLICAÇÃO da fase 1 fica, por enquanto: app instalado com a versão
-- anterior ainda escuta `postgres_changes`. Sai numa migration própria quando
-- não houver mais cliente antigo (ver docs/architecture/suporte-tempo-real.md).
--
-- `-- db-test: reaplicar` na primeira linha: as policies moram no schema
-- `realtime`, que o `supabase db dump` da baseline não retrata; o
-- `scripts/db-test.sh` reaplica esta migration sempre. Por isso ela é
-- IDEMPOTENTE. Não toca no fluxo fiscal.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. O que é publicado
-- ---------------------------------------------------------------------

create or replace function public.support_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event   text;
  v_payload jsonb;
begin
  if tg_table_name = 'support_messages' then
    v_event := 'message_created';
    -- As colunas que a conversa exibe — as mesmas que o SELECT do app e dos
    -- portais lê. `sender_id` e `read_by_recipient` ficam de fora: nenhuma
    -- tela os usa ao receber.
    v_payload := jsonb_build_object(
      'id', new.id,
      'ticket_id', new.ticket_id,
      'tenant_id', new.tenant_id,
      'sender_side', new.sender_side,
      'body', new.body,
      'attachment_url', new.attachment_url,
      'created_at', new.created_at
    );
  else
    v_event := case tg_op when 'INSERT' then 'ticket_created' else 'ticket_updated' end;
    v_payload := jsonb_build_object(
      'id', new.id,
      'tenant_id', new.tenant_id,
      'status', new.status,
      'last_message_at', new.last_message_at
    );
  end if;

  -- `realtime.send` nunca derruba a escrita: falhar em avisar não pode desfazer
  -- a mensagem que o cliente mandou (na plataforma, o erro vira WARNING).
  perform realtime.send(v_payload, v_event, 'support:tenant:' || new.tenant_id::text, true);
  perform realtime.send(v_payload, v_event, 'support:admin', true);
  return null;
end;
$$;

revoke all on function public.support_broadcast() from public, anon, authenticated;

comment on function public.support_broadcast() is
  'Publica mensagem nova e mudança de chamado nos tópicos privados support:tenant:<id> e support:admin (Realtime Broadcast).';

drop trigger if exists support_messages_broadcast on public.support_messages;
create trigger support_messages_broadcast
  after insert on public.support_messages
  for each row execute function public.support_broadcast();

drop trigger if exists support_tickets_broadcast on public.support_tickets;
create trigger support_tickets_broadcast
  after insert or update of status, last_message_at on public.support_tickets
  for each row execute function public.support_broadcast();

-- ---------------------------------------------------------------------
-- 2. Quem escuta
-- ---------------------------------------------------------------------

drop policy if exists support_broadcast_receive on realtime.messages;
create policy support_broadcast_receive
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (
      (
        (select realtime.topic()) = 'support:tenant:' || (select public.current_tenant_id())::text
        and (select public.current_actor_is_active_member())
      )
      or (
        (select realtime.topic()) = 'support:admin'
        and (select public.is_platform_admin())
      )
    )
  );
