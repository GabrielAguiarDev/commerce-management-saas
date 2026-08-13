# Padding horizontal — onde ele mora

## O problema que este padrão resolve

O padding horizontal ficava no container **raiz** de cada tela. Funciona para
conteúdo estático, e quebra tudo que rola na horizontal: o conteúdo é cortado na
borda do *padding* e não na borda da **tela**, deixando uma faixa morta de 16px
de cada lado por onde o item desaparece cedo demais. Era visível na barra de
abas de Configurações e na fileira de chips de Relatórios e Produtos.

A responsabilidade está invertida: **a raiz da tela não tem padding horizontal.
Quem aplica o padding é o conteúdo.**

Assim a fileira que rola sangra até a borda real do aparelho, e o primeiro e o
último item continuam no prumo dos blocos estáticos de cima e de baixo.

## O token

Um só, em [`src/theme/theme.ts`](src/theme/theme.ts): **`spacing.screen`**
(hoje `16`). É o único token semântico da escala de espaçamento, e existe porque
este número precisa CONCORDAR entre dois lugares diferentes — o bloco estático e
o `contentContainerStyle` de quem rola. Nenhum `s16` solto no lugar dele.

Quem usa restyle escreve `paddingHorizontal="screen"`; quem escreve estilo cru
lê `theme.spacing.screen` via `useAppTheme()`.

## As três regras

### 1. A raiz da tela não tem padding horizontal

`<Screen>` desenha header, banner de conexão e a rolagem vertical — e **não**
aplica gutter ao conteúdo.

```tsx
<Screen title="Relatórios" subtitle={…}>
  {/* o conteúdo alcança a borda real da tela */}
</Screen>
```

### 2. Bloco estático vai dentro de `<Gutter>`

```tsx
<Screen title="Relatórios" subtitle={…}>
  <Chips … />               {/* rola: sangra, ver regra 3 */}

  <Gutter>
    <Card>…</Card>          {/* estático: recebe o gutter */}
  </Gutter>
</Screen>
```

**Atalho:** numa tela em que **nada** rola na horizontal, não envolva bloco por
bloco — use `<Screen padded>`, que aplica o gutter ao conteúdo inteiro de uma
vez. O padrão de `padded` é `false` de propósito: o caso seguro é o que se
escreve, para que ninguém ative por hábito e volte a cortar uma rolagem.

### 3. Rolagem horizontal leva o padding no `contentContainerStyle`

**Nunca no `style`.** No `style` do `ScrollView`/`FlatList` o padding recorta a
área visível e volta a cortar o conteúdo antes da borda — que é o defeito
original.

```tsx
<ScrollView
  horizontal
  contentContainerStyle={{ paddingHorizontal: theme.spacing.screen, gap: 8 }}
>
```

A mesma regra vale para a rolagem **vertical** da tela: o padding horizontal vai
no `contentContainerStyle`, junto com o vertical. É o que o `<Screen>` faz.

## Material Top Tabs

A barra de abas de Configurações é um `ScrollView` horizontal por dentro, então
segue a regra 3 — pelas opções que o navegador expõe:

```tsx
screenOptions={{
  tabBarScrollEnabled: true,
  tabBarContentContainerStyle: { paddingHorizontal: theme.spacing.screen },
  tabBarItemStyle: { width: 'auto', paddingHorizontal: 14 },
}}
```

`width: 'auto'` é **obrigatório** junto de `tabBarScrollEnabled`: sem ele a
biblioteca dá a cada aba 40% da largura da tela em vez de medi-la pelo texto.

**O indicador animado acompanha sozinho.** O `TabBar` do `react-native-tab-view`
lê o padding do próprio `contentContainerStyle` e injeta `start`/`end` no estilo
do indicador, além de somá-lo à largura total da barra. Não é preciso — nem
permitido — compensar com margem negativa.

Uma ressalva de implementação: use **só `paddingHorizontal`**, nunca
`paddingLeft`/`paddingRight` separados. A biblioteca passa `paddingStart` e
`paddingEnd` em ordem trocada num dos dois pontos de cálculo; com padding
simétrico os dois valores são iguais e isso é inofensivo, com padding assimétrico
o indicador sairia do lugar.

## O que NÃO fazer

- **Margem negativa para desfazer o padding do pai.** Se você precisar de uma,
  o padding está no nível errado — corrija o nível.
- **`overflow: 'hidden'` novo** num bloco que não tinha. Corta a sombra do card.
- **Divisor de largura total dentro de um bloco com gutter.** Hoje todo
  `<Divider />` do app vive **dentro** de um `<Card>` — é separador de linha de
  cartão e deve respeitar o padding do cartão. Se um dia aparecer um divisor que
  precisa atravessar a tela, ele fica FORA do `<Gutter>` e só o conteúdo do item
  entra nele.
- **`snapToInterval` sem recalcular.** Não existe nenhum no app hoje. Se entrar
  um, o padding do content container entra na conta do snap.

## Onde cada tela está hoje

Só **três** telas têm rolagem horizontal e portanto ficam sem gutter na raiz:

| Tela | Por quê | Como o conteúdo recebe o gutter |
|---|---|---|
| Configurações | barra de abas rolável | `tabBarContentContainerStyle` + `TabPane` |
| Relatórios | fileira de períodos | `<Chips>` se auto-aplica + `<Gutter>` no resto |
| Produtos | fileira de filtros | idem |

As outras onze usam `<Screen padded>`: Início, Caixa, Custos, Mais, Nova venda,
Estoque, Vendas pendentes, Suporte, Chamado, e as quatro abas de Configurações
(via `TabPane`).

**Ao criar uma tela nova:** comece com `<Screen padded>`. No dia em que ela
ganhar qualquer coisa que role na horizontal, tire o `padded`, envolva os blocos
estáticos em `<Gutter>` e deixe a fileira que rola solta.

## Exceção: as telas de entrada

`<AuthScreen>` (login, recuperação de senha) tem linguagem visual própria e já
usava o padrão certo — gutter de `28` no `contentContainerStyle`. Não usa
`spacing.screen` e não deve passar a usar: são números diferentes por decisão de
design, não por descuido.
