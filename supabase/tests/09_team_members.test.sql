-- Equipe: e-mail do perfil vem do Auth e só o serviço de equipe o troca;
-- o dono gerencia acesso e status dos funcionários, e ninguém mexe no dono.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(24);

-- -------------------------------------------------------------- e-mail
select is(
  (select email from profiles where id = tests.uid('seller_a')),
  'seller_a@example.com',
  'e-mail copiado do Auth e normalizado'
);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-0000000000e1', 'novo@example.com'),
  ('a0000000-0000-0000-0000-0000000000e2', 'outro@example.com');
insert into profiles (id, tenant_id, role_id, email)
values ('a0000000-0000-0000-0000-0000000000e1', tests.tenant('a'),
        (select id from roles where tenant_id = tests.tenant('a') and name = 'Vendedor'),
        '  Novo.Func@Example.COM ');
select is(
  (select email from profiles where id = 'a0000000-0000-0000-0000-0000000000e1'),
  'novo.func@example.com',
  'e-mail informado pelo serviço é aparado e minúsculo'
);
select throws_ok(
  $$ insert into profiles (id, tenant_id, email)
     values ('a0000000-0000-0000-0000-0000000000e2', tests.tenant('a'), 'NOVO.FUNC@example.com') $$,
  '23505', null,
  'e-mail é único sem diferenciar maiúsculas'
);

select tests.login('owner_a');
select throws_ok(
  $$ update profiles set email = 'x@example.com' where id = tests.uid('seller_a') $$,
  '42501', null,
  'dono não troca o e-mail do funcionário'
);
select throws_ok(
  $$ update profiles set email = 'dono@example.com' where id = tests.uid('owner_a') $$,
  '42501', null,
  'dono não troca o próprio e-mail'
);
select tests.login('seller_a');
select throws_ok(
  $$ update profiles set email = 'eu@example.com' where id = tests.uid('seller_a') $$,
  '42501', null,
  'funcionário não troca o próprio e-mail'
);
select is(tests.visible('profiles'), 7, 'funcionário vê a equipe do próprio negócio (com e-mail)');

select tests.logout();
select lives_ok(
  $$ update profiles set email = 'Trocado@Example.com' where id = tests.uid('seller_a') $$,
  'backend troca o e-mail'
);
select is(
  (select email from profiles where id = tests.uid('seller_a')),
  'trocado@example.com',
  'e normaliza'
);

-- --------------------------------------------------- autoatendimento
select tests.login('seller_a');
select is(
  tests.affected($$ update profiles set ui_theme = 'dark' where id = tests.uid('seller_a') $$),
  1,
  'funcionário salva o próprio tema'
);
select throws_ok(
  $$ update profiles set role_id = (select id from roles where tenant_id = tests.tenant('a') and name = 'Gerente') where id = tests.uid('seller_a') $$,
  'P0001', 'Operação permitida apenas ao dono do negócio.',
  'funcionário não troca o próprio tipo de acesso'
);
select is(
  tests.affected($$ update profiles set ui_theme = 'dark' where id = tests.uid('stock_a') $$),
  0,
  'funcionário não mexe no perfil de colega'
);
select throws_ok(
  $$ insert into roles (tenant_id, name, permissions) values (tests.tenant('a'), 'Tudo', '{"all": true}') $$,
  'P0001', null,
  'funcionário não cria tipo de acesso'
);

-- ------------------------------------------------------------ dono
select tests.login('owner_a');
select is(
  tests.affected($$ update profiles set status = 'suspended' where id = tests.uid('seller_a') $$),
  1,
  'dono suspende funcionário'
);
select is(
  tests.affected($$ update profiles set role_id = (select id from roles where tenant_id = tests.tenant('a') and name = 'Estoquista') where id = tests.uid('seller_a') $$),
  1,
  'dono troca o tipo de acesso do funcionário'
);
select is(
  (select status || '/' || r.name from profiles p join roles r on r.id = p.role_id where p.id = tests.uid('seller_a')),
  'suspended/Estoquista',
  'mudanças gravadas'
);
select throws_ok(
  $$ update profiles set status = 'suspended' where id = tests.uid('owner_a') $$,
  'P0001', 'O acesso do dono não pode ser alterado.',
  'dono não suspende a si mesmo'
);
select throws_ok(
  $$ update profiles set role_id = (select id from roles where tenant_id = tests.tenant('a') and is_owner) where id = tests.uid('stock_a') $$,
  'P0001', 'Perfil ou tipo de acesso inválido para este negócio.',
  'dono não promove funcionário a dono'
);
select throws_ok(
  $$ update profiles set tenant_id = tests.tenant('c') where id = tests.uid('stock_a') $$,
  'P0001', 'Perfil ou tipo de acesso inválido para este negócio.',
  'dono não move funcionário para outro negócio'
);
select is(
  tests.affected($$ update profiles set status = 'suspended' where id = tests.uid('owner_c') $$),
  0,
  'dono de A não alcança perfil de C'
);
select throws_ok(
  $$ insert into profiles (id, tenant_id) values ('a0000000-0000-0000-0000-0000000000e2', tests.tenant('a')) $$,
  'P0001', 'Cadastro e remoção de usuários exigem o serviço de equipe.',
  'dono não cadastra usuário direto'
);
select lives_ok(
  $$ insert into roles (tenant_id, name, permissions) values (tests.tenant('a'), 'Balcão', '{"modules": ["sales", "cash"]}') $$,
  'dono cria tipo de acesso'
);
select throws_ok(
  $$ insert into roles (tenant_id, name, permissions, is_owner) values (tests.tenant('a'), 'Sócio', '{"all": true}', true) $$,
  'P0001', null,
  'dono não cria outro papel de dono'
);

-- Funcionário suspenso não consegue se reativar.
select tests.login('seller_a');
select throws_ok(
  $$ update profiles set status = 'active' where id = tests.uid('seller_a') $$,
  'P0001', null,
  'suspenso não se reativa'
);

select * from finish();
rollback;
