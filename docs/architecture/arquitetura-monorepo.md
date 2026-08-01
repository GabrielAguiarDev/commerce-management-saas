# Arquitetura do Monorepo e Correção da Estrutura — Aguiar One

Guia para organizar o monorepo, corrigir a estrutura de pastas dos projetos
Next.js e definir como os domínios servem cada aplicação.

---

## 1. Decisão de arquitetura (o alvo)

### Domínios

| Aplicação          | Endereço                    | Público            |
|--------------------|-----------------------------|--------------------|
| Landing page       | `seudominio.com`            | visitantes         |
| Portal do cliente  | `app.seudominio.com`        | donos de comércio  |
| Painel admin       | `admin.seudominio.com`      | você (plataforma)  |

**Por que o admin fica isolado:** o admin controla todos os clientes e faz
operações privilegiadas. Mantê-lo num subdomínio próprio, separado do portal
que os clientes acessam, reduz a superfície de risco. Landing e portal são
para público/clientes, tudo bem ficarem no domínio principal (ou o portal
num subdomínio `app.`, como acima).

### Código

**Três projetos Next.js separados** no monorepo, cada um com deploy próprio.
O roteamento entre domínios é feito na **camada de hospedagem** (onde você faz
deploy), não no código. Cada app permanece simples e independente.

```
aguiar-one-saas/
├── apps/
│   ├── landing-page/     → seudominio.com
│   ├── portal-client/    → app.seudominio.com   (renomear de "portal"?)
│   ├── portal-admin/     → admin.seudominio.com
│   ├── mobile/           → app mobile (não é web)
│   └── api/              → Edge Functions / backend (ver seção 5)
├── packages/             → código compartilhado (ver seção 4)
├── package.json
└── (config do monorepo)
```

---

## 2. Corrigir a estrutura de pastas de cada projeto Next.js

**Problema atual:** no `portal-admin`, existe `app/admin/` com componentes
(`Sidebar.tsx`, `Modal.tsx`, os `*View.tsx`) misturados com arquivos de rota
(`page.tsx`, `layout.tsx`). Isso está errado por dois motivos:

1. A subpasta `admin/` cria a rota `/admin` — desnecessária, já que o projeto
   inteiro É o admin (ele vai morar em `admin.seudominio.com`, na raiz).
2. No App Router, a pasta `app/` é só para ROTAS. Componentes reutilizáveis
   não moram ali.

### Estrutura correta de um projeto Next.js (App Router)

```
portal-admin/
├── app/                      ← SÓ rotas (cada pasta = uma URL)
│   ├── layout.tsx            ← layout raiz
│   ├── page.tsx              ← página inicial (/)
│   ├── login/
│   │   └── page.tsx          ← /login
│   ├── clientes/
│   │   └── page.tsx          ← /clientes
│   ├── planos/
│   │   └── page.tsx          ← /planos
│   ├── modulos/
│   │   └── page.tsx          ← /modulos
│   ├── financeiro/
│   │   └── page.tsx          ← /financeiro
│   └── suporte/
│       └── page.tsx          ← /suporte
│
├── components/               ← componentes de UI (NÃO viram rota)
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── Modal.tsx
│   ├── Overlays.tsx
│   └── views/                ← as "Views" que o design gerou
│       ├── VisaoView.tsx
│       ├── DetalheView.tsx
│       ├── PlanosView.tsx
│       ├── ModulosView.tsx
│       ├── FinanceiroView.tsx
│       ├── SuporteView.tsx
│       ├── ConfigView.tsx
│       └── LoginView.tsx
│
├── lib/                      ← utilitários e integrações
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts          ← (só no admin; portal não tem)
│   ├── money.ts
│   └── icons.tsx
│
├── types/                    ← tipos TypeScript
│   └── types.ts
│
├── middleware.ts
├── .env.local
└── package.json
```

### Como migrar (passo a passo, sem quebrar)

O código que o Claude Design gerou veio todo despejado numa pasta. Reorganize
assim:

1. **Remova o nível `admin/`**: mova o conteúdo de `app/admin/` para `app/`
   diretamente. O `page.tsx` e `layout.tsx` que estavam em `app/admin/` vão
   para `app/`.

2. **Crie `components/`** na raiz do projeto (fora de `app/`). Mova para lá
   todos os componentes de UI: `Sidebar.tsx`, `Topbar.tsx`, `Modal.tsx`,
   `Overlays.tsx`, `AdminConsole.tsx`, e todos os `*View.tsx` (pode agrupar
   os Views numa subpasta `components/views/`).

3. **Crie `lib/`** e mova para lá: `money.ts`, `icons.tsx`, `css.ts`,
   `styleKit.ts`, `dictionary.ts`, e depois os clientes do Supabase.

4. **Crie `types/`** e mova `types.ts`, `viewProps.ts`.

5. **`data.ts` e `state.ts`**: se forem dados de exemplo (mock) do protótipo,
   vão sair quando você plugar o Supabase. Por ora, deixe em `lib/` ou numa
   pasta `mock/` para lembrar que é temporário.

6. **Atualize os imports**: ao mover arquivos, os caminhos de `import` mudam.
   Configure o alias `@/` no `tsconfig.json` (se ainda não tem) para importar
   de forma limpa: `import { Sidebar } from '@/components/Sidebar'`.

> **Ritmo:** faça isso enquanto o projeto é pequeno (~25 arquivos). É chato
> mas rápido agora; reorganizar depois de 200 arquivos é bem pior. Não precisa
> ser perfeito de primeira — o objetivo é separar ROTAS (em `app/`) de
> COMPONENTES (em `components/`) e integrações (em `lib/`).

### Repita para o portal do cliente

O `portal-client` segue a MESMA estrutura, com as rotas dele (dashboard,
vendas, produtos, estoque, caixa, custos, relatorios, configuracoes, suporte)
em `app/`, e os componentes em `components/`. Diferença: o portal **não tem**
`lib/supabase/admin.ts` (sem chave secreta — ver o guia de setup do portal).

---

## 3. Configuração do alias de import (`tsconfig.json`)

Para importar com `@/` em cada projeto, garanta no `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Assim `import { Sidebar } from '@/components/Sidebar'` funciona de qualquer
lugar do projeto, sem caminhos relativos frágeis (`../../../`).

---

## 4. Código compartilhado entre projetos (`packages/`)

Admin e portal do cliente vão compartilhar coisas — os tipos do banco, a
paleta/design tokens, talvez componentes de UI comuns (botões, modais). Em vez
de duplicar, coloque em `packages/`:

```
packages/
├── ui/          → componentes visuais compartilhados (opcional)
├── types/       → tipos do banco (gerados do Supabase)
└── config/      → paleta, constantes compartilhadas
```

> **Não faça isso agora.** Comece com cada projeto independente. Extraia para
> `packages/` só quando perceber duplicação real (o mesmo componente copiado
> em dois apps). Extrair cedo demais é over-engineering. É fácil mover para
> `packages/` depois.

**Dica valiosa:** o Supabase gera os TIPOS TypeScript do seu banco
automaticamente (a partir das tabelas que você criou). Isso dá autocomplete e
segurança de tipo em todos os projetos. Vale gerar e colocar em
`packages/types/` quando for integrar — consulte "Generating TypeScript Types"
na doc do Supabase.

---

## 5. A pasta `api/` e as Edge Functions

Você tem uma pasta `apps/api/`. Defina o papel dela:

- Se for para **Edge Functions do Supabase** (convite de usuário, cobrança
  futura, operações privilegiadas): elas normalmente vivem numa pasta
  `supabase/functions/` na raiz, gerenciada pela CLI do Supabase — não
  necessariamente em `apps/api/`. Vale conferir como você pretende fazer
  deploy delas.
- Se for um **backend próprio** (um servidor Node/Express separado): com
  Supabase + Edge Functions, você provavelmente NÃO precisa disso. Reavalie
  se essa pasta é necessária — pode ser complexidade que dá para eliminar.

> Recomendação: a maioria das operações vai direto do app para o Supabase
> (protegido por RLS). O pouco de "backend" que sobra são Edge Functions.
> Evite manter um servidor próprio a menos que tenha uma razão concreta.

---

## 6. Roteamento de domínios (na hospedagem)

O mapeamento domínio → projeto é feito onde você faz o deploy, não no código:

- Cada projeto (`landing-page`, `portal-client`, `portal-admin`) vira um
  deploy próprio.
- Você aponta cada (sub)domínio para o deploy correspondente:
  - `seudominio.com` → landing-page
  - `app.seudominio.com` → portal-client
  - `admin.seudominio.com` → portal-admin
- Isso se configura no painel da plataforma de hospedagem (domínios /
  custom domains) e no seu provedor de DNS (registros CNAME para os
  subdomínios).

> Como fazer o deploy e apontar subdomínios varia por plataforma de
> hospedagem. Consulte a doc da plataforma que você escolher para "custom
> domains" e "monorepo deploys".

---

## 7. Checklist da reorganização

- [ ] `portal-admin`: removido o nível `app/admin/` (conteúdo direto em `app/`).
- [ ] Componentes movidos de `app/` para `components/`.
- [ ] Integrações e utilitários em `lib/`; tipos em `types/`.
- [ ] Alias `@/` configurado no `tsconfig.json` e imports atualizados.
- [ ] `app/` contém SÓ rotas (pastas com `page.tsx`).
- [ ] Mesma estrutura aplicada ao `portal-client`.
- [ ] Papel da pasta `api/` definido (ou removida se desnecessária).
- [ ] Cada app roda isolado (`npm run dev`) sem erros após a mudança.
```

