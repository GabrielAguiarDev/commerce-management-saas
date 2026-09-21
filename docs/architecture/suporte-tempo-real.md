# Suporte em tempo real — Realtime e push notification

Planejado em 21/09/2026. **Ainda não implementado.**

Hoje uma resposta nova no chamado só aparece depois de recarregar a tela (ou,
no app, puxar para atualizar). Este documento organiza o trabalho em duas
fases, na ordem em que devem ser feitas.

| Fase | O que entrega | Onde | Depende de |
| --- | --- | --- | --- |
| 1. Realtime | Mensagem nova aparece sozinha com a tela aberta | App, portal do cliente, portal admin | Uma migration |
| 2. Push notification | Aviso no celular com o app fechado ou em segundo plano | Só o app | Fase 1 concluída; credenciais Apple/Google; novo build |

---

## Decisão: Supabase Realtime, não um websocket próprio

| Opção | Por que não / por que sim |
| --- | --- |
| Websocket próprio | Exigiria servidor, autenticação, reconexão, escala e deploy novos — tudo o que o Supabase já entrega. |
| **Supabase Realtime (Postgres Changes)** | **Escolhida.** É websocket gerenciado, respeita o RLS das tabelas (o cliente só recebe eventos do próprio negócio; o admin, de todos) e não pede servidor novo. |
| Polling (`refetchInterval`) | Atraso de segundos e consulta constante. Fica só como rede de segurança da reconexão. |
| Push notification | Não substitui o Realtime: cobre o app **fechado**, que nenhuma das outras cobre. É a fase 2. |

Estado atual do banco: a publicação `supabase_realtime` existe, mas **nenhuma
tabela** está nela (`schema_producao.sql`, linha ~4109). Nenhuma tela faz
polling.

### A regra que vale para as duas fases

**O evento não carrega dado para a tela — ele só avisa que algo mudou.** Quem
recebe o evento invalida a consulta que já existe (react-query no app,
`router.refresh()` nos portais), e a leitura continua sendo a de sempre, com
RLS, adapters e i18n. Isso evita uma segunda forma de montar a mensagem que
um dia diverge da primeira.

### O Realtime não reenvia o que se perdeu

Se o aparelho ficou sem rede ou em segundo plano, o evento daquele intervalo
não chega depois. Por isso **toda reconexão do canal refaz a consulta**. O
app já refaz ao voltar do background (`refetchOnWindowFocus` em
`AppProviders`); falta garantir o mesmo no status `SUBSCRIBED` depois de uma
queda.

---

## Fase 1 — Realtime

### 1.1 Banco

Migration nova, `supabase/migrations/<data>_support_realtime.sql`:

```sql
alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.support_tickets;
```

- Tornar idempotente (checar `pg_publication_tables` antes do `add table`),
  como as outras migrations do projeto.
- `REPLICA IDENTITY` padrão basta: só precisamos saber **que** mudou (INSERT
  de mensagem, UPDATE de status/`last_message_at`/`read_by_recipient`), não o
  valor antigo.
- Conferir que as policies de SELECT de `support_messages` e `support_tickets`
  (inclusive as RESTRICTIVE de `20260917010000_role_module_rls.sql`) deixam o
  dono e o funcionário ativo lerem o próprio tenant — o Realtime entrega um
  evento só a quem pode dar SELECT naquela linha.
- Teste em `supabase/tests/08_support_messages.test.sql`: a tabela está na
  publicação.

### 1.2 App (`apps/mobile`)

Chaves que já existem: `suporteKeys.tickets(tenantId)` e
`suporteKeys.mensagens(ticketId)` em
`src/domain/support/useCases/useSupport.ts`.

1. **`src/domain/support/supportRealtime.ts`** (novo, único arquivo do
   domínio que abre canal — mesma regra do `supportApi.ts`): funções que
   inscrevem e devolvem a função de cancelar.
   - `subscribeToTicket(ticketId, onChange)` — INSERT em `support_messages`
     com `filter: ticket_id=eq.<id>`.
   - `subscribeToTenantSupport(onChange)` — INSERT em `support_messages` e
     UPDATE em `support_tickets`. Sem filtro de tenant: o RLS já limita (mesma
     regra de "nenhuma consulta filtra por tenant_id" dos `*Api.ts`).
2. **Hooks** em `useSupport.ts`:
   - `useTicketLive(ticketId)` — invalida `mensagens(ticketId)` e `tickets`.
   - `useSupportLive()` — invalida `tickets` (lista e badge do "Mais").
   - Os dois refazem a consulta quando o canal volta a `SUBSCRIBED`.
3. **Onde ligar:**
   - `app/(app)/support/[id].tsx` → `useTicketLive(id)`. A conversa já rola
     até a última mensagem quando a quantidade muda.
   - `useSupportLive()` montado **uma vez**, no shell autenticado
     (`app/(app)/_layout.tsx`, `AppShell`), porque o badge do "Mais" precisa
     atualizar em qualquer tela. Não montar por tela: cada montagem abre um
     canal.
4. **Marcar como lida:** se a conversa está aberta quando chega a resposta,
   chamar `useMarkAsRead` — senão o badge acende para uma mensagem que a
   pessoa está vendo.
5. **Sessão:** encerrar os canais no logout (`supabase.removeAllChannels()`
   junto do `client.clear()` que já existe em `AppProviders`).

### 1.3 Portal do cliente (`apps/portal-client`)

Os chamados chegam pelo layout raiz (`loadPortal` → `PortalProvider` →
`d.tickets`, leitura em `lib/dados/leitura.ts`).

1. Componente cliente `components/SupportLive.tsx`, montado no
   `app/layout.tsx` ao lado do `AccessRevoked`: inscreve em
   `support_messages` (INSERT) e `support_tickets` (UPDATE) e chama
   `router.refresh()`.
2. **Agrupar eventos:** várias mensagens em sequência não podem virar vários
   refresh — debounce de ~300 ms.
3. Usar o cliente do navegador (`lib/supabase/client.ts`), que já tem o
   cookie próprio do portal (`sb-aguiar-client-auth`).
4. Se a conversa aberta recebeu a resposta, marcar como lida pela action que
   já existe em `app/suporte/actions.ts`.

### 1.4 Portal admin (`apps/portal-admin`)

Os chamados chegam por `app/layout.tsx` → `AdminProvider initialTickets`
(que já ressincroniza quando a lista muda — ver a chave montada em
`AdminProvider.tsx`, ~linha 180).

1. Componente cliente `components/SupportLive.tsx` no layout: INSERT em
   `support_messages` e INSERT/UPDATE em `support_tickets` →
   `router.refresh()` com debounce.
2. O admin é `is_platform_admin`: as policies já o deixam ler todos os
   tenants, então o canal recebe tudo sem filtro.
3. **Aviso de chamado novo** (opcional nesta fase): toast "Novo chamado de
   <negócio>" quando o INSERT for em `support_tickets`.

### 1.5 Pronto quando

- [ ] Resposta do admin aparece na conversa do app e do portal do cliente sem
      tocar em nada, em menos de 2 s.
- [ ] Resposta do cliente aparece no portal admin do mesmo jeito.
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
