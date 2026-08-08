# Aguiar One — App mobile

Contexto vivo do projeto. **Leia este arquivo por inteiro antes de mexer no código.**
Ele vale mais que intuição: registra o que foi decidido, por quê, e as armadilhas
já descobertas.

Última atualização: **2026-08-06** (fase 5 — integração Supabase)

---

## 1. Visão geral

App de gestão para micro e pequenos negócios brasileiros: PDV, caixa, estoque,
custos, relatórios e suporte. Interface inteira em **pt-BR**, tom coloquial e
sem jargão contábil ("Sobrou hoje", "Quanto te custa", "O que sai do seu bolso").

É o cliente mobile do monorepo `aguiar-one-saas`, irmão de `portal-client` (web)
e `portal-admin`. Compartilha com eles o modelo de **tenant + módulos**.

**16 rotas**, sendo 12 telas de conteúdo, 5 bottom sheets e 3 estados de topo
(login, bloqueio, app).

### O ponto arquitetural central: módulos são entitlements

Os módulos (`cash`, `stock`, `costs`, `reports`, ...) **não são flags de demo**:
são o que o tenant contratou. Eles mudam, na mesma carga:

| onde | efeito |
|---|---|
| tab bar | o 3º item vira **Caixa** (com `cash`) ou **Custos** (sem) |
| tela "Mais" | a grade só mostra os módulos do plano |
| Início | o atalho de caixa e o alerta de estoque só existem com o módulo |
| Cadastro rápido | campos de estoque e de custo só aparecem se houver o módulo |
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

**Abas persistentes por dentro, pilha com chrome sobreposta por fora.** As cinco
raízes vivem num `Tabs` que nunca desmonta; o resto empilha sobre ele, com a tab
bar como overlay por cima de tudo. E o acesso é verificado UMA vez, num guardião
acima das abas. Ver §4.

**`nodeLinker: hoisted` no workspace.** Ver §8, Armadilha 1 — foi mudança na
raiz do monorepo, não só no app.

---

## 3. Estrutura & convenções

```
app/                        SOMENTE rotas
  _layout.tsx               splash hold + AppProviders + Stack raiz
  index.tsx                 a PORTA DA RUA (resolveEntryRoute, função pura)
  login.tsx  blocked.tsx  +not-found.tsx
  (app)/_layout.tsx         o GUARDIÃO (resolveAppGate) + Stack + chrome fixa
  (app)/(tabs)/_layout.tsx  as abas — montadas uma vez, barra própria em null
  (app)/(tabs)/{home,products,cash,costs,more}.tsx      ← trocam por jumpTo
  (app)/{sell,stock,reports,settings}.tsx               ← empilham
  (app)/support/{index,[id]}.tsx
src/
  components/
    ui/                     primitivos (Box, Text, Botao, Campo, Chips, Skeleton…)
    patterns/               compostos (Screen, TabBar, BottomSheet, hosts…)
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

### A tab bar é a casca, e casca não pisca

A chrome (tab bar, FAB, barra do carrinho, confirm, sheet) é um **overlay
absoluto irmão da pilha**, em `(app)/_layout.tsx`. É a leitura literal do
protótipo, onde ela é `position:absolute` sobre o conteúdo rolável — e é o que
mantém a barra visível também em Estoque, Suporte e Configurações, que um `Tabs`
comum esconderia ao empilhar.

A `TabBar` **não tem mais estado de carregamento**. Ela já teve `if (loading)
return null`, para não mostrar "Custos" num Plano Completo enquanto o plano não
chegasse; o efeito colateral era pior que o problema — a barra inteira sumia. A
espera foi para o guardião (`capabilitiesSettled`), que só libera com as
capacidades resolvidas. Quando a barra renderiza, não há instante a esconder.

### Duas famílias de rota, e elas não se alcançam igual

| | onde mora | como se alcança |
|---|---|---|
| **abas** — Início, Produtos, Caixa, Custos, Mais | `(app)/(tabs)/` | `goToRoot()` → `dismissAll` + `navigate` (jumpTo) |
| **empilhadas** — Vender, Estoque, Relatórios, Configurações, Suporte | `(app)/` | `router.push()`, com botão voltar |

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
`TabBar` do design system, um nível acima. Caixa **e** Custos moram nas abas,
embora só um dos dois seja o 3º item da barra em cada plano — os dois são destino
de raiz, e o que não está na barra continua acessível pela grade do "Mais".

`/sell` é raiz no protótipo mas **não** é aba: ela se empilha sobre as abas, com
a tab bar continuando visível por cima. Consequência visível: Nova venda passou a
ter botão voltar, porque agora existe de verdade uma tela embaixo dela. Antes o
`replace` fingia que não — e o voltar do Android já saía do app.

`backBehavior="none"` no `Tabs` é obrigatório aqui. O padrão (`firstRoute`) faria
o navegador tratar "voltar" como "ir para Início", `router.canGoBack()` viraria
`true` em Produtos/Caixa/Custos e o `Screen` desenharia um botão voltar que o
protótipo não tem.

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
| `carrinhoStore` | **não** | itens, forma de pagamento, snapshot do Desfazer |
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

**8. Por que o bottom sheet não é rota.** O sheet do carrinho precisa **reabrir a
partir do "Desfazer" do toast**, que vive fora da pilha. Como rota, isso exigiria
empurrar uma rota a partir de um componente global — e no iOS tudo que é
empilhado *depois* de um modal também é apresentado como modal, quebrando a
navegação seguinte.

**9. `Seletor` usa `Modal` do RN, e não overlay absoluto.** Ele é aberto de
dentro de um bottom sheet; um overlay comum ficaria por baixo.

**10. Toast: um por vez, e o timer do anterior é cancelado.** Sem isso, o timer
velho apaga o toast novo antes da hora.

**10b. O `ToastHost` mora no layout RAIZ, não no de `(app)`.** Ficou no
`(app)/_layout.tsx` por muito tempo — mas `login` e `blocked` estão FORA desse
grupo. Nas duas telas o `showToast` escrevia na store e **nada renderizava**: o
toque no botão não produzia efeito nenhum.

Doeu mais no LOGIN, onde o toast é o único retorno de erro que existe. Senha
errada, conta sem negócio, falha de rede — tudo silencioso, e o sintoma que
chegava era "o login não faz nada", que manda depurar navegação e rede em vez
da camada de UI.

Uma instância só. Montar na raiz **e** em `(app)` mostraria o toast duplicado
dentro do app. Como o afastamento inferior do design pressupõe tab bar + barra
do carrinho, o componente pergunta a `useSegments()` se está dentro de `(app)`
e desce para a margem normal quando não está — senão o toast flutuaria no meio
da tela de login.

Se criar uma tela nova fora de `(app)` que precise de confirmação ou de sheet,
`ConfirmHost` e `SheetHost` têm exatamente o mesmo problema: continuam só em
`(app)`, de propósito, porque hoje só o app os usa.

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
- [ ] **Fase 6 — Offline com sincronização.** Não iniciada, e deliberadamente
      fora da fase 5. Ver §13.

---

## 10. Pendências e próximos passos

**Fora de escopo desta entrega, com o botão preservado no desenho** (cada um
mostra hoje um toast explicando o que faria):

- **Câmera de código de barras** em Vender → `expo-camera` + permissão no config.
- **Anexar foto** no chamado → `expo-image-picker` + permissão.
- **Exportar PDF / planilha** em Relatórios → `expo-print` + `expo-sharing`.
- **Edição de produto** (o `⋯` da lista) → o protótipo também só avisa.
- **"Falar com o suporte" na tela de bloqueio** → precisa de canal EXTERNO
  (WhatsApp/e-mail via `Linking`), porque o suporte in-app é justamente o que
  aquele plano não tem.

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

## 13. Offline com sincronização — NÃO IMPLEMENTADO

Fase separada e posterior, deliberadamente fora do escopo da integração. O que
já está no lugar para quando ela chegar, e o que vai doer:

- `conexaoStore` e `useConnectionMonitor` já existem e já mostram o banner.
- `SaleAPI.is_synced` já existe no contrato, hoje sempre `true`. É o campo que
  passa a significar algo.
- **O ponto mais difícil não é a leitura, é a escrita.** Venda, sangria e
  fechamento de caixa geram id no servidor; uma fila offline precisa de id local
  e de reconciliação. E `close_cash_register` calcula a diferença no banco — não
  dá para fechar caixa offline sem duplicar essa conta no cliente.
- A baixa de estoque é feita por **trigger** no banco. Uma venda enfileirada
  offline não desconta nada até subir, então o saldo mostrado fica otimista.

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
- Toast dura 4,2s; o de venda finalizada tem **Desfazer**, que restaura o
  carrinho e reabre o sheet.
- Offline: banner âmbar. Ao voltar: banner teal por 2,4s e depois o toast
  "Tudo sincronizado. Nada se perdeu."
- Finalizar venda leva de volta para Vender.
- Abrir um chamado não lido apaga o badge da tela "Mais".
