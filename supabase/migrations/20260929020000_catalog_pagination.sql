-- =====================================================================
-- CATÁLOGO PAGINADO: list_products_page e catalog_facets
-- =====================================================================
--
-- As telas Produtos e Estoque do app liam o catálogo INTEIRO e filtravam no
-- aparelho. Com a lista paginada (20 por vez, mais ao rolar), o que a tela
-- fazia sobre a lista toda passa a ser pergunta ao banco:
--
--   * `list_products_page` — uma página, com a busca e o chip aplicados. A
--     busca ignora acento e caixa ("racao" acha "Ração"), como a do aparelho
--     fazia, e casa por nome OU código;
--   * `catalog_facets` — o que é sobre o catálogo todo e não cabe numa página:
--     quantos produtos há ("20 cadastrados"), se há serviço e as categorias
--     (o rótulo do 3º chip) e os contadores Em dia / Baixo / Zerado.
--
-- Só produtos ATIVOS, nos dois — o "pausado" do portal não aparece no app.
--
-- SECURITY INVOKER: o RLS de `products` vale linha a linha, como valia no
-- SELECT direto. Nenhuma das duas lê `cost` (coluna sem grant para a sessão;
-- o custo continua vindo de `v_product_costs`).
--
-- A regra de saúde do estoque aqui é a mesma de `stockStatus` no app
-- (catalogAdapter.ts): zerado quando quantidade <= 0; baixo quando há mínimo
-- (> 0) e a quantidade chega nele; em dia no resto.
--
-- A tela Vender continua com o catálogo inteiro: ela vende offline e precisa
-- dele no aparelho. Não toca no fluxo fiscal. IDEMPOTENTE.
-- =====================================================================

create extension if not exists unaccent with schema extensions;

/**
 * A chave de busca: sem acento, minúscula. `unaccent` é STABLE (depende do
 * dicionário); com o dicionário fixo, o resultado é determinístico — o
 * wrapper IMMUTABLE é o padrão para poder usá-lo em índice no futuro.
 */
create or replace function public.search_key(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
$$;

create or replace function public.list_products_page(
  p_search   text    default null,
  p_filter   text    default 'all',
  p_category text    default null,
  p_offset   integer default 0,
  p_limit    integer default 20
)
returns table (
  id             uuid,
  tenant_id      uuid,
  name           text,
  barcode        text,
  price          numeric,
  is_service     boolean,
  is_favorite    boolean,
  is_active      boolean,
  stock_quantity numeric,
  stock_min      numeric,
  tracks_stock   boolean,
  category       text,
  created_at     timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with q as (
    select public.search_key(nullif(btrim(p_search), '')) as key
  )
  select p.id, p.tenant_id, p.name, p.barcode, p.price, p.is_service, p.is_favorite,
         p.is_active, p.stock_quantity, p.stock_min, p.tracks_stock, p.category, p.created_at
    from public.products p, q
   where p.is_active
     -- `strpos` e não LIKE: um "%" ou "_" digitado na busca é texto, não curinga.
     and (
       q.key = ''
       or strpos(public.search_key(p.name), q.key) > 0
       or strpos(public.search_key(p.barcode), q.key) > 0
     )
     and case coalesce(p_filter, 'all')
           when 'favorites' then p.is_favorite
           when 'services'  then p.is_service
           when 'category'  then btrim(p.category) = btrim(p_category)
           when 'stock'     then coalesce(p.tracks_stock, false) and not p.is_service
           else true
         end
   -- `id` desempata: com nomes iguais, a mesma linha não pode aparecer em duas
   -- páginas nem sumir entre elas.
   order by p.name, p.id
  offset greatest(coalesce(p_offset, 0), 0)
   limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

create or replace function public.catalog_facets()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with active as (
    select p.is_service, btrim(p.category) as category,
           coalesce(p.tracks_stock, false) and not p.is_service as tracks,
           coalesce(p.stock_quantity, 0) as qty,
           coalesce(p.stock_min, 0) as min_qty
      from public.products p
     where p.is_active
  )
  select jsonb_build_object(
    'total', (select count(*) from active),
    'has_services', exists (select 1 from active where is_service),
    'categories', coalesce(
      (select jsonb_agg(jsonb_build_object('name', c.category, 'count', c.n) order by c.n desc, c.category)
         from (select category, count(*) as n
                 from active
                where coalesce(category, '') <> ''
                group by category) c),
      '[]'::jsonb
    ),
    'stock', (
      select jsonb_build_object(
        'ok',  count(*) filter (where qty > 0 and not (min_qty > 0 and qty <= min_qty)),
        'low', count(*) filter (where qty > 0 and min_qty > 0 and qty <= min_qty),
        'out', count(*) filter (where qty <= 0)
      )
        from active
       where tracks
    )
  );
$$;

revoke all on function public.list_products_page(text, text, text, integer, integer) from public, anon;
revoke all on function public.catalog_facets() from public, anon;
grant execute on function public.list_products_page(text, text, text, integer, integer) to authenticated, service_role;
grant execute on function public.catalog_facets() to authenticated, service_role;
grant execute on function public.search_key(text) to authenticated, service_role;

comment on function public.list_products_page(text, text, text, integer, integer) is
  'Uma página do catálogo ativo, com busca sem acento (nome ou código) e o filtro do chip: all, favorites, services, category, stock.';
comment on function public.catalog_facets() is
  'Números do catálogo ativo inteiro: total, serviços, categorias e contadores de saúde do estoque.';
