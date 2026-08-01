# Configuração do Portal do Cliente (Next.js) com o Supabase — Aguiar One

Guia para ligar o **portal do cliente** (Next.js, App Router) ao projeto
Supabase `Commerce Management`. Siga na ordem.

> **Diferença em relação ao admin:** o portal é usado pelo DONO do comércio
> (e, no futuro, funcionários). Ele **nunca** faz operações privilegiadas —
> só lê e escreve os dados do próprio tenant, protegido pelo RLS. Por isso o
> portal **não usa a chave secreta (service_role)**. Ela não entra aqui.

> **Contexto de segurança:** a chave **anon/publishable** é pública e pode ir
> no navegador — quem protege os dados é o RLS. O portal usa **só** essa chave
> pública. A `service_role` fica exclusivamente no projeto do admin.

---

## 1. Pegar as credenciais no Supabase

No painel do Supabase, com o projeto `Commerce Management` aberto:

1. Vá em **Settings → API** (ou **Project Settings → API Keys**).
2. Anote **dois** valores (o portal não precisa da service_role):
   - **Project URL** — algo como `https://xxxxxxxx.supabase.co`
   - **anon / publishable key** — chave pública (começa com `eyJ...`)

> O painel pode chamar a chave pública de `anon` (legado) ou `publishable`
> (nova). As duas funcionam com a mesma variável de ambiente. Use a que
> aparecer.

---

## 2. Instalar os pacotes

No terminal, na raiz do projeto do portal:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` — o SDK principal (fala com o banco e o Auth).
- `@supabase/ssr` — o helper que faz o Auth funcionar com cookies no
  App Router (server components, middleware).

---

## 3. Variáveis de ambiente

Crie um arquivo **`.env.local`** na raiz do projeto. **Só duas linhas** — sem
a chave secreta:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

- Ambas têm o prefixo **`NEXT_PUBLIC_`** — o Next.js as expõe ao navegador.
  É intencional e seguro (são públicas; o RLS protege os dados).
- **Não** adicione a `SUPABASE_SERVICE_ROLE_KEY` aqui. O portal não faz nada
  que precise dela, e mantê-la fora deste projeto elimina qualquer risco de
  vazar a chave secreta por aqui.

> **Garanta que `.env.local` está no `.gitignore`** (o Next.js já coloca por
> padrão, mas confira). Ele nunca deve ir para o Git.

---

## 4. Criar os clientes Supabase

O portal precisa de **dois** clientes (o admin precisava de três — aqui não há
o cliente de service_role). Crie a pasta `lib/supabase/` e os arquivos abaixo.

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

> **Não existe `admin.ts` no portal.** Se você se pegar precisando da
> service_role no portal, pare e repense — provavelmente essa operação
> pertence ao admin ou a uma Edge Function, não ao portal do cliente.

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

---

## 6. Teste de conexão

Antes de construir telas, prove que a conexão funciona. Crie uma página
temporária `app/teste/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function TestePage() {
  const supabase = await createClient()

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

Rode `npm run dev`, acesse `/teste`. Se aparecer "Conexão OK", está ligado.
Se der erro de credencial, revise o `.env.local` e reinicie o `npm run dev`
(variáveis de ambiente só recarregam ao reiniciar). Depois, **apague a página
de teste**.

---

## 7. Login do portal (o dono do comércio)

O portal tem login próprio. Diferença em relação ao admin:

- No **admin**, verifica-se `is_platform_admin = true` (é você, o dono da
  plataforma).
- No **portal**, o usuário deve ter um **`tenant_id`** (pertence a um negócio)
  e **NÃO** ser admin de plataforma.

Exemplo de login (Client Component):

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

async function entrar(email: string, senha: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })
  if (error) {
    // mostrar "e-mail ou senha inválidos"
    return
  }
  // logado — redirecionar para o dashboard do portal
}
```

Depois do login, ao proteger as rotas do portal, verifique o perfil:

```typescript
// Server Component / Server Action — checa se o usuário pode usar o portal.
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  // não logado → manda para o login
}

const { data: perfil } = await supabase
  .from('profiles')
  .select('tenant_id, is_platform_admin')
  .eq('id', user!.id)
  .single()

// Regras do portal:
// - precisa ter tenant_id (pertence a um negócio)
// - não pode ser admin de plataforma (esse usa o painel admin, não o portal)
if (!perfil?.tenant_id || perfil.is_platform_admin) {
  // barrar acesso ao portal
}
```

> Quando o sistema de funcionários/papéis existir (pós-v1), aqui também se
> checa o papel do usuário para restringir o que ele acessa. Por enquanto,
> basta: logado + tem tenant + não é admin de plataforma.

---

## 8. Menu dinâmico — módulos ativos do cliente

Esta é a parte específica do portal: o menu se monta conforme os módulos que
o cliente tem ativos. Use a view `v_active_modules` e a função `has_module`
que já existem no banco. O RLS já filtra pelo tenant do usuário logado — você
**não** passa tenant_id.

### 8a. Buscar todos os módulos ativos (montar o menu)

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()

const { data: modulos } = await supabase
  .from('v_active_modules')
  .select('key, name, is_access')

// 'modulos' traz só os módulos ativos do tenant logado.
// Monte o menu a partir dessa lista: para cada módulo (exceto os de
// acesso, is_access = true, como o 'app'), mostre o item correspondente.
// Ex: se não vier 'stock' na lista, o menu não mostra "Estoque".
```

Mapeie cada `key` para o item de menu correspondente no seu código:
`dashboard`, `sales`, `products`, `stock`, `cash`, `costs`, `reports`,
`support`. Só aparecem os que vierem na lista.

### 8b. Checar um módulo específico (checagem pontual)

Quando precisar decidir sobre um módulo só (mostrar um botão, liberar uma
seção), chame a função `has_module` via `.rpc()`:

```typescript
const { data: temEstoque } = await supabase.rpc('has_module', {
  p_module_key: 'stock',
})
// temEstoque === true → o cliente tem o módulo Estoque ativo
```

### 8c. (Referência) checagem de acesso ao app mobile

O módulo `'app'` é de acesso (`is_access = true`). No aplicativo mobile, a
tela de bloqueio usa a mesma função:

```typescript
const { data: temApp } = await supabase.rpc('has_module', {
  p_module_key: 'app',
})
// temApp === false → mostrar a tela "seu plano não inclui o app"
```

---

## 9. Ordem recomendada dos próximos passos

1. **Conexão** (passos 1–6) e confirmar o teste.
2. **Login do portal** (passo 7) — o dono loga e é validado.
3. **Layout com menu dinâmico** (passo 8) — o menu se monta pelos módulos
   ativos. A partir daqui o portal já "sabe" o que mostrar por cliente.
4. **Dashboard** — primeira tela com dado real, usando as views de leitura
   (`v_daily_sales`, `v_monthly_result`, `v_stock_alerts`).
5. **Módulos um a um** — Vendas, Produtos, etc., cada um lendo/escrevendo
   suas tabelas (o RLS já isola tudo por tenant).

---

## 10. Checklist de segurança

- [ ] `.env.local` está no `.gitignore` e nunca foi commitado.
- [ ] O `.env.local` do portal tem **apenas** URL + anon key (SEM service_role).
- [ ] **Não** existe `admin.ts` neste projeto.
- [ ] O middleware está ativo (sessão se mantém entre reloads).
- [ ] O login valida: usuário tem `tenant_id` e não é admin de plataforma.
- [ ] O menu só mostra módulos que vêm de `v_active_modules`.

---

## Referências oficiais

- Server-Side Auth (Next.js): https://supabase.com/docs/guides/auth/server-side/nextjs
- Criar clientes SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Chamar funções do banco (RPC): consulte "Database Functions" na doc do Supabase

> Práticas de integração Supabase + Next.js mudam com alguma frequência. Se
> algo divergir, a fonte da verdade é a documentação oficial acima.