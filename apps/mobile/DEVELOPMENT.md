# Aguiar One — App mobile

Contexto vivo do projeto. **Leia este arquivo por inteiro antes de mexer no código.**
Ele vale mais que intuição: registra o que foi decidido, por quê, e as armadilhas
já descobertas.

Última atualização: **2026-08-06**

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
| Credenciais | `expo-secure-store` (token) + AsyncStorage (preferências) | token em AsyncStorage é texto puro em disco | blueprint |
| Conexão | `@react-native-community/netinfo` | o chip de demo do protótipo saiu de escopo; o comportamento ficou | brief |
| Testes | `jest` puro (node) para lógica | suíte de 157 testes em ~0,3s | blueprint |

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

**O perfil vem do e-mail do login, não de um chip.** Os chips de demo ficaram
fora de escopo por decisão do brief. Para não perder os três caminhos do design,
o mock tem três credenciais (ver §7). Isso também é como vai funcionar de
verdade: o plano vem do tenant do usuário.

**Pilha de navegação com chrome sobreposta, e não abas.** Ver §4.

**`nodeLinker: hoisted` no workspace.** Ver §8, Armadilha 1 — foi mudança na
raiz do monorepo, não só no app.

---

## 3. Estrutura & convenções

```
app/                        SOMENTE rotas
  _layout.tsx               splash hold + AppProviders + Stack raiz
  index.tsx                 o PORTÃO (usa resolverRotaDeEntrada, função pura)
  login.tsx  bloqueio.tsx  +not-found.tsx
  (app)/_layout.tsx         Stack do app + chrome fixa (tab bar, FAB, sheets…)
  (app)/{inicio,vender,produtos,mais,caixa,estoque,custos,relatorios,config}.tsx
  (app)/suporte/{index,[id]}.tsx
src/
  components/
    ui/                     primitivos (Box, Text, Botao, Campo, Chips…)
    patterns/               compostos (Screen, BarraDeAbas, BottomSheet, hosts…)
    sheets/                 os 5 bottom sheets + SheetHost
    AppProviders.tsx        composição única de providers
    index.ts                a API pública do DS — telas importam SÓ daqui
  theme/                    palette.ts (hex) · theme.ts (tokens) · fonts.ts
  domain/<nome>/            Types / ApiTypes / Api / Adapter / Service / useCases
  data/                     fixtures NO FORMATO CRU DA API
  services/                 storageAdapter, mockLatency
  store/                    zustand: um arquivo por store
  hooks/                    useAppHydrated, useAppTheme, useMonitorDeConexao, navegacao
  i18n/                     mensagens (erros, toasts, confirmações)
  utils/                    dinheiro.ts, texto.ts (+ __tests__)
```

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

`@components @config @data @domain/* @hooks @i18n @services @store @theme @utils/*`

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

O protótipo tem **tab bar sempre visível E botão voltar em metade das telas**
(estado `pilha` + função `go()`). Um `Tabs` do Expo Router não entrega isso:
dentro de uma aba não há pilha para voltar, e telas como Estoque ou Suporte
perderiam ou o voltar, ou a tab bar.

**Solução adotada:** `app/(app)/_layout.tsx` é um `Stack` normal — push/pop
nativos, gesto de voltar do iOS, `router.canGoBack()` confiável — e a chrome
(tab bar, FAB, barra do carrinho, toast, confirm, sheet) é um **overlay absoluto
irmão da pilha**. É a leitura literal do protótipo, onde essa chrome é
`position:absolute` sobre o conteúdo rolável.

**As cinco raízes** (Início, Produtos, o atalho Caixa/Custos, Mais e Vender)
zeram a pilha via `irParaRaiz()` (`src/hooks/navegacao.ts`):

```ts
if (router.canDismiss()) router.dismissAll();
router.replace(rota);
```

`router.dismissTo()` sozinho **não serve**: quando o destino não está na pilha,
ele substitui só a tela do topo — saindo de Início › Estoque e tocando em
Produtos, o Início continuaria embaixo e o voltar apareceria numa aba raiz.

**O portão** (`app/index.tsx`) não decide nada: pergunta a
`resolverRotaDeEntrada()` (pura, testada) e obedece. Enquanto ela devolve `null`,
nada é renderizado e a splash continua segurando. Isso evita a versão clássica do
bug: dois `useEffect` de navegação disputando e o app em laço entre login e
início.

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

### O mock devolve o formato CRU

`src/data/*` guarda fixtures em **inglês, snake_case, com nulos** — não o modelo
de domínio. É a diferença entre um adapter vivo e um adapter decorativo: assim
todo dado do app atravessa a tradução desde o primeiro dia, e a virada para o
Supabase mexe em **uma função por domínio**.

Nulos deliberados nos fixtures, para o adapter ter o que defender:
`stock_qty: null` (não controla estoque) vs. `stock_qty: 0` (acabou);
`plan_name: null`; `difference_cents: null`; um resumo do dia inteiramente nulo.

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
| `sessaoStore` | sim (usuário + tenantId) | token vai para o **SecureStore**, não aqui |
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

## 7. Credenciais de demonstração

Qualquer senha com 6+ caracteres. O e-mail escolhe o tenant e, com ele, o plano:

| e-mail | negócio | plano | módulos |
|---|---|---|---|
| `maria@petshopamigo.com.br` | Petshop Amigo | Completo | caixa, estoque, custos, relatórios |
| `rita@acarajedarita.com.br` | Acarajé da Rita | Essencial | só custos |
| `joao@mercadinho.com.br` | Mercadinho da Esquina | sem `app` | → **tela de bloqueio** |

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

**11. `conexaoStore.definirOnline` ignora chamada com o mesmo valor.** O NetInfo
emite eventos repetidos ao trocar de rede; sem a guarda, o banner
"sincronizando…" reiniciava sozinho a cada emissão.

**12. `useCapacidades` expõe `carregando`.** Enquanto o plano não chegou, TODAS
as capacidades são falsas — a tab bar mostraria "Custos" num Plano Completo por
uma fração de segundo. Por isso a `BarraDeAbas` não renderiza durante o
carregamento, e o portão trata `temAcessoAoApp` como `null` (≠ `false`).

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
- [ ] **Fase 5 — Backend Supabase.** Trocar o corpo dos `*Api.ts`. Ver §11.

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
   `SheetCarrinho`, `SheetFechamento`, `BarraDeAbas` por entitlement. A infra já
   está pronta (`jest.config.js` usa `projects`, e `jest-expo` +
   `@testing-library/react-native` já estão instalados) — falta o segundo bloco.
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

## 11. A virada para o Supabase (fase 5)

Deve ser mecânica. O que muda:

1. **O corpo de cada `<nome>Api.ts`** — nove arquivos, todos marcados com
   `⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE`. Cada função vira um
   `supabase.from(...).select(...)`, mantendo assinatura e tipo de retorno.
2. `sessionApi.entrar` vira `supabase.auth.signInWithPassword` — o
   `sessionApiTypes.ts` já está modelado no formato do Supabase Auth.
3. `src/data/*` deixa de ser importado pelos Api (pode virar seed de teste).
4. `src/services/mockLatency.ts` sai de cena.
5. `stockService.registrarMovimentacao` faz **duas** escritas (movimentação +
   saldo). No banco isso vira uma função SQL única, no mesmo espírito de
   `admin_create_tenant` — para não existir movimentação sem saldo.

O que **não** muda: adapters, services, useCases, seletores, stores, componentes
e telas. Se a virada estiver dando trabalho, foi a camada que vazou antes.

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
