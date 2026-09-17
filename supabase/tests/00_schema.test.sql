-- Estrutura que as outras suítes assumem, depois das migrations pendentes.
begin;
set local search_path = public, extensions, tests;
select plan(12);

select ok(
  not has_column_privilege('authenticated', 'public.products', 'cost', 'SELECT'),
  'authenticated não tem SELECT em products.cost'
);
select ok(
  has_column_privilege('authenticated', 'public.products', 'price', 'SELECT'),
  'authenticated lê as demais colunas de products'
);
select ok(
  has_column_privilege('authenticated', 'public.products', 'cost', 'UPDATE'),
  'authenticated continua podendo gravar products.cost (quem decide é o trigger)'
);
select ok(
  not has_column_privilege('anon', 'public.products', 'name', 'SELECT'),
  'anon não lê products'
);
select ok(
  has_table_privilege('authenticated', 'public.v_product_costs', 'SELECT')
  and not has_table_privilege('anon', 'public.v_product_costs', 'SELECT'),
  'v_product_costs: authenticated lê, anon não'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.apply_stock_movement(uuid,text,numeric,text,numeric,uuid)'::regprocedure),
  'apply_stock_movement é SECURITY DEFINER (lê products sem o privilégio de coluna)'
);
select is(
  (select count(*)::int from pg_proc where proname = 'create_sale' and pronamespace = 'public'::regnamespace),
  1,
  'create_sale não tem sobrecarga (PostgREST recusaria com PGRST203)'
);
select is(
  (select count(*)::int from pg_trigger
    where tgrelid = 'public.support_messages'::regclass
      and tgname = 'guard_support_message_write'
      and not tgisinternal),
  1,
  'support_messages tem o trigger de guarda'
);
select is_empty(
  $$ select c.relname
       from pg_class c
      where c.relnamespace = 'public'::regnamespace
        and c.relkind = 'r'
        and not c.relrowsecurity $$,
  'toda tabela de public tem RLS ligado'
);
select ok(
  not has_function_privilege('anon', 'public.create_sale(text,jsonb,text,text,timestamptz,uuid)', 'EXECUTE'),
  'anon não executa create_sale'
);
select ok(
  not has_function_privilege('authenticated', 'public.sync_product_column_grants()', 'EXECUTE'),
  'authenticated não executa sync_product_column_grants'
);
select is_empty(
  $$ select v.relname
       from pg_class v
       join pg_depend d on d.refobjid = 'public.products'::regclass
       join pg_rewrite rw on rw.oid = d.objid and rw.ev_class = v.oid
       join pg_attribute a on a.attrelid = 'public.products'::regclass
                          and a.attnum = d.refobjsubid and a.attname = 'cost'
      where v.relkind = 'v'
        and coalesce(v.reloptions, '{}') && array['security_invoker=true', 'security_invoker=on'] $$,
  'nenhuma view security_invoker lê products.cost'
);

select * from finish();
rollback;
