# Fila offline de vendas (PDV do portal)

Só **vendas novas do PDV** (`/vendas/nova`). Editar/estornar venda, caixa,
estoque, custos e o resto continuam exigindo internet.

## Fluxo

1. No clique em "Registrar venda", `PortalProvider.recordSale` cria uma
   `QueuedSale` com `clientId` (uuid v4) e `soldAt` do clique.
2. `submitSale` (`salesQueueStore.ts`):
   - `navigator.onLine === false` → grava no IndexedDB sem tentar a rede;
   - senão chama a Server Action `recordSale(..., clientId, soldAt)` (timeout
     de 20s). Falha de caminho (rede, sessão, erro transitório do banco) → vai
     para a fila; recusa do banco → erro na tela, carrinho mantido.
3. `useSalesQueueSync` (montado no provider) reenvia ao abrir o portal, no
   evento `online`, ao voltar para a aba e com espera crescente (5s → 5min).
4. A action passa `p_id = clientId` para `create_sale`. Reenvio de uma venda
   que já entrou recebe `23505` → a action devolve `{ ok: true, duplicate: true }`
   (sem repetir nota fiscal nem histórico) e a venda sai da fila.

## Estados

| status    | significado                                           | automático?          |
|-----------|-------------------------------------------------------|----------------------|
| `pending` | ainda não enviada, ou falha de rede/sessão/infra       | sim, com espera      |
| `failed`  | banco recusou (42501, 22023, 23503, código desconhecido) | **não** — "Tentar de novo" ou "Descartar" no PDV |

Na dúvida (erro sem código e sem cara de rede), a venda vai para `failed`:
é preferível parar e mostrar a reenviar para sempre.

## Escopo e dados

- Cada venda guarda `tenantId` + `userId`; só é listada/enviada na sessão da
  mesma pessoa no mesmo negócio (a `create_sale` usa o tenant e o usuário da
  sessão que chama).
- Guarda apenas o necessário para reenviar (itens, forma de pagamento, CPF
  opcional). Nenhuma leitura do servidor é copiada para o IndexedDB; o catálogo
  offline é o cache de telas que o service worker já mantinha.
- Sair da conta **não** apaga a fila (seriam vendas perdidas).
- Várias abas: Web Locks evitam rodadas simultâneas; `BroadcastChannel`
  sincroniza a lista. Sem esses recursos, o `23505` continua impedindo duplicatas.

## Arquivos

- `salesQueue.ts` — regras puras (classificação, espera, escopo, resumo).
- `salesQueueDb.ts` — IndexedDB (`aguiar-portal-offline` / `pending_sales`).
- `salesQueueStore.ts` — store do navegador + hooks React.
- `salesQueue.test.mjs` — testes da lógica pura.

## Testes

O portal não tem framework de testes. A lógica pura não importa nada em tempo
de execução e é testada com o `node:test` (Node ≥ 23.6, remoção de tipos
nativa):

```sh
cd apps/portal-client
node --test lib/offline/salesQueue.test.mjs
```

## Limitações conhecidas

- O estoque e o caixa exibidos são os do servidor; o PDV mostra "−N pendentes"
  por produto e o shell exibe uma tarja nas outras telas, mas os números não são
  recalculados localmente.
- `soldAt` vem do relógio do computador (horário no futuro vira `now()` no
  servidor). Uma venda enviada depois do fechamento do caixa entra com a hora
  original.
- Uma venda enfileirada por timeout pode ter chegado ao banco; ela aparece como
  pendente até a próxima sincronização, que a remove via `23505`.
