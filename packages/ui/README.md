# @aguiar/ui

A biblioteca de componentes dos portais Aguiar One. Hoje consumida por
`apps/portal-admin` e `apps/portal-client`.

## O que entra aqui

Uma peça é da lib quando **os dois portais a desenham igual** e ela não sabe
nada do negócio de nenhum dos dois. O `Selecao` não sabe o que está na lista; o
`MenuAcoes` não sabe o que as ações fazem.

O que **não** entra: telas, cartões de módulo, itens de navegação, selos que
traduzem um status de negócio numa cor. Isso fica no `components/` e no
`lib/styleKit.ts` de cada app, montado sobre as peças daqui.

O caso do meio — uma peça comum que precisa do estado do app — resolve-se com um
invólucro fino no app. `MenuLinha` (portal) e `ModalBase` (portal) são isso: dez
linhas que ligam o componente da lib ao provider e nada mais.

## Como usar

```tsx
import { css, MenuAcoes, Selecao, selo } from "@aguiar/ui";
```

Os tokens entram uma vez, no `globals.css` de cada app:

```css
@import "tailwindcss";
@import "@aguiar/ui/tokens.css";
```

As fontes — Public Sans no texto, IBM Plex Mono nos números — são as mesmas nos
dois portais. Cada app as carrega em `layout.tsx` sob os nomes `--font-sans` e
`--font-mono`, e `tokens.css` monta a pilha completa a partir daí:

```tsx
const sans = Public_Sans({ variable: "--font-sans", ... });
const mono = IBM_Plex_Mono({ variable: "--font-mono", ... });
```

Trocar a fonte de todos os portais de uma vez é trocar essas duas linhas em cada
`layout.tsx` — os componentes leem `SANS` e `MONO` e não sabem o nome de
nenhuma família.

A lib é publicada como TypeScript, sem passo de build: cada app a compila junto
com o seu próprio código, via `transpilePackages: ["@aguiar/ui"]` no
`next.config.ts`. Editar um arquivo aqui reflete no `next dev` na hora, sem
`pnpm build` no meio.

## Tokens

Um vocabulário só, claro e escuro, trocado por `data-tema="escuro"` no `<body>`.

| Grupo       | Tokens                                                          |
| ----------- | --------------------------------------------------------------- |
| Superfícies | `--bg` `--surface` `--surface2` `--surface3` `--surface-hover`   |
| Bordas      | `--border-soft` `--border` `--border2`                           |
| Texto       | `--text` `--text2` `--muted`                                     |
| Destaque    | `--accent` `--accent-ink` `--accent-soft` `--accent-line` `--accent-hi` |
| Estados     | `--pos` `--warn` `--danger`, cada um com `-soft` e `-line`       |
| Lateral     | `--side` `--side-card` `--side-text` `--side-text2` `--side-border` |

Cores de estado saem sempre da tabela de tons (`selo`, `corDoTom`,
`fundoDoTom`), nunca de um hex solto: é o que mantém "verde é resolvido,
vermelho exige ação" igual nos dois portais.
