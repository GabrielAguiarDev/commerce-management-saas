# Mapa de funcionalidades pendentes

Revisão integrada em 16/09/2026, cobrindo portal do cliente, portal administrativo,
aplicativo mobile, landing page e migrations. O módulo fiscal/nota fiscal foi
deliberadamente excluído desta análise e das alterações.

## Entregue nesta rodada

| Área | Situação anterior | Resultado |
| --- | --- | --- |
| Permissões do portal | Papel e módulos eram usados principalmente para montar o menu | Rotas, leituras e Server Actions agora cruzam status, tenant, plano e papel; equipe e papéis exigem o dono |
| Permissões do mobile | Um deep link podia montar uma tela fora das permissões do papel | Sessão carrega permissões e o guardião barra venda, produtos, caixa, estoque, custos e relatórios |
| Equipe | Alterações sensíveis dependiam apenas da aplicação | Triggers protegem papel do dono, tenant, status, papel e privilégio de plataforma contra chamadas diretas |
| Venda | Validação parcial e edição em duas transações | Itens são validados no banco; criar, estornar, desfazer estorno e substituir são atômicos e idempotentes |
| Caixa | Dois aparelhos podiam abrir turnos ao mesmo tempo | Índice parcial garante um único caixa aberto por tenant e as telas traduzem o conflito |
| PDV | Estado de edição podia vazar para uma venda futura e o método exibido podia divergir do salvo | A edição é descartada ao sair do PDV e a forma efetiva é a mesma exibida e persistida |
| Preferências sem efeito | Interruptores de comprovante e nome do cliente eram salvos, mas não alteravam o PDV | Controles foram retirados e substituídos por uma explicação honesta |
| Suporte administrativo | Prioridade não era editável e anexos não abriam | Prioridade pode ser alterada e anexos privados usam URL assinada de curta duração |
| Landing page | CTA de reserva podia não sair do lugar; contato e dados legais tinham marcadores; depoimentos eram fictícios | CTA leva a Contato, canais dependem de configuração real, marcadores legais saíram da publicação e depoimentos fictícios não são renderizados |

## Segunda fase (17/09/2026)

| Área | Resultado | Migration / arquivo |
| --- | --- | --- |
| Autorização no banco | Policies RESTRICTIVE por operação em vendas, itens, produtos, estoque, custos, caixa e suporte, com gates de módulo nas views de relatório e guardas por coluna em `products` | `20260917010000_role_module_rls.sql` |
| Custos recorrentes | Série mensal explícita (`cost_recurrence_series`), competência por lançamento, geração idempotente (`generate_recurring_costs`), dias 29/30/31 ajustados ao fim do mês, edição/exclusão por RPC e leitura das séries restrita a custos/relatórios | `20260917020000_recurring_costs.sql` |
| Equipe | O dono convida por e-mail e remove funcionários pela Edge Function `team-members` (service_role só na função). Se a pessoa já tem registros presos por FK, a remoção é recusada e a tela orienta a suspender | `20260917030000_team_members.sql`, `supabase/functions/team-members` |
| Preferências do mobile | As formas de pagamento aceitas vêm de `tenant_settings`, as mesmas do portal. Tema e idioma continuam no aparelho | `apps/mobile/src/domain/tenant` |

### Para publicar esta fase

1. Aplicar as três migrations, na ordem, e depois conferir os NOTICEs das
   funções SECURITY DEFINER.
2. Fazer o deploy de `team-members` e configurar `PORTAL_CLIENT_URL` na função.
3. Testar em staging com os perfis dono, só vendas, só estoque, só caixa, só
   relatórios e pacote app, cobrindo venda, estorno, edição de venda,
   movimentação de estoque com custo, fechamento de caixa, suporte, custo
   recorrente (incluindo dia 31) e convite/remoção de funcionário.

### Riscos conhecidos

- A validação do SQL foi apenas estática (parser PG17). Nenhuma migration foi
  executada localmente.
- Um funcionário de vendas ainda consegue ler `products.cost`, porque o RLS não
  filtra por coluna.
- `support_messages` UPDATE não impede trocar `sender_side`.
- No dashboard do portal, funcionários sem os módulos correspondentes passam a
  ver vendas, custos e caixa vazios.
- No mobile ainda não dá para editar nem excluir custos: essa semântica existe
  só no servidor e no portal.

## Terceira fase (17/09/2026)

| Área | Resultado |
| --- | --- |
| Custos no mobile | Edição e exclusão de custos manuais pelas RPCs `save_manual_cost`/`delete_manual_cost`, com a mesma semântica de série do portal. Custo vindo do estoque não é editável |
| `products.cost` | `authenticated` perde o SELECT da coluna (grants por coluna) e o custo é lido por `v_product_costs`, com gate por módulo (`20260917040000_authorization_leftovers.sql`). Depois de adicionar uma coluna em `products`, rodar `select public.sync_product_column_grants();` |
| Suporte | Um trigger impede sessão comum de trocar autor, lado, conteúdo ou chamado de uma mensagem |
| Painel do portal | Cards de vendas e lucro ficam ocultos para quem não tem o módulo correspondente |
| PDV web offline | Vendas novas vão para uma fila no IndexedDB, separada por negócio e usuário, e são reenviadas sem duplicar (`client_id`). Recusas definitivas pedem ação do usuário. Detalhes em `apps/portal-client/lib/offline/README.md` |

Pendências que sobraram desta fase:

- ~~Testes de migrations em Postgres real~~: feito — `scripts/db-test.sh`, suítes em `supabase/tests`, job `db` no CI (ver `docs/testes/banco.md`).
- ~~`markRead` ignorava mensagens `admin`~~: corrigido no portal e no mobile; a trava de `support_messages` foi ajustada em `20260917050000`.
- `20260917050000` também corrige o UPDATE de `profiles` (tema, suspender, trocar papel afetavam 0 linhas) e os reforços (`deposit`) ignorados no fechamento de caixa.
- Trigger `cost_from_stock_entry` testa `type = 'entry'`, que não existe no vocabulário (código morto).
- No PDV offline, estoque e caixa não são recalculados localmente, e o horário da venda vem do relógio do computador.
- O advisor do Supabase vai apontar `v_product_costs` como view security definer (é intencional: o filtro de tenant e de módulo está dentro dela).

## Próximas funcionalidades

### Prioridade média

5. **Fila offline para outras escritas do portal web** (hoje só vendas do PDV).

6. **Cobertura automatizada das migrations e das Server Actions.** TypeScript,
   lint, builds e testes mobile estão cobertos. Falta um Postgres/Supabase local
   no CI para executar migrations e provar RLS, triggers, concorrência de caixa
   e retries das RPCs.

### Dependências externas

7. Configurar `CONTACT_EMAIL`, o WhatsApp real e os dados jurídicos da empresa,
   com revisão legal dos termos.
8. Inserir depoimentos somente depois de receber texto, identificação, imagem e
   autorização dos clientes.

## Controles deliberadamente indisponíveis

- Ações que dependem de uma seleção, de dados carregados ou de uma transição em
  andamento continuam desabilitadas enquanto a pré-condição não existe.
- Anexos antigos que guardaram apenas o nome do arquivo aparecem sem link, pois
  não há caminho de Storage recuperável.
- Exclusões protegidas por vínculo (por exemplo, tipo de acesso em uso) continuam
  bloqueadas e explicam o motivo.
- Nota fiscal não faz parte deste mapa.
