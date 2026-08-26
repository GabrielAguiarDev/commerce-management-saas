# Fase 2 — a emissão da NFC-e

Estado em 17/08/2026. Continuação de `emissao-nota-fiscal.md` (o levantamento)
e da fase 1 (`§12` daquele documento, o cadastro).

**Nenhuma nota foi emitida ainda.** O caminho inteiro está escrito, mas nada
foi executado contra a Focus NFe nem contra o banco — falta o certificado
digital, o credenciamento na SEFAZ e a conta no provedor, e nenhum dos três
depende de código. O que existe aqui é tudo o que dava para construir sem eles.

---

## 0. O módulo está DESLIGADO — "Em breve" (25/08/2026)

Enquanto os três itens acima não existirem, o módulo `fiscal` não se vende e
não se liga para ninguém. A decisão mora em **uma lista, em dois arquivos**:

| Arquivo | Constante | O que ela desliga |
|---|---|---|
| `apps/portal-admin/lib/planos.ts` | `COMING_SOON_MODULES` | o lado de quem VENDE |
| `apps/portal-client/lib/modulos.ts` | `COMING_SOON_MODULES` | o lado de quem USA |

**No portal-admin**, com a chave na lista:

- `listModules` separa o módulo do catálogo vendável e o devolve em
  `comingSoon`. Como `s.modules` deixa de o conter, ele some **sozinho** da
  grade do cadastro, da ficha do cliente, dos chips de composição do plano, dos
  padrões da plataforma e de todas as contagens — nenhuma tela precisou de um
  `if`.
- A tela **Módulos** é a única que junta as duas listas de volta: o módulo
  aparece lá com a etiqueta **Em breve**, "Clientes ativos" em `—` e
  "Disponível em" como *Indisponível*. Nome e descrição continuam editáveis.
- As escritas filtram de novo, no servidor: `resolveModules` (as duas escritas
  de módulo de um cliente), `sellableModules` em `app/planos/actions.ts`
  (`plans.module_keys`) e `defaultModules` (`platform_settings`). Um plano
  antigo que ainda carregue a chave, ou uma requisição forjada, morre ali.

**No portal-client a regra é outra, e mais dura: o cliente não pode saber que
existe nota fiscal aqui dentro.** Não há etiqueta "Em breve" deste lado — "em
breve" é uma promessa, e a data depende de um certificado que ainda não foi
comprado. O que o cliente não vê, ele não pergunta no suporte.

| Onde | O que acontece |
|---|---|
| `lib/modulos.ts` → `tenantModules` | descarta a chave antes de montar o menu. Cobre o tenant que já tivesse o módulo em `v_active_modules` |
| Menu lateral | sem o item *Nota Fiscal* em Gestão |
| Configurações | sem a aba *Dados fiscais*, e **sem o aviso que a citava** — um field que ninguém sente falta não precisa de legenda |
| PDV | sem o campo "CPF na nota" |
| Produtos | sem a seção fiscal (NCM, CFOP, CSOSN…) do modal |
| Equipe | *Nota Fiscal* não aparece como permissão de tipo de acesso |
| `/notas` | **404** (`app/notas/page.tsx`), não uma tela de aviso — a rota fica indistinguível de uma que nunca existiu |
| `readFiscal` / `readFiscalDocuments` | devolvem vazio sem consultar o banco |
| `recordSale` | não enfileira documento nenhum |
| Suporte | a categoria Financeiro dizia "Cobrança, plano ou nota fiscal" — virou "…ou pagamento". Ali a palavra significava a fatura DA PLATAFORMA, mas o cliente não tinha como saber disso |

**Nada foi removido.** `NotasView`, `ConfigFiscal`, a seção fiscal do
`ProdutoModal`, `lib/dados/fiscal.ts`, `lib/dados/notas.ts`, os tipos, as RPCs
e as Edge Functions estão inteiros e compilando. O que existe é uma chave numa
lista, e o desligamento é consequência dela.

**Para religar: tirar `"fiscal"` das duas listas.** É a última linha do
checklist do §8, e é literalmente isso — o resto deste documento volta a valer
sem mais nenhuma edição de código.

---

## 1. Decisões tomadas

| Decisão | Valor | Onde isso aparece |
|---|---|---|
| Provedor | **Focus NFe** | `supabase/functions/_shared/focus.ts` |
| Modelo de conta | uma conta da plataforma, emitente escolhido por `cnpj_emitente` | token em variável de ambiente da função, não por tenant |
| Cliente-piloto | não tem certificado nem CSC | tudo construído para homologação |

---

## 2. O contrato da Focus NFe

Levantado da documentação oficial em 17/08/2026. Está aqui para não precisar
ser levantado de novo.

```
base homologação   https://homologacao.focusnfe.com.br
base produção      https://api.focusnfe.com.br
prefixo            /v2
autenticação       HTTP Basic — usuário = token, SENHA VAZIA
                   Authorization: Basic base64("TOKEN:")   ← os dois-pontos são obrigatórios

emitir     POST   /v2/nfce?ref={ref}
consultar  GET    /v2/nfce/{ref}?completa=1
cancelar   DELETE /v2/nfce/{ref}     body { justificativa }   15 a 255 caracteres
webhooks   POST   /v2/hooks          body { event, url, cnpj }
```

### O achado que mudou o desenho

**A NFC-e é SÍNCRONA.** O POST já devolve o status final — `autorizado` ou
`erro_autorizacao` —, porque os webservices estaduais de NFC-e respondem na
hora. Isso é diferente da NF-e modelo 55, que é assíncrona e depende de
webhook.

Consequência: **a Edge Function `fiscal-callback` que estava no plano não
existe.** Os eventos de webhook da Focus (`nfe`, `nfce_contingencia`, `mdfe`…)
não incluem NFC-e comum. Uma função que nunca é chamada é código morto
esperando apodrecer; ela entra junto com o modelo 55.

`processando_autorizacao` ainda acontece quando a SEFAZ demora, e é para esse
resto que existe a `fiscal-retry`.

### Status da Focus → status nosso

| Focus | `fiscal_documents.status` |
|---|---|
| `autorizado` | `authorized` |
| `processando_autorizacao` | `processing` |
| `erro_autorizacao` | `rejected` |
| `cancelado` | `cancelled` |
| `denegado` | `denied` |

Um HTTP 4xx **sem** campo `status` é erro de REQUISIÇÃO (campo faltando, JSON
inválido), não recusa da SEFAZ. Ele vira `rejected` de propósito: tratá-lo como
`processing` faria a fila insistir para sempre num payload que nunca vai passar.

### Prazos e vedações que o código já respeita

- **Cancelamento de NFC-e: 30 minutos** após a autorização (varia por UF).
- **NFC-e contra CNPJ está vedada** desde 04/05/2026 (Ajuste SINIEF 43/2025) —
  venda para pessoa jurídica exige NF-e modelo 55. O `buildNfce` recusa antes
  de enviar, com a explicação em português, em vez de deixar a SEFAZ devolver
  um código numérico.
- **IBS/CBS obrigatórios para Simples e MEI em 04/01/2027.** As colunas existem
  desde a fase 1 (`trib_class`, `ibs_cst`, `cbs_cst`) e ainda **não** são
  enviadas no payload.

---

## 3. O que foi construído

### Banco — `supabase/migrations/20260817140000_fiscal_emissao.sql`

| Objeto | O que faz |
|---|---|
| `sales.customer_document` / `customer_name` | o "CPF na nota" |
| `fiscal_documents.reference` | a `ref` que vai à Focus, única para sempre — reenviá-la é o que impede nota duplicada |
| `create_sale(...)` | a venda numa transação só. **Escrita e NÃO LIGADA** — ver §5 |
| `enqueue_fiscal_document(sale_id)` | o portal pede, o banco cria a linha em `pending` |
| `fiscal_document_payload(id)` | devolve tudo que a nota precisa, com a herança dos padrões fiscais já resolvida |
| `mark_fiscal_document(...)` | a escrita de volta do resultado |

As três últimas têm `EXECUTE` revogado de `authenticated` (menos a de
enfileirar): quem grava status de nota é a Edge Function, porque "autorizado"
precisa ser afirmação da SEFAZ e não do navegador.

### Edge Functions — `supabase/functions/`

```
_shared/focus.ts   o adapter da Focus. ÚNICO arquivo que sabe que ela existe.
_shared/nfce.ts    o payload da NFC-e. Função pura, sem rede e sem banco.
_shared/db.ts      clientes service_role e do usuário, e o helper de resposta.
fiscal-emit/       emite um documento.
fiscal-retry/      resolve o que ficou no meio do caminho.
```

`fiscal-emit` aceita chamada da chave de serviço **ou** de um usuário logado —
e, no segundo caso, relê o documento com o JWT dele para provar posse. Sem
isso, um `document_id` adivinhado mandaria emitir a nota de outro comércio.

`fiscal-retry` trata `processing` **consultando** (emitir de novo criaria uma
segunda nota) e `pending` **delegando à `fiscal-emit`** (duas cópias do caminho
de emissão divergiriam na primeira correção). `rejected` fica de fora: rejeição
é falta de cadastro, e insistir sozinho nunca conserta.

### Portal — `apps/portal-client/`

| Arquivo | Mudança |
|---|---|
| `app/vendas/actions.ts` | `recordSale` grava o CPF, enfileira o documento e dispara a emissão em `after()` |
| `app/notas/` | a rota `/notas`, com a ação de reenviar |
| `components/views/NotasView.tsx` | a tela: filtros, o aviso de homologação e **o motivo da recusa na íntegra** |
| `components/views/PdvView.tsx` | o campo "CPF na nota" |
| `lib/dados/notas.ts` | vocabulário da tela |
| `lib/dados/leitura.ts` | `readFiscalDocuments` |
| `lib/rotas.ts`, `lib/dados/perfis.ts` | `fiscal` virou item de menu em Gestão e permissão de tipo de acesso |

---

## 4. As três regras que organizam esta área

**1. A venda nunca falha por causa da nota.** Se a SEFAZ caiu, se a Focus não
responde, se faltou NCM — a venda já está gravada e o documento fica com o
motivo escrito. Travar o balcão esperando o fisco é inaceitável num PDV.

**2. A nota só é enfileirada depois de os itens entrarem.** É o que fecha a
janela pior enquanto `create_sale` não está ligada: um documento fiscal de uma
venda vazia, com valor zero, enviado à SEFAZ e impossível de apagar.

**3. Quem afirma o status é a SEFAZ.** O portal só lê `fiscal_documents`; não
há policy de insert nem de update para quem tem sessão, e não há atualização
otimista em lugar nenhum desta tela.

---

## 5. O que NÃO está ligado, e por quê

### `create_sale` — escrita, não ligada

A função existe na migration e `recordSale` continua fazendo as duas escritas
em sequência. Ligar é trocar as duas por um `rpc("create_sale")`.

**Não liguei porque não há como exercitá-la contra o banco neste ambiente**, e
o erro de uma função de criação de venda aparece como venda perdida no balcão.
É uma linha de mudança e um teste; não é trabalho, é acesso.

### Cancelamento e a ramificação do estorno

`FocusNfe.cancel()` existe e ninguém a chama. `refundSale` e `editSale`
continuam como estavam — e `editSale` estorna e recria, o que **fica ilegal
assim que houver nota autorizada**: documento autorizado só admite cancelamento
(30 min), carta de correção ou NF-e de devolução.

Isso é entrega própria, e só passa a importar quando existir a primeira nota
autorizada de verdade. Está registrado aqui para não ser esquecido.

### NFS-e, NF-e modelo 55 e IBS/CBS

Fora do escopo desta fase. `enqueue_fiscal_document` já ignora vendas só de
serviço, e `buildNfce` já recusa venda para CNPJ explicando o motivo — os dois
caminhos existem, o que falta é o documento do outro lado.

---

## 6. Para ligar tudo — o passo a passo

### 6.1 Fora do portal (é o que demora)

1. **Certificado digital A1 e-CNPJ** no CNPJ do cliente. ~R$ 200/ano, vale 12
   meses, a emissão leva dias porque exige validação por videoconferência.
   **É exigido também em homologação** — a SEFAZ valida a assinatura do XML nos
   dois ambientes. É o caminho crítico.
2. **Credenciamento de NFC-e** na SEFAZ do estado + **gerar o CSC de
   homologação**. Depende do passo 1.
3. **Conta na Focus NFe**, upload do certificado lá, e pegar os dois tokens
   (homologação e produção).
4. **Contador** define regime, CFOP, CSOSN e o NCM padrão. Este pode ser
   adiantado agora, na aba Configurações › Dados fiscais.

### 6.2 No banco

```
1. rodar 20260817120000_fiscal_cadastro.sql   (fase 1, se ainda não rodou)
2. rodar 20260817140000_fiscal_emissao.sql    (esta fase)
```

Não há CLI do Supabase configurada no repositório (`supabase/` só tem
`migrations/` e `functions/`), então a execução é manual no painel, como as
anteriores.

### 6.2-b Religar o módulo no código — a ÚNICA edição que falta

Enquanto isto não for feito, o módulo não existe para ninguém: ele não aparece
na ficha do cliente do portal-admin (então não há como ligar para o tenant) e
o portal-client o esconde inteiro. Ver §0.

```
apps/portal-admin/lib/planos.ts    COMING_SOON_MODULES = ["fiscal"]  →  []
apps/portal-client/lib/modulos.ts  COMING_SOON_MODULES = ["fiscal"]  →  []
```

Depois disso, `fiscal` volta ao catálogo vendável e a ficha do cliente no
portal-admin passa a oferecer o módulo — é ali que ele se liga para o tenant.

**Faça isto por último, e só depois do 6.1 e do 6.3.** Religar antes do
certificado devolve ao cliente uma tela `/notas` que aceita vendas e acumula
documentos `pending` que ninguém emite.

### 6.3 Nas Edge Functions

Variáveis a configurar (Supabase › Edge Functions › Secrets):

```
FOCUS_NFE_TOKEN_HOMOLOGATION=...
FOCUS_NFE_TOKEN_PRODUCTION=...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são
injetadas automaticamente pelo Supabase — não precisam ser cadastradas.

Deploy:

```
supabase functions deploy fiscal-emit
supabase functions deploy fiscal-retry
```

E um agendamento para a `fiscal-retry` (cron do Supabase), a cada 10 ou 15
minutos. Ela processa no máximo 25 documentos por execução e desiste de um
documento depois de 8 tentativas.

### 6.4 O primeiro teste, em ordem

0. Módulo `fiscal` fora das duas listas (§6.2-b) e ligado para o tenant na
   ficha do cliente do portal-admin.
1. Cadastro fiscal completo, **em homologação**, com CSC de homologação.
2. NCM padrão do negócio preenchido (ou NCM nos produtos).
3. Registrar uma venda de um produto.
4. Abrir `/notas`. O esperado é a nota aparecer em **Na fila** e virar
   **Autorizada** em segundos — ou **Recusada** com o motivo da SEFAZ escrito.
5. Só depois de uma autorização em homologação, trocar para produção. O
   servidor recusa a troca com o cadastro incompleto (`saveFiscalData`).

---

## 7. Limitações conhecidas

| O quê | Detalhe |
|---|---|
| **Sem contingência offline** | Sem internet, a venda é gravada e a nota sai depois. A contingência de verdade exige assinar localmente, o que o modelo "certificado no provedor" não permite. Precisa estar no contrato com o cliente. |
| **Uma forma de pagamento por venda** | `sales.payment_method` é uma coluna só. Venda dividida entre Pix e dinheiro sai na nota como uma forma só. |
| **Sem desconto** | Nem `sales` nem `sale_items` têm coluna de desconto; o payload manda `valor_bruto` sem `valor_desconto`. |
| **CSOSN complexos** | O payload cobre o caso comum (tributação normal do Simples). CSOSN 201/202/500 pedem grupos de ICMS-ST que ainda não são montados. |
| **Venda mista** | Carrinho com produto e serviço gera a NFC-e só das mercadorias. A NFS-e do serviço não existe. |
| **Edge Functions sem typecheck** | Não há Deno neste ambiente; o TypeScript delas não foi compilado. `deno check supabase/functions/**/*.ts` antes do primeiro deploy. |

---

## 8. Checklist para concluir a feature

Está na ordem em que precisa ser feito. Os quatro primeiros não dependem de
código e são o que demora — comece por eles.

**Fora do repositório**

- [ ] Certificado digital A1 e-CNPJ comprado (~R$ 200/ano, leva dias) — §6.1
- [ ] Credenciamento de NFC-e na SEFAZ do estado + CSC de homologação — §6.1
- [ ] Conta na Focus NFe, certificado enviado lá, os dois tokens em mãos — §6.1
- [ ] Contador definiu regime, CFOP, CSOSN e NCM padrão — §6.1

**Infraestrutura**

- [ ] `20260817120000_fiscal_cadastro.sql` rodada no painel do Supabase — §6.2
- [ ] `20260817140000_fiscal_emissao.sql` rodada no painel do Supabase — §6.2
- [ ] `deno check supabase/functions/**/*.ts` (nunca foram compiladas) — §7
- [ ] Secrets `FOCUS_NFE_TOKEN_HOMOLOGATION` / `_PRODUCTION` — §6.3
- [ ] `fiscal-emit` e `fiscal-retry` deployadas — §6.3
- [ ] Cron da `fiscal-retry` a cada 10–15 min — §6.3

**Religar o módulo** (a única edição de código obrigatória)

- [ ] Esvaziar `COMING_SOON_MODULES` nos dois arquivos — §6.2-b
- [ ] Ligar o módulo `fiscal` para o tenant, na ficha do cliente do
      portal-admin (só aparece lá depois do item acima)

**Validar**

- [ ] Cadastro fiscal completo em **homologação**, com o CSC de homologação
- [ ] Primeira nota **autorizada** em homologação — §6.4
- [ ] Trocar para produção (o servidor recusa a troca com cadastro incompleto)

**Entrega própria, depois da primeira nota autorizada**

- [ ] **Ligar `create_sale`** em `recordSale` — hoje são duas escritas em
      sequência, e a função existe pronta na migration — §5
- [ ] Ramificar `refundSale` / `editSale` para cancelamento: `editSale` estorna
      e recria, o que **fica ilegal** com nota autorizada em jogo — §5
- [ ] Rever as limitações do §7 com o contador (sem contingência offline, uma
      forma de pagamento por venda, sem desconto, CSOSN 201/202/500)
