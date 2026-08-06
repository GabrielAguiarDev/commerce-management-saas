# PWA do Portal do Cliente — fase 1 (instalar e abrir sem internet)

O portal do cliente é instalável e abre sem conexão. Este documento explica o
que existe hoje, por que foi feito assim, como testar e o que fica para a
fase 2.

> **O limite desta fase, em uma frase:** as TELAS abrem sem internet, com o
> último retrato que o servidor mandou. As GRAVAÇÕES — registrar venda, fechar
> caixa, lançar custo — continuam falhando offline, de propósito. A fila de
> escrita é a fase 2.

---

## 1. As peças

| Arquivo | O que faz |
|---|---|
| `app/manifest.ts` | O manifesto. É ele que torna o app instalável (nome, ícones, `display: standalone`, cores). O Next serve em `/manifest.webmanifest` e injeta o `<link rel="manifest">` sozinho. |
| `public/icons/` | Os ícones do app: 192 e 512 (obrigatórios), os `maskable` do Android e o `apple-touch-icon` do iOS. Os `.svg` ao lado são a fonte de onde os `.png` saíram. |
| `app/sw.ts` | O service worker: o que guardar, com qual estratégia, e o que servir quando a rede não responde. |
| `app/serwist/[path]/route.ts` | Compila o `sw.ts` com esbuild e o serve em `/serwist/sw.js`. |
| `app/layout.tsx` | Registra o worker (`SerwistProvider`) e declara os metadados do app instalado. |
| `public/offline.html` | A tela servida quando a pessoa, offline, pede uma tela que nunca abriu. |
| `components/Pwa.tsx` | A tarja "você está sem conexão" e o convite para instalar. |
| `lib/pwa.ts` | Apaga as telas guardadas ao sair. |
| `proxy.ts` | O matcher deixa os arquivos do PWA passarem sem middleware. |

---

## 2. Por que Serwist, e por que pela rota

O Next 16 monta o app com o **Turbopack**, que não tem plugins de webpack. O
caminho tradicional (`next-pwa`, ou o `withSerwist` do `@serwist/next`, que
geram `public/sw.js` durante o build do webpack) simplesmente não roda mais.

O `@serwist/turbopack` resolve isso de outro jeito: uma **rota estática**
(`app/serwist/[path]/route.ts`) compila o worker com o esbuild no momento do
build e o entrega como arquivo. O resultado aparece no log do build:

```
○ (serwist) Using esbuild to bundle the service worker.
✓ (serwist) 42 precache entries (1231.78 KiB)
```

Dois detalhes que não são opcionais nesse arranjo:

- **`Service-Worker-Allowed: /`** — um worker servido de `/serwist/` só mandaria
  em `/serwist/`. A rota devolve esse cabeçalho para que ele valha no portal
  inteiro. Já vem pronto do pacote.
- **`define: process.env.NODE_ENV`** — a biblioteca consulta essa variável em
  tempo de execução, e dentro de um service worker não existe `process`. O
  valor é fixado na compilação; sem isso o worker morre na primeira linha.

---

## 3. As estratégias de cache

Definidas em `app/sw.ts`, na ordem em que são consultadas:

1. **Supabase — nunca guardado (`NetworkOnly`).** Uma resposta guardada com o
   token de uma sessão pode ser devolvida a outra, e nesta fase é melhor a
   leitura falhar na cara do que o portal mostrar o saldo de ontem como se fosse
   o de agora.
2. **`_next/static` (JS, CSS, fontes) — cache primeiro.** O nome do arquivo tem
   o hash do conteúdo: mudou o arquivo, mudou a URL. Não há como servir velho.
3. **Páginas e payloads do roteador — rede primeiro.** Com internet, o portal
   mostra sempre o dado de agora; sem ela, cai na última cópia. É o que faz as
   telas abrirem offline.
4. **Imagens e ícones — serve o guardado e revalida por trás.**
5. **Fallback:** navegação que falha e não tem cópia recebe `offline.html`.

**Em desenvolvimento nada disso existe.** O registro do worker é desligado no
`layout.tsx` (`disable={process.env.NODE_ENV !== "production"}`) e a própria
lista de estratégias vira "só rede" fora de produção — cache no meio do
`next dev` transforma qualquer depuração em caça-fantasma.

---

## 4. O que o middleware não pode tocar

`proxy.ts` roda em toda requisição e manda quem não tem sessão para o login.
Quatro caminhos precisam ficar de fora, e por um motivo concreto: eles são
pedidos por quem ainda **não** tem sessão (o navegador busca o manifesto na tela
de login) e pelo próprio service worker, que não segue redirecionamento como uma
aba faria. Passando pelo middleware, cada um receberia o HTML do login no lugar
do arquivo:

- `serwist/` — o worker; o registro falharia com um erro de MIME type;
- `manifest.webmanifest` — sem ele o navegador não oferece a instalação;
- `offline.html` — a tela de quando não há mais nada;
- `icons/` — os ícones do app instalado.

---

## 5. Sessão, cache e aparelho compartilhado

O portal roda no computador do balcão. Sem cuidado, quem ficasse sozinho na loja
poderia desligar a internet, abrir o app e ler o faturamento do dia na cópia que
sobrou em cache — a sessão já teria acabado, o cache não.

Por isso **sair apaga as telas guardadas** (`lib/pwa.ts`, chamado pelo `signOut`
do `PortalProvider`). Só os caches com dado do negócio são apagados; os de JS e
CSS ficam, porque são iguais para todo mundo e apagá-los só faria a próxima
pessoa esperar o download de novo.

---

## 6. Como testar

O service worker **só existe no build de produção** e exige HTTPS ou
`localhost`.

```bash
pnpm --filter portal-client build
pnpm --filter portal-client start
```

### 6.1. Instalar no notebook (Chrome ou Edge)

1. Abra `http://localhost:3000` e faça login.
2. Na barra de endereço, à direita, aparece o ícone de instalar (um monitor com
   uma seta). Ou: menu ⋮ → **Transmitir, salvar e compartilhar** → **Instalar
   página como aplicativo**.
3. O portal também mostra sozinho o cartão "Instalar o Aguiar One" no canto
   inferior direito, assim que o navegador confirma que o app é instalável.
4. Instalado, ele abre em janela própria, sem barra de endereço, com o ícone "A"
   na área de trabalho / no Dock.

> Se o ícone de instalar não aparecer, é sinal de que falta algum requisito —
> vá para o passo 6.2, que diz qual.

### 6.2. Conferir no DevTools

Abra o DevTools (F12) → aba **Application**.

**Application → Manifest**
- `Aguiar One` no topo, com a descrição e as cores;
- **Icons**: os quatro ícones carregando (192, 512 e os dois `maskable`);
- em **Installability**, a mensagem esperada é que o app pode ser instalado.
  Qualquer erro ali aponta exatamente o campo que falta.

**Application → Service Workers**
- uma entrada `/serwist/sw.js` com o status **activated and is running**;
- se aparecer "waiting", clique em **skipWaiting** (ou marque *Update on reload*
  enquanto estiver mexendo no worker).

**Application → Cache Storage**
- depois de navegar por algumas telas, os caches aparecem: `serwist-precache-*`
  (os 42 arquivos do build), `pages` / `others` (o HTML das telas visitadas),
  `pages-rsc` (os payloads do roteador), `static-image-assets`.
- Clicando em um deles dá para ver, URL a URL, o que está guardado.

### 6.3. Simular a falta de internet

O jeito certo é **Network → Throttling → Offline** (o "Offline" da aba
*Application* desliga só a rede da página; o da aba *Network* é o que o service
worker enxerga).

1. Com o portal aberto e algumas telas já visitadas, ligue **Offline**.
2. **Recarregue (F5).** A tela deve abrir normalmente, com os dados do último
   carregamento, e a tarja amarela "Você está sem conexão" aparece abaixo da
   barra de topo.
3. Navegue pelo menu entre telas já visitadas — todas abrem.
4. Peça uma tela que você **nunca** abriu neste navegador: aparece a página
   `offline.html`, com "Você está sem conexão" e o botão "Tentar de novo".
5. Tente **registrar uma venda**: falha. É o comportamento correto desta fase —
   é a fase 2 que vai enfileirar a escrita.
6. Desligue o **Offline**: a tela `offline.html` se recarrega sozinha. Dentro do
   portal, a tarja some e o portal volta ao normal na navegação seguinte (não há
   recarregamento automático de propósito: ele apagaria o carrinho de uma venda
   em andamento, que vive na memória).

### 6.4. No celular

- **Android (Chrome):** menu ⋮ → **Adicionar à tela inicial** / **Instalar
  aplicativo**. O ícone sai recortado na forma do sistema — é o `maskable` que
  cuida disso. Para testar offline, o modo avião serve.
- **iPhone / iPad (Safari):** não existe prompt automático; é **Compartilhar →
  Adicionar à Tela de Início**. O portal mostra essa instrução no cartão de
  instalação quando detecta iOS. O suporte da Apple a service worker em app
  instalado é mais limitado, e o cache pode ser descartado depois de semanas sem
  uso — o app volta a precisar de uma abertura online para se refazer.

### 6.5. Em produção

PWA exige **HTTPS**. O deploy já fornece. Depois de publicar, repita 6.2 e 6.3
no domínio real — é lá que o cliente vai instalar.

---

## 7. O que fica para a fase 2

- **Fila de escrita offline:** registrar venda, sangria, custo e movimentação de
  estoque guardados localmente e enviados quando a internet voltar, com
  tratamento de conflito.
- **Dados locais de verdade** (IndexedDB), no lugar de depender do HTML da
  última visita — inclusive para telas nunca abertas.
- **Sinal de sincronização na interface:** o que está pendente de envio, o que
  já subiu, o que falhou.
- **Revisão do que a tarja de offline diz:** hoje ela avisa que nada é salvo;
  com a fila, passa a dizer que será enviado depois.
