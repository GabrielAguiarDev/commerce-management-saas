# Testes de banco — migrations e RLS

Os testes rodam num Postgres de verdade (a mesma imagem do Supabase), com o
schema **da produção** como ponto de partida. Eles respondem a duas perguntas
antes de uma migration chegar ao projeto:

1. **Ela aplica?** Em cima do que está no ar hoje, e duas vezes seguidas
   (toda migration daqui é idempotente, e o teste cobra isso).
2. **A autorização continua certa?** Cada perfil (dono, só vendas, só estoque,
   só caixa, só relatórios, bundle `app`, suspenso) vê e grava só o que deve,
   e nunca o que é de outro negócio.

## Como rodar

Pré-requisito: Docker (OrbStack, Docker Desktop ou o do runner do GitHub).

```bash
scripts/db-test.sh            # tudo
scripts/db-test.sh sales      # só os arquivos cujo nome contém "sales"
DB_TEST_KEEP=1 scripts/db-test.sh   # deixa o container de pé para depurar
```

O script:

1. sobe um container **efêmero** de `public.ecr.aws/supabase/postgres:17.6.1.155`
   (troque com `DB_TEST_IMAGE=...`);
2. prepara o ambiente de teste (`supabase/tests/bootstrap/00_auth.sql`);
3. carrega a baseline `supabase/schema_producao.sql`;
4. aplica, **duas vezes**, cada migration com versão **maior** que a de
   `supabase/schema_producao.version`;
5. carrega os helpers (`supabase/tests/bootstrap/10_helpers.sql`);
6. roda cada `supabase/tests/*.test.sql` com pgTAP — cada arquivo é uma
   transação que termina em `ROLLBACK`, então um não enxerga o outro;
7. **derruba o container**, inclusive em erro ou Ctrl+C (`trap`).

Sai com código ≠ 0 se qualquer migration falhar, se algum teste der
`not ok`, se o número de testes não bater com o `plan()` ou se aparecer um
`ERROR:`.

Com `DB_TEST_KEEP=1`, o nome do container aparece no fim; derrube com
`docker rm -f <nome>`. Para conferir que nada ficou para trás:
`docker ps --filter name=aguiar-db-test`.

No CI, o job **`banco · migrations e RLS`** (`.github/workflows/ci.yml`) roda
o mesmo script em todo push na `main` e em todo PR.

## Atualizar a baseline depois de aplicar migrations

A baseline é um retrato do schema da produção. Sempre que migrations forem
aplicadas no projeto, tire um retrato novo — senão o teste passa a reaplicar
coisas que já estão lá (e deixa de testar a migration seguinte contra o
banco real).

```bash
# 1. aplicar (como sempre)
supabase db push --linked

# 2. conferir o que ficou aplicado; a última linha com as duas colunas
#    preenchidas é a versão da nova baseline
supabase migration list --linked

# 3. retratar o schema
supabase db dump --linked -f supabase/schema_producao.sql

# 4. registrar a versão correspondente (14 dígitos, nada mais)
echo 20260917050000 > supabase/schema_producao.version

# 5. provar que o retrato novo carrega e passa
scripts/db-test.sh
```

Os passos 3 e 4 andam **juntos, no mesmo commit**: o arquivo de versão é o
que diz ao script quais migrations são "pendentes". Se ele apontar para uma
versão sem arquivo em `supabase/migrations/`, o script para com erro.

## Escrever um teste

Crie `supabase/tests/NN_assunto.test.sql` seguindo o molde:

```sql
begin;
set local search_path = public, extensions, tests;
select tests.seed();
select plan(2);

select tests.login('seller_a');
select is(tests.visible('costs'), 0, 'vendedor não vê custos');
select throws_ok($$ select cost from products $$, '42501', null, 'nem o custo do produto');

select * from finish();
rollback;
```

Helpers (`supabase/tests/bootstrap/10_helpers.sql`):

| Helper | O que faz |
| --- | --- |
| `tests.seed()` | cria os negócios A, B e C e as pessoas abaixo |
| `tests.login('nome')` | simula uma requisição do PostgREST: `request.jwt.claims` com `sub` e `role`, e `set role authenticated` |
| `tests.login_service()` | idem, com a `service_role` |
| `tests.logout()` | volta a ser a conexão direta (`postgres`, backend confiável) |
| `tests.uid('nome')`, `tests.tenant('a')`, `tests.product('a1')` | ids fixos |
| `tests.visible('tabela')` | quantas linhas a sessão atual enxerga |
| `tests.affected($$ update ... $$)` | quantas linhas o comando alterou (RLS filtra em silêncio; isto torna o silêncio testável) |
| `tests.set_today('2026-02-28')` | congela `recurring_cost_today()` na transação (chame deslogado) |

Pessoas:

| Negócio | Módulos | Pessoas |
| --- | --- | --- |
| A | sales, products, stock, cash, costs, reports | `owner_a`, `seller_a` (sales), `stock_a` (stock), `cashier_a` (cash), `reports_a` (reports, formato array), `suspended_a` (sales, suspenso) |
| B | só `app` | `owner_b`, `seller_b` (sales + products via bundle) |
| C | todos | `owner_c` — serve para provar isolamento |

Produtos: `a1` (controla estoque, 100 un, custo 4), `a2` (serviço, custo 20),
`b1`, `c1`.

Dicas:

- Leituras de `products` com sessão **precisam listar colunas**: `select *`
  e `returning *` falham com 42501 por causa de `products.cost`.
- Uma linha inserida por uma função **não aparece** para o mesmo comando que
  a chamou. Chame a função num `select` e confira no seguinte.
- Troque de pessoa com `tests.login` antes de cada "requisição": ele também
  zera os marcadores `aguiar.*_context`, como aconteceria numa requisição
  nova do PostgREST.

## O que o ambiente de teste muda (e por quê)

Tudo em `supabase/tests/bootstrap/00_auth.sql`, só no container:

- **`auth.uid()` / `auth.role()` / `auth.jwt()`** são trocadas pelas versões
  do GoTrue, que leem `request.jwt.claims`. As da imagem leem só o formato
  antigo (`request.jwt.claim.sub`).
- **`auth.users`** já vem na imagem; há um stub mínimo só para o caso de ela
  deixar de vir.
- **Privilégios padrão**: a imagem concede tudo a `anon`/`authenticated` em
  objetos novos. O dump já traz os GRANTs reais de cada objeto, então esses
  padrões são zerados antes da carga — senão `anon` ganharia EXECUTE em
  `create_sale` e `authenticated` ganharia SELECT em `products.cost`, coisas
  que a produção não tem.
- As migrations rodam como **`postgres`, que não é superusuário** — igual
  ao projeto.

## Limitações conhecidas

- **Concorrência** (dois aparelhos gerando a mesma série, duas abas abrindo
  caixa) não é exercitada: tudo roda numa sessão só. O índice
  `cash_registers_one_open_per_tenant` e o `costs_one_recurrence_per_competence_idx`
  são testados pelo efeito (23505 / `on conflict`), não pela corrida.
- **Marcadores de contexto duram a transação inteira.**
  `save_manual_cost`/`delete_manual_cost`/`generate_recurring_costs` ligam
  `aguiar.cost_series_context` com `set_config(..., true)` e não desligam; o
  efeito vale até o fim da **transação**, não da função. Pelo PostgREST não
  há como aproveitar isso (uma requisição = uma transação, e o cliente não
  roda SQL livre), mas uma conexão direta que chame essas funções e depois
  escreva em `costs` na mesma transação passa por cima de
  `guard_cost_recurrence`.
- **Storage, Edge Functions e fluxo fiscal** ficam de fora.
- O retrato `schema_producao.sql` é só schema: `modules`, `plans` etc. vêm
  vazios, e `tests.seed()` cria o mínimo necessário.
