-- Guarda de support_messages: o cliente não forja resposta do suporte, não
-- reescreve mensagem e não mistura chamado de outro negócio.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(19);

-- Chamados e uma resposta do suporte, gravados pelo backend.
insert into support_tickets (id, tenant_id, opened_by, subject) values
  ('70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), tests.uid('owner_a'), 'Impressora'),
  ('70000000-0000-0000-0000-0000000000a2', tests.tenant('a'), tests.uid('owner_a'), 'Outro'),
  ('70000000-0000-0000-0000-0000000000c1', tests.tenant('c'), tests.uid('owner_c'), 'Do C');
insert into support_messages (id, ticket_id, tenant_id, sender_side, body) values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), 'support', 'Pode reiniciar?');
-- Resposta assinada pela equipe (o portal admin grava `sender_id`).
insert into support_messages (id, ticket_id, tenant_id, sender_id, sender_side, body) values
  ('71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), tests.uid('owner_c'), 'admin', 'Já verificamos.');

select tests.login('seller_a');

select lives_ok(
  $$ insert into support_messages (id, ticket_id, tenant_id, sender_id, sender_side, body)
     values ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), tests.uid('seller_a'), 'client', 'Reiniciei') $$,
  'cliente responde o próprio chamado'
);
select throws_ok(
  $$ insert into support_messages (ticket_id, tenant_id, sender_id, sender_side, body)
     values ('70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), tests.uid('seller_a'), 'support', 'Resolvido!') $$,
  '42501', null,
  'cliente não insere mensagem como suporte'
);
select throws_ok(
  $$ insert into support_messages (ticket_id, tenant_id, sender_id, sender_side, body)
     values ('70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), tests.uid('owner_a'), 'client', 'Sou o dono') $$,
  '42501', null,
  'cliente não assina como outra pessoa'
);
select throws_ok(
  $$ insert into support_messages (ticket_id, tenant_id, sender_side, body)
     values ('70000000-0000-0000-0000-0000000000c1', tests.tenant('a'), 'client', 'Oi') $$,
  '42501', null,
  'cliente não liga mensagem a chamado de outro negócio'
);
select throws_ok(
  $$ insert into support_messages (ticket_id, tenant_id, sender_side, body)
     values ('70000000-0000-0000-0000-0000000000c1', tests.tenant('c'), 'client', 'Oi') $$,
  '42501', null,
  'cliente não escreve no negócio de outro'
);

-- O ponto da guarda: UPDATE não troca o lado.
select throws_ok(
  $$ update support_messages set sender_side = 'support' where id = '71000000-0000-0000-0000-000000000002' $$,
  '42501', null,
  'cliente não transforma a própria mensagem em resposta do suporte'
);
select throws_ok(
  $$ update support_messages set sender_side = 'client' where id = '71000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'cliente não se apropria da resposta do suporte'
);
select throws_ok(
  $$ update support_messages set body = 'Editado' where id = '71000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'cliente não reescreve a resposta do suporte'
);
select throws_ok(
  $$ update support_messages set body = 'Editado' where id = '71000000-0000-0000-0000-000000000002' $$,
  '42501', null,
  'cliente não reescreve a própria mensagem'
);
select throws_ok(
  $$ update support_messages set ticket_id = '70000000-0000-0000-0000-0000000000a2' where id = '71000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'cliente não move a mensagem de chamado'
);
select throws_ok(
  $$ update support_messages set read_by_recipient = true where id = '71000000-0000-0000-0000-000000000002' $$,
  '42501', null,
  'cliente não marca como lida a própria mensagem'
);
select is(
  tests.affected($$ update support_messages set read_by_recipient = true where id = '71000000-0000-0000-0000-000000000001' $$),
  1,
  'cliente marca como lida a resposta do suporte'
);
select is(
  tests.affected($$ update support_messages set read_by_recipient = true where id = '71000000-0000-0000-0000-000000000003' $$),
  1,
  'cliente marca como lida a resposta assinada pela equipe'
);
select throws_ok(
  $$ update support_messages set sender_id = tests.uid('seller_a') where id = '71000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  'cliente não troca o autor da resposta'
);
select results_eq(
  $$ select sender_side, body, read_by_recipient from support_messages where id = '71000000-0000-0000-0000-000000000001' $$,
  $$ values ('support'::text, 'Pode reiniciar?'::text, true) $$,
  'resposta do suporte continua intacta'
);

-- Suspenso e outro negócio.
select tests.login('suspended_a');
select is(tests.visible('support_messages'), 0, 'suspenso não lê mensagens');
select throws_ok(
  $$ insert into support_messages (ticket_id, tenant_id, sender_side, body)
     values ('70000000-0000-0000-0000-0000000000a1', tests.tenant('a'), 'client', 'Oi') $$,
  '42501', null,
  'suspenso não escreve'
);
select tests.login('owner_c');
select is(tests.visible('support_messages'), 0, 'dono de C não lê mensagens de A');

-- O backend (Edge Function / portal admin) continua livre.
select tests.logout();
select lives_ok(
  $$ update support_messages set read_by_recipient = true where id = '71000000-0000-0000-0000-000000000002' $$,
  'backend marca a mensagem do cliente como lida'
);

select * from finish();
rollback;
