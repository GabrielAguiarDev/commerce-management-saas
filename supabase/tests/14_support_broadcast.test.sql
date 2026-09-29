-- Broadcast do suporte: o banco publica nos tópicos certos, e só quem pode
-- ler o chamado consegue entrar no canal.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(13);

-- owner_c também é admin da plataforma neste teste.
update profiles set is_platform_admin = true where id = tests.uid('owner_c');

insert into support_tickets (id, tenant_id, opened_by, subject) values
  ('72000000-0000-0000-0000-0000000000a1', tests.tenant('a'), tests.uid('owner_a'), 'Impressora');

select tests.login('seller_a');
insert into support_messages (id, ticket_id, tenant_id, sender_id, sender_side, body) values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-0000000000a1',
   tests.tenant('a'), tests.uid('seller_a'), 'client', 'A impressora parou');

-- ------------------------------------------------------------------ publica
reset role;
select is(
  (select count(*)::int from realtime.messages
    where event = 'message_created' and payload ->> 'id' = '73000000-0000-0000-0000-000000000001'),
  2,
  'mensagem nova vai para dois tópicos'
);
select results_eq(
  $$ select topic, private from realtime.messages
      where event = 'message_created' order by topic $$,
  $$ values ('support:admin'::text, true),
            ('support:tenant:' || tests.tenant('a')::text, true) $$,
  'tópico do negócio e da plataforma, ambos privados'
);
select is(
  (select payload - 'created_at' from realtime.messages
    where event = 'message_created' and topic = 'support:admin'),
  jsonb_build_object(
    'id', '73000000-0000-0000-0000-000000000001',
    'ticket_id', '72000000-0000-0000-0000-0000000000a1',
    'tenant_id', tests.tenant('a'),
    'sender_side', 'client',
    'body', 'A impressora parou',
    'attachment_url', null
  ),
  'payload traz a mensagem inteira que a conversa exibe'
);
select ok(
  exists (select 1 from realtime.messages where event = 'ticket_created'),
  'chamado novo é publicado'
);

update support_tickets set status = 'waiting_client' where id = '72000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from realtime.messages where event = 'ticket_updated' and payload ->> 'status' = 'waiting_client'),
  2,
  'mudança de status é publicada'
);
create temp table before_priority as
  select count(*)::int as n from realtime.messages where event = 'ticket_updated';
update support_tickets set priority = 'high' where id = '72000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from realtime.messages where event = 'ticket_updated'),
  (select n from before_priority),
  'mudar só a prioridade não publica nada (o trigger olha status e last_message_at)'
);

-- ------------------------------------------------------------------ escuta
-- Entrar num canal privado = as policies de realtime.messages, rodando como
-- o usuário, com o tópico em `realtime.topic`.
create function pg_temp.can_join(p_topic text) returns boolean language sql as $$
  select set_config('realtime.topic', p_topic, true) is not null
     and exists (select 1 from realtime.messages where topic = p_topic);
$$;

select tests.login('seller_a');
select ok(pg_temp.can_join('support:tenant:' || tests.tenant('a')), 'membro entra no canal do próprio negócio');
select ok(not pg_temp.can_join('support:admin'), 'membro não entra no canal da plataforma');

select tests.login('owner_c');
select ok(pg_temp.can_join('support:admin'), 'admin da plataforma entra no canal da plataforma');

-- Outro negócio: publica algo no C para ter linha no tópico dele.
reset role;
insert into support_tickets (tenant_id, opened_by, subject) values (tests.tenant('c'), tests.uid('owner_c'), 'Do C');
select tests.login('owner_a');
select ok(not pg_temp.can_join('support:tenant:' || tests.tenant('c')), 'dono não entra no canal de outro negócio');

select tests.login('suspended_a');
select ok(not pg_temp.can_join('support:tenant:' || tests.tenant('a')), 'perfil suspenso não entra no canal');

reset role;
set local role anon;
select ok(not pg_temp.can_join('support:tenant:' || tests.tenant('a')), 'anônimo não entra no canal');

-- ------------------------------------------------------------------ publicar
select tests.login('owner_a');
select throws_ok(
  $$ insert into realtime.messages (topic, extension, event, payload, private)
     values ('support:tenant:' || tests.tenant('a'), 'broadcast', 'message_created', '{"body":"forjada"}', true) $$,
  '42501', null,
  'cliente não publica no canal do suporte'
);

select * from finish();
rollback;
