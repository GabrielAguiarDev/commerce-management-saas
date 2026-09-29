# Suporte em tempo real — Realtime e push notification

Planejado em 21/09/2026. **Fase 1 implementada em 28/09/2026** (código no
projeto e testes passando; falta a validação em ambiente — ver
[§1.5](#15-pronto-quando)). **Fase 2 não começou.**

Até a fase 1, uma resposta nova no chamado só aparecia depois de recarregar a
tela (ou, no app, puxar para atualizar). Este documento organiza o trabalho em
duas fases, na ordem em que devem ser feitas.

| Fase | O que entrega | Onde | Depende de | Estado |
| --- | --- | --- | --- | --- |
| 1. Realtime | Mensagem nova aparece sozinha com a tela aberta | App, portal do cliente, portal admin | Uma migration | **Feita** (28/09/2026) |
| 2. Push notification | Aviso no celular com o app fechado ou em segundo plano | Só o app | Fase 1 concluída; credenciais Apple/Google; novo build | Não começou |

---

## Decisão: Supabase Realtime, não um websocket próprio

| Opção | Por que não / por que sim |
| --- | --- |
| Websocket próprio | Exigiria servidor, autenticação, reconexão, escala e deploy novos — tudo o que o Supabase já entrega. |
| **Supabase Realtime (Postgres Changes)** | **Escolhida.** É websocket gerenciado, respeita o RLS das tabelas (o cliente só recebe eventos do próprio negócio; o admin, de todos) e não pede servidor novo. |
| Polling (`refetchInterval`) | Atraso de segundos e consulta constante. Fica só como rede de segurança da reconexão. |
| Push notification | Não substitui o Realtime: cobre o app **fechado**, que nenhuma das outras cobre. É a fase 2. |

Estado do banco antes da fase 1: a publicação `supabase_realtime` existia, mas
**nenhuma tabela** estava nela (`schema_producao.sql`, linha ~4109). Desde
`20260928000000_support_realtime.sql`, `support_messages` e `support_tickets`
estão na publicação. Nenhuma tela faz polling.

### A regra que vale para as duas fases

**Uma tradução só da linha do banco.** A mensagem pode chegar por dois
caminhos: pelo SELECT de sempre ou pelo payload do evento. Os dois passam pela
mesma função (`toMessageAPI` no app) e pelo mesmo adapter. Ninguém monta a
mensagem "do seu jeito" a partir do evento.

> Até 29/09/2026 a regra era mais estrita — "o evento só avisa, quem recebe
> relê" — porque o `postgres_changes` já cobrava uma checagem de RLS por
> inscrito e o GET extra não pesava. Com o Broadcast (abaixo) o payload já vem
> autorizado, e reler seria jogar fora o que chegou.

### Escala: Broadcast do banco, não `postgres_changes` (29/09/2026)

`postgres_changes` confere o RLS da linha **para cada inscrito, em série**, a
cada mudança. Com N clientes conectados, uma mensagem custa N checagens — é o
limite que a própria Supabase aponta para esse modo.

Desde `20260929000000_support_broadcast.sql`:

- um **trigger** em `support_messages` (INSERT) e `support_tickets` (INSERT e
  UPDATE de `status`/`last_message_at`) chama `realtime.send` uma vez por
  tópico, com a linha no payload;
- **tópicos privados**: `support:tenant:<tenant_id>` (app e portal do
  cliente) e `support:admin` (console);
- a **autorização acontece uma vez, na entrada do canal**: a policy
  `support_broadcast_receive` em `realtime.messages` deixa entrar o membro
  ativo daquele negócio, ou `is_platform_admin()` no tópico da plataforma —
  a mesma regra de leitura das tabelas. Não há policy de INSERT: cliente
  nenhum publica nesses tópicos;
- `realtime.send` nunca derruba a escrita: falhar em avisar não desfaz a
  mensagem.

**App:** um canal só por sessão (`supportRealtime.subscribeToSupport`),
compartilhado por contagem de ouvintes — o `supabase.channel(topic)` devolve o
canal existente com o mesmo tópico, então dois canais "separados" seriam o
mesmo, e fechar a conversa derrubaria o do shell. A conversa aberta põe a
mensagem do payload direto no cache (`appendMessage`, sem repetir pelo `id`;
a resposta do próprio cliente volta pela mutação e pelo canal). A lista de
chamados ainda é relida por evento: ordem, resumo e "não lida" dependem de
várias mensagens.

**Portais:** mesmos tópicos, mas continuam em `router.refresh()` — a página é
renderizada no servidor e não há cache no navegador onde pôr a mensagem.

**Testes:** `supabase/tests/14_support_broadcast.test.sql` (tópicos, payload,
quem entra e quem não entra, cliente não publica). O container de teste não
tem o serviço Realtime; `tests/bootstrap/05_realtime.sql` é o dublê de
`realtime.messages`/`topic()`/`send()`. A migration começa com
`-- db-test: reaplicar` porque o `db dump` da baseline não retrata o schema
`realtime`.

**A publicação da fase 1 saiu** em `20260929010000_support_drop_postgres_changes.sql`
(29/09/2026 — o sistema ainda não tinha usuários, então não havia app antigo
escutando `postgres_changes`). `08_support_messages.test.sql` garante que as
duas tabelas continuam FORA da publicação: se voltarem, cada escrita volta a
pagar uma checagem de RLS por inscrito.

### O Realtime não reenvia o que se perdeu

Se o aparelho ficou sem rede ou em segundo plano, o evento daquele intervalo
não chega depois. Por isso **toda reconexão do canal refaz a consulta**. O
app já refazia ao voltar do background (`refetchOnWindowFocus` em
`AppProviders`); a fase 1 acrescentou o mesmo no status `SUBSCRIBED` depois de
uma queda — e nos três clientes, não só no app.

A **primeira** inscrição não conta como reconexão: ali a consulta acabou de
rodar (o app buscou os chamados, o layout dos portais montou o retrato), e
refazê-la seria uma segunda carga completa por tela aberta. Os três clientes
ignoram o primeiro `SUBSCRIBED` e reagem do segundo em diante.

---

## Fase 1 — Realtime (feita)

### 1.1 Banco — `20260928000000_support_realtime.sql`

```sql
alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.support_tickets;
```

Como ficou:

- **Idempotente**, num `do $$ ... $$`: cada tabela só entra se ainda não estiver
  em `pg_publication_tables`. O `db-test.sh` aplica toda migration duas vezes, e
  a segunda passagem prova isso.
- A publicação `supabase_realtime` é criada pela **plataforma**, não por este
  projeto (a baseline só faz `ALTER PUBLICATION ... OWNER TO postgres`). Se ela
  não existir, a migration levanta um erro que diz o que aconteceu — em vez de
  falhar no `add table` com uma mensagem que não ajuda ninguém.
- `REPLICA IDENTITY` ficou no **padrão**: só precisamos saber **que** mudou
  (INSERT de mensagem, UPDATE de status/`last_message_at`/`read_by_recipient`).
  Subir para `FULL` dobraria o WAL destas tabelas sem ninguém ler o `old`.
- **RLS conferido** no `schema_producao.sql`: as policies de SELECT de
  `support_tickets` e `support_messages` — a permissiva `*_tenant_all` e a
  RESTRICTIVE `role_module_select` de `20260917010000_role_module_rls.sql` —
  liberam o membro **ativo** do próprio tenant e o `is_platform_admin()`, e
  `role_module_deny_anon` nega o `anon`. Como o Realtime entrega um evento só a
  quem pode dar SELECT naquela linha, ninguém recebe chamado de outro negócio e
  o admin recebe de todos, sem filtro no cliente.
- **Teste** em `supabase/tests/08_support_messages.test.sql` (asserções 20 e 21):
  as duas tabelas estão na publicação.

### 1.2 App (`apps/mobile`)

1. **`src/domain/support/supportRealtime.ts`** (novo) — o único arquivo do
   domínio que abre canal, mesma regra do `supportApi.ts` para as consultas.
   - `subscribeToTicket(ticketId, handlers)` — INSERT em `support_messages` com
     `filter: ticket_id=eq.<id>`.
   - `subscribeToTenantSupport(handlers)` — INSERT em `support_messages` e UPDATE
     em `support_tickets`, **no mesmo canal** (a cota do Realtime é por conexão).
     Sem filtro de tenant: o RLS já limita.
   - `handlers` é `{ onEvent, onReconnect }` em vez de um `onChange` só, porque a
     reconexão é um caso diferente do evento — ver [a regra
     acima](#o-realtime-não-reenvia-o-que-se-perdeu). O `onEvent` recebe
     `{ senderSide }`: é o que **decide** marcar como lida, e é a única coisa que
     o payload empresta ao app — a mensagem continua vindo da consulta.
   - `closeSupportChannels()` fecha os canais que este arquivo abriu. É uma lista
     própria, e **não** `supabase.removeAllChannels()`: a função que apaga tudo
     continuaria se chamando "fechar os canais do suporte" quando a fase 2 (ou o
     próximo domínio) trouxer o segundo canal.
   - Cada tópico leva um número de sequência, porque a mesma conversa pode ser
     empilhada duas vezes e dois canais com o mesmo tópico brigam pelo `join`.
2. **Hooks** em `useSupport.ts`:
   - `useTicketLive(ticketId)` e `useSupportLive()` invalidam `suporteKeys.all`,
     que cobre a conversa **e** a lista numa chamada só (a chave dos chamados é
     prefixada por ela) — e a resposta mexe no `last_message_at`, que reordena a
     lista de qualquer jeito.
   - Os dois refazem a consulta quando o canal **volta** a `SUBSCRIBED`.
3. **Onde está ligado:**
   - `app/(app)/support/[id].tsx` → `useTicketLive(id)`. A conversa já rola até a
     última mensagem quando a quantidade muda.
   - `useSupportLive()` no shell autenticado (`app/(app)/_layout.tsx`,
     `AppShell`), montado **uma vez**, porque o badge do "Mais" precisa atualizar
     em qualquer tela.
4. **Marcar como lida:** `useTicketLive` chama `useMarkAsRead` quando o evento é
   de `'support'`/`'admin'` (`isFromSupportTeam`). As do próprio cliente voltam
   pelo mesmo canal, e marcá-las é uma escrita que o trigger
   `guard_support_message_write` recusa.
5. **Sessão:** `closeSupportChannels()` roda junto do `client.clear()` que já
   existia em `AppProviders`, na mesma inscrição que observa a sessão morrer.
   Cobre os dois jeitos de ela acabar — "Sair" e sessão revogada por fora, em que
   o shell pode desmontar sem passar pelo logout.

### 1.3 Portal do cliente (`apps/portal-client`)

`components/SupportLive.tsx` (novo), montado no `app/layout.tsx` ao lado do
`AccessRevoked`.

1. Inscreve em `support_messages` (INSERT) e `support_tickets` (UPDATE) e chama
   `router.refresh()` — o layout relê por `lib/dados/leitura.ts`, com RLS e uma
   única definição de "não lida".
2. **Debounce de 300 ms:** uma conversa chega em rajada (a resposta, o
   `last_message_at`, o status), e cada `router.refresh()` é o layout raiz
   inteiro.
3. Cliente do navegador (`lib/supabase/client.ts`), que carrega a sessão do
   cookie próprio do portal (`sb-aguiar-client-auth`).
4. **Conversa aberta:** se o INSERT é do lado da equipe e o `ticket_id` é o da
   rota (`ticketFromRoute`), chama `markTicketRead` — a action que já existe em
   `app/suporte/actions.ts` — e só então refresca. A rota vive num **ref**, e não
   nas dependências do efeito: como dependência, cada navegação derrubaria e
   reabriria o websocket.
5. **Não abre canal sem sessão:** o guarda é `d.business.id` (o `tenant_id`, vazio
   em `EMPTY_DATA`), o mesmo sinal que a casca usa — o layout raiz é
   compartilhado com o `/login`.

### 1.4 Portal admin (`apps/portal-admin`)

`components/SupportLive.tsx` (novo), montado no `app/layout.tsx` dentro do
`AdminProvider` (que já ressincroniza quando a assinatura da lista muda).

1. INSERT em `support_messages`, INSERT e UPDATE em `support_tickets` →
   `router.refresh()` com o mesmo debounce de 300 ms.
2. O admin é `is_platform_admin`: as policies o deixam ler todos os tenants,
   então o canal recebe tudo sem filtro.
3. **Aviso de chamado novo:** toast no INSERT de `support_tickets`. O nome do
   negócio sai da lista de clientes que o console **já tem em mão**
   (`customerById`) — nenhuma consulta a mais, e nada além do `tenant_id` é lido
   do payload. Um cliente cadastrado depois da última carga ainda não está nessa
   lista, e aí vale `toastNovoChamadoSemNome` ("Novo chamado recebido"). Os dois
   textos entraram em `lib/dictionary.ts`, em pt e en.
4. O estado que o evento consulta (clientes, dicionário, `toast`) vive num
   **ref**: nas dependências do efeito, um refresh ou uma troca de idioma
   reabriria o websocket.
5. **Não abre canal nas telas de acesso** (`PUBLIC_ROUTES`), que são as mesmas
   que o `proxy.ts` deixa passar sem sessão.

### 1.5 Pronto quando

Verificado com testes automáticos:

- [x] A migration aplica duas vezes seguidas e as duas tabelas estão na
      publicação (`scripts/db-test.sh`, 11 arquivos / 279 asserções).
- [x] O contrato do canal do app — tabela, evento, filtro do `ticket_id`, o lado
      de quem escreveu, a reconexão que refaz a consulta e o canal que vai embora
      no cancelamento e no logout
      (`src/domain/support/__tests__/supportRealtime.test.ts`).
- [x] `typecheck` e `lint` limpos no app e nos dois portais; os 434 testes do app
      passando.

Falta verificar **em ambiente** (precisa de Supabase com Realtime ligado, dois
tenants e dois aparelhos — nenhum destes itens é verificável por teste local):

- [x] A migration aplicada no projeto real (28/09/2026) — `support_messages`
      e `support_tickets` conferidas em `supabase_realtime`. O histórico de
      migrations do projeto está vazio (nunca se usou `db push` nele), então a
      aplicação foi arquivo a arquivo; ver `docs/testes/banco.md`.
- [ ] Resposta do admin aparece na conversa do app e do portal do cliente sem
      tocar em nada, em menos de 2 s.
- [ ] Resposta do cliente aparece no portal admin do mesmo jeito, e o chamado
      novo levanta o toast com o nome do negócio.
- [ ] Badge do "Mais" (app) e a lista do Suporte atualizam sozinhos.
- [ ] Um cliente **não** recebe evento de chamado de outro negócio (teste com
      dois tenants).
- [ ] Derrubar a rede por 1 min, mandar uma resposta nesse intervalo e voltar:
      a mensagem aparece (refetch da reconexão).
- [ ] Logout encerra os canais (nenhum canal ativo no Realtime Inspector do
      painel).

---

## Fase 2 — Push notification no app

Só depois da fase 1: o Realtime cobre o app aberto; o push cobre o fechado.

### 2.1 Pré-requisitos (fora do código)

- **iOS:** chave APNs (`.p8`) da conta Apple Developer, enviada ao EAS
  (`eas credentials`).
- **Android:** projeto Firebase + credencial FCM v1 enviada ao EAS.
- `extra.eas.projectId` no `app.json` (o `getExpoPushTokenAsync` precisa dele).
- **Novo build** do app: `expo-notifications` é módulo nativo — recarregar o
  Metro não basta (mesma situação do `react-native-get-random-values`).
- Ler a documentação do SDK 57 antes de escrever o código
  (`apps/mobile/AGENTS.md`).

### 2.2 Banco

Migration `<data>_push_tokens.sql`:

```sql
create table public.push_tokens (
  token       text primary key,          -- ExponentPushToken[...]
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  platform    text not null check (platform in ('ios', 'android')),
  updated_at  timestamptz not null default now()
);
```

- RLS: a pessoa insere, atualiza e apaga só os **próprios** tokens
  (`profile_id = auth.uid()`); ninguém lê token de outro. O envio é feito com
  `service_role`, na Edge Function.
- `token` como chave: o mesmo aparelho logando com outra conta **move** o
  token (upsert), em vez de mandar a notificação para as duas contas.

### 2.3 App

1. `src/services/pushNotifications.ts`: pedir permissão, obter o Expo push
   token e o canal Android (`setNotificationChannelAsync`).
2. **Quando pedir a permissão:** não no login. Na primeira vez que a pessoa
   abre um chamado ("Quer ser avisado quando a gente responder?") — é quando
   o pedido faz sentido para ela.
3. `src/domain/session`: registrar o token (upsert em `push_tokens`) depois
   do login e da restauração da sessão; **apagar no logout**, antes do
   `signOut`, senão o aparelho continua recebendo aviso da conta anterior.
4. **Tocar na notificação** abre `ROUTES.support/<ticketId>` (o `data` da
   notificação leva o `ticketId`), passando pelo guardião como um deep link.
5. **App em primeiro plano:** `setNotificationHandler` não mostra o banner se
   a conversa daquele chamado está aberta — o Realtime já a atualizou.
6. Texto da notificação no idioma do app: o aparelho grava `language` junto do
   token, e a função escolhe o texto.

### 2.4 Envio

Edge Function nova, `supabase/functions/support-push`:

1. Disparada por **Database Webhook** no INSERT de `support_messages` com
   `sender_side in ('support', 'admin')` (resposta da equipe → cliente).
2. Busca os tokens do tenant do chamado com `service_role` e envia pela Expo
   Push API (`https://exp.host/--/api/v2/push/send`), em lotes de até 100.
3. Conteúdo: título = assunto do chamado; corpo = início da resposta;
   `data: { ticketId }`.
4. **Recibos:** tokens com erro `DeviceNotRegistered` são apagados de
   `push_tokens` — senão a lista cresce com aparelhos que não existem mais.
5. Segredos: `EXPO_ACCESS_TOKEN` (se o projeto exigir push autenticado) na
   configuração da função, como já é feito com `PORTAL_CLIENT_URL` em
   `team-members`.

### 2.5 Pronto quando

- [ ] App fechado: resposta do admin gera notificação em iOS e Android.
- [ ] Tocar na notificação abre direto a conversa daquele chamado.
- [ ] Conversa aberta: nenhum banner duplicado.
- [ ] Logout: o aparelho para de receber avisos daquela conta.
- [ ] Mesmo aparelho, outra conta: só a conta atual recebe.
- [ ] Token inválido é removido depois do primeiro recibo de erro.

---

## Riscos e limites

- **Cota do Realtime:** 200 conexões simultâneas no plano gratuito, 500 no
  Pro. Cada app/aba aberta é uma conexão; um canal por sessão (e não por
  tela) mantém isso previsível.
- **Portais em várias abas:** cada aba abre o próprio canal. Aceitável no
  volume atual; se crescer, trocar por `BroadcastChannel` entre abas.
- **Push não é garantido:** o sistema pode atrasar ou descartar. A fonte da
  verdade continua sendo a lista de chamados; o push só convida a abri-la.
- **Idioma do push:** vem do idioma salvo junto do token, não do aparelho no
  momento do envio — trocar de idioma no app precisa atualizar o token.
