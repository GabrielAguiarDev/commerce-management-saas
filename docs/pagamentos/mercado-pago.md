# Mensalidade paga no portal — Mercado Pago

O que foi construído, e o que **você** precisa fazer fora do código para ligar o
pagamento e publicar esta versão.

> **Estado desta entrega:** banco testado (pgTAP), Edge Functions com checagem
> de tipos, portais com typecheck, lint, testes e build passando. **Nada foi
> testado contra o Mercado Pago de verdade** — isso depende das credenciais, e é
> o passo 6 abaixo. Não publique em produção antes de fazê-lo.

---

## 1. O que existe agora

| Onde | O quê |
|---|---|
| Portal do cliente | Tela **Assinatura** (`/assinatura`, só o dono do negócio): situação, mensalidades em aberto, pagamento por **Pix** (QR + copia e cola, confirmação automática) ou **cartão de crédito** (formulário do Mercado Pago), e histórico. Tarja de aviso em qualquer tela quando a mensalidade vence em até 5 dias ou está vencida. |
| Console admin | Tela **Recebimentos** (`/recebimentos`): conta conectada, saldo, a liberar, bruto, tarifas, líquido, Pix × cartão e a lista de pagamentos (com o cliente de cada um). Em **Configurações**, o **dia de vencimento** da mensalidade. O **Financeiro** continua igual e passa a refletir sozinho o que foi pago pelo portal. |
| Banco | Migration `20261003000000_platform_billing_mercadopago.sql`: tabela `platform_payment_attempts`, colunas novas em `platform_payments`, RLS de leitura para o dono, `ensure_current_charge()` e `apply_provider_payment()`. |
| Edge Functions | `billing-checkout` (cria Pix / cobra cartão / consulta), `mp-webhook` (aviso do Mercado Pago), `mp-account` (dados da conta para o console). |

### Como o dinheiro vira "pago"

1. O dono abre o portal → a cobrança do mês passa a existir (`ensure_current_charge`), com o valor de `tenants.monthly_fee` e vencimento no dia configurado.
2. Ele escolhe Pix ou cartão → `billing-checkout` cria o pagamento no Mercado Pago. **O valor sai do banco, nunca do navegador.**
3. O Mercado Pago avisa o `mp-webhook` **e** a tela pergunta a cada 5 s. Nos dois caminhos a função busca o pagamento na API do Mercado Pago e só então quita a cobrança.
4. `platform_payments.status = 'paid'` → Financeiro do console e portal do cliente atualizados.

### Decisões que tomei por você

- **Checkout dentro do portal** (Pix nativo + Card Payment Brick), não redirecionamento para o Checkout Pro.
- **Cobrança avulsa por mês**, sem débito recorrente automático. O cliente paga cada mensalidade; não guardamos cartão.
- **Cartão só à vista** (1 parcela). Sem boleto nesta v1.
- **Mensalidade em atraso não bloqueia o portal** — só mostra o aviso. Bloquear é decisão comercial sua (ver "Próximos passos").
- **Só o dono** do negócio vê e paga; funcionários não enxergam a tela.
- **O Access Token fica só nos secrets das Edge Functions.** Nenhum dos dois portais o conhece.
- O **registro manual** do console (`Marcar como pago`) continua existindo, para quem pagar por fora.

### Sobre o saldo da conta (o que você pediu para verificar)

- **Dá para ler pela API:** dados da conta (`/users/me`) e todos os pagamentos com tarifa, valor líquido, data e status de liberação (`/v1/payments/search`). É disso que o painel é feito.
- **Saldo disponível:** o endpoint `/users/{id}/mercadopago_account/balance` está **em descontinuação** e a maioria das contas recebe `403`. O painel tenta; se o Mercado Pago responder, mostra o saldo oficial. Se não, mostra **"Liberado no período"** e **"A liberar"**, calculados dos pagamentos — uma estimativa que **não desconta saques**. O saldo oficial, nesse caso, é o do app do Mercado Pago. A alternativa oficial são os relatórios (*Account money / Released money*), que são CSVs assíncronos — fora do escopo da v1.

---

## 2. Criar a aplicação no Mercado Pago

1. Use a conta Mercado Pago que vai **receber** as mensalidades (de preferência conta PJ, já verificada).
2. Acesse <https://www.mercadopago.com.br/developers/panel/app> → **Criar aplicação**.
   - Tipo de pagamento: **Pagamentos online**.
   - Produto: **Checkout Transparente** (Checkout API).
3. Em **Credenciais de produção**, conclua a ativação (o Mercado Pago pede dados do negócio).
4. Cadastre uma **chave Pix** na conta — sem ela a criação do Pix é recusada.
5. Anote, em *Credenciais de teste* e *Credenciais de produção*:
   - **Public Key** → vai no portal do cliente;
   - **Access Token** → vai nos secrets do Supabase. **É o segredo. Nunca commite.**

## 3. Banco de dados

Aplique a migration no projeto Supabase (como as anteriores):

```bash
supabase db push
# ou cole supabase/migrations/20261003000000_platform_billing_mercadopago.sql no SQL Editor
```

Depois, atualize a baseline de testes como de costume (`schema_producao.sql` / `.version`).

Confira que cada cliente pagante tem `tenants.monthly_fee` preenchido — é esse o valor cobrado.

## 4. Edge Functions

Secrets (Supabase → Edge Functions → Secrets, ou CLI):

```bash
supabase secrets set MP_ACCESS_TOKEN="APP_USR-..."      # ou TEST-... para testar
supabase secrets set MP_WEBHOOK_SECRET="..."            # gerado no passo 5
```

Deploy:

```bash
supabase functions deploy billing-checkout
supabase functions deploy mp-account
supabase functions deploy mp-webhook --no-verify-jwt   # pública: quem chama é o Mercado Pago
```

> `--no-verify-jwt` é obrigatório **só** no `mp-webhook`. As outras duas exigem sessão.

## 5. Webhook

1. No painel da aplicação → **Webhooks** → **Configurar notificações**.
2. URL de produção: `https://<SEU-PROJETO>.supabase.co/functions/v1/mp-webhook`
3. Evento: **Pagamentos**.
4. Salve e copie a **assinatura secreta** → `supabase secrets set MP_WEBHOOK_SECRET="..."`.
5. Use o botão **Simular** do painel: a função deve responder `200`.

Sem `MP_WEBHOOK_SECRET` a função aceita o aviso e registra um alerta no log. Não é um risco de quitação falsa (ela sempre confere o pagamento na API antes de quitar), mas configure o secret antes de ir para produção.

## 6. Portal do cliente

Variável de ambiente (Vercel → projeto do portal do cliente, e `.env.local`):

```
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxxxxxx-...
```

Sem ela o portal oferece **só Pix**. O console admin não precisa de variável nova.

## 7. Testar antes de produção

Com as credenciais de **teste** (`TEST-...`) no secret e na variável do portal:

- [ ] Entrar no portal como dono de um cliente com mensalidade → menu **Assinatura** aparece, com a cobrança do mês.
- [ ] Entrar como funcionário → o menu **não** aparece e `/assinatura` redireciona.
- [ ] **Pix:** gerar o QR, conferir o copia e cola e a contagem regressiva. (Em teste, o Pix não é pago de verdade; valide o Pix de ponta a ponta com um valor real baixo em produção.)
- [ ] **Cartão:** pagar com um [cartão de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/test/cards) — titular `APRO` aprova, `OTHE` recusa. Conferir a mensagem de recusa e a tela de sucesso.
- [ ] Após aprovar: cobrança como **Paga** no histórico, e o cliente **Em dia** no Financeiro do console.
- [ ] Console → **Recebimentos**: conta, tarja de "credenciais de teste", o pagamento na lista com o nome do cliente.
- [ ] Console → Configurações → **Dia de vencimento**.
- [ ] Logs das três funções no Supabase sem erro.

Depois troque para as credenciais de **produção** (secret + variável + webhook em modo produtivo), faça um Pix real de valor baixo e estorne pelo painel do Mercado Pago — a cobrança deve voltar para "em aberto".

## 8. Publicar

1. Migration aplicada em produção.
2. Secrets de produção + deploy das três funções.
3. Webhook de produção configurado.
4. `NEXT_PUBLIC_MP_PUBLIC_KEY` de produção na Vercel.
5. Merge de `feat/payment` → deploy dos portais.
6. Avisar os clientes de que a mensalidade agora é paga em **Assinatura**.

---

## Limites conhecidos e próximos passos

- **Conferido no navegador só em parte:** com dados fictícios, vi a tela de Assinatura, a escolha da forma de pagamento, a tarja de aviso e o painel de Recebimentos. O **QR do Pix, o formulário de cartão, a tela "em análise" e a de sucesso** dependem do Mercado Pago e nunca foram vistos rodando — confira-os no passo 7.
- **"Reverter pagamento" no console** numa cobrança paga pelo Mercado Pago só muda o status no nosso banco — **não estorna o dinheiro**. Estorno se faz no painel do Mercado Pago (e o webhook reabre a cobrança sozinho).
- **Pagamento em dobro** (Pix e cartão para a mesma mensalidade): a segunda aprovação fica registrada na tentativa, mas não há estorno automático.
- **Meses anteriores** sem linha em `platform_payments` não são cobrados retroativamente; só o mês corrente é gerado.
- **Sem recorrência automática, boleto, nota/recibo em PDF, e-mail de cobrança ou bloqueio por inadimplência.** Candidatos naturais à v2.
- **App mobile** não tem a tela de Assinatura.
