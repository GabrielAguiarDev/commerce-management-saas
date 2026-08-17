-- =====================================================================
-- A VITRINE DE PLANOS DA LANDING PAGE.
--
-- MOTIVO: a dobra "Planos" de aguiarone.com era HTML fixo — dois cartões
-- escritos à mão em `apps/landing-page/lib/dictionary.ts`, com o preço do
-- plano pago ainda em "R$ XX". Mudar uma vírgula da oferta exigia commit e
-- deploy. Esta tabela tira a COPY do código; o admin passa a editá-la.
--
-- ┌─ O QUE ESTA TABELA NÃO É ──────────────────────────────────────────┐
-- │ Ela não decide NADA sobre acesso. Quem diz o que um cliente pode   │
-- │ usar é `plans.module_keys`, e continua sendo — nem esta tabela nem │
-- │ a view abaixo tocam nisso, leem isso ou expõem isso.               │
-- │                                                                    │
-- │ E ela NÃO GUARDA PREÇO. O preço é um fato do plano, não do         │
-- │ anúncio: mora em `plans.price`, é o mesmo número que cobra o       │
-- │ cliente, e chega até a página pela função `plan_showcase_price`.   │
-- │ Uma coluna de preço aqui seria uma segunda verdade, e a página     │
-- │ acabaria anunciando um valor que a fatura contradiz.               │
-- └────────────────────────────────────────────────────────────────────┘
--
-- NOTA PARA QUEM LÊ ESTA PASTA PELA PRIMEIRA VEZ: `supabase/migrations/`
-- NÃO descreve o banco inteiro. `plans`, `modules` e `tenants` — entre
-- outras — foram criadas fora do repositório, direto no projeto Supabase,
-- e não têm migration aqui. O versionado começa em `20260801000000`, e o
-- que veio antes você só enxerga no painel. Esta migration depende de
-- `public.plans(key)` e de `public.is_platform_admin()` já existirem.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A tabela.
--
-- A CHAVE PRIMÁRIA É O VÍNCULO COM O PLANO. Não há `id` próprio de
-- propósito: um cartão de vitrine só existe como a face pública de um
-- plano real, e a PK textual — mesma forma de `plans.key` e
-- `modules.key` — já garante sozinha o que queremos garantir, que é um
-- cartão por plano. Dois anúncios do mesmo plano na mesma página seriam
-- um erro de operação, não uma configuração.
--
-- `on delete cascade`: excluir o plano leva junto o anúncio dele. Perder
-- a copy dói, mas a alternativa (`restrict`) faria a exclusão de plano no
-- painel morrer com um erro cru de chave estrangeira, numa tela que esta
-- entrega não pode alterar. A janela é estreita: `deletePlan` já recusa
-- excluir plano com clientes, o plano sob medida e o último plano ativo.
--
-- `on update cascade`: `plans.key` é texto e é a identidade; se um dia
-- ela for renomeada, o cartão acompanha em vez de virar órfão.
--
-- CADA CAMPO EM DUAS COLUNAS, `_pt` e `_en`. Não é jsonb: são dois
-- idiomas, fixos, conhecidos em tempo de compilação, e colunas dão tipo,
-- `not null` e erro de escrita na hora certa. O painel já trata os dois
-- idiomas na interface (`lib/dictionary.ts`), mas nenhum DADO dele era
-- bilíngue até aqui — `plans.name` é uma coluna só, duplicada nos dois
-- idiomas por `umTexto()` em `lib/planosBanco.ts`. Esta é a primeira
-- tabela do sistema com tradução de verdade.
-- ---------------------------------------------------------------------
create table if not exists public.plan_showcase (
  plan_key      text primary key
                references public.plans(key)
                on update cascade
                on delete cascade,

  -- O nome DE VENDA. Não é `plans.name`, e é bom que não seja: hoje o
  -- plano se chama "Pago" no console e "Completo" na página. O nome
  -- interno é para quem administra; este é para quem compra.
  title_pt      text not null,
  title_en      text not null,

  -- A frase de uma linha sob o nome ("Para quem tem estoque, caixa...").
  subtitle_pt   text not null default '',
  subtitle_en   text not null default '',

  -- O texto do botão. Os dois cartões levam ao MESMO cadastro gratuito,
  -- inclusive o do plano pago — ver o comentário em `Plans.tsx`. O
  -- destino não se edita aqui; só o que o botão diz.
  cta_label_pt  text not null,
  cta_label_en  text not null,

  -- O que vem DEPOIS do número: "/ mês, para sempre" contra "/ mês".
  -- O número vem de `plans.price`; isto aqui é argumento de venda, e a
  -- diferença entre as duas frases é a promessa do plano gratuito.
  price_unit_pt text not null default '',
  price_unit_en text not null default '',

  -- Os itens com "✓" no cartão. `text[]` e não uma tabela filha: é uma
  -- lista curta, ordenada, sempre lida inteira e só por esta tabela —
  -- uma tabela de itens custaria um join e uma coluna de ordem para não
  -- entregar nada além do que o array já entrega.
  features_pt   text[] not null default '{}',
  features_en   text[] not null default '{}',

  -- O cartão em destaque: ganha a etiqueta "Recomendado" e o fundo
  -- petrol. Marcar mais de um é visualmente válido e argumentativamente
  -- ruim; o banco não impede, a tela avisa.
  featured      boolean not null default false,

  -- Fora do ar sem apagar a copy.
  visible       boolean not null default true,

  -- A ordem NA PÁGINA, independente de `plans.sort_order` — aquele
  -- ordena o catálogo do console, este ordena o argumento de venda.
  sort_order    integer not null default 0,

  updated_at    timestamptz not null default now()
);

comment on table public.plan_showcase is
  'Copy de venda dos cartões de plano da landing page. NÃO controla acesso (isso é plans.module_keys) e NÃO guarda preço (isso é plans.price). Uma linha por plano anunciado.';

comment on column public.plan_showcase.plan_key is
  'O plano real anunciado por este cartão. É a PK: um cartão por plano, e nenhum cartão sem plano — é dele que sai o preço exibido.';
comment on column public.plan_showcase.title_pt is
  'Nome de venda, independente de plans.name ("Pago" no console, "Completo" na página).';
comment on column public.plan_showcase.price_unit_pt is
  'O que vem depois do número: "/ mês, para sempre". O número em si vem de plans.price.';
comment on column public.plan_showcase.featured is
  'Etiqueta "Recomendado" e cartão em petrol na landing.';
comment on column public.plan_showcase.sort_order is
  'Ordem na página. Não tem relação com plans.sort_order, que ordena o catálogo do console.';

-- ---------------------------------------------------------------------
-- 2. `updated_at`, mantido pelo banco.
--
-- Por trigger e não pela aplicação: a coluna serve para saber quando a
-- vitrine mudou de verdade, e um UPDATE feito pelo SQL editor do painel
-- — que acontece — não passaria por nenhuma Server Action nossa.
-- ---------------------------------------------------------------------
create or replace function public.plan_showcase_touch()
returns trigger
language plpgsql
-- search_path fixo por hábito: esta não é SECURITY DEFINER, mas o custo
-- de escrever é zero e o dia em que alguém a promover não vai avisar.
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists plan_showcase_touch on public.plan_showcase;
create trigger plan_showcase_touch
  before update on public.plan_showcase
  for each row
  execute function public.plan_showcase_touch();

-- ---------------------------------------------------------------------
-- 3. RLS.
--
-- Escrita: só `is_platform_admin()`, a mesma trava de `plans`,
-- `platform_settings` e `platform_payments`.
--
-- Leitura anônima: SÓ o que está no ar (`visible`). A linha escondida é
-- invisível para `anon` no nível do banco, e não apenas ausente da view
-- — quem despublica um cartão o tira do alcance de quem tem a chave
-- publicável, não só da página.
-- ---------------------------------------------------------------------
alter table public.plan_showcase enable row level security;

drop policy if exists plan_showcase_admin_all on public.plan_showcase;
create policy plan_showcase_admin_all
  on public.plan_showcase
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists plan_showcase_anon_read on public.plan_showcase;
create policy plan_showcase_anon_read
  on public.plan_showcase
  for select
  to anon
  using (visible);

-- ---------------------------------------------------------------------
-- 4. Privilégios de coluna — a parte que o RLS sozinho não faz.
--
-- ┌─ POR QUE COLUNA, E NÃO A TABELA INTEIRA ───────────────────────────┐
-- │ O PostgREST publica TABELA, não só view: com um `grant select` na  │
-- │ tabela toda, `/rest/v1/plan_showcase` responderia a qualquer um    │
-- │ com a chave publicável, contornando a view e entregando as colunas │
-- │ que ela esconde. O RLS filtra LINHAS; quem filtra COLUNAS é o      │
-- │ grant. Sem isto, a view seria uma sugestão.                        │
-- └────────────────────────────────────────────────────────────────────┘
--
-- `updated_at` fica de fora: é metadado de operação, não é vitrine.
--
-- `plan_key` e `visible` PRECISAM entrar, e é a conta que
-- `security_invoker` cobra: a view roda com os privilégios de quem
-- chama, então `anon` tem de poder ler toda coluna que a view menciona
-- — `plan_key` porque é o argumento da função de preço, `visible`
-- porque é o filtro. O que isso abre, exatamente: quem tiver a chave
-- publicável consegue saber que o cartão "Completo" é o plano de chave
-- `paid`. É um slug de plano, ao lado de um nome e um preço que a
-- própria página imprime em letras garrafais. `module_keys`,
-- `description`, `is_custom` e os planos sem cartão continuam fora de
-- alcance — eles estão em `plans`, e `plans` não ganha permissão
-- nenhuma nesta migration.
-- ---------------------------------------------------------------------
revoke all on public.plan_showcase from anon;
revoke all on public.plan_showcase from authenticated;

grant select (
  plan_key,
  title_pt, title_en,
  subtitle_pt, subtitle_en,
  cta_label_pt, cta_label_en,
  price_unit_pt, price_unit_en,
  features_pt, features_en,
  featured,
  visible,
  sort_order
) on public.plan_showcase to anon;

-- O admin escreve; quem decide se ele é admin é a policy acima.
grant select, insert, update, delete on public.plan_showcase to authenticated;

-- ---------------------------------------------------------------------
-- 5. O preço — a única travessia até `plans`.
--
-- `plans` tem policy `is_platform_admin`, então `anon` recebe ZERO
-- LINHAS dela. Uma view `security_invoker` com join em `plans` voltaria
-- vazia; e a saída NÃO é afrouxar o RLS de `plans`, porque uma policy de
-- SELECT lá — mesmo restrita — abriria `module_keys` junto, que é a
-- fonte da verdade do que o cliente acessa.
--
-- Então o preço vem por uma função SECURITY DEFINER que devolve UM
-- numeric e mais nada. É o mesmo desenho de `platform_whatsapp_contact`
-- (migration 20260807000000): a tabela continua fechada, a função expõe
-- um valor.
--
-- ┌─ ELA É FECHADA POR DENTRO ─────────────────────────────────────────┐
-- │ O argumento é filtrado, não obedecido. Não existe caminho para     │
-- │ ler o preço de um plano que não esteja anunciado AGORA:            │
-- │                                                                    │
-- │   plano sem cartão            → o join não casa      → null        │
-- │   cartão com visible = false  → o `and s.visible`    → null        │
-- │   plano com is_active = false → o `and p.is_active`  → null        │
-- │                                                                    │
-- │ O conjunto que ela alcança é, por construção, exatamente o dos     │
-- │ preços que a landing já imprime na tela. Chamar com 'custom', com  │
-- │ a chave de um plano descontinuado ou com lixo devolve null nos     │
-- │ três casos, sem distinguir entre eles.                             │
-- └────────────────────────────────────────────────────────────────────┘
--
-- Devolve `numeric` CRU, sem formatar: "R$ 89" é decisão de tipografia
-- da página, e um `text` aqui congelaria o formato no banco.
-- ---------------------------------------------------------------------
create or replace function public.plan_showcase_price(p_plan_key text)
returns numeric
language sql
-- STABLE: não escreve, e o resultado não muda dentro da mesma consulta.
stable
-- SECURITY DEFINER: roda com os privilégios do dono, que é o que permite
-- ler `plans` sem afrouxar o RLS dela para ninguém.
security definer
-- search_path fixo: impede que um schema malicioso no caminho de busca
-- sequestre os nomes `plans` / `plan_showcase`. Obrigatório aqui.
set search_path = public, pg_temp
as $$
  select p.price
    from public.plans p
    join public.plan_showcase s on s.plan_key = p.key
   where p.key = p_plan_key
     and s.visible
     and p.is_active
$$;

-- Uma função nasce executável por PUBLIC. Numa SECURITY DEFINER isso é
-- porta dos fundos: revogar primeiro, conceder depois.
revoke all on function public.plan_showcase_price(text) from public;
grant execute on function public.plan_showcase_price(text) to anon;
grant execute on function public.plan_showcase_price(text) to authenticated;

comment on function public.plan_showcase_price is
  'Preço de um plano ANUNCIADO, lido de plans.price. Devolve null para plano sem cartão de vitrine, com cartão oculto ou inativo — não há caminho para consultar o preço de um plano fora da vitrine. plans continua fechada a anon.';

-- ---------------------------------------------------------------------
-- 6. A view pública.
--
-- `security_invoker = true`: roda com os privilégios de QUEM CHAMA, e
-- não do dono. É a diferença que faz o RLS da tabela valer de verdade —
-- a policy `plan_showcase_anon_read` é quem esconde o cartão despublicado,
-- e não a boa vontade da view. Uma view definer atravessaria o RLS por
-- conta própria e a policy viraria decoração.
--
-- A lista de colunas é a vitrine e nada mais. `plan_key`, `visible` e
-- `updated_at` não saem daqui — o filtro por `visible` já mora no RLS
-- (seção 3), então a view não precisa nem repetir o `where`.
-- ---------------------------------------------------------------------
drop view if exists public.plan_showcase_public;
create view public.plan_showcase_public
with (security_invoker = true)
as
  select
    s.title_pt,
    s.title_en,
    s.subtitle_pt,
    s.subtitle_en,
    s.cta_label_pt,
    s.cta_label_en,
    s.price_unit_pt,
    s.price_unit_en,
    s.features_pt,
    s.features_en,
    -- O preço do plano REAL, pela única porta que existe.
    public.plan_showcase_price(s.plan_key) as price,
    s.featured,
    s.sort_order
  from public.plan_showcase s;

grant select on public.plan_showcase_public to anon;
grant select on public.plan_showcase_public to authenticated;

comment on view public.plan_showcase_public is
  'A vitrine de planos como a landing page a lê. security_invoker: o RLS de plan_showcase é quem filtra, então cartão oculto não aparece nem aqui nem na tabela. Expõe copy, preço, destaque e ordem — nunca plan_key, module_keys ou qualquer coluna interna.';

-- ---------------------------------------------------------------------
-- 7. A semente — a copy que está no ar hoje.
--
-- Copiada palavra por palavra de `apps/landing-page/lib/dictionary.ts`,
-- pt e en, sem reescrever nada: o objetivo desta migration é tirar o
-- texto do código, não mudá-lo. A primeira publicação pela nova via tem
-- de produzir a MESMA página, com uma diferença deliberada — o preço.
--
-- ┌─ O PREÇO MUDA, E É DE PROPÓSITO ───────────────────────────────────┐
-- │ O dicionário traz "R$ XX" no plano pago, com um /* PENDENTE */ ao  │
-- │ lado. `plans.price` do plano `paid` já é 89.00 e é o valor que     │
-- │ cobra os clientes. A partir daqui a página lê o preço real: sobe   │
-- │ "R$ 89". Não há como cumprir "o preço vem do plano real" e manter  │
-- │ o marcador — e um marcador no ar é pior que um preço.              │
-- └────────────────────────────────────────────────────────────────────┘
--
-- `on conflict do nothing` para a migration poder rodar de novo sem
-- erro E sem desfazer uma edição já feita pelo painel. Rodar duas vezes
-- não devolve a copy para o estado original — que é exatamente o que se
-- quer de uma tabela que o admin edita.
--
-- As chaves são as do banco: `gratuito` e `paid` (não `free`).
-- ---------------------------------------------------------------------
insert into public.plan_showcase (
  plan_key,
  title_pt,      title_en,
  subtitle_pt,   subtitle_en,
  cta_label_pt,  cta_label_en,
  price_unit_pt, price_unit_en,
  features_pt,
  features_en,
  featured, visible, sort_order
)
values
  (
    'gratuito',
    'Gratuito', 'Free',
    'Para quem quer organizar as vendas e enxergar o lucro.',
      'For anyone who wants to organise sales and see the profit.',
    'Começar grátis', 'Start for free',
    '/ mês, para sempre', '/ month, forever',
    array[
      'Registro de vendas ilimitado',
      'Controle de custos',
      'Relatórios básicos de lucro',
      'Acesso pelo celular'
    ],
    array[
      'Unlimited sales entry',
      'Cost tracking',
      'Basic profit reports',
      'Access from your phone'
    ],
    false, true, 1
  ),
  (
    'paid',
    'Completo', 'Complete',
    'Para quem tem estoque, caixa e quer decidir com números.',
      'For anyone with stock and a till who wants to decide with numbers.',
    'Começar grátis e testar', 'Start free and try it',
    '/ mês', '/ month',
    array[
      'Tudo do plano gratuito',
      'Controle de estoque com alertas',
      'Abertura e fechamento de caixa',
      'Relatórios avançados por produto',
      'Suporte prioritário'
    ],
    array[
      'Everything in the free plan',
      'Inventory control with alerts',
      'Opening and closing the till',
      'Advanced reports by product',
      'Priority support'
    ],
    true, true, 2
  )
on conflict (plan_key) do nothing;

-- =====================================================================
-- O QUE ESTA MIGRATION **NÃO** FEZ, e é bom que não tenha feito:
--
--   · nenhuma policy nova em `plans` — ela continua fechada a `anon`;
--   · nenhum grant a `anon` em `plans`, `modules` ou `tenant_modules`;
--   · nada em `has_module()` nem nas policies existentes;
--   · nenhuma coluna de preço fora de `plans`.
--
-- CONFERÊNCIA depois de aplicar (com a chave publicável, sem sessão):
--
--   GET /rest/v1/plan_showcase_public?select=*   → 2 linhas, com price
--   GET /rest/v1/plans?select=*                  → []      (inalterado)
--   GET /rest/v1/plan_showcase?select=module_keys→ erro de coluna
--   GET /rest/v1/plan_showcase?select=updated_at → 401/permissão
--   POST /rest/v1/rpc/plan_showcase_price
--        {"p_plan_key":"custom"}                 → null
-- =====================================================================
