# Emissão de nota fiscal da venda — levantamento

Levantamento de como o Aguiar One pode passar a emitir documento fiscal da
venda registrada no portal e no app. Feito lendo o código real (`portal-client`,
`portal-admin`, `mobile`, `supabase/migrations`) e a legislação vigente em
agosto de 2026.

Conclusão curta: **o trabalho de código é a menor parte.** O que trava a
emissão é cadastro (dados fiscais que o banco não tem), habilitação do cliente
na SEFAZ, e uma decisão de produto sobre estorno de venda que hoje o portal faz
de um jeito que a nota torna ilegal.

---

## 1. Escopo — qual nota estamos falando

"Emitir nota do produto vendido pelo sistema" pode ser quatro coisas
diferentes. Elas não compartilham quase nada além do certificado digital.

| Documento | Quando | Quem emite | Situação aqui |
|---|---|---|---|
| **NFC-e** (modelo 65) | venda presencial a consumidor final (o balcão) | o cliente (tenant) | **é este o alvo** |
| **NF-e** (modelo 55) | venda para CNPJ, entrega em outro município/UF | o cliente (tenant) | necessária cedo — ver §5 |
| **NFS-e** (municipal) | serviço prestado | o cliente (tenant) | o catálogo já tem `products.is_service` |
| **NFS-e da plataforma** | mensalidade do SaaS (`platform_payments`) | a Aguiar One | escopo separado, não tratado aqui |

Dois pontos que costumam passar batido:

**1. Venda mista gera dois documentos.** O catálogo tem `is_service` (banho,
consulta — o petshop que já está no banco vive disso). Serviço **não** entra em
NFC-e: vai em NFS-e, que é municipal, com regra e layout próprios de cada
prefeitura. Um carrinho com ração + banho vira uma NFC-e e uma NFS-e. Se o
plano é atender petshop e salão, isso não é fase 4 — é requisito.

**2. Quem emite é o cliente, não a plataforma.** Cada nota sai no CNPJ do
comércio, assinada com o certificado dele, sob credenciamento dele na SEFAZ do
estado dele. A Aguiar One é intermediária. Isso muda tudo no onboarding e é a
razão de §4 existir.

---

## 2. O que o sistema já tem

O caminho da venda está inteiro e é curto — bom sinal:

| Peça | Onde | O que faz |
|---|---|---|
| PDV | `apps/portal-client/app/vendas/nova` | carrinho, forma de pagamento |
| Gravação | `app/vendas/actions.ts` › `recordSale` | insere `sales` + `sale_items` |
| Leitura | `lib/dados/leitura.ts` | única fronteira banco → portal |
| Vocabulário | `lib/dados/vendas.ts` | `PAYMENT_DB`, `SALE_STATUS` |
| Módulos | `lib/modulos.ts`, tabela `modules` | menu e telas montam pelo plano |
| Venda no app | `apps/mobile/src/domain/sales` | fila offline em SQLite, já transacional |

Duas coisas dessa lista são ativos diretos para o fiscal:

- **O catálogo de módulos é dado, não código** (`modules` + `tenant_modules` +
  `v_active_modules`). Criar um módulo `fiscal` vendável é inserir uma linha e
  mapear a chave em `lib/modulos.ts` — não é refatoração.
- **O mobile já tem fila offline com transação** (`offlineQueueApi.ts`). A
  emissão fiscal precisa exatamente do mesmo padrão: a venda acontece agora, o
  documento sobe quando der. O desenho já existe no repositório.

---

## 3. O que falta no banco

Nenhuma tabela hoje tem campo fiscal. O levantamento abaixo é o mínimo para a
SEFAZ aceitar uma NFC-e.

### 3.1 `tenants` — o emitente

Hoje: `id, name, segment, status, plan, monthly_fee, city, phone, created_at`.

Falta tudo que identifica o emitente:

- `cnpj` (ou CPF, para MEI pessoa física), `inscricao_estadual`, `inscricao_municipal`
- `crt` — regime tributário (1 Simples, 2 Simples excesso de sublimite, 3 Normal, 4 MEI). Define se o item leva CSOSN ou CST.
- endereço fiscal completo: logradouro, número, complemento, bairro, CEP, município + **código IBGE do município**, UF. O código IBGE não é opcional: é ele que vai no XML, não o nome da cidade.
- `fiscal_ambiente` — `homologacao` | `producao`. Cliente novo começa em homologação, sempre.
- `csc_id` + `csc_token` — o Código de Segurança do Contribuinte, obtido no portal da SEFAZ do estado. **Só a NFC-e usa** (é o que assina o QR Code). Sem CSC não há emissão.
- `nfce_serie` / `nfe_serie` — série por ponto de emissão.

> A pendência já registrada em `docs/api/portal-client-pendencias.md` §3.3
> ("Documento e endereço — colunas em `tenants`") é a primeira parcela disto.
> Vale fazer as duas de uma vez, com o layout fiscal em mente, em vez de criar
> uma coluna `cnpj` solta agora e migrar de novo depois.

**Segredo:** `csc_token` é senha. Não pode ficar legível numa tabela que o
portal lê sob RLS. Ou vai em `vault` do Supabase, ou fica no provedor (ver §6),
que é a saída recomendada.

### 3.2 `products` — o item

Hoje: `id, name, price, cost, category, barcode, unit, is_service, is_favorite, is_active, stock_quantity, stock_min, tracks_stock`.

Falta:

| Campo | Por quê |
|---|---|
| `ncm` (8 dígitos) | obrigatório em todo item. Sem ele a nota é rejeitada. |
| `cest` | obrigatório quando o produto está em substituição tributária |
| `origem` (0–8) | nacional, importado direto, importado do mercado interno… |
| `unidade_comercial` | `unit` hoje é texto livre ("un", "kg", "pacote"). O XML aceita, mas a unidade tributável precisa ser coerente. |
| `gtin` | o `barcode` atual **não serve**: a SEFAZ valida dígito verificador de GTIN-8/12/13/14. Código interno de balança quebra a nota. Precisa de coluna própria, com "SEM GTIN" como valor válido. |
| `cfop_padrao` | 5102 na maioria das vendas em UF, mas varia |
| `csosn` (Simples) / `cst_icms` (Normal) | qual tributação o item recebe |
| `cst_pis`, `cst_cofins` | idem |

E, a partir de 04/01/2027 para Simples Nacional (§5): `cClassTrib`, `CST-IBS`,
`CST-CBS`.

> **Nada disso é decisão de desenvolvedor.** NCM, CFOP e CSOSN de cada produto
> são definidos pelo contador do cliente. O sistema precisa de um **perfil
> fiscal padrão por tenant** (a maioria dos produtos de um petshop cai no mesmo
> conjunto) e exceção por produto — senão o cliente cadastra 400 produtos à mão
> e desiste no vigésimo.

### 3.3 `sales` e `sale_items` — a operação

Hoje `sales` tem `id, tenant_id, user_id, total, payment_method, status, sold_at`.

Falta:

- `customer_document` — o "CPF na nota". É o campo mais visível para o consumidor final e o PDV não tem onde pedir.
- `customer_name`, e o endereço completo **quando for NF-e** (modelo 55 exige destinatário identificado).
- desconto (em `sales` e em `sale_items`) — o XML separa `vDesc` por item; hoje o portal não tem desconto nenhum.
- pagamento detalhado: a NFC-e exige o grupo `pag` com forma (`tPag`), valor e troco. `payment_method` único não cobre venda dividida entre Pix e dinheiro. Se venda dividida não é caso de uso, tudo bem — mas é uma decisão, não um esquecimento.

### 3.4 Tabelas novas

```
fiscal_documents
  id, tenant_id, sale_id, modelo (55|65|nfse), ambiente,
  serie, numero, chave_acesso, status, protocolo, autorizada_em,
  motivo_rejeicao, xml_url, danfe_url, provider_ref, tentativas, created_at

fiscal_events
  id, tenant_id, document_id, tipo (cancelamento|carta_correcao|inutilizacao),
  justificativa, protocolo, status, created_at
```

`status` em `fiscal_documents` é o coração: `pendente`, `processando`,
`autorizada`, `rejeitada`, `cancelada`, `denegada`. A tela de notas do portal é
uma leitura dessa tabela, e a fila de retentativa também.

---

## 4. O que não é código (e é o que realmente demora)

Para o primeiro cliente emitir a primeira nota, alguém precisa, **por cliente**:

1. **Certificado digital e-CNPJ A1** — arquivo `.pfx` + senha, ~R$ 180 a R$ 235/ano, validade 12 meses. Vence e para de emitir; precisa de alerta de vencimento no admin.
2. **Credenciamento na SEFAZ do estado** para NFC-e, e geração do **CSC** no portal estadual. Feito pelo contribuinte, com certificado, no site da SEFAZ. Não tem API.
3. **Homologação antes de produção** — emitir notas de teste no ambiente de homologação até a SEFAZ liberar produção.
4. **Definição fiscal pelo contador** — regime, CSOSN/CST padrão, CFOP, NCM do catálogo.

Esse é o gargalo real. Um cliente que já emite NFC-e hoje (tem certificado, CSC
e contador) entra em minutos; um que nunca emitiu leva semanas, e nada disso
depende de você. **Vale escolher o cliente-piloto entre os que já emitem.**

Consequência de produto: o onboarding fiscal precisa ser uma tela de
Configurações com estado ("faltam 3 passos"), não um formulário que salva e
some. E o admin precisa ver, por cliente, em que passo ele está.

---

## 5. O relógio da reforma tributária

A Nota Técnica 2025.002 (RTC) acrescentou ao layout da NF-e e da NFC-e os
grupos de IBS, CBS e IS, com novos códigos (`CST-IBS`, `CST-CBS`, `cClassTrib`).

| Regime | Campos IBS/CBS obrigatórios em produção |
|---|---|
| Normal (Lucro Real/Presumido) | **desde 03/08/2026** — já em vigor |
| **Simples Nacional e MEI** | **04/01/2027** |

O público deste SaaS é Simples e MEI, então a régua é **janeiro de 2027 — cerca
de cinco meses.** Dá tempo, mas define duas coisas:

- Construir agora já contando com esses campos evita uma segunda migração em dezembro.
- É o argumento mais forte contra escrever emissor próprio (§6): a NT 2025.002 já teve mais de trinta versões, e cada uma é retrabalho de quem monta o XML na mão.

Duas mudanças já valendo, independentes da reforma:

- **NFC-e para CNPJ está vedada** (prorrogada por Ajuste SINIEF 43/2025 para 04/05/2026 — já passou). Venda para pessoa jurídica **precisa de NF-e modelo 55**. Se um dos clientes vende para outro comércio, o modelo 55 não é fase 4, é fase 2.
- **São Paulo** tornou a NFC-e obrigatória para todo o varejo em 2026.

---

## 6. Provedor de emissão — não escreva o emissor

Emitir por conta própria significa manter: montagem e validação do XML contra
schema, assinatura XSLT/XMLDSig com o certificado, comunicação SOAP com 27
SEFAZ diferentes, QR Code da NFC-e, DANFE em PDF, eventos de cancelamento e
inutilização, contingência offline, e o acompanhamento de cada nota técnica.
Não é o negócio do Aguiar One.

Provedores com API REST que cobrem NFC-e + NF-e + NFS-e e **guardam o
certificado por você** (o que tira do seu banco o maior risco de segurança do
projeto):

| Provedor | Observação |
|---|---|
| **Focus NFe** | preço público e plano específico de varejo — ver abaixo |
| **PlugNotas (TecnoSpeed)** | forte em suporte a desenvolvedor; herdeiro dos componentes clássicos |
| **Nuvem Fiscal** | API REST enxuta, documentação boa, cobrança por nota |
| **eNotas / NFE.io** | mais orientados a NFS-e e produto digital |

Preços públicos da Focus NFe, como régua de ordem de grandeza:

- **Varejo (NFC-e)**: R$ 59,90/mês — 1 CNPJ, 500 NFC-e + 100 NF-e, R$ 0,05 por NFC-e extra
- **Varejo+**: R$ 629,90/mês — CNPJs ilimitados, 9.000 NFC-e + 1.000 NF-e
- **Solo**: R$ 89,90/mês — 1 CNPJ, 100 notas
- **Growth**: R$ 548,00/mês — CNPJs ilimitados, 4.000 notas

Isso decide o modelo comercial: **um plano multi-CNPJ na plataforma** (você
absorve, repassa no preço do módulo) é bem mais barato por cliente do que uma
conta por cliente, a partir de umas dez lojas. Mas amarra todos os clientes a
um provedor — o que reforça a próxima seção.

**Isole o provedor atrás de uma interface.** O padrão Adapter que o app mobile
já usa (`salesApi` como única fronteira externa do domínio) serve exatamente
para isso: um `fiscalApi` que fala com o provedor, um `fiscalAdapter` que
traduz, e nada acima disso sabendo qual provedor é. Trocar de provedor, ou usar
dois, vira substituir um arquivo.

---

## 7. Onde o código roda

`docs/architecture/arquitetura-monorepo.md` §5 recomenda evitar backend próprio
e usar Edge Functions. A emissão fiscal é o caso concreto que testa essa regra,
porque precisa de três coisas que o portal não tem:

1. **Segredo** — o token do provedor não pode chegar ao navegador do balcão.
2. **Assincronia** — a SEFAZ pode levar segundos ou estar fora do ar. A venda não pode esperar.
3. **Webhook** — o provedor devolve a autorização depois, num POST que precisa de endereço público.

Recomendação: **Edge Functions do Supabase**, não `apps/api`.

```
supabase/functions/
  fiscal-emit/       ← recebe sale_id, monta o payload, chama o provedor
  fiscal-callback/   ← webhook do provedor: atualiza fiscal_documents
  fiscal-retry/      ← cron: reprocessa 'pendente' e 'processando' antigos
```

`apps/api` hoje é o scaffold vazio do NestJS. O doc de arquitetura já pergunta
se ela deveria existir; três Edge Functions não justificam manter um serviço
Node com deploy, monitoramento e custo próprios. **Ou este projeto lhe dá um
propósito, ou é hora de apagá-la** — vale decidir junto com esta fase.

### O fluxo

```
recordSale()  →  sales + sale_items          (síncrono, como hoje)
              →  fiscal_documents 'pendente' (síncrono, uma linha)
              →  invoke fiscal-emit          (dispara e não espera)

fiscal-emit   →  provedor  →  SEFAZ
fiscal-callback ← provedor →  status = autorizada | rejeitada
```

**A venda nunca falha por causa da nota.** Se a SEFAZ está fora, a venda está
gravada e o documento fica `pendente` — o `fiscal-retry` resolve. O contrário
(travar o balcão esperando a SEFAZ) é inaceitável num PDV.

O limite honesto disso: **não é contingência offline de verdade.** A contingência
offline da NFC-e exige assinar o documento localmente, entregar o DANFE ao
cliente na hora e transmitir até o primeiro dia útil seguinte — isso só funciona
com o certificado no aparelho, o que o modelo "provedor guarda o certificado"
não permite. Para a v1, a decisão razoável é: sem internet, a venda é gravada e
a nota sai depois; o consumidor recebe o comprovante não-fiscal. Precisa estar
escrito no contrato com o cliente, porque é uma limitação real.

---

## 8. O impacto no código atual — o achado crítico

`app/vendas/actions.ts` implementa correção de venda assim:

```ts
// editSale: "Editar é substituir: a venda antiga é estornada e uma nova entra
// no lugar."
export async function editSale(...) {
  const refund = await refundSale(vendaId);
  return recordSale(items, payment);
}
```

Isso é impecável enquanto a venda é só um registro interno. **Com nota
autorizada, deixa de ser.** Um documento fiscal autorizado não é apagável nem
editável; ele só admite:

- **cancelamento**, dentro do prazo da UF (geralmente 30 minutos após a autorização da NFC-e, e só se a mercadoria não circulou);
- **carta de correção**, que não serve para valor nem para item;
- **NF-e de devolução** (entrada), depois do prazo — que é um documento novo, com CFOP de devolução.

Ou seja: `refundSale` e `editSale` precisam consultar `fiscal_documents` antes
de agir e ramificar em três caminhos. Estornar uma venda de 40 minutos atrás
com nota autorizada e simplesmente marcar `status = 'refunded'` deixa o cliente
com receita declarada que não existe — e quem descobre é o contador dele, meses
depois.

Outros pontos de contato, em ordem de esforço:

| Arquivo | Mudança |
|---|---|
| `app/vendas/actions.ts` | enfileirar documento; ramificar estorno/edição (acima) |
| `app/vendas/nova/page.tsx` | campo "CPF na nota", e desconto se entrar no escopo |
| `lib/dados/leitura.ts` | ler `fiscal_documents` junto com a venda |
| `types/types.ts` | `FiscalDocument`, `FiscalStatus`; `Product` ganha os campos fiscais |
| `lib/modulos.ts` | nova `ModuleKey` `"fiscal"` no mapa e na `ORDER` |
| `components/views/ProdutosView.tsx` | aba fiscal do produto |
| `components/views/ConfigView.tsx` | Configurações › Dados fiscais (substitui o aviso de §3.3 do doc de pendências) |
| `apps/mobile/src/domain/sales` | mesma enfileiração, aproveitando a fila offline existente |
| `portal-admin` | módulo `fiscal` no catálogo, preço, e painel de onboarding fiscal por cliente |

E uma dívida já conhecida vira bloqueante: **`recordSale` não é transacional.**
Hoje, uma venda sem itens é um incômodo no relatório. Com nota, é um documento
fiscal de R$ 0,00 ou de valor errado enviado à SEFAZ. A função `create_sale`
citada em `docs/api/portal-client-pendencias.md` §3.2 passa a ser pré-requisito,
não melhoria.

---

## 9. Fases sugeridas

**Fase 0 — decisões (sem código)**
Escolher provedor e fazer conta de teste; decidir se `fiscal` é módulo pago e
por quanto; escolher o cliente-piloto (de preferência um que já emita NFC-e
hoje); confirmar com um contador o perfil fiscal padrão do segmento.

**Fase 1 — cadastro fiscal (não emite nada)**
Migração com as colunas de §3.1 e §3.2 e as tabelas de §3.4; `create_sale`
transacional; telas de Dados fiscais e da aba fiscal do produto; validação de
CNPJ, NCM e GTIN; perfil fiscal padrão do tenant com exceção por produto;
importação de NCM em massa (o admin já tem `produtosCsv.ts`).
*Entrega valor sozinha: resolve a pendência de documento/endereço e prepara o
catálogo. Nada quebra se a fase 2 atrasar.*

**Fase 2 — piloto em homologação**
`fiscal-emit`, `fiscal-callback`, `fiscal-retry`; adapter do provedor;
`fiscal_documents` gravando; NFC-e de venda simples com DANFE e QR Code; CPF na
nota no PDV; tela "Notas" no portal.

**Fase 3 — produção**
Cancelamento dentro do prazo; ramificação de estorno/edição (§8); reenvio do
DANFE por WhatsApp (o `platform_whatsapp_contact` já existe); alerta de
vencimento de certificado; painel no admin.

**Fase 4 — cobertura**
NF-e modelo 55 para venda a CNPJ; NFS-e para `is_service`; campos IBS/CBS
**antes de 04/01/2027**.

---

## 10. Decisões em aberto

1. **Conta única da plataforma no provedor, ou uma por cliente?** Muda o preço, o contrato e quem é o titular do relacionamento.
2. **Certificado no provedor ou no seu Storage?** No provedor é mais seguro e mais simples; no seu, é o que viabilizaria contingência offline um dia.
3. **`fiscal` é módulo pago ou item do plano caro?** Tem custo variável por nota — é o primeiro módulo do produto com essa característica, e o financeiro do admin não modela isso hoje.
4. **Venda dividida em duas formas de pagamento entra no escopo?** Muda o modelo de `sales`.
5. **`apps/api` fica ou sai?** Esta fase é a última chance de lhe dar um propósito.
6. **NFS-e entra na v1?** Se o alvo é petshop e salão, metade do faturamento do cliente é serviço.

---

## 11. Custo estimado por cliente

| Item | Valor |
|---|---|
| Certificado A1 e-CNPJ | R$ 180 – 235 / ano |
| Provedor (conta individual, varejo) | a partir de ~R$ 60 / mês |
| Provedor (plano multi-CNPJ rateado, a partir de ~10 lojas) | ~R$ 63 / mês por loja, caindo com a escala |
| Credenciamento na SEFAZ e CSC | gratuito, mas manual |
| Contador (perfil fiscal) | do cliente |

---

## 12. Status — Fase 1 construída (17/08/2026)

O cadastro fiscal está no código. **Nada emite nota ainda** — é o que a fase 1
prometia: o lugar onde os dados moram e as telas para preenchê-los.

### O que entrou

| Onde | O quê |
|---|---|
| `supabase/migrations/20260817120000_fiscal_cadastro.sql` | `tenant_fiscal_settings`, `fiscal_credentials`, `fiscal_documents`, `fiscal_events`, colunas fiscais em `products`, módulo `fiscal` no catálogo, e a **política de UPDATE de `tenants` que faltava** |
| `lib/dados/fiscal.ts` | tabelas de códigos (CRT, CSOSN, CST, CFOP, origem), validadores de CNPJ/CPF/NCM/CEST/CFOP/CEP/IBGE/GTIN, e a lista de pendências |
| `components/views/ConfigFiscal.tsx` | a aba **Configurações › Dados fiscais** |
| `components/modais/ProdutoModal.tsx` | a seção fiscal do produto, com herança do padrão do negócio |
| `app/configuracoes/actions.ts` | `saveFiscalData`, com a trava de produção no servidor |
| `app/produtos/actions.ts` | validação fiscal do produto |

### Três decisões que valem registro

**1. Os dados do emitente NÃO foram para `tenants`,** como a análise de
pendências supunha, e sim para `tenant_fiscal_settings`. `tenants` é escrita
pelo admin e guarda `plan`, `monthly_fee` e `status` — colunas que o cliente
não pode tocar. Como a proteção disso é um GRANT por coluna, cada coluna nova
ali significaria mexer no GRANT de novo, e uma coluna esquecida na lista vira
uma tela que grava no vazio. Que é exatamente o bug que esta migration
conserta.

**2. O CSC ficou numa tabela que o portal não lê.** `fiscal_credentials` não
tem policy de select para quem tem sessão; grava-se por uma função
`security definer`, e o portal só enxerga a view
`v_fiscal_credentials_status`, que devolve booleano. O campo do token aparece
sempre vazio na tela, e vazio significa "mantém o que está gravado" — o portal
nunca recebeu o valor para poder devolvê-lo.

**3. Campo fiscal vazio no produto quer dizer "usa o padrão do negócio",** não
"faltando". Um petshop com 400 itens cai quase todo no mesmo NCM e no mesmo
CSOSN; sem herança, o cadastro fiscal seria 400 formulários e ninguém passaria
do vigésimo. O modal mostra o padrão herdado como placeholder e escreve
"herdando 102 do negócio" embaixo — preencher o campo com uma cópia congelaria
o valor e mudar o padrão depois deixaria de valer.

### Para ligar num ambiente

1. **Rodar a migration** no projeto Supabase. Não há CLI configurada no
   repositório (`supabase/` só tem `migrations/`), então é execução manual no
   painel, como as anteriores.
2. **Ligar o módulo `fiscal`** para o tenant, na ficha do cliente do
   portal-admin. A migration cadastra o módulo no catálogo e **não o liga para
   ninguém** — quem tem custo por nota é decisão comercial.
3. Sem os dois passos, a aba não aparece: o portal esconde de quem não tem o
   módulo, que é o comportamento correto.

> A migration **não foi executada contra o banco real** nesta entrega — não há
> credencial neste ambiente. O TypeScript compila e o `next build` passa, mas o
> primeiro `select` de `tenant_fiscal_settings` só é exercitado quando ela
> rodar.

### A fase 2 começou

Ver **`fase-2-emissao.md`**: o adapter da Focus NFe, as Edge Functions de
emissão e retentativa, o enfileiramento na venda, o "CPF na nota" e a tela
`/notas`. Continua sem emitir — falta certificado, credenciamento e conta no
provedor, e nenhum dos três depende de código.

Um achado de lá que corrige o §7 deste documento: **a NFC-e é síncrona na
Focus**, então a Edge Function `fiscal-callback` prevista não existe. Webhook
só faz sentido para a NF-e modelo 55.

### O que a fase 1 deixou de fora, de propósito

- **`create_sale` transacional.** Escrita na migration da fase 2 e ainda **não
  ligada**, pelo mesmo motivo: mexer no caminho da venda pede o banco à mão
  para testar. Enquanto isso, a venda continua sendo duas escritas em sequência
  — mas a nota só é enfileirada depois de os itens entrarem, o que fecha a
  janela pior.
- **Importação de NCM em massa.** O `produtosCsv.ts` do admin já é o esqueleto;
  faz mais sentido depois de o primeiro cliente ter um perfil fiscal real.
- **NFS-e para `is_service`.** O modal já avisa que serviço não sai em NFC-e, em
  vez de mostrar campos que a nota dele não usa.

---

## Fontes

- [NT 2025.002 IBS/CBS/IS — novos grupos e regras (TecnoSpeed)](https://blog.tecnospeed.com.br/nota-tecnica-reforma-tributaria-nfe-nfce/)
- [Reforma Tributária do Consumo — adequações NF-e/NFC-e (Portal da NF-e)](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=AklZnck3o6I%3D)
- [Campos IBS/CBS obrigatórios em janeiro de 2026 (SEFAZ/AM)](https://www.sefaz.am.gov.br/noticias/31893)
- [NFC-e não poderá mais ser emitida para CNPJ (Focus NFe)](https://focusnfe.com.br/blog/nfce-nao-podera-mais-ser-emitida-para-cnpj/)
- [Vedação da NFC-e contra CNPJ adiada para 2026 (Contábeis)](https://www.contabeis.com.br/noticias/73322/vedacao-da-nfc-e-contra-cnpj-e-adiada-para-2026/)
- [NFC-e obrigatória em SP em 2026 (Certisign)](https://certisign.com.br/blog/nfc-e-obrigatoria-sp)
- [Credenciamento e CSC da NFC-e (SEFAZ/MS)](https://www.catalogo.sefaz.ms.gov.br/nota-fiscal-de-consumidor-eletronica-nfc-e-credenciamento-e-csc/)
- [Padrões técnicos de contingência off-line NFC-e (Portal da NF-e)](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=fMhAfsQfE+M%3D)
- [Planos e preços Focus NFe](https://focusnfe.com.br/precos/)
- [Documentação da API de NFC-e (Nuvem Fiscal)](https://dev.nuvemfiscal.com.br/docs/nfce/)
- [PlugNotas / TecnoSpeed — API de NF-e](https://tecnospeed.com.br/en/plugdfe/nfe/)
- [Valor do certificado digital A1 e A3 em 2026 (Omie)](https://www.omie.com.br/blog/qual-e-o-valor-do-certificado-digital-a1-e-a3-em-2026/)
