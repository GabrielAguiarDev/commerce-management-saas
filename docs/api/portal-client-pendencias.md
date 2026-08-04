# Portal do Cliente — o que está ligado, o que falta ligar e o que falta criar

Levantamento feito depois de ligar o portal ao Supabase seguindo
`setup-client-supabase.md`. O esquema foi lido do projeto real (`Commerce
Management`) pela especificação OpenAPI do PostgREST, não de suposição.

---

## 1. O que já está ligado

Toda escrita passa por uma Server Action que revalida a sessão e grava sob o
RLS; depois um `router.refresh()` traz o retrato novo. Não há atualização
otimista — numa tela de balcão, mostrar uma venda que o banco recusou é pior do
que meio segundo de espera.

| Área | Tabelas / RPC | Estado |
|---|---|---|
| Sessão | `auth`, `profiles` | login, logout, middleware (exige `tenant_id` e barra admin de plataforma) |
| Menu modular | `v_active_modules` | menu, telas e colunas montam-se pelos módulos do plano |
| Produtos | `products` | listar, criar, editar, favoritar, pausar, excluir |
| Vendas | `sales`, `sale_items` | listar com itens, registrar, editar, estornar, desfazer estorno |
| Estoque | `stock_movements`, `apply_stock_movement` | saldo, movimentações, entrada/saída/ajuste, reversão |
| Custos | `costs` | listar, criar, editar, excluir; compra de mercadoria vira custo sozinha |
| Caixa | `cash_registers`, `cash_movements`, `close_cash_register` | abrir, sangria, reforço, fechar, reabrir, histórico |
| Suporte | `support_tickets`, `support_messages` | listar, abrir, responder, resolver, reabrir, marcar lido |
| Equipe | `roles`, `profiles` | tipos de acesso (CRUD), suspender/liberar, trocar tipo de acesso |
| Negócio | `tenants` | nome, ramo, telefone, cidade |

Dashboard e Relatórios são derivados de `sales`, `costs` e `products` — não têm
tabela própria.

---

## 2. Falta conectar (já existe no banco, o portal ainda não usa)

**1. As quatro views de leitura.** `v_daily_sales`, `v_monthly_result`,
`v_stock_alerts` e `v_product_sales` existem e estão prontas. Hoje o portal
puxa `sales` cru (180 dias) e refaz as contas no cliente. Funciona, mas cresce
junto com o negócio e duplica no TypeScript uma regra que o banco já sabe.
Migrar Dashboard e Relatórios para elas é a maior economia disponível.

**2. `expected_cash_for_register`.** O "esperado na gaveta" da conferência é
recalculado no cliente. A função existe e deveria ser a fonte — hoje há duas
implementações da mesma conta, e elas podem divergir.

**3. `has_module`.** Não é usado; o portal lê a lista inteira de
`v_active_modules` uma vez por navegação, o que cobre o menu. A função continua
útil para checagem pontual dentro de uma Server Action.

**4. E-mail do funcionário.** A aba Equipe mostra o campo vazio: o e-mail vive
em `auth.users`, fora do alcance do RLS do portal. Precisa de uma coluna em
`profiles` ou de uma view que o exponha ao próprio tenant.

**5. `support_tickets.priority`.** Existe e não aparece em lugar nenhum do
portal.

**6. `sale_items.product_id`.** É gravado, mas o histórico exibe só
`product_name`. Ligar o item ao produto permitiria "ver no catálogo" a partir
de uma venda antiga.

---

## 3. Falta criar

### 3.1 Bloqueadores

**1. Não existe usuário de portal.** Nenhum `profiles` tem `tenant_id`
preenchido — o único perfil é o admin da plataforma. **É impossível entrar no
portal hoje**, e por isso o caminho de dados não pôde ser verificado ponta a
ponta. Precisa de um usuário no Auth + um `profiles` com `tenant_id` e
`role_id`.

**2. A tabela `roles` está vazia.** Nem o papel do dono existe. Sem ele,
`profiles.role_id` fica nulo e a aba Equipe não tem o que mostrar. O
`admin_create_tenant` provavelmente deveria criar o papel "Dono" junto com o
tenant.

### 3.2 Integridade

**3. Não há CHECK nas colunas de estado.** Foi verificado inserindo o valor
`'__x__'` — o banco **aceitou** em `sales.payment_method`, `sales.status`,
`costs.type`, `costs.origin`, `cash_registers.status` e
`support_tickets.status`. (As linhas de teste foram apagadas.) Em
`stock_movements.type`, `cash_movements.type` e `support_messages.sender_side`
a inserção parou antes, na chave estrangeira, então lá continua desconhecido.

Como o admin e o portal escrevem nas mesmas colunas, um vocabulário divergente
("cash" x "dinheiro") só apareceria como dado sumido numa tela. O vocabulário
que o portal usa está em `lib/dados/*.ts`; vale transformá-lo em CHECK, ou em
enum, antes que os dois lados divirjam.

**4. `create_sale` transacional.** Registrar uma venda hoje são três escritas em
sequência (`sales`, `sale_items`, baixa de estoque) sem transação — o PostgREST
não tem uma entre chamadas. Se a segunda falhar, a primeira já está gravada.
Uma função no banco resolveria de vez.

**5. `apply_stock_movement` ignora o `p_type`.** Verificado na prática: a função
**soma** o `p_quantity` que recebe, seja o tipo `in`, `out` ou `adjustment`
(10 → `out` 3 → 13). Quem carrega o significado é o sinal, e quem o decide é o
chamador. Ela também **não** atualiza `products.cost` quando recebe
`p_unit_cost`, nem lança a despesa em `costs`.

O portal já trata os três casos (`app/estoque/actions.ts`), mas isso é uma
armadilha para o próximo a chamar a função — sobretudo o app mobile. Ou a
função passa a interpretar o tipo, ou o comportamento precisa estar escrito nela.

### 3.3 Funcionalidades sem tabela

O portal mostra estas telas com um aviso "Em breve", porque um interruptor que
parece salvar e não salva é pior do que um que se assume incompleto.

| O que | Onde aparece | O que falta |
|---|---|---|
| Preferências de uso | Configurações › Preferências | tabela `tenant_settings` (imprimir comprovante, pedir cliente, formas aceitas, tema) |
| Documento e endereço | Configurações › Dados | colunas em `tenants` (CNPJ/CPF, logradouro, número, bairro, CEP) |
| Log de auditoria | Configurações › Equipe | tabela `activity_log` (quem, o quê, quando, sobre qual registro) |
| Categorias | Produtos, Custos | hoje são texto livre em `products.category` / `costs.category`; criar, renomear e excluir não persistem |
| Anexos do suporte | Suporte | bucket no Storage + upload; hoje só o nome do arquivo é gravado |
| Logo do negócio | Configurações › Dados | bucket + coluna `tenants.logo_url` |
| Cadastrar funcionário | Configurações › Equipe | criar usuário no Auth exige `service_role`, que o portal não tem por decisão de segurança — precisa de convite pelo admin ou de uma Edge Function |

### 3.4 RLS não verificado

Sem um usuário de portal, **nenhuma política foi exercitada**. Estas são as que
o portal precisa e que podem não existir:

- `tenants` — UPDATE pelo dono (a tela de Dados do negócio salva ali);
- `roles` — INSERT/UPDATE/DELETE pelo tenant;
- `profiles` — SELECT dos outros perfis do mesmo tenant (lista da equipe) e
  UPDATE de `status`/`role_id`;
- `products`, `sales`, `sale_items`, `stock_movements`, `costs`,
  `cash_registers`, `cash_movements` — INSERT/UPDATE/DELETE pelo tenant;
- `support_tickets` / `support_messages` — INSERT pelo cliente, e UPDATE de
  `read_by_recipient`.

Se alguma faltar, a tela não mostra lista vazia: `lib/dados/carregar.ts`
devolve o erro e a casca exibe um aviso.

---

## 4. Ordem sugerida

1. Criar o papel "Dono" e um usuário de portal para o tenant existente — sem
   isso nada mais pode ser testado.
2. Rodar o portal logado e conferir cada tela; corrigir as políticas de RLS que
   faltarem.
3. Pôr CHECK (ou enum) nas colunas de estado, com o vocabulário de
   `lib/dados/*.ts`.
4. `create_sale` transacional e acertar `apply_stock_movement`.
5. Migrar Dashboard e Relatórios para as views.
6. `tenant_settings`, colunas de documento/endereço e log de auditoria.
7. Storage para anexos e logo.
