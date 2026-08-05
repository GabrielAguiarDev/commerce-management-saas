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

### 3.1 Resolvido durante o levantamento

**1. Usuário de portal — criado.** Não havia nenhum `profiles` com `tenant_id`,
então era impossível entrar. Foi criado `dono@petshopamigofiel.com.br` para o
tenant `Petshop Amigo Fiel`, com o papel "Dono" e um `profiles` ligando os dois.

**2. `roles` estava vazia — o papel "Dono" foi criado.** Vale investigar por que
`admin_create_tenant` não o cria junto com o tenant: todo negócio novo vai nascer
com o mesmo problema.

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

**4. `create_sale` transacional.** Registrar uma venda hoje são duas escritas em
sequência (`sales` e `sale_items`) sem transação — o PostgREST não tem uma entre
chamadas. Se a segunda falhar, fica uma venda sem itens. Uma função no banco
resolveria de vez, e de quebra levaria a baixa de estoque para dentro dela.

**5. Existe um trigger de baixa em `sale_items` — não documentado.** Inserir um
item de venda **já desconta** `products.stock_quantity` e grava o
`stock_movements` do tipo `sale` (verificado: saldo 100 → 97 ao inserir 3
unidades). Descobrir isso tarde custa caro: a primeira versão desta integração
descontava de novo pela aplicação e tirava o dobro de cada venda.

O trigger **não** reage à mudança de `sales.status`: estornar uma venda não
devolve o estoque sozinho. Hoje quem devolve é `app/vendas/actions.ts`, à mão.
Convém decidir de que lado fica a regra — as duas metades em lugares diferentes
é o que torna isso fácil de errar.

**6. `apply_stock_movement` ignora o `p_type`.** Verificado na prática: a função
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

### 3.4 RLS — verificado com sessão real

Com o login criado, cada política foi exercitada com a chave pública e o token
do dono (exatamente o que o portal faz). Resultado:

| Operação | Resultado |
|---|---|
| Leitura de `tenants`, `v_active_modules`, `products`, `sales`, `costs`, `cash_registers`, `stock_movements`, `support_tickets`, `profiles`, `roles` | ✅ todas passam |
| `products` INSERT / UPDATE | ✅ |
| `sales` + `sale_items` INSERT | ✅ |
| `costs` INSERT | ✅ |
| `cash_registers` + `cash_movements` INSERT | ✅ |
| `support_tickets` INSERT | ✅ |
| `roles` INSERT | ✅ |
| RPC `apply_stock_movement`, `expected_cash_for_register`, `close_cash_register` | ✅ |
| **`tenants` UPDATE** | ❌ **bloqueado — 0 linhas afetadas** |

**A única política que falta é o UPDATE de `tenants` pelo dono.** É o que a aba
Configurações › Dados do negócio salva. Hoje a tela avisa "Não foi possível
salvar, fale com o suporte" em vez de fingir sucesso, mas o certo é a política:

```sql
create policy "dono atualiza o próprio negócio" on tenants
  for update using (id = current_tenant_id())
  with check (id = current_tenant_id());
```

(Convém restringir as colunas — nome, ramo, telefone e cidade — para o cliente
não conseguir mexer em `plan`, `monthly_fee` ou `status`.)

---

## 4. Ordem sugerida

1. **Política de UPDATE em `tenants`** — é a única coisa quebrada hoje.
2. **CHECK (ou enum) nas colunas de estado**, com o vocabulário de
   `lib/dados/*.ts`, antes que admin e portal divirjam.
3. **Decidir de que lado fica a baixa de estoque** e documentar o trigger.
   Junto disso, `create_sale` transacional.
4. Fazer `admin_create_tenant` criar o papel "Dono" do tenant novo.
5. Migrar Dashboard e Relatórios para as views de leitura.
6. `tenant_settings`, colunas de documento/endereço e log de auditoria.
7. Storage para anexos e logo.
