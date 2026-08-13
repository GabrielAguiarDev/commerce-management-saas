# Aguiar One — App mobile

Contexto vivo do projeto. **Leia este arquivo por inteiro antes de mexer no código.**
Ele vale mais que intuição: registra o que foi decidido, por quê, e as armadilhas
já descobertas.

Última atualização: **2026-08-08** (telas de entrada: login redesenhado e
recuperação de senha **simulada** — ver §7.1)

---

## 1. Visão geral

App de gestão para micro e pequenos negócios brasileiros: PDV, caixa, estoque,
custos, relatórios e suporte. Interface inteira em **pt-BR**, tom coloquial e
sem jargão contábil ("Sobrou hoje", "Quanto te custa", "O que sai do seu bolso").

É o cliente mobile do monorepo `aguiar-one-saas`, irmão de `portal-client` (web)
e `portal-admin`. Compartilha com eles o modelo de **tenant + módulos**.

**16 rotas**, sendo 12 telas de conteúdo, 5 bottom sheets e 3 estados de topo
(login, bloqueio, app) — mais as **três telas da recuperação de senha**, que
empilham sobre o login e hoje são uma simulação (§7.1).

### O ponto arquitetural central: módulos são entitlements

Os módulos (`cash`, `stock`, `costs`, `reports`, ...) **não são flags de demo**:
são o que o tenant contratou. Eles mudam, na mesma carga:

| onde | efeito |
|---|---|
| tab bar | o 3º item vira **Caixa** (com `cash`) ou **Custos** (sem) |
| tela "Mais" | a grade só mostra os módulos do plano |
| Início | o atalho de caixa e o alerta de estoque só existem com o módulo |
| Cadastro rápido / Editar produto | campos de estoque e de custo só aparecem se houver o módulo |
| acesso ao app | sem o módulo `app` (`is_access`), cai na tela de **bloqueio** |

Tudo isso sai de **uma função pura**, `derivarCapacidades()`, e de duas que a
consomem — `itensDaTabBar()` e `itensDoMais()`. Nenhuma tela pergunta pela chave
do módulo; todas perguntam pela capacidade (`capacidades.temCaixa`).

As chaves são **exatamente** as de `modules.key` no Supabase do monorepo
(ver `supabase/migrations/` e `apps/portal-client/lib/modulos.ts`). Isso é
deliberado: quando o backend entrar, o adapter já fala a língua do banco.

---

## 2. Stack & decisões

| Camada | Escolha | Motivo | Quem decidiu |
|---|---|---|---|
| Runtime | Expo SDK **57.0.8** (managed), RN 0.86, React 19.2.3, TS 6.0.3 | fixado pelo repositório | usuário |
| Navegação | `expo-router` 57 + `typedRoutes` | rotas por arquivo, deep link, guarda por rota | agente |
| Estilo | `@shopify/restyle` | tema tipado; proíbe hex solto no componente | blueprint |
| Estado local | `zustand` (+`persist` onde precisa) | simples, testável, sem boilerplate | blueprint |
| Estado servidor | `@tanstack/react-query` | vive em `domain/*/useCases/` | blueprint |
| Animação | `react-native-reanimated` 4.5 + `react-native-worklets` | traduz os `@keyframes` do protótipo | agente |
| Gestos | `react-native-gesture-handler` | arrasto de fechar o bottom sheet | agente |
| Ícones | `react-native-svg` | os `path` são copiados do protótipo, não aproximados | agente |
| Tipografia | Manrope via `@expo-google-fonts/manrope` + `useFonts` | especificada no design | design |
| Backend | `@supabase/supabase-js` + RLS | mesmo projeto do portal web; nenhuma consulta passa `tenant_id` | brief |
| Credenciais | `LargeSecureStore` (AES-256 no SecureStore + cifrado no AsyncStorage) | sessão em AsyncStorage é texto puro em disco, e não cabe no SecureStore | doc Supabase |
| Conexão | `@react-native-community/netinfo` | o chip de demo do protótipo saiu de escopo; o comportamento ficou | brief |
| Testes | `jest` puro (node) para lógica | suíte de 196 testes em ~0,4s | blueprint |

### Decisões que valem registro

**Dinheiro é sempre inteiro em centavos.** Converte-se para reais só na
formatação. O protótipo somava floats; num carrinho de 30 itens isso faz o total
da tela divergir do recibo.

**Formatação BRL com separador de milhar.** O protótipo fazia
`toFixed(2).replace('.', ',')` — sem milhar, `R$ 28460,00`. O BRIEF pede
`R$ 1.234,56`, que é a forma correta e a única legível nos valores do mês.
É o **único desvio deliberado** do protótipo em formatação de moeda.

**Tema de marca, com claro/escuro por preferência do usuário** — não pelo modo
do sistema. É onde o protótipo põe o toggle (Configurações › Preferências) e
mantém a identidade petrol/teal igual nos dois modos.

**O plano vem do tenant do usuário autenticado, não de um chip nem do e-mail.**
Os chips de demo ficaram fora de escopo por decisão do brief. Na fase de mock o
e-mail escolhia o tenant; hoje quem decide é `profiles.tenant_id` do usuário
logado, e os módulos saem de `v_active_modules`. Ver §7.

**Abas persistentes por dentro, telas internas empilhadas por fora.** As cinco
raízes vivem num `Tabs` que nunca desmonta; o resto empilha **por cima**, em tela
cheia e sem tab bar. E o acesso é verificado UMA vez, num guardião acima das
abas. Ver §4.

**`nodeLinker: hoisted` no workspace.** Ver §8, Armadilha 1 — foi mudança na
raiz do monorepo, não só no app.

---

## 3. Estrutura & convenções

```
app/                        SOMENTE rotas
  _layout.tsx               splash hold + AppProviders + Stack raiz
  index.tsx                 a PORTA DA RUA (resolveEntryRoute, função pura)
  login.tsx  blocked.tsx  +not-found.tsx
  forgot-password.tsx  verify-code.tsx  new-password.tsx   ← recuperação SIMULADA
  (app)/_layout.tsx         o GUARDIÃO (resolveAppGate) + Stack + carrinho/modais
  (app)/(tabs)/_layout.tsx  as abas + a TAB BAR e o botão Vender (só aqui)
  (app)/(tabs)/{home,products,cash,costs,more}.tsx      ← trocam por jumpTo
  (app)/{sell,stock,reports,settings}.tsx               ← empilham, SEM tab bar
  (app)/support/{index,[id]}.tsx
src/
  components/
    ui/                     primitivos (Box, Text, Botao, Campo, Chips, Skeleton…)
    patterns/               compostos (Screen, AuthScreen, TabBar, BottomSheet,
                            CodeInput, hosts…)
    sheets/                 os 5 bottom sheets + SheetHost
    AppProviders.tsx        composição única de providers
    index.ts                a API pública do DS — telas importam SÓ daqui
  theme/                    palette.ts (hex) · theme.ts (tokens) · fonts.ts
  config/                   env.ts — as EXPO_PUBLIC_, lidas e conferidas
  domain/<nome>/            Types / ApiTypes / Api / Adapter / Service / useCases
  domain/shared/dbEnums.ts  o vocabulário das colunas de estado do banco
  services/                 supabase.ts · secureSessionStorage.ts · storageAdapter
  store/                    zustand: um arquivo por store
  hooks/                    useAppHydrated, useAppTheme, useConnectionMonitor,
                            useSessionSync, navigation
  i18n/                     mensagens (erros, toasts, confirmações)
  utils/                    money.ts, text.ts, dates.ts (+ __tests__)
```

> `src/data/` (fixtures) e `services/mockLatency.ts` **não existem mais** —
> saíram na fase 5, quando o último `*Api.ts` passou a falar com o Supabase.

### Regras duras

- **`app/` só tem rotas.** Nenhum componente, hook ou constante de negócio.
- **Componente nunca escreve cor.** O ESLint bloqueia hex literal fora de
  `src/theme/`. Cor que não existe? Cria-se o token.
- **`Text` sempre por `variant`, nunca `fontWeight`.** Em RN, cada peso da
  Manrope é uma família própria; `fontWeight="bold"` renderiza Medium com
  falso-negrito.
- **Função + named export.** Default export só em rota (o Expo Router exige).
- **Domínio não conhece React**, exceto `useCases/`.
- **Módulo de `domain/` não importa barrel de UI** — arrasta `react-native` para
  o jest node e quebra a suíte pura.

### Aliases

`@components @config @domain/* @hooks @i18n @services @store @theme @utils/*`

(`@data` ainda está declarado nos três arquivos, mas a pasta não existe mais
desde a fase 5. Remover é seguro; deixar não custa nada.)

Declarados em **três** lugares que precisam andar juntos: `tsconfig.json`
(tsc), `babel.config.js` (runtime, via `module-resolver`) e `jest.config.js`
(suíte node).

### Comandos

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint .
pnpm test          # jest (suíte 'logica', node)
pnpm export:ios    # expo export --platform ios
pnpm start         # dev server
```

---

## 4. Navegação — a decisão e o porquê

Três camadas, e cada uma existe por um motivo diferente:

```
app/_layout.tsx              splash hold + providers + Stack raiz
app/index.tsx                a PORTA DA RUA — login ou app (só isso)
app/(app)/_layout.tsx        o GUARDIÃO (acesso, uma vez) + Stack + chrome fixa
app/(app)/(tabs)/_layout.tsx as ABAS — montadas uma vez, nunca desmontadas
```

### O guardião roda UMA VEZ, acima das abas

A verificação de acesso (sessão válida, `has_module('app')`, tenant, plano) **não
muda entre uma aba e outra** — é o mesmo usuário na mesma sessão. Ela mora em
`app/(app)/_layout.tsx`, que é um LAYOUT: envolve toda a navegação, monta uma vez
e permanece montado enquanto o usuário estiver dentro do app.

`resolveAppGate()` (pura, testada) responde `hold | login | error | blocked |
allow`, e o guardião obedece. A peça central é a **trava** (`released`): depois
de liberar uma vez, nenhuma revalidação em segundo plano — voltar do background,
reconectar, `onAuthStateChange`, refetch do react-query — devolve o portão para
`hold`. Só a **sessão sumir** expulsa quem já entrou, e por isso `login` é
perguntado ANTES da trava.

> Isso corrige um bug de verdade: `hold` esconde a navegação inteira, e sem a
> trava qualquer revalidação a escondia por um instante. Na tela, isso aparecia
> como a interface toda — tab bar inclusive — sumindo e voltando a cada troca de
> aba.

A trava é ajustada **durante o render** (`setReleased(true)`), o padrão oficial
do React para estado derivado: é idempotente e vale já neste render. Num
`useEffect`, a liberação só valeria no render seguinte — e é esse "um render a
mais" que pisca.

`app/index.tsx` deixou de perguntar pelo entitlement. Ela é rota de PASSAGEM (o
`Redirect` a desmonta no mesmo instante), então quem chegava por deep link em
`/home` nunca passava por lá. Sendo o guardião um layout, essa porta dos fundos
não existe.

### A tab bar pertence às abas — e é a estrutura que decide, não a tela

A tab bar e o botão Vender são um **overlay absoluto dentro de
`(tabs)/_layout.tsx`**: irmãos do navegador de abas, não da pilha. Como
pertencem à tela `(tabs)`, qualquer `push` da pilha de fora sobe por cima e os
cobre. É daí que sai a separação entre **tela de aba** e **tela interna**, sem
uma linha de "mostrar ou não" espalhada por tela.

Eles já moraram um nível acima, irmãos da `Stack` em `(app)/_layout.tsx`, o que
os deixava visíveis sobre a pilha inteira. O efeito era que Configurações,
Suporte e Vender apareciam com a barra de navegação principal embaixo, como se
fossem destinos de topo — e Vender, que é a tela que mais precisa de altura para
a grade de produtos, perdia 88px para uma barra que não usa.

Continuam sendo overlay absoluto (e não a prop `tabBar` do navegador) por duas
razões: o desenho pede a barra flutuando sobre o conteúdo rolável, e o botão
Vender precisa transbordar para fora dela.

No `(app)/_layout.tsx` ficou só o que vale na pilha inteira: a **barra do
carrinho** — some-la em Vender seria escondê-la exatamente onde é usada — e os
hosts de sheet e confirm, que são modais.

**Duas coisas se posicionam a partir do rodapé** e por isso precisam saber se há
tab bar embaixo: a barra do carrinho e o espaço reservado no fim do
`Screen`. (O toast era a terceira, até subir para o topo — ver a regra 10.)
As duas perguntam a `useOnTabScreen()`, que é `isTabRoute(usePathname())`
— a mesma função pura já testada no node. Sem isso elas boiariam sobre um rodapé
vazio nas telas internas. Na barra do carrinho a mudança é **animada** (mesma
curva do `aoUp`): ela acontece durante a transição de tela, e sem interpolar
vira um solavanco no meio do slide.

A `TabBar` **não tem mais estado de carregamento**. Ela já teve `if (loading)
return null`, para não mostrar "Custos" num Plano Completo enquanto o plano não
chegasse; o efeito colateral era pior que o problema — a barra inteira sumia. A
espera foi para o guardião (`capabilitiesSettled`), que só libera com as
capacidades resolvidas. Quando a barra renderiza, não há instante a esconder.

### Duas famílias de rota, e elas não se alcançam igual

| | onde mora | como se alcança | tab bar |
|---|---|---|---|
| **abas** — Início, Produtos, Caixa, Custos, Mais | `(app)/(tabs)/` | `goToRoot()` → `dismissAll` + `navigate` (jumpTo) | sim |
| **internas** — Vender, Estoque, Relatórios, Configurações, Suporte | `(app)/` | `router.push()`, com botão voltar | **não** |

`goTo(rota)` escolhe entre as duas a partir de `isTabRoute()` — quem chama (a
grade do "Mais", os atalhos do Início) só diz para onde quer ir. Um `push` numa
rota de aba não funciona (navegador de abas não tem pilha) e não é erro de
compilação; o jest cobre isso comparando `isTabRoute()` com a pasta real.

**Por que abas agora, se antes eram `Stack`.** As raízes já foram telas de uma
pilha, trocadas com `dismissAll` + `replace`. Funcionava, mas `replace`
**desmonta** a tela que sai: voltar para Início remontava a tela, refazia o
render inteiro e perdia rolagem e filtros. Num `Tabs`, cada aba é montada na
primeira visita e permanece; trocar é um `jumpTo`, instantâneo e sem refetch.
`freezeOnBlur` mantém as inativas montadas mas suspensas, então cinco abas
montadas não custam cinco telas trabalhando.

A barra do navegador de abas é `tabBar={() => null}`: o navegador é puramente
estrutural (guarda o estado das abas), e quem desenha e escuta o toque é a
`TabBar` do design system, irmã dele. Caixa **e** Custos moram nas abas,
embora só um dos dois seja o 3º item da barra em cada plano — os dois são destino
de raiz, e o que não está na barra continua acessível pela grade do "Mais".

**`/sell` é a exceção que vale explicar.** Ela é acionada pelo botão central da
tab bar, o que a faz *parecer* uma aba — mas é tela de pilha, e abre em tela
cheia **sem** a barra. O motivo é a grade de produtos: é a tela do app que mais
precisa de altura, e 88px de barra que ela não usa saem caros. O toque no botão
central portanto NAVEGA (empilha), não troca de aba; voltar cai na aba de origem
com a tab bar de volta. Consequência visível: Nova venda tem botão voltar,
porque agora existe de verdade uma tela embaixo dela.

`backBehavior="none"` no `Tabs` é obrigatório aqui. O padrão (`firstRoute`) faria
o navegador tratar "voltar" como "ir para Início", `router.canGoBack()` viraria
`true` em Produtos/Caixa/Custos e o `Screen` desenharia um botão voltar que o
protótipo não tem. É também o que faz o botão voltar aparecer exatamente onde a
tab bar não está: `false` nas abas, `true` na pilha de fora — sem lista de rotas
nenhuma.

### Carregamento de dados fica DENTRO do conteúdo

Carregar os dados de uma tela ao entrar nela é normal; esconder a tela para isso
não é. O componente `Skeleton` ocupa o espaço exato do conteúdo que vem, com
header e tab bar já desenhados ao redor (Caixa, Início, Produtos). A única espera
que cobre a tela inteira é o `hold` do guardião — uma vez, na entrada do app.

---

## 5. Camada de domínio

Oito domínios, todos em `src/domain/<nome>/` com o mesmo desenho:

```
<nome>Types.ts       modelo de domínio (pt-BR) + erro tipado com `codigo`
<nome>ApiTypes.ts    contrato do backend (inglês, snake_case, nullable)
<nome>Api.ts         ⚠️ ÚNICA fronteira de rede — o que muda com o Supabase
<nome>Adapter.ts     tradutor puro API → domínio (e o caminho de volta)
<nome>Service.ts     regras, validação, normalização de erro
useCases/            react-query — a única camada que conhece React
__tests__/           adapter e seletores, puros, jest node
index.ts             a API pública do domínio
```

| domínio | responsabilidade |
|---|---|
| `session` | login, logout, recuperação de senha. Sem `useCases` — ver o comentário no `index.ts` |
| `tenant` | negócio, plano, **capacidades**, equipe, atividades |
| `catalog` | produtos, favoritos, cadastro rápido, seletores de busca/filtro |
| `sales` | resumo do dia, últimas vendas, finalizar venda + **carrinho puro** |
| `cash` | turno, gaveta, sangria/reforço, **conferência e diferença** |
| `stock` | movimentações (o saldo dos itens vem de `catalog`) |
| `costs` | custos, resumo do mês |
| `reports` | resumo financeiro, gráfico, mais vendidos |
| `support` | chamados, thread, novo chamado |
| `navigation` | rotas, gate, tab bar e grade do "Mais" — puro, sem React |

### O mock devolvia o formato CRU — e foi por isso que a virada funcionou

Durante a fase 2, `src/data/*` guardou fixtures em **inglês, snake_case, com
nulos** — nunca o modelo de domínio. Era a diferença entre um adapter vivo e um
decorativo: todo dado do app atravessou a tradução desde o primeiro dia.

O resultado apareceu na fase 5: **nenhum adapter, nenhum seletor e nenhum teste
precisou mudar** para trocar o mock pelo Supabase. Os nulos que os fixtures
carregavam de propósito (`stock_qty: null` = não controla estoque vs.
`stock_qty: 0` = acabou; `plan_name: null`; `difference_cents: null`) eram
exatamente os que o banco real produz.

Onde o palpite errou — unidade do dinheiro, origem do `tenant_id`, colunas que
não existem — está registrado em §11.1. Errar nesses pontos custou barato
justamente porque a fronteira estava isolada.

**Os `*ApiTypes.ts` não são espelhos de tabela.** Vários são DTOs COMPOSTOS: o
`*Api.ts` junta duas ou três leituras num objeto só. A composição é trabalho da
fronteira de rede; a tradução, do adapter.

### Regras puras que valem conhecer

- `derivarCapacidades(modulos)` — plano → o que a UI pode mostrar.
- `resolverRotaDeEntrada(estado)` — para onde ir agora. Idempotente.
- `calcularDiferenca(linhas, conferido)` — a diferença do fechamento de caixa.
  **Linha em branco é ignorada, não vale zero**: se valesse, conferir só o
  dinheiro acusaria a falta de todo o Pix e cartão.
- `linhasDeConferencia(turno)` — agrupa débito+crédito numa linha "Cartão", e o
  esperado de "Dinheiro" é a **gaveta** (inclui abertura e ajustes), não a venda
  em dinheiro.
- `situacaoDoEstoque(qtd, min)` — zerado tem precedência; mínimo 0 = "não avise".
- `gradeDeVenda(produtos, busca)` — sem busca, só favoritos; com busca, tudo.
- `carrinho.*` — adicionar/incrementar/decrementar/total, tudo imutável.

---

## 6. Estado

| store | persistido? | conteúdo |
|---|---|---|
| `sessionStore` | **não** (mudou na fase 5) | usuário, tenantId, roleId. Quem persiste a sessão é o cliente Supabase, criptografada — duas cópias divergiriam. Reconstruído no boot por `restore()` |
| `preferenciasStore` | sim | tema escuro, formas de pagamento aceitas |
| `carrinhoStore` | **não** | itens, forma de pagamento |
| `uiStore` | não | toast, confirmação, sheet (um de cada por vez) |
| `conexaoStore` | não | online, sincronizando |

- `partialize` explícito nos dois persistidos: nada de `entrando`/`hidratado` no
  disco. Um `entrando: true` gravado trava o app no relaunch.
- `preferenciasStore` tem **`merge` defensivo**: uma forma de pagamento nova numa
  versão futura não existe no objeto gravado e viria `undefined` — sumindo do
  seletor só para quem já usava o app.
- **`useAppHydrated`** lista os persistidos **explicitamente**. Store persistido
  novo que não entrar nessa lista causa tela piscando na abertura, e só para
  quem já tem dado gravado (instalação limpa nunca reproduz).
- O carrinho **não** é persistido, de propósito: uma venda em montagem que
  reaparece no dia seguinte é pior que uma venda perdida.

---

## 7. Acesso — Supabase Auth real

As credenciais de demonstração **acabaram** na fase 5, junto com `src/data/`.
Quem entra é um usuário de verdade do projeto `Commerce Management`, e o plano
vem do tenant dele, não do e-mail digitado.

### O que decide cada tela de entrada

| condição | onde é verificada | destino |
|---|---|---|
| senha errada / conta inexistente | `sessionApi.signIn` (400 do Supabase) | fica no login, "e-mail ou senha não conferem" |
| `profiles.is_platform_admin` | `sessionAdapter.toSession` | login, "conta de administrador usa o painel" |
| `profiles.tenant_id` nulo | `sessionAdapter.toSession` | login, "conta não ligada a um negócio" |
| `profiles.status` ≠ `active` | `sessionAdapter.toSession` | login, "acesso suspenso" |
| `has_module('app')` = `false` | `useAppAccess` → o portão | **tela de bloqueio** |

As três negativas do adapter **derrubam a sessão do Supabase** antes de propagar
o erro (`sessionService.signIn`). Sem isso a sessão ficaria de pé e o próximo
relaunch entraria direto, contornando a regra que acabou de barrar.

`has_module` vem depois e é separado de propósito: é entitlement, não
identidade, e leva a uma tela diferente. Ele responde `true` / `false` / `null`
— e `null` (carregando ou sem rede) **segura o portão** em vez de bloquear.
Confundir os dois manda para a tela de bloqueio quem só está sem sinal.

### 7.1 As telas de ENTRADA — login redesenhado e recuperação SIMULADA

Quatro telas dividem o mesmo esqueleto, o `AuthScreen` (fundo petrol, conteúdo
centrado, título grande, botão voltar no topo quando há pilha). Ele existe
separado do `Screen` porque as duas famílias não têm nada em comum: o `Screen`
desenha header com avatar do usuário, banner de conexão e espaço para a tab bar
— nada disso faz sentido antes de haver usuário.

Duas coisas ficaram do jeito que já eram, depois de tentar o contrário:

- **O botão voltar fica FORA da rolagem**, no topo. Dentro do conteúdo
  centralizado ele descia até o meio da tela nas telas curtas — e um voltar que
  muda de lugar conforme o conteúdo deixa de ser um voltar. Mesma posição e
  mesmo alvo do botão do `Screen`.
- **O login passa `showBack={false}`, e isso NÃO é redundância.** `app/index.tsx`
  fica embaixo dele na pilha (é a rota de passagem que redirecionou para lá),
  então `router.canGoBack()` responde `true` no login para sempre. O voltar
  levaria à porta da rua, que redireciona de volta para o login.
- **Ao salvar a senha nova, a pilha da recuperação é ZERADA** (`dismissAll` antes
  do `replace`). Só o `replace` trocaria a tela do topo e deixaria "conferir
  código" viva embaixo do login, alcançável pelo gesto de voltar do iOS — e
  conferindo um código que acabou de ser usado.
- **O rótulo fica ACIMA do campo**, e não entalhado na borda. O entalhe exige um
  retângulo com o fundo da tela cobrindo a linha, e esse retângulo interrompe a
  borda arredondada — o campo perde o desenho fechado que é a identidade dele no
  app inteiro. O que sobrou da ideia é o `highlightOnFocus`: a borda **e o
  rótulo** acendem em teal enquanto o campo tem foco.

**O login continua sendo só e-mail e senha, e continua sem cadastro.** A conta
nasce no painel admin, junto com o tenant e os módulos contratados. Por isso o
rodapé "Ainda não tem conta? Fale com o suporte" abre o **WhatsApp** com o
número de `platform_settings.whatsapp_contact` — o mesmo canal externo da tela
de bloqueio, pelo mesmo motivo (quem não tem conta não tem como abrir chamado
dentro do app). Reaproveita o `useSupportWhatsApp` inteiro.

> ⚠️ Isso exigiu a migration `20260808000000_platform_whatsapp_contact_anon.sql`:
> a função `platform_whatsapp_contact()` era executável só por `authenticated`,
> e no login ainda não há sessão. **Sem aplicar a migration, o botão cai no
> toast de "não foi possível abrir o WhatsApp"** — o fluxo degrada, não quebra.

**A recuperação de senha é uma SIMULAÇÃO, de ponta a ponta.** Três telas
(`forgot-password` → `verify-code` → `new-password`), com um aviso na primeira
dizendo isso em voz alta e anunciando o código da demonstração (`1234`). Nenhum
e-mail sai, nenhuma senha muda.

O que sustenta o mock é **um arquivo só**, `domain/session/passwordRecovery.ts`:
é ele que vira `Api` + `Adapter` + `Service` quando o fluxo real existir, e
nenhuma das três telas muda quando isso acontecer. O que já é definitivo e está
sob teste são as regras puras — `mascararEmail`, o tamanho do código, o mínimo
da senha, a conferência das duas senhas — e os códigos de erro.

Decisões que valem registro:

- **O `sessionService.recuperarSenha` (Supabase `resetPasswordForEmail`) NÃO é
  usado por estas telas.** Mandar um e-mail de verdade e depois pedir um código
  inventado deixaria duas recuperações concorrentes na mão do usuário — e a
  real leva para uma página web fora do app. Ele continua exportado, esperando.
- **O e-mail viaja mascarado entre as telas**, como parâmetro de rota. Uma store
  global para uma conversa de três telas seria estado demais, e a tela do código
  não precisa do endereço por extenso.
- **`sessionRules.ts` nasceu por causa do jest.** A regex de e-mail e o mínimo
  de senha moravam no `sessionService`, que importa o armazenamento seguro e
  portanto puxa `react-native`. Um teste node que importasse aquilo quebrava na
  primeira linha. As duas regras puras se mudaram; o service e a recuperação
  leem de lá — e continuam com UMA peneira de e-mail só.
- **Nenhum botão desabilitado sem explicação.** "Confirmar" com o código
  incompleto fica ativo e responde com o aviso, como já fazia o "Falar com o
  suporte" da tela de bloqueio.
- **As quatro caixas do código são UM campo só** (`CodeInput`): um `TextInput`
  invisível esticado por cima delas, com o teclado do sistema. Chegou a existir
  um teclado numérico desenhado e ele saiu — não pagava o que custava. O campo
  único dá de graça o **preenchimento automático do código no iOS**
  (`textContentType="oneTimeCode"`), o colar, e o apagar sem dança de foco entre
  campos, que é a origem clássica dos bugs dessas telas.
- **O `AuthScreen` aceita um `footer`** ancorado na base, fora da rolagem e
  dentro do `KeyboardAvoidingView` (sobe com o teclado). É onde vive o
  "Confirmar" da tela do código: com o conteúdo centralizado, o botão logo
  abaixo dele flutuava no meio da tela. O login e o "enviar código" **não** usam
  o rodapé — ali o botão pertence ao formulário, logo abaixo do último campo.

### Ambiente

`.env` (fora do Git) com `EXPO_PUBLIC_SUPABASE_URL` e
`EXPO_PUBLIC_SUPABASE_ANON_KEY` — as mesmas do portal do cliente. Ver
`.env.example`. **A `service_role` nunca entra aqui**: um app é um binário na
mão do cliente, e qualquer chave embutida nele deve ser considerada pública.
Conferido no bundle exportado: a URL e a chave publishable estão lá (é o
esperado), e `service_role` não aparece.

---

## 8. Notas e armadilhas

> A seção mais valiosa do arquivo. Cada linha é um bug não-óbvio já resolvido.

**1. pnpm isolado quebra o Metro — `nodeLinker: hoisted` no workspace.**
Com o linking isolado padrão do pnpm, o bundle falha em dependências
**transitivas** que não são nossas: `@expo/metro-runtime` importa `whatwg-fetch`,
o próprio `react-native` importa `invariant`, e a lista cresce a cada SDK.
Declarar cada uma no `package.json` do app é remendar sintoma. A correção está em
`pnpm-workspace.yaml` (raiz): `nodeLinker: hoisted`. **Em pnpm 10+ essa chave vive
no `pnpm-workspace.yaml`, não no `.npmrc`** — colocá-la no `.npmrc` é ignorado em
silêncio. Depois de mudar, é preciso apagar todos os `node_modules` e reinstalar.
Verificado: `apps/portal-client` continua com `tsc --noEmit` limpo.

**1b. Mas NÃO ligue `disableHierarchicalLookup` no `metro.config.js`.**
Hoisted não quer dizer plano: quando duas versões do mesmo pacote são exigidas,
o pnpm ainda cria um `node_modules` **aninhado** para a perdedora. É o caso do
`pretty-format` — a raiz fica com a v30 (que o jest arrasta) e o `react-native`
guarda em `node_modules/react-native/node_modules` a v29 que ele declara. Com o
lookup hierárquico desligado o Metro não enxerga esse aninhado, o `HMRClient`
importa a v30 (que não expõe `.default` no require CJS) e o app morre no boot
com `[runtime not ready] TypeError: Cannot read property 'default' of undefined`,
antes de renderizar qualquer tela. **O bundle compila normalmente** — `expo
export` e `tsc` passam e escondem o problema; só quebra em runtime. O risco de
"dois Reacts" que justificaria a flag não existe aqui: não há cópia aninhada de
`react` nem de `react-native` no grafo.

**2. `react-hooks/immutability` × Reanimated.** A regra nova (alinhada ao React
Compiler) trata `useSharedValue().value = x` como mutação proibida — mas isso é
exatamente a API do Reanimated, inclusive dentro de worklet, onde `setState` não
existe. Desligada em `eslint.config.js`, com o motivo escrito lá. Religar se a
regra passar a entender shared values.

**3. `as const` no mapa de cores impede o tema escuro.** Com `as const`, cada
token vira o tipo **literal** do hex e `darkColors` não compila
(`'#0b1a21'` não é atribuível a `'#eef2f4'`). A solução é o tipo mapeado
`Cores = { [K in keyof typeof tokensClaros]: string }`, que alarga os valores e
mantém as chaves precisas — são elas que viram `ThemeColor`.

**3b. `borderRadius` do restyle não aceita número — e `as never` esconde isso.**
O restyle procura a chave em `theme.borderRadii`; passar `14` lança
`Value '14' does not exist in theme['borderRadii']` **na renderização**. O
`Botao` e o `Campo` recebem o raio em pixels (é assim que o design fala), então
a conversão é obrigatória: `borderRadius={tokenDeRaio(raio)}`, com a prop tipada
como `Raio` (a união fechada dos valores que existem no tema). A versão original
usava `raio?: number` + `borderRadius={raio as never}` — compilava limpo e
quebrava a primeira tela com input. Se precisar de um raio novo, adicione o
token em `borderRadii`; não afrouxe o tipo.

**4. `TextVariant` precisa excluir `defaults`.** O restyle aplica `defaults`
sozinho; deixá-la no tipo faz o autocomplete oferecer uma variante que não existe
visualmente e o `Botao` não compilar.

**5. Estado derivado de query: ajustar no render, não em `useEffect`.** O
formulário de Configurações › Negócio preenche a partir do tenant, que chega
depois do primeiro render. Com `useEffect`, o campo pisca vazio e — pior — se o
usuário estiver digitando quando a query revalidar, perde o texto. O padrão usado
é o oficial do React: guardar o id já aplicado e ajustar durante o render.

**6. `ESLint 10 + eslint-config-expo 57` não funcionam juntos.**
`eslint-plugin-react@7.37` quebra com a nova API de contexto do ESLint 10
(`contextOrFilename.getFilename is not a function`). Fixado em `eslint@^9`.

**7. O gesto de saída do bottom sheet é responsabilidade do componente.** O sheet
não é rota, então não há `gestureEnabled` do navegador para herdar. O arrasto
vertical (fecha acima de 90px ou com velocidade > 800) está no `BottomSheet`. Sem
ele, o sheet só fecharia no ✕.

**8. Por que o bottom sheet não é rota.** Os sheets são abertos a partir de
componentes GLOBAIS que vivem fora da pilha — a `CartBar`, o toast, o próprio
`uiStore`. Como rota, isso exigiria empurrar uma rota a partir de um componente
global — e no iOS tudo que é empilhado *depois* de um modal também é apresentado
como modal, quebrando a navegação seguinte.

**9. `Seletor` usa `Modal` do RN, e não overlay absoluto.** Ele é aberto de
dentro de um bottom sheet; um overlay comum ficaria por baixo.

**10. Toast: o sistema é o do Reactix, e ele nasce NO TOPO.** O componente é
copiado da doc ([reacticx.com/docs/components/toast](https://www.reacticx.com/docs/components/toast))
e vive em `src/components/ui/toast/` — código de terceiro, não dependência npm.
Os desvios do original, todos comentados no código:

1. `position` default é `'top'`, não `'bottom'`. O rodapé aqui já é disputado
   por tab bar, barra do carrinho e FAB; toast ali cobre ação.
2. **A safe area é aplicada no `Toast`, não no `ToastViewport`.** O original põe
   `paddingTop: insets.top + 10` no viewport e `top: 80` no toast — só que o
   toast é `position: 'absolute'`, e filho absoluto **não herda padding do
   pai**. O padding nunca chegou nele; quem segurava o toast fora da barra de
   status eram os 80 fixos, e num iPhone com Dynamic Island isso é curto — o
   toast aparecia POR BAIXO da ilha. Agora o viewport não tem padding nenhum e
   o toast calcula `insets.top + ALTURA_HEADER + AFASTAMENTO`. `AFASTAMENTO` (8)
   é o número a mexer para descer o toast.

   **E ele pousa ABAIXO do header, não colado na safe area.** Em cima do header
   o toast cobria título, subtítulo e avatar, e a metade de baixo ainda cobria o
   primeiro campo do conteúdo — parado entre os dois, sem pertencer a nenhum.
   Abaixo do header ele flutua sobre o CONTEÚDO, que é o que um aviso passageiro
   deve cobrir, e quem lê continua vendo em que tela está. A altura do header
   mora em `patterns/headerGeometry.ts` (`ALTURA_HEADER`, 57pt) e **espelha os
   paddings do `Screen`**: mexeu num, mexe no outro. Não é medida em runtime de
   propósito — o header não é ancestral do toast, e ler o layout dele pediria um
   `onLayout` mais um estado global só para transportar o número.

   Pela mesma conta, a faixa do viewport subiu de 200 para 340pt: no Android o
   pai recorta o filho que passa da borda, e com o toast começando em ~124pt
   sobravam 76 — um erro de três linhas perdia a última.
3. `Toast.types.ts` é nosso: a doc publica os outros quatro arquivos, esse não.
4. **Arrastar para fechar** é acréscimo nosso — o Reactix só fecha por tempo,
   por toque na ação ou por API. O gesto segue a posição: no topo fecha para
   cima, no rodapé para baixo. Fecha por distância (48pt) **ou** por velocidade
   (700pt/s), senão o flick curto não fecharia. Puxar para o lado errado dá
   rubber band e volta.

   O arrasto escreve num shared value SEPARADO (`dragY`), somado ao `translateY`
   no transform. Escrever no mesmo valor faria uma spring de reposicionamento de
   pilha arrancar o toast de baixo do dedo.
5. **A largura é o gutter da tela**, não os `width: '90%'` + `maxWidth: 400` do
   original. Mesma armadilha do item 2, no outro eixo: o `paddingHorizontal: 16`
   do viewport nunca chegou ao toast absoluto, e o que sobrava era uma
   porcentagem que não conversa com margem nenhuma do app — o toast entrava
   desalinhado com os cartões que ele cobre, e o texto quebrava antes da hora.
   Agora o `Toast` aplica `left`/`right` = `theme.spacing.screen`, o mesmo token
   do `Gutter`. Mudar a margem do app move o toast junto.

   O `activeOffsetY` de 10pt não é enfeite: sem ele o pan reivindica o toque no
   primeiro pixel e o `onPress` do conteúdo expansível nunca dispara.

   **O timer não pausa durante o arrasto.** Segurar o toast parado não estende os
   4,2s, e no limite ele some sob o dedo. Pausar de verdade exigiria mexer também
   no timer do `ToastContext`, que é quem manda no ciclo de vida — não foi feito.

**10a. A CAIXA do toast: ícone de estado à esquerda, texto do tema, raio de 16.**
Três defeitos que andavam juntos, todos vindos do original:

- **O ícone era um glifo de texto** (`'✓'`, `'✗'`, `'ℹ'`) num `<Text>` de 20px:
  peso, largura e alinhamento vertical mudavam entre iOS e Android, e o "ℹ" saía
  colorido em alguns aparelhos. Agora são `path` do nosso `Icon` (`check`,
  `close`, `info`, `alert`) dentro de uma faixa redonda translúcida. A faixa não
  é enfeite: é ela que fecha o "i" (o ícone é só pingo e haste) e é ela que
  segura o ✕ do erro no lugar de ESTADO — solto sobre o vermelho ele leria como
  botão de fechar.
- **O texto não usava o tema**: `fontSize: 16` sem `fontFamily`, ou seja, fonte
  do SISTEMA no meio de um app inteiro em Manrope, e dois pontos maior que o
  corpo de qualquer tela. Virou `variant="bodyMd"` (14/21) com `color="white"`.
- **O raio era 100 no container e 12 no `Pressable` de dentro.** O de dentro
  nunca apareceu (quem recorta é o container, com `overflow: 'hidden'`), e 100
  num bloco de ~60pt de alto vira pílula — o recado de duas linhas ficava dentro
  de um comprimido, com as curvas comendo o respiro dos cantos. Agora é
  `theme.borderRadii.r16` **nos dois**, e o padding é 12/14 com 10 de gap em vez
  do `padding: 16` cravado (o mesmo número dos cartões, num bloco de metade da
  altura deles).

**10b. As telas NÃO chamam esse sistema direto.** A porta de entrada continua
sendo `useUIStore().showToast(texto, { tone, withUndo, onUndo })` — uma fachada
que traduz o vocabulário do produto para as opções do Reactix (`tone: 'erro'`
vira `type: 'error'` com o vermelho do tema; `withUndo` vira `action`). Foi o
que permitiu trocar o toast inteiro sem tocar nas ~30 chamadas espalhadas.

São TRÊS tons, e o que muda entre eles é o ÍCONE: `neutral` mostra o "i",
`sucesso` o visto, `erro` o ✕ (e esse é o único que também muda de cor). O fundo
petrol é identidade do toast (`palette.toast`, fixo nos dois temas), então
confirmação e recado saem no mesmo fundo — "salvo", "venda registrada", "caixa
fechado" ganham o visto, não um verde.

Nenhum toast do app é `'default'`, o tipo sem ícone do Reactix: recado sem estado
nenhum ainda é informação. Onde o tom depende do RESULTADO, ele sai do mesmo
resultado que escolhe a frase — venda que ficou no aparelho é `neutral` (ainda
falta lançar, e um visto diria que acabou), sincronização parcial é `neutral`
(sobrou venda na fila), estorno com estoque que não voltou é `erro`.

Um por vez, e o novo derruba o anterior: o Reactix **empilha** por padrão, então
a restrição do protótipo é aplicada na fachada. Sem isso, dois erros seguidos
ficariam um em cima do outro.

**10c. O provider mora em `AppProviders`, que envolve o app inteiro.** Antes era
`<ToastHost />` no layout raiz, e antes disso no `(app)/_layout.tsx` — mas
`login` e `blocked` estão FORA desse grupo. Nas duas telas o `showToast`
escrevia na store e **nada renderizava**: o toque no botão não produzia efeito
nenhum.

Doeu mais no LOGIN, onde o toast é o único retorno de erro que existe. Senha
errada, conta sem negócio, falha de rede — tudo silencioso, e o sintoma que
chegava era "o login não faz nada", que manda depurar navegação e rede em vez
da camada de UI.

Uma instância só. Montar em dois lugares mostraria o toast duplicado. O
`ToastProviderWithViewport` renderiza o viewport depois dos filhos, e é isso que
põe o toast por cima — por isso ele fica POR FORA do `BottomSheetModalProvider`,
e não por dentro como já esteve: lá o toast de erro do checkout saía atrás do
próprio carrinho que o disparou.

**10d. O `ConfirmHost` subiu para `AppProviders` pelo mesmo motivo de camada.**
Ele morava em `(app)/_layout.tsx`, dentro do `BottomSheetModalProvider`. Só que
o `PortalProvider` do `@gorhom/bottom-sheet` desenha o host do portal DEPOIS dos
próprios filhos — ou seja, o sheet pinta por cima de tudo que estiver dentro do
provider. O sintoma era exato: "Cancelar venda" abria o diálogo de confirmação
ATRÁS do sheet do carrinho.

A ordem de pintura agora é: telas → sheets (portal) → `ConfirmHost` → toast.
`ConfirmHost` é irmão POSTERIOR do `BottomSheetModalProvider`; nada disso usa
`zIndex`, é ordem de irmão mesmo — mover qualquer um deles na árvore muda a
camada.

`SheetHost` continua só em `(app)`, de propósito, porque hoje só o app usa
sheets. Se criar uma tela nova fora do grupo que precise de um, ela tem o mesmo
problema que o toast tinha.

**11. `conexaoStore.definirOnline` ignora chamada com o mesmo valor.** O NetInfo
emite eventos repetidos ao trocar de rede; sem a guarda, o banner
"sincronizando…" reiniciava sozinho a cada emissão.

**12. `useCapabilities` expõe `loading` — mas quem espera é o GUARDIÃO.**
Enquanto o plano não chegou, TODAS as capacidades são falsas: a tab bar mostraria
"Custos" num Plano Completo por uma fração de segundo. A `TabBar` já resolvia
isso não renderizando durante o carregamento — e assim a casca do app sumia da
tela. A espera subiu para `(app)/_layout.tsx` (`capabilitiesSettled`), que segura
UMA vez na entrada; a barra, quando renderiza, já tem a verdade. O guardião
continua tratando `hasAppAccess` como `null` (≠ `false`) pelo mesmo motivo de
sempre: "ainda não sei" não é "seu plano não inclui". Ver §4.

**13. Fonte que não carrega não pode prender a splash.** `useFonts` devolve
`[carregadas, erro]`; o layout raiz considera pronto quando **qualquer um dos
dois** resolve. Sem a Manrope o texto sai na fonte do sistema — feio, mas
utilizável.

**14. `babel-preset-expo` já configura o plugin de worklets.** Declará-lo à mão
no `babel.config.js` duplica a transformação e quebra as worklets. Só o
`module-resolver` está lá.

**15. `useReducedMotion` respeitado** no `Interruptor`, no pulso do banner (loop
infinito — o que mais incomoda) e na entrada do sheet.

---

> As armadilhas abaixo são do BACKEND. Todas foram verificadas contra o banco
> real, não deduzidas da documentação.

**16. Existe um TRIGGER em `sale_items` que já baixa o estoque.** Inserir um
item de venda desconta `products.stock_quantity` e grava o `stock_movements` do
tipo `sale` — verificado: saldo 100 → 97 ao inserir 3 unidades. **Descontar de
novo pela aplicação tira o dobro de cada venda**, e a primeira versão da
integração do portal fez exatamente isso. Por isso `salesApi.recordSale` só
grava a venda e os itens, e o comentário lá é longo de propósito.

O trigger **não** reage a mudança de `sales.status`: estornar uma venda não
devolve o estoque sozinho. O app ainda não estorna; quando estornar, é preciso
devolver à mão, como `app/vendas/actions.ts` faz no portal.

**17. `apply_stock_movement` IGNORA o `p_type` — ela só SOMA o `p_quantity`.**
Verificado: saldo 10, tipo `out`, quantidade 3 → saldo **13**. Quem carrega o
significado é o SINAL da quantidade, e quem decide o sinal é quem chama. O
`p_type` serve só para o histórico ler depois.

`stockApi.createStockMovement` passa o `delta` **já assinado**, como vem do
`stockAdapter` (que lê "+10" e "−3" do campo). Mandar `Math.abs(delta)` com
`p_type: 'out'` esperando que a função subtraia **aumentaria** o estoque.

A função também **não** atualiza `products.cost` nem lança a despesa em `costs`.
O portal faz as duas coisas à mão; o app ainda não, porque o sheet de
movimentação não pede custo unitário.

**18. `sender_side` do cliente é `'client'`, não `'customer'`.** É o que o
portal grava e o que o painel admin lê. A grafia errada não daria erro nenhum —
a mensagem seria salva e apareceria na conversa; o que quebraria em silêncio é
a leitura de "não lida", que é o que alimenta o badge da tela "Mais".

**19. Datas: `toISOString()` NÃO serve para colunas `date` puras.**
`costs.cost_date` e `v_daily_sales.day` são `date` sem fuso. Às 21h de Brasília
o ISO já aponta para o dia seguinte — um custo lançado à noite cairia fora do
mês em que foi pago, e "vendas de hoje" perderia o próprio dia. Por isso
`@utils/dates` tem `toDateOnly`, que monta `YYYY-MM-DD` no fuso LOCAL, e tem
teste dedicado. Para colunas `timestamptz` (`sold_at`, `created_at`) o ISO está
certo — o fuso vai embutido.

**20. `!inner` nos embeds que servem de FILTRO.** Em
`sale_items?select=...,sales!inner(...)` com filtro em `sales.status`, sem o
`!inner` o PostgREST devolve o item com `sales: null` em vez de removê-lo — e
itens de vendas estornadas entram na soma do dia.

**21. O `select` do PostgREST precisa ser string LITERAL.** O tipo é inferido do
texto; uma concatenação vira `string` e o resultado perde a forma, levando o
TypeScript junto. Vale para todos os `*Api.ts`.

**22. `maybeSingle()` e não `single()` quando "zero linhas" é um estado real.**
Usuário do Auth sem linha em `profiles` acontece (conta criada e ainda não
vinculada a um negócio). Com `single`, isso vira erro de rede — e a tela diria
"sem conexão" para quem está perfeitamente conectado.

**23. O auto-refresh do token precisa do `AppState`.** O `autoRefreshToken` é um
`setInterval`, e o sistema congela timers em segundo plano. Num app de balcão a
tela apaga entre um cliente e outro; sem `startAutoRefresh`/`stopAutoRefresh`
atrelados ao `AppState`, o token vence e a primeira ação ao voltar — justamente
uma venda — falha com 401. Está em `services/supabase.ts`, fora de qualquer
hook, porque o assinante precisa ser único.

**24. A sessão NÃO cabe no SecureStore.** O limite é ~2 KB por valor e a sessão
do Supabase passa disso (dois JWTs + metadados). Gravá-la direto ali falha e o
usuário é deslogado a cada relaunch, sem explicação. Daí o `LargeSecureStore`:
chave AES-256 no SecureStore (32 bytes), conteúdo cifrado no AsyncStorage.

**25. `react-native-get-random-values` é NATIVO — instalar não basta, tem que
reconstruir.** `pnpm add` põe o JS no `node_modules`; o código nativo só entra
no binário com `pnpm ios` / `pnpm android` (`expo run:*`). Num app compilado
ANTES da instalação, o import passa e a chamada estoura — e estoura no meio do
login, na hora de gravar a sessão, ou seja **depois** de o Supabase já ter
autenticado com sucesso.

O sintoma é traiçoeiro: o login "não faz nada" e não navega. Pior ainda se todo
erro de `signIn` for traduzido como `network` — a mensagem "sem conexão com o
servidor" manda depurar exatamente o lado que está saudável. Por isso existem
`SessionStorageError` e o código de erro `storage`, e por isso
`ensureRandomness()` falha com uma mensagem que diz para reconstruir.

**26. O `ios/` pode estar defasado em relação ao `node_modules`, e o erro do
CocoaPods não diz isso.** Aconteceu de verdade: `Podfile.lock` em
`ExpoModulesCore 57.0.7` enquanto o `node_modules` já tinha `57.0.10` (o
`pnpm-workspace.yaml` pede as versões novas em `minimumReleaseAgeExclude`). O
CocoaPods reclama de **um** pod e sugere `pod update <aquele> --no-repo-update`
— mas quando vários derivaram (ali eram três: Core, Asset e FileSystem), o
update de um só cascateia no seguinte.

O que resolve de uma vez, sem destruir o projeto Xcode:

```bash
cd apps/mobile/ios && pod update --no-repo-update
```

`ios/` e `android/` são pastas GERADAS (estão no `.gitignore`), então
regenerá-las é seguro. Se `pod update` não bastar, o próximo passo é
`npx expo prebuild --clean -p ios`.

---

## 9. Mapa de progresso

- [x] **Fase 1 — Fundação.** Expo Router, aliases nos três lugares, tema restyle
      claro/escuro com os tokens do design, Manrope, jest node, ESLint com a
      regra anti-hex, `app.json` com bundle id e splash.
      *Portão: typecheck ✅ lint ✅ test ✅*
- [x] **Fase 2 — Domínio e mocks.** 9 domínios em Api/Adapter/Service/useCases,
      fixtures no formato cru, 157 testes puros.
      *Portão: typecheck ✅ lint ✅ test ✅*
- [x] **Fase 3 — Shell e navegação.** Portão puro, login, bloqueio, 404, Stack +
      chrome sobreposta, tab bar por entitlement, FAB, barra do carrinho, toast,
      confirm, bottom sheet.
      *Portão: typecheck ✅ lint ✅ test ✅ export ios ✅*
- [x] **Fase 4 — Telas.** Início, Vender, Produtos, Mais, Caixa (2 estados),
      Estoque, Custos, Relatórios, Configurações (4 abas), Suporte (lista +
      thread) e os 5 sheets.
      *Portão: typecheck ✅ lint ✅ test ✅ export ios ✅*
- [x] **Fase 5 — Backend Supabase (integração online).** Cliente com sessão
      criptografada, login real, portão por `has_module('app')` e os nove
      domínios lendo/escrevendo no banco. `src/data/` e `mockLatency` removidos.
      *Portão: typecheck ✅ lint ✅ test ✅ (196) export ios ✅*
- [x] **Fase 5.1 — Navegação persistente.** As cinco raízes viraram um `Tabs`
      que não desmonta, a verificação de acesso subiu para um guardião acima das
      abas (com trava), a tab bar perdeu o estado de carregamento e o
      carregamento de dados virou `Skeleton` dentro do conteúdo. Trocar de aba
      passou a ser um `jumpTo` — instantâneo, sem refetch e sem piscar. Ver §4.
      *Portão: typecheck ✅ lint ✅ test ✅ (231) export ios ✅*
- [x] **Fase 5.2 — Aba × tela interna.** A tab bar e o botão Vender desceram do
      layout de `(app)` para o de `(tabs)`, e com isso passaram a existir só nas
      quatro abas principais. Configurações, Suporte, Estoque, Relatórios e
      Vender abrem em tela cheia, com header e voltar, e desempilham de volta
      para a aba de origem. As rotas já estavam nos grupos certos — o que mudou
      foi o nível em que a chrome é montada. Ver §4.
      *Portão: typecheck ✅ lint ✅ test ✅ (231)*
- [x] **Fase 6 — Vendas offline com fila e sincronização manual.** A venda
      fechada sem internet vai para uma fila em SQLite local e sobe depois, no
      botão, pelo mesmo `recordSale` de sempre. Ver §13.
      *Portão: typecheck ✅ lint ✅ test ✅ (293) export ios ✅*

---

## 10. Pendências e próximos passos

**Fora de escopo desta entrega, com o botão preservado no desenho** (cada um
mostra hoje um toast explicando o que faria):

- **Câmera de código de barras** em Vender → `expo-camera` + permissão no config.
- **Anexar foto** no chamado → `expo-image-picker` + permissão.
- **Exportar PDF / planilha** em Relatórios → `expo-print` + `expo-sharing`.
- **"Falar com o suporte" na tela de bloqueio** → precisa de canal EXTERNO
  (WhatsApp/e-mail via `Linking`), porque o suporte in-app é justamente o que
  aquele plano não tem.

- **Recuperação de senha de verdade** → hoje as três telas são uma simulação
  (§7.1). O caminho é trocar o miolo de `domain/session/passwordRecovery.ts` por
  `Api`/`Adapter`/`Service` como os outros domínios, e decidir entre o OTP que a
  interface já desenha (`supabase.auth.verifyOtp` com `type: 'recovery'`, que
  devolve sessão e permite trocar a senha dentro do app) e o link do
  `resetPasswordForEmail` — este último exige `redirectTo` com o scheme
  `aguiarone://` e uma rota que receba o deep link. **O aviso de simulação e o
  código `1234` saem da tela junto com o mock.**

**Melhorias propostas, não implementadas** (fora do escopo pedido):

1. **Sentry + ErrorBoundary** no `app/_layout.tsx`. App em produção sem crash
   reporting é depuração às cegas. É a primeira coisa a fazer.
2. **Segundo projeto de jest (`jest-expo` + RNTL)** para componentes críticos:
   `CartSheet`, `CloseOutSheet`, `TabBar` por entitlement. A infra já está
   pronta (`jest.config.js` usa `projects`, e `jest-expo` +
   `@testing-library/react-native` já estão instalados) — falta o segundo bloco.
   Ficou mais urgente depois da fase 5: o `CloseOutSheet` agora manda o
   **contado em dinheiro** para o banco, e um erro ali carimba diferença errada
   no fechamento do caixa.
3. **E2E com Maestro** nos fluxos que dão dinheiro: login → montar carrinho →
   finalizar; abrir caixa → sangria → fechar com diferença.
4. **CI (GitHub Actions)**: `typecheck + lint + test` em cada PR.
5. **`app.config.ts` tipado** no lugar do `app.json`, quando existir mais de um
   ambiente (dev/staging/prod com bundle id e ícone próprios).
6. **i18n completo.** Hoje `src/i18n/` centraliza só **mensagens** (erros por
   `codigo`, toasts, confirmações) — o que é acoplado a comportamento e o que
   aparece em mais de uma tela. Rótulo estático segue junto do JSX, onde é
   conferível linha a linha contra o protótipo. Extrair 100% é o passo natural
   quando entrar um segundo idioma.
7. **`FlashList`** se algum catálogo passar de ~100 itens. Hoje as listas são
   curtas e o `.map()` dentro do `ScrollView` do `Screen` é adequado.
8. **Validação com `zod` dentro dos adapters**, quando o backend real entrar:
   um campo que sumiu no servidor vira erro nomeado na fronteira, e não
   `undefined` explodindo três telas adiante.

---

## 11. A virada para o Supabase (fase 5) — FEITA

A aposta da arquitetura se pagou: **os nove adapters, os seletores, as stores e
quase todas as telas ficaram intactos.** O que mudou foi o corpo dos `*Api.ts`.
Mas a previsão original errou em cinco pontos, e cada um deles é uma lição.

### 11.1 O que a fase de mock adivinhou errado

**1. O `tenant_id` não vem do `user_metadata`.** Vem de `public.profiles`. A
diferença não é cosmética: `user_metadata` é **gravável pelo próprio usuário**
(`supabase.auth.updateUser`), então dava para escrever o `tenant_id` de outro
negócio e o app acreditaria. `profiles` é protegida por RLS e só o admin
escreve. É a mesma leitura que o portal faz em `lib/sessao.ts`.

**2. Dinheiro no banco é `numeric` em REAIS, não inteiro em centavos.** O app
continua trabalhando só com centavos — a conversão acontece na **fronteira de
rede**, nos dois sentidos (`realToCents` na leitura, `centsToReal` na escrita).
Ficou no `*Api.ts` e não no adapter de propósito: é uma diferença de UNIDADE
entre dois sistemas, não uma tradução de modelo, e mantê-la ali foi o que
permitiu não tocar em nenhum adapter nem em nenhum teste.

**3. Vários `*ApiTypes.ts` viraram DTOs COMPOSTOS**, e não espelhos de tabela.
`TenantAPI` junta `tenants` + `plans` + `v_active_modules`; `DailySummaryAPI`
junta `v_daily_sales` + um agregado de `sale_items`. A composição é trabalho da
fronteira; a tradução, do adapter. Isso não estava previsto e é o motivo de o
contrato ter sobrevivido.

**4. `renews_at` não existe** em `tenants`. O campo continua no contrato,
sempre `null` — a tela já sabe escondê-lo. Inventar uma data calculada seria
pior: apareceria como fato na tela do cliente.

**5. `stockService` não faz mais duas escritas.** A previsão estava certa —
virou uma função SQL única. Ver a armadilha 17.

### 11.2 O que mudou fora dos `*Api.ts` (e por quê)

| onde | mudança | motivo |
|---|---|---|
| `sessionStore` | **deixou de ser persistido** | quem persiste a sessão agora é o cliente Supabase, criptografada. Duas cópias divergiriam no pior momento: token revogado no servidor, `user` ainda no disco |
| `sessionAdapter` | ganhou as 3 negativas de acesso | `no_tenant`, `platform_admin`, `suspended` — quem cai nelas digitou a senha certa |
| `catalogService.moveStock` | **removido** | `apply_stock_movement` já ajusta o saldo. Mantê-lo descontaria o estoque duas vezes |
| `cashService.closeCash` | recebe o **contado**, não a diferença | quem calcula esperado e diferença é `close_cash_register`, no banco |
| `tenantSpecialCategory` | virou `specialCategoryOf(products)`, puro | era uma tabela fixa tenant → rótulo dentro do Api. Não sobrevive a backend real: o rótulo é leitura do próprio catálogo |
| `settings.tsx` | ganhou `onError` no salvar | sem ele, a recusa do RLS não daria retorno NENHUM na tela |

---

## 12. O que o banco precisa (descoberto na integração)

Ordenado por quanto dói. Os dois primeiros são visíveis para o cliente hoje.

**1. Falta a política de UPDATE em `tenants`.** Configurações › Negócio **não
salva**. A escrita passa sem erro e afeta zero linhas — por isso o
`tenantApi.updateTenant` confere a contagem e devolve `null`, que vira o erro
`forbidden` e um toast honesto. Sem essa checagem, a tela diria "salvo" e o nome
voltaria ao antigo na carga seguinte.

```sql
create policy "dono atualiza o próprio negócio" on tenants
  for update using (id = current_tenant_id())
  with check (id = current_tenant_id());
```

**2. Não existe `activity_log`.** O feed de atividades em Configurações vem
**sempre vazio**. `listActivities` devolve `[]` de propósito: sintetizar
"atividades" a partir de vendas e movimentações pareceria um log de auditoria
sem ser um, e alguém acabaria confiando nisso para saber quem fez o quê.

**3. Falta CHECK (ou enum) nas colunas de estado.** Verificado no levantamento
do portal: `'__x__'` foi **aceito** em `sales.payment_method`, `sales.status`,
`costs.type`, `costs.origin` e `cash_registers.status`. Enquanto não houver,
`src/domain/shared/dbEnums.ts` é a única coisa segurando o vocabulário deste
lado — e ele **precisa continuar igual** ao de `apps/portal-client/lib/dados/`.

**4. `create_sale` transacional.** Registrar uma venda são duas escritas sem
transação (`sales`, depois `sale_items`). O `salesApi` apaga a venda órfã se a
segunda falhar, mas isso é remendo: o certo é uma função no banco, que de quebra
levaria a baixa de estoque para dentro dela.

**5. E-mail do funcionário.** Vive em `auth.users`, fora do alcance do RLS.
A aba Equipe mostra o campo vazio, igual ao portal.

**5b. `platform_settings` não é legível pelo app — resolvido por função.**
A tabela tem política `is_platform_admin` (ver
`apps/portal-admin/lib/autorizacao.ts`), então o usuário de tenant recebe **200
com zero linhas**, não 403 — "bloqueado pelo RLS" e "chave inexistente" chegam
idênticos ao app.

O botão "Falar com o suporte" da tela de bloqueio precisa do número, então a
migration `20260807000000_platform_whatsapp_contact.sql` cria
`platform_whatsapp_contact()` — SECURITY DEFINER, executável por
`authenticated`, expondo **um** valor. A tabela continua fechada.

Escolhida no lugar de uma policy de SELECT na tabela porque
`platform_settings` é um chaveiro genérico (guarda também `trial_days`,
`default_modules`, `inactivity_notify`): abrir a tabela cria uma superfície que
precisaria ser revista a cada chave nova, e revisão que depende de alguém
lembrar é revisão que uma hora não acontece.

⚠️ **Enquanto a migration não for aplicada, a RPC não existe e o botão cai no
fallback** — avisa e oferece o e-mail. É o comportamento correto, não um bug.

**6. O custo praticado na venda não é guardado.** `sale_items` tem `unit_price`
(o preço no momento, correto) mas não o custo. O lucro do dia é calculado com o
custo **atual** do produto — se o fornecedor mudou o preço ontem, o lucro de
hoje sai com o custo novo. Um `unit_cost` em `sale_items` resolveria.

---

## 13. Vendas offline com fila e sincronização manual

**A promessa:** o app não para de vender sem internet. A venda fechada offline
é guardada no aparelho e entra no sistema depois, quando o vendedor apertar o
botão — como uma venda NORMAL, pelos gatilhos de sempre. Ela só chega atrasada.

### A regra que sustenta tudo

**Não existe segundo caminho de escrita de venda.** A venda da fila sobe pelo
mesmo `salesApi.recordSale` do balcão, com o mesmo INSERT. É isso que garante
que a baixa de estoque (que é um trigger em `sale_items`) valha igual para as
duas. Um caminho privilegiado para a venda offline seria a maneira mais rápida
de as duas divergirem.

### As peças

| arquivo | papel |
|---|---|
| `services/database.ts` | abre o SQLite e aplica o schema. **Único** a falar com `expo-sqlite` |
| `sales/offlineQueueApi.ts` | a fronteira local: grava, lê, marca, apaga. Irmão do `salesApi` |
| `sales/offlineQueueAdapter.ts` | linhas do SQLite ⇄ `PendingSale`, e fila → payload de venda |
| `sales/syncErrors.ts` | por que a venda não subiu, em código de domínio |
| `sales/salesService.ts` | a bifurcação (online × fila) e o laço da sincronização |
| `useCases/usePendingSales.ts` | fila, contagem, sincronizar e descartar |
| `app/(app)/pending-sales.tsx` | a tela |

### Por que SQLite e não AsyncStorage

O requisito é "uma venda registrada não pode se perder", e é justamente aí que o
AsyncStorage falha: guardar a fila como um JSON obriga, a cada venda, a ler o
array inteiro, dar push e **regravar tudo**. Duas escritas simultâneas
(fechar uma venda enquanto a sincronização marca outra) e uma sobrescreve a
outra; o app morrendo no meio da regravação trunca o blob e leva a **fila
inteira**, não uma venda. No SQLite cada venda é uma linha e cada gravação é uma
transação.

### Não duplicar: o id nasce no aparelho

Cada venda offline recebe um **uuid v4 gerado no celular** (`utils/uuid.ts`), e
esse uuid é enviado como o `sales.id` do INSERT. Um segundo envio da mesma venda
bate na chave primária e o Postgres recusa — a garantia fica no **banco**, que é
o único lugar onde ela vale mesmo com o aparelho desligando no meio.

Daí a duplicata (`23505`) **não** ser tratada como "pronto, subiu" sem olhar:
existem dois passados possíveis, e `salesApi.saleHasItems` os separa. Se a venda
subiu inteira, é só tirar da fila; se ficou só o cabeçalho (o `sales` entrou, o
`sale_items` não, o app morreu antes de apagar a órfã), os itens são
completados. Sem isso ficaria no sistema uma venda de valor cheio, sem item
nenhum e sem ter tirado nada do estoque.

⚠️ **A venda ONLINE continua sem mandar id.** Se o `sales.id` do banco não
aceitasse um uuid vindo de fora, preencher nos dois caminhos derrubaria também a
venda comum — o app inteiro pararia de vender para proteger a fila. Do jeito que
está, a pior hipótese é a venda offline não subir, ficar na fila com o motivo à
vista e ninguém perder nada.

### O que a sincronização faz

Uma venda de cada vez, na ordem em que foram vendidas. A que sobe **sai** da
fila; a que falha **fica**, marcada com o motivo, e é reenviada na próxima. Nada
é apagado por ter dado errado — descartar é decisão do usuário, na tela, com
confirmação. O resumo do fim sempre começa pelo que deu certo.

Manual por decisão de produto: sincronizar sozinho ao voltar a conexão colocaria
vendas no sistema sem ninguém sabendo, e o erro de uma recusa por estoque
apareceria longe do momento em que dava para lembrar do que houve no balcão.

### O que continua verdade (e ainda dói)

- **O estoque mostrado offline é otimista.** O saldo conhecido é o do último
  momento com internet, e a venda enfileirada não desconta nada até subir. Por
  isso o app **não valida estoque no fechamento offline**: barrar uma venda por
  um número velho é impedir dinheiro de entrar por causa de um palpite. Quem
  decide é o gatilho, na sincronização.
- **Só VENDA tem fila.** Sangria e fechamento de caixa continuam exigindo
  internet — `close_cash_register` calcula a diferença no banco, e duplicar essa
  conta no cliente é outra fase.
- **Editar uma venda da fila não existe.** Para a venda recusada há descartar, e
  só. Corrigir os itens offline é o próximo passo natural desta tela.
- `SaleAPI.is_synced` segue sempre `true` e agora é **legado**: a venda que a
  fila entrega ao servidor é uma venda comum, e quem sabe o que está pendente é
  o SQLite, não uma coluna do Supabase.
- **Depende de rebuild.** `expo-sqlite` é módulo nativo: num binário compilado
  antes desta fase, a fila não existe. `pnpm ios` / `pnpm android`.

---

## 14. Histórico de vendas: ver, editar e estornar

**A promessa:** o que dá para fazer com uma venda no portal passa a dar para
fazer no balcão. Ver o detalhe, corrigir o que foi digitado errado e estornar —
sem abrir o computador, que é exatamente onde o dono do negócio **não** está no
momento em que percebe o erro.

### Três telas, e o que cada uma responde

| tela | pergunta |
|---|---|
| card do Início | "o que vendi agora há pouco?" — as **10** últimas de hoje |
| `app/(app)/sales/index.tsx` | "o que eu já vendi?" — tudo, por dia, paginado |
| `app/(app)/sales/[id].tsx` | "o que tinha nessa venda, e o que faço com ela?" |

O card do Início mostrava **3** e crescia sem limite conforme o dia andava,
empurrando o resto da tela para fora. Agora ele mostra dez e termina com a porta
do histórico ("Ver todas as vendas") — que é a única forma de chegar lá, como a
fila offline é alcançada pelo card dela.

### A rolagem infinita, e a porta que ela abriu no `Screen`

O histórico carrega **20 por vez** e busca as próximas ao chegar a 320px do fim.
Isso exigiu a única prop nova do `Screen` em muito tempo: `onEndReached`.

Ela mora lá porque **quem rola é o `ScrollView` do `Screen`** — a alternativa
seria a tela trazer o próprio `FlatList`, e `VirtualizedList` dentro de
`ScrollView` é erro em runtime, não questão de gosto. O `onScroll` só é ligado
quando alguém passa a prop: uma tela comum não paga por um callback a cada
quadro de rolagem.

⚠️ **A guarda `!isFetchingNextPage` é obrigatória** em quem consome. O evento
repete enquanto o dedo está na faixa final; sem ela, uma rolagem até o fim pede
a mesma página quatro ou cinco vezes e a lista aparece com vendas duplicadas.

### As peças novas

| arquivo | papel |
|---|---|
| `sales/salesHistory.ts` | **função pura**: agrupa por dia local, soma o dia sem as estornadas |
| `salesApi.listSales` | a página do histórico — sem recorte de data e **com** as estornadas |
| `salesApi.fetchSale` | uma venda com os itens |
| `salesApi.setSaleStatus` / `moveSaleStock` | o estorno: status + volta do estoque |
| `salesService.refundSale` / `undoRefund` / `editSale` | as regras |
| `useCases`: `useSalesHistory`, `useSale`, `useRefundSale`, `useUndoRefund`, `useEditSale` | |
| `utils/payment.ts` | chave do banco → nome visível, num lugar só |

### O recorte, e por que o total NÃO é somado na tela

Quatro filtros: **Todas**, **Hoje**, **Mês atual** e **Selecionar período** (duas
datas `dd/mm/aaaa`, com qualquer uma das pontas opcional). O intervalo de cada
um sai de `rangeForFilter`, função pura e testada — "mês atual" calculado em UTC
devolve o mês errado na noite do dia 1º.

⚠️ **O `to` do intervalo é EXCLUSIVO** (meia-noite do dia seguinte, comparado com
`lt`). Com `lte` na meia-noite do próprio dia, a venda das 14h do último dia do
período ficaria de fora — o erro de relatório mais difícil de notar, porque a
lista fica *quase* certa. Tem teste com essa venda das 23h59.

O resumo do topo (`useSalesTotals`) é **consulta própria sobre o período
inteiro**, não a soma da página carregada. Com 20 vendas de um mês que tem 300,
somar a tela mostraria um terço do faturamento com toda a confiança do mundo.
O custo: `fetchSalesTotals` lê uma linha (duas colunas) por venda do recorte.
Barato no porte deste app, **e não escala para sempre** — a substituição certa é
uma função de agregação no banco, que é migração e não código de tela.

### A estornada NÃO some da lista

Ela fica riscada, com selo, **fora do total do dia**. É o mesmo desenho do
portal e pela mesma razão: é essa linha que explica ao contador por que o
caderno e o sistema divergem naquele dia. Apagar faria o número fechar e a
história sumir.

### O estorno devolve o estoque À MÃO

⚠️ O trigger de `sale_items` só reage à **inserção** do item — mudar
`sales.status` não move saldo nenhum. Por isso `moveSaleStock` chama
`apply_stock_movement` item a item, com a quantidade **assinada** (a função
ignora o `p_type` e soma o que recebe — ver `shared/dbEnums`). Sem isso,
estornar tiraria a venda do faturamento e deixaria a mercadoria fora da
prateleira.

A ordem é **status primeiro, estoque depois**. Se a devolução falhar no meio, o
pior caso é uma venda estornada com saldo a ajustar à mão — e o app **diz isso
em voz alta** (`toasts.stockNotReturned`) em vez de fingir sucesso. Na ordem
inversa o pior caso seria mercadoria de volta ao estoque com a venda ainda
contando no faturamento.

### Editar é estornar e registrar de novo

Mesma decisão do portal (`apps/portal-client/app/vendas/actions.ts`): a venda
antiga é estornada e uma nova entra no lugar. Reescrever a linha original
apagaria o rastro da correção e exigiria uma lógica nova só para acertar a
diferença de estoque entre o carrinho velho e o novo. O custo, visível e
honesto: o histórico fica com **duas linhas**.

O caminho na interface passa pelo **carrinho**: "Editar venda" carrega os itens
e leva para Vender, com `cartStore.editingSaleId` guardando de qual venda eles
vieram. Enquanto esse campo estiver preenchido, o botão do `CartSheet`
substitui em vez de registrar. **Nada é tocado no servidor até salvar** — sair
da edição não desfaz coisa alguma, e o diálogo diz isso.

O `editingSaleId` mora no carrinho, e não numa prop de tela, porque o carrinho
sobrevive à navegação: quem edita pode ir a Produtos conferir um preço e voltar.

### Sem caminho offline — e isso é dito na tela

Vender funciona offline (§13); **estornar e editar não**. Os dois dependem de
ler os itens no servidor e chamar a função de estoque do banco, e enfileirar
isso seria prometer o que não dá para cumprir: a edição deixaria a antiga
estornada no servidor e a substituta dormindo no aparelho. Offline, os botões
somem e o aviso aparece no lugar deles.

### Pendência descoberta aqui: duas grafias na mesma coluna

O app grava `debit_card`/`credit_card` (as chaves de
`preferencesStore.PAYMENT_METHODS`); o portal grava `debit`/`credit`
(`lib/dados/vendas.ts`). **A coluna `sales.payment_method` tem as duas**, e um
negócio que vende pelos dois canais vê as duas no histórico. `utils/payment.ts`
traduz as seis chaves para não mostrar identificador cru na tela, mas isso é
curativo: unificar é **migração de dados**, não mudança de rótulo, e precisa ser
combinado com o portal antes.

---

## 15. Editar produto pela lista (o `⋯` de Produtos)

O `⋯` de cada linha **abre o mesmo sheet do cadastro rápido**, com os campos
preenchidos. Um sheet só, e não dois: os campos são idênticos, e o que muda
entre cadastrar e corrigir um preço é de onde vêm os valores iniciais e para
onde vai o salvar. Duas telas se desencontrariam na primeira vez que um campo
novo entrasse em uma delas.

`Sheet` ganhou `productId?` — **ausente é cadastro, presente é edição**. O
`ProductSheet` resolve o produto no cache do `useCatalog` (quem tocou na linha
veio de uma lista já carregada) e só então monta o formulário, para os valores
iniciais existirem no primeiro render. Se o id não estiver no cache, o sheet diz
isso em vez de abrir campos vazios — salvar em branco apagaria nome e preço.

**O código de barras virou campo (opcional) do formulário.** Antes só o backend
o preenchia; agora `NewProduct.code` e `ProductUpdate.code` chegam ao adapter,
que apara e converte vazio em `null` — nunca `''`, que casaria com busca vazia e
brigaria com o índice único. Conflito de código volta do Postgres como `23505` e
é traduzido em `duplicate_code`: sem isso viraria "erro de rede", mandando o
dono tentar de novo para sempre num conflito que só ele resolve.

**A quantidade em estoque NÃO é editável aqui**, e é a decisão central desta
tela. Saldo se move por movimentação (`apply_stock_movement`, com motivo e na
mesma transação); um campo "quanto tem" no formulário sobrescreveria o saldo por
cima do livro e apagaria o rastro do ajuste. O sheet mostra o saldo atual e
manda para Estoque. O **mínimo**, esse sim, é configuração do produto e muda
aqui — e `stock_min` só entra no `update` quando veio número, porque `null` é
"não tenho esse campo" (plano sem estoque), não "zera o aviso".

Editar **não é otimista**, ao contrário de favoritar: preço que aparece alterado
e volta atrás é pior que meio segundo de espera — pode haver venda no meio.

---

## 12. Referência de design

**Fonte de verdade:** o protótipo `design.html` (Claude Design). Não apagar esta
seção — é o que permite conferir fidelidade sem o arquivo em mãos.

### Tokens (claro → escuro)

| token | claro | escuro |
|---|---|---|
| bg | `#eef2f4` | `#0b1a21` |
| surface | `#ffffff` | `#132a34` |
| surface2 | `#f4f8f9` | `#193540` |
| line | `rgba(15,42,54,.11)` | `rgba(255,255,255,.10)` |
| text | `#0f2a34` | `#e9f2f4` |
| muted | `#5f7783` | `#94aeb8` |
| teal | `#0e7c86` | `#2fb3ba` |
| tealsoft | `#e0f1f2` | `rgba(47,179,186,.16)` |
| green | `#17795e` | `#43c193` |
| greensoft | `#e2f2ec` | `rgba(67,193,147,.15)` |
| red | `#c4453c` | `#e3736a` |
| redsoft | `#fbe9e7` | `rgba(227,115,106,.15)` |
| amber | `#a9700f` | `#e0a950` |
| ambersoft | `#fbf0dc` | `rgba(224,169,80,.14)` |
| petrol | `#123c4a` | `#0d2029` |
| onpetrol | `#eaf4f5` | `#e9f2f4` |

Fixos nos dois temas: toast `#0f2a34`, gradiente do FAB
`#149ba6 → teal → #0b6b74`.

### Formas e movimento

Raios: 11–14 em botão-ícone e chip interno; 14–18 em input e card de lista;
20–22 em card grande; 28 no topo do sheet; 999 em pill.
Tab bar 88px. FAB 58px. Botão primário 52–56px.

Movimento (em `src/components/patterns/animacoes.ts`):
`aoUp` 14px + fade em 220ms · `aoSheet` slide de baixo em 260ms com
`cubic-bezier(.2,.8,.25,1)` · `aoFade` 200–300ms · `aoPulse` opacidade
1 ↔ 0,45 em 1,6s infinito.

### Semântica de cor

teal = ação · verde = positivo · âmbar = atenção · vermelho = destrutivo ou
negativo. Em Relatórios, a cor do **valor** segue o significado da linha ("Saiu"
é sempre vermelho, mesmo caindo), e a cor da **variação** segue se aquilo é boa
notícia (despesa subindo é âmbar, não verde).

### Regras de negócio no protótipo

- Grade de Vender sem busca = só favoritos; máximo 8 cartões.
- Badge de estoque: verde "N em estoque" · âmbar "N — está baixo" · vermelho
  "Sem estoque".
- Toast dura 4,2s. No protótipo o de venda finalizada tinha **Desfazer**, que
  restaurava o carrinho e reabria o sheet. **Divergimos aqui**: o botão saiu.
  Ele desfazia só o CARRINHO — a venda continuava em `sales`/`sale_items` e o
  gatilho do banco já tinha baixado o estoque, então tocar nele e finalizar de
  novo criava uma segunda venda, com receita e baixa em dobro. Volta quando
  existir estorno de verdade no banco (cancelar a venda e devolver o estoque).
  Mesmo motivo do banner teal logo abaixo: um botão que promete o que não faz é
  pior que a ausência dele.
- Offline: banner âmbar. Ao voltar: banner teal por 2,4s e depois o toast
  "Tudo sincronizado. Nada se perdeu."
  **Divergimos aqui, na fase 6.** No protótipo o banner teal era um `setTimeout`
  de 2,4s disparado por ficar online — anunciava uma sincronia que não existia.
  Agora o teal só aparece enquanto a fila está REALMENTE subindo, e quem o liga
  é o caso de uso. Um banner que diz "sincronizando" sem sincronizar ensina o
  vendedor a não acreditar nele justamente no dia em que ele importa.
- Finalizar venda leva de volta para Vender.
- Abrir um chamado não lido apaga o badge da tela "Mais".
