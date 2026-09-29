-- Catálogo paginado: busca sem acento, filtros dos chips, páginas estáveis e
-- os números do catálogo inteiro — tudo sob o RLS de quem pergunta.
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(14);

-- Semente do negócio A: 'Ração 1kg' (estoque 100, mínimo 0) e 'Banho'
-- (serviço). Mais alguns para cobrir chips, saúde do estoque e paginação.
insert into products (tenant_id, name, price, category, barcode, is_favorite, stock_quantity, stock_min, tracks_stock, is_active) values
  (tests.tenant('a'), 'Coleira',      10, 'Acessórios', '789100', true,  3, 5, true,  true),   -- baixo
  (tests.tenant('a'), 'Guia',         10, 'Acessórios', '789200', false, 0, 2, true,  true),   -- zerado
  (tests.tenant('a'), 'Pausado',      10, 'Acessórios', null,     false, 5, 0, true,  false);  -- inativo
insert into products (tenant_id, name, price, tracks_stock, is_active)
  select tests.tenant('a'), 'Item ' || lpad(g::text, 2, '0'), 1, false, true from generate_series(1, 25) g;

select tests.login('owner_a');

select is(
  (select array_agg(name) from list_products_page('racao')),
  array['Ração 1kg'],
  'busca ignora acento e caixa'
);
select is(
  (select array_agg(name) from list_products_page('7892')),
  array['Guia'],
  'busca casa pelo código'
);
select is(
  (select count(*)::int from list_products_page('%')),
  0,
  '"%" digitado é texto, não curinga'
);
select is(
  (select array_agg(name order by name) from list_products_page(null, 'favorites')),
  array['Coleira'],
  'chip Favoritos'
);
select is(
  (select array_agg(name) from list_products_page(null, 'services')),
  array['Banho'],
  'chip Serviços'
);
select is(
  (select array_agg(name order by name) from list_products_page(null, 'category', ' Acessórios ')),
  array['Coleira', 'Guia'],
  'chip de categoria (ativos, sem o pausado)'
);
select is(
  (select array_agg(name order by name) from list_products_page(null, 'stock')),
  array['Coleira', 'Guia', 'Ração 1kg'],
  'lista do Estoque: só quem controla estoque e não é serviço'
);

-- Paginação: 29 ativos em ordem de nome, páginas de 20.
select is(
  (select count(*)::int from list_products_page(null, 'all', null, 0, 20)),
  20,
  'primeira página tem 20'
);
select is(
  (select count(*)::int from list_products_page(null, 'all', null, 20, 20)),
  9,
  'segunda página tem o resto'
);
select is(
  (select count(*)::int from (
     select id from list_products_page(null, 'all', null, 0, 20)
     intersect
     select id from list_products_page(null, 'all', null, 20, 20)) x),
  0,
  'nenhum produto se repete entre páginas'
);
select is(
  (select count(*)::int from list_products_page(null, 'all', null, 0, 5000)),
  29,
  'o limite por página tem teto (100) e não devolve inativo'
);

select is(
  catalog_facets(),
  jsonb_build_object(
    'total', 29,
    'has_services', true,
    'categories', jsonb_build_array(jsonb_build_object('name', 'Acessórios', 'count', 2)),
    'stock', jsonb_build_object('ok', 1, 'low', 1, 'out', 1)
  ),
  'facetas do catálogo ativo inteiro'
);

-- Isolamento: o C não vê o catálogo do A, nem nas facetas.
select tests.login('owner_c');
select is(
  (select array_agg(name) from list_products_page()),
  array['Pão'],
  'outro negócio só vê o próprio catálogo'
);
select is(
  (catalog_facets() ->> 'total')::int,
  1,
  'facetas também respeitam o RLS'
);

select * from finish();
rollback;
