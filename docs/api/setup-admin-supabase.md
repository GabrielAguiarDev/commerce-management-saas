
# Configuração do Admin (Next.js) com o Supabase — Aguiar One

Guia para ligar o painel **admin** (Next.js, App Router) ao projeto Supabase
`Commerce Management` que você já criou. Siga na ordem. Cada passo tem um
"por quê" curto para você entender, não só copiar.

> **Contexto de segurança (leia antes):** o Supabase te dá duas chaves.
> A **anon/publishable** é pública e pode ir no navegador — quem protege os
> dados é o RLS que você já configurou. A **service_role** é secreta, fura o
> RLS e **só pode viver no servidor** (nunca exposta ao navegador). Este guia
> mantém as duas no lugar certo.

---

## 1. Pegar as credenciais no Supabase

No painel do Supabase, com o projeto `Commerce Management` aberto:

1. Vá em **Settings → API** (ou **Project Settings → API Keys**).
2. Anote três valores:
   - **Project URL** — algo como `https://xxxxxxxx.supabase.co`
   - **anon / publishable key** — chave pública (começa com `eyJ...`)
   - **service_role key** — chave secreta (também `eyJ...`). **Trate como
     senha.** Nunca cole em código versionado nem no lado do cliente.

> O painel pode chamar a chave pública de `anon` (legado) ou `publishable`
> (nova). As duas funcionam com a mesma variável de ambiente durante a
> transição. Use a que aparecer.

---

## 2. Instalar os pacotes

No terminal, na raiz do projeto admin:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` — o SDK principal (fala com o banco e o Auth).
- `@supabase/ssr` — o helper que faz o Auth funcionar com cookies no
  App Router (server components, middleware). É o pacote atual e recomendado.

---

## 3. Variáveis de ambiente

Crie um arquivo **`.env.local`** na raiz do projeto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

Repare na diferença **crucial**:

- As duas primeiras têm o prefixo **`NEXT_PUBLIC_`** — isso significa que o
  Next.js as expõe ao navegador. É intencional e seguro (são públicas).
- A terceira **NÃO** tem o prefixo — ela fica só no servidor. Se você colocar
  `NEXT_PUBLIC_` nela por engano, vaza a chave secreta. **Não faça isso.**

> **Garanta que `.env.local` está no `.gitignore`** (o Next.js já coloca por
> padrão, mas confira). Ele nunca deve ir para o Git.

---

## 4. Criar os clientes Supabase

O App Router precisa de **três** clientes diferentes, porque o código roda em
lugares diferentes (navegador, servidor, middleware). Crie a pasta
`lib/supabase/` (ou `utils/supabase/`) e os arquivos abaixo.

### 4a. Cliente do navegador — `lib/supabase/client.ts`

Usado em Client Components (`'use client'`), que rodam no navegador.

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 4b. Cliente do servidor — `lib/supabase/server.ts`

Usado em Server Components, Server Actions e Route Handlers. Lê a sessão do
usuário pelos cookies.

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado de um Server Component — pode ignorar se houver
            // middleware atualizando a sessão (passo 5).
          }
        },
      },
    }
  )
}
```

### 4c. Cliente admin (service_role) — `lib/supabase/admin.ts`

**Só para operações privilegiadas do admin** (criar cliente, convidar usuário,
ver dados de todos os tenants). Este usa a chave secreta e **fura o RLS**, então
só pode ser importado em código de servidor (Server Actions, Route Handlers) —
**nunca** em Client Components.

```typescript
import { createClient } from '@supabase/supabase-js'

// ATENÇÃO: este cliente ignora o RLS. Use apenas no servidor,
// em operações administrativas conscientes.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
```

> Regra de ouro: se um arquivo importa `admin.ts`, ele **não** pode ter
> `'use client'` no topo. A chave secreta nunca vai para o navegador.

---

## 5. Middleware — manter a sessão viva

Server Components não conseguem escrever cookies, então o token de sessão
precisa ser renovado por um middleware. Crie **`middleware.ts`** na raiz do
projeto (ou dentro de `src/` se você usa essa pasta):

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Renova o token e mantém a sessão. NÃO coloque lógica entre criar o
  // cliente e esta chamada.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Roda em tudo, menos assets estáticos e imagens.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

Sem esse middleware, o usuário é "deslogado" sozinho quando o token expira.
Com ele, a sessão se renova de forma transparente.

---

## 6. Teste de conexão

Antes de construir telas, prove que a conexão funciona. Crie uma página
temporária de teste — por exemplo `app/teste/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function TestePage() {
  const supabase = await createClient()

  // Lê o catálogo de módulos (é público para autenticados; sem login
  // ainda, pode vir vazio por causa do RLS — o importante é NÃO dar erro
  // de conexão).
  const { data, error } = await supabase.from('modules').select('*')

  return (
    <pre>
      {error
        ? `Erro: ${error.message}`
        : `Conexão OK. Módulos visíveis: ${data?.length ?? 0}\n` +
          JSON.stringify(data, null, 2)}
    </pre>
  )
}
```

Rode `npm run dev` e acesse `/teste`. O que esperar:

- **"Conexão OK"** com a lista de módulos → tudo certo (a tabela `modules`
  é legível por qualquer autenticado; dependendo da config pode aparecer sem
  login).
- **Erro de credencial/URL** → revise o `.env.local` e reinicie o
  `npm run dev` (variáveis de ambiente só recarregam ao reiniciar).

Depois de confirmar, **apague a página de teste**.

---

## 7. Ordem recomendada dos próximos passos

Com a conexão de pé, construa nesta sequência:

1. **Login do admin** — tela de login usando o cliente do navegador
   (`supabase.auth.signInWithPassword`). O admin é você; crie seu usuário
   admin manualmente (ver passo 8).
2. **Proteção de rotas** — usar o middleware/server client para barrar acesso
   ao painel sem login, e verificar que o usuário é `is_platform_admin`.
3. **Lista de clientes (tenants)** — primeira tela com dado real, lendo a
   tabela `tenants`.
4. **Criar cliente + convidar usuário** — aqui entra o cliente admin
   (service_role) numa **Server Action** ou **Route Handler**, porque criar
   usuário no Auth é operação privilegiada.

---

## 8. Criar seu usuário admin (uma vez)

Você é o admin da plataforma. Para o login funcionar, crie seu usuário e
marque-o como admin:

1. No Supabase, vá em **Authentication → Users → Add user**, e crie com seu
   e-mail e senha.
2. Copie o **UID** do usuário criado.
3. No **SQL Editor**, rode (troque o UID e o e-mail):

```sql
-- Cria o perfil do admin da plataforma.
-- Admin NÃO pertence a um tenant (tenant_id fica nulo).
insert into public.profiles (id, full_name, is_platform_admin, tenant_id)
values ('COLE_O_UID_AQUI', 'Seu Nome', true, null);
```

Pronto — esse usuário agora passa em `is_platform_admin()` e enxerga todos os
tenants pelas políticas de RLS.

---

## 9. Checklist de segurança (antes de ir para produção)

- [ ] `.env.local` está no `.gitignore` e nunca foi commitado.
- [ ] A chave `service_role` **não** tem prefixo `NEXT_PUBLIC_`.
- [ ] Nenhum arquivo com `'use client'` importa `admin.ts`.
- [ ] Todas as tabelas com dados têm RLS **habilitado** (você já fez, mas
      confirme que nenhuma tabela nova ficou sem).
- [ ] O middleware está ativo (sessão se mantém entre reloads).
- [ ] Você testou o login e a leitura de dados com um usuário real.

---

## Referências oficiais

- Server-Side Auth (Next.js): https://supabase.com/docs/guides/auth/server-side/nextjs
- Criar clientes SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Tipos de chave de API: consulte "API Keys" na doc do Supabase

> Práticas de integração Supabase + Next.js mudam com alguma frequência. Se
> algo divergir, a fonte da verdade é a documentação oficial acima.
