-- =====================================================================
-- A VITRINE PASSA A ESPELHAR O CATÁLOGO.
--
-- MOTIVO: o console chamava o plano de "Pago" e o site de "Completo", e a
-- descrição idem. Os dois nomes já discordavam ANTES desta tabela existir
-- (um em `plans.name`, outro escrito à mão no dicionário da landing), e a
-- migration 20260816000000 apenas tornou a discordância visível ao trazer
-- os dois para telas vizinhas. A decisão foi eliminá-la na fonte: título,
-- descrição e preço passam a ter UM lugar só, que é `plans`.
--
-- ┌─ O QUE SOBRA EM `plan_showcase` ───────────────────────────────────┐
-- │ Só o que é DE APRESENTAÇÃO e não existe no catálogo: a lista de    │
-- │ "✓", o texto do botão, o que vem ao lado do número, o destaque, a  │
-- │ ordem na página e o interruptor de publicação. Nada aqui tem       │
-- │ equivalente em `plans` — se tivesse, teria saído junto.            │
-- │                                                                    │
-- │ Título, subtítulo e preço agora vêm de `plans` na hora da leitura. │
-- │ Não há cópia, não há sincronização, não há como divergir.          │
-- └────────────────────────────────────────────────────────────────────┘
--
-- ⚠️  ESTA MIGRATION DESCARTA COPY QUE ESTÁ NO AR. As colunas de título e
-- subtítulo saem, e com elas o texto de venda semeado em 20260816000000
-- ("Para quem tem estoque, caixa e quer decidir com números."). Ele
-- continua existindo no repositório como reserva, em
-- `apps/landing-page/lib/dictionary.ts`, mas sai do banco e da página. O
-- site passa a dizer "Pago" e "Todos os módulos de função liberados".
--
-- Lembrete de 20260816000000: `supabase/migrations/` NÃO descreve o banco
-- inteiro — `plans`, `modules` e `tenants` foram criadas fora do
-- repositório e não têm migration aqui.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. A view sai primeiro.
--
-- ┌─ ELA TEM DE MORRER ANTES DAS COLUNAS ──────────────────────────────┐
-- │ `plan_showcase_public`, como a 20260816000000 a criou, seleciona   │
-- │ `title_pt` e companhia. O Postgres não deixa dropar uma coluna     │
-- │ enquanto uma view depende dela:                                    │
-- │                                                                    │
-- │   ERROR: 2BP01: cannot drop column title_pt ... because other      │
-- │   objects depend on it                                             │
-- │                                                                    │
-- │ O `HINT` do Postgres sugere `DROP ... CASCADE`, e é o conselho     │
-- │ errado para este arquivo: `cascade` derruba o que estiver          │
-- │ pendurado sem dizer o que era, e num banco com mais views que esta │
-- │ levaria junto coisas que ninguém pediu. Derrubar a view por nome,  │
-- │ aqui em cima, faz a mesma coisa de forma explícita — e ela é       │
-- │ recriada na seção 4, com o formato novo.                           │
-- └────────────────────────────────────────────────────────────────────┘
-- ---------------------------------------------------------------------
drop view if exists public.plan_showcase_public;

-- ---------------------------------------------------------------------
-- 1. Fora as colunas que viraram leitura de `plans`.
--
-- `if exists` para a migration poder rodar duas vezes. Depois disto, um
-- título de cartão não é editável em lugar nenhum a não ser na tela de
-- Planos — que é o ponto.
-- ---------------------------------------------------------------------
alter table public.plan_showcase
  drop column if exists title_pt,
  drop column if exists title_en,
  drop column if exists subtitle_pt,
  drop column if exists subtitle_en;

comment on table public.plan_showcase is
  'Apresentação dos planos na landing page: itens, texto do botão, unidade do preço, destaque, ordem e publicação. Título, descrição e preço NÃO moram aqui — vêm de plans na leitura, para não haver duas verdades.';

-- ---------------------------------------------------------------------
-- 2. Todo plano ativo tem cartão.
--
-- Antes, um plano só aparecia no site se alguém inserisse a linha à mão —
-- e o "Customizado" nunca teve uma. Agora a regra é a inversa: existe no
-- catálogo e está ativo, então está no site, e quem tira do ar é o
-- interruptor `visible`, não a ausência da linha.
--
-- Os defaults abaixo tornam a linha barata de criar: um cartão nasce sem
-- itens e sem texto de botão, e a landing sabe se virar com os dois
-- vazios (ver `lib/vitrine.ts` lá). `sort_order` nasce igual ao do
-- catálogo — é o palpite mais razoável, e a tela de Vitrine reordena.
-- ---------------------------------------------------------------------
alter table public.plan_showcase
  alter column cta_label_pt  set default '',
  alter column cta_label_en  set default '';

insert into public.plan_showcase (
  plan_key,
  cta_label_pt,  cta_label_en,
  price_unit_pt, price_unit_en,
  features_pt,   features_en,
  featured, visible, sort_order
)
select
  p.key,
  '', '',
  '', '',
  '{}', '{}',
  false, true, p.sort_order
from public.plans p
where p.is_active
on conflict (plan_key) do nothing;

-- ---------------------------------------------------------------------
-- 3. O preço, com a regra nova.
--
-- Continua sendo a ÚNICA porta de `plans` para fora, e continua fechada
-- por dentro: o argumento é filtrado, não obedecido. O que mudou é o
-- `join`, que virou `left join` — um plano ativo sem linha de vitrine
-- agora aparece no site, então recusar o preço dele seria publicar o
-- cartão com "Sob consulta" sem motivo.
--
--   plano inativo                → o `and p.is_active`      → null
--   cartão com visible = false   → o `and coalesce(...)`    → null
--   chave inexistente            → o `where` não casa       → null
--
-- `coalesce(s.visible, true)`: sem linha de vitrine, o padrão é publicado
-- — a mesma regra da view abaixo, e as duas precisam concordar.
-- ---------------------------------------------------------------------
create or replace function public.plan_showcase_price(p_plan_key text)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.price
    from public.plans p
    left join public.plan_showcase s on s.plan_key = p.key
   where p.key = p_plan_key
     and p.is_active
     and coalesce(s.visible, true)
$$;

comment on function public.plan_showcase_price is
  'Preço de um plano PUBLICADO, lido de plans.price. Devolve null para plano inativo ou com cartão oculto. plans continua fechada a anon.';

-- ---------------------------------------------------------------------
-- 4. A view, agora dirigida por `plans`.
--
-- ┌─ POR QUE ELA DEIXOU DE SER `security_invoker` ─────────────────────┐
-- │ Uma view invoker roda com os privilégios de QUEM CHAMA. Como ela   │
-- │ agora lê `plans.name` e `plans.description`, `anon` precisaria de  │
-- │ permissão de leitura em `plans` — a tabela que guarda              │
-- │ `module_keys`, que é a fonte da verdade do que cada cliente        │
-- │ acessa. Abrir `plans` para a internet a fim de publicar um título  │
-- │ é caro demais pelo que se ganha.                                   │
-- │                                                                    │
-- │ SECURITY DEFINER faz o oposto: a view lê as duas tabelas como      │
-- │ dona, e para fora entrega APENAS as colunas listadas aqui embaixo. │
-- │ `plans` não ganha policy nenhuma, não ganha grant nenhum, e        │
-- │ continua devolvendo zero linhas para `anon` — conferido.           │
-- │                                                                    │
-- │ O QUE ISSO CUSTA: o RLS de `plan_showcase` deixa de filtrar esta   │
-- │ leitura, então o recorte do que é público passa a ser o `where`    │
-- │ daqui. É a linha mais importante do arquivo, e está logo abaixo.   │
-- │ Em troca, a seção 5 tira de `anon` até o acesso que ela tinha à    │
-- │ tabela — `plan_key` incluído, que antes vazava por necessidade.    │
-- └────────────────────────────────────────────────────────────────────┘
-- ---------------------------------------------------------------------
drop view if exists public.plan_showcase_public;
create view public.plan_showcase_public
with (security_barrier = true)
as
  select
    -- O nome e a descrição DO CATÁLOGO. Uma fonte só.
    p.name        as title,
    coalesce(p.description, '') as subtitle,

    -- Apresentação, de `plan_showcase`. `coalesce` em tudo: um plano
    -- ativo pode não ter linha, e nesse caso o cartão sai com o título,
    -- o preço e mais nada — o que é pouco, mas não é quebrado.
    coalesce(s.cta_label_pt, '')  as cta_label_pt,
    coalesce(s.cta_label_en, '')  as cta_label_en,
    coalesce(s.price_unit_pt, '') as price_unit_pt,
    coalesce(s.price_unit_en, '') as price_unit_en,
    coalesce(s.features_pt, '{}') as features_pt,
    coalesce(s.features_en, '{}') as features_en,
    coalesce(s.featured, false)   as featured,
    coalesce(s.sort_order, p.sort_order) as sort_order,

    -- O preço do plano real, pela porta de sempre.
    public.plan_showcase_price(p.key) as price

  from public.plans p
  left join public.plan_showcase s on s.plan_key = p.key
  -- ⚠️  O RECORTE DO QUE É PÚBLICO. Sem RLS por trás desta view, estas
  -- duas condições são a única coisa entre o catálogo e a internet.
  where p.is_active
    and coalesce(s.visible, true);

grant select on public.plan_showcase_public to anon;
grant select on public.plan_showcase_public to authenticated;

comment on view public.plan_showcase_public is
  'A vitrine como a landing a lê. Título e descrição vêm de plans; itens, botão, unidade, destaque e ordem vêm de plan_showcase; o preço vem de plans.price. SECURITY DEFINER: expõe só estas colunas e nunca module_keys, is_custom ou plano inativo/oculto.';

-- ---------------------------------------------------------------------
-- 5. `anon` sai da tabela.
--
-- Com a view definer, ninguém de fora precisa mais tocar em
-- `plan_showcase` — e com a 20260816000000 `anon` tinha grant de coluna
-- ali (incluindo `plan_key`) só porque a view invoker exigia. Some.
--
-- A policy de leitura anônima também sai: ela não filtra mais nada, e
-- uma policy que não vale é pior do que nenhuma, porque parece que vale.
-- A de admin continua, e é ela que protege a escrita.
-- ---------------------------------------------------------------------
revoke all on public.plan_showcase from anon;

drop policy if exists plan_showcase_anon_read on public.plan_showcase;

-- =====================================================================
-- CONFERÊNCIA depois de aplicar (com a chave publicável, sem sessão):
--
--   GET /rest/v1/plan_showcase_public?select=*   → 3 linhas (com custom)
--   GET /rest/v1/plans?select=*                  → []      (inalterado)
--   GET /rest/v1/plan_showcase?select=featured   → permissão negada
--   POST /rest/v1/rpc/plan_showcase_price
--        {"p_plan_key":"custom"}                 → null se oculto
--
-- O QUE NÃO MUDOU: nenhuma policy de `plans`, nenhum grant a `anon` em
-- `plans`, `modules` ou `tenant_modules`, nada em `has_module()`, e
-- nenhuma coluna de preço fora de `plans`.
-- =====================================================================
