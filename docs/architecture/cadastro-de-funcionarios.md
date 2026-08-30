# Cadastro de funcionários

**Status:** proposta de desenho. Nada implementado.
**Data:** 29/08/2026

Hoje Configurações › Equipe mostra quem já existe, permite **suspender/liberar
acesso** e **trocar o tipo de acesso** — mas não permite **criar** ninguém. É o
último aviso "Em breve" do portal (`ConfigView.tsx:548`), e o texto dele é
honesto: criar um funcionário exige criar um usuário no Auth, e isso pede a
`service_role`, que o portal do cliente não tem por decisão de segurança
(`lib/supabase/client.ts`).

Este documento decide **como** fazer, com atenção ao cenário que motivou a
pergunta: uma loja com **mais de um computador**.

---

## 1. Duas coisas encontradas antes de projetar

Elas mudam o desenho e valem mais do que o cadastro em si.

### 1.1 ⚠️ Qualquer funcionário pode se promover a dono

`changeEmployeeRole` e `setEmployeeActive`
(`app/configuracoes/actions.ts`) exigem apenas `requireCustomer` — ou seja,
**estar logado neste negócio**. Não há checagem de quem está pedindo:

- um balconista pode trocar o próprio `role_id` para o papel do dono;
- um balconista pode suspender o acesso do dono (só o próprio acesso é
  protegido: `if (id === session.userId)`).

A aba Equipe também não é filtrada por permissão — `PERMISSION_MODULES` não tem
uma chave de "equipe", e a aba aparece para todo mundo que abre Configurações.

**Isso já é um problema hoje**, mas hoje o estrago é limitado porque só existe o
dono na maioria dos negócios. **No dia em que houver cadastro de funcionário,
essa passa a ser a porta de entrada mais fácil do sistema** — não faz sentido
proteger a criação e deixar a promoção aberta.

> Falta confirmar no banco se o RLS de `profiles` permite UPDATE em colegas do
> mesmo tenant. A camada de aplicação **não** protege; se o RLS também não,
> a escalada é real hoje. É a primeira coisa a verificar.

### 1.2 ⚠️ Só existe UM caixa aberto por negócio

`openRegister` recusa se houver qualquer caixa aberto no tenant, e a consulta
usa `maybeSingle()` — dois caixas abertos ao mesmo tempo nem seriam lidos
corretamente.

**É exatamente aqui que "mais de um computador" bate.** Duas pessoas em dois
computadores não conseguem abrir dois turnos. Ver §5.

---

## 2. O que já existe e deve ser reaproveitado

Não há nada para inventar do zero — o console já faz este fluxo para o **dono**
de um cliente novo (`portal-admin/app/clientes/actions.ts`):

| peça | onde | serve para |
|---|---|---|
| `inviteUserByEmail` + `redirectTo` | console, passo 2 | o convidado escolhe a própria senha |
| `/auth/confirmar` (`type=invite`) | portal do cliente | troca o token por sessão |
| `/redefinir-senha?primeiro_acesso=1` | portal do cliente | a tela onde a senha nasce |
| `admin_create_tenant` (`security definer`, transacional) | banco | cria tenant + papel + perfil numa transação |
| compensação com `deleteUser` | console, passo 7 | não deixa e-mail "ocupado" por cadastro que falhou |
| Edge Functions com `service_role` | `supabase/functions/fiscal-emit` | precedente de código privilegiado fora do portal |

O cadastro de funcionário é **a mesma coreografia, um nível abaixo**: em vez de
criar um tenant, cria um `profiles` dentro de um tenant que já existe.

---

## 3. Decisão 1 — o código mora numa Edge Function

Três lugares possíveis, e só um serve:

**No portal do cliente.** ❌ Precisaria da `service_role` no servidor Next. A
chave que ignora todo o RLS passaria a viver no mesmo processo que renderiza
tela — e o `lib/supabase/client.ts` diz, com todas as letras, que quando parecer
que o portal precisa dela, a operação pertence a outro lugar.

**No console (admin da plataforma).** ❌ Funciona tecnicamente e a chave já está
lá, mas transforma **você** no gargalo de toda contratação. Uma lanchonete
contrata e demite; o dono precisa resolver isso num sábado à noite sem abrir
chamado.

**Numa Edge Function.** ✅ A `service_role` fica dentro do Supabase, nunca no
navegador nem no servidor Next. O portal chama a função levando o **JWT de quem
está logado**, e a função decide sozinha se aquela pessoa pode. Já existe
precedente e caminho de deploy no repositório (`fiscal-emit`).

Nome proposto: **`equipe`**, uma função com ações (`convidar`, `reenviar`,
`desligar`, `redefinir-senha`) em vez de quatro funções — todas partilham a
mesma autorização, e repetir isso em quatro arquivos é repetir o lugar de errar.

### A regra que não pode ser quebrada

> **O `tenant_id` NUNCA vem do corpo da requisição.**
>
> A função lê o JWT → `auth.uid()` → consulta `profiles` → daí sai o tenant. É a
> mesma disciplina do `requireCustomer` (`lib/sessao.ts`), e pelo mesmo motivo:
> uma Edge Function é um endpoint HTTP público, e qualquer pessoa com um token
> válido pode chamá-la com o corpo que quiser. Aceitar um `tenant_id` do cliente
> seria entregar o cadastro de funcionários de todos os negócios da plataforma.

---

## 4. Decisão 2 — quem pode cadastrar

Antes de existir o botão, é preciso existir a permissão. Proposta:

1. **Nova chave de permissão `team`**, entrando em `PERMISSION_MODULES`. Quem
   não a tem não vê a aba Equipe, e as ações a exigem no servidor — não só na
   tela.
2. **O papel `is_owner` sempre a tem** e não pode perdê-la; senão o dono
   consegue se trancar para fora do próprio negócio.
3. **Ninguém edita quem tem `is_owner`.** Nem para suspender, nem para trocar de
   papel. O dono só é alterado pelo console.
4. **Ninguém concede um papel `is_owner`.** Fecha a promoção descrita em §1.1.
5. A checagem vale **nas três** ações que já existem (`setEmployeeActive`,
   `changeEmployeeRole`, `saveRole`) e nas novas — e vale **no servidor**. Uma
   aba escondida não é controle de acesso.

---

## 5. Decisão 3 — a loja com mais de um computador

### 5.1 Identidade é da PESSOA, não da máquina

Existe um desenho alternativo, comum em PDV: o **computador** faz login uma vez
(uma conta por estação) e cada pessoa se identifica com um PIN curto. É rápido
no balcão e dispensa e-mail para o funcionário.

**Está sendo recusado**, e vale registrar por quê: o sistema inteiro já é
construído em cima de identidade por pessoa —

- `activity_log.actor_id` é `auth.uid()`, e `actor_name` é o nome congelado na
  hora;
- `cash_registers.opened_by` / `closed_by`;
- `sales.user_id`;
- permissões vivem em `profiles.role_id`.

Com sessão de estação, `auth.uid()` passa a ser "Computador 2" e o histórico
deixa de responder à única pergunta que ele existe para responder. A migration
do `activity_log` diz isso na primeira caixa: *um log que a parte auditada
consegue forjar não serve para auditar ninguém*. O PIN viraria uma camada de
aplicação por cima — e camada de aplicação é exatamente o que o RLS existe para
não precisar.

**Então: um funcionário = uma conta.** Ele entra em qualquer computador da loja.

### 5.2 Vários computadores não são problema para o login

Vale dizer explicitamente, porque é a dúvida natural:

- o Supabase mantém **várias sessões simultâneas** da mesma conta, em aparelhos
  diferentes. O caixa pode estar logado no computador 1 e no celular ao mesmo
  tempo;
- pessoas diferentes em computadores diferentes, ao mesmo tempo, é o caso
  normal e já funciona;
- na troca de turno no MESMO computador, é sair e entrar. Acontece duas vezes
  por dia, não a cada venda — o custo é aceitável e a alternativa custa o
  histórico.

### 5.3 O que REALMENTE quebra: o caixa único

Este é o ponto (§1.2). Duas saídas:

**(a) O caixa é da LOJA, não da pessoa** — recomendado agora.
Um turno aberto por vez; os dois computadores vendem para dentro dele. Quem fez
cada venda continua registrado em `sales.user_id` e no `activity_log`. Casa com
a realidade de quase todo cliente deste porte: **uma gaveta física**.
Ajuste necessário: a mensagem "Já existe um caixa aberto" precisa dizer **quem**
abriu e **quando** — hoje ela parece um bug para quem está no outro computador.

**(b) Um caixa por gaveta/estação** — quando um cliente real tiver duas gavetas.
Exige o conceito de estação no banco (`cash_registers.station_id`), a troca do
`maybeSingle()` por uma consulta por estação, e uma forma de o computador saber
qual estação ele é. É uma mudança de modelo, não um ajuste — não vale antecipar.

> Não misturar as duas coisas: **conta é da pessoa; gaveta é do lugar.** Foi
> tentar resolver as duas com a mesma peça que produziu o desenho de "conta por
> estação" que estamos recusando.

---

## 6. Decisão 4 — o funcionário sem e-mail

O caso é real: muito balconista não tem e-mail ou não o acessa no trabalho.

**Caminho padrão — convite por e-mail.** ✅
Reaproveita o que já funciona. O dono nunca conhece a senha; ela nasce escolhida
pela pessoa, por link de uso único. É a opção certa sempre que houver um e-mail
de verdade — inclusive o pessoal, do celular.

**Caminho alternativo — senha provisória definida pelo dono.**
`admin.createUser({ email, password, email_confirm: true })`, e a pessoa é
obrigada a trocar no primeiro acesso. Resolve o "quero contratar agora e ela
começa em dez minutos".

Duas consequências que precisam estar **na tela**, não só aqui:

1. o dono passa a conhecer a senha inicial — aceitável se ela expira no primeiro
   uso, inaceitável se ficar valendo;
2. se o e-mail for inventado (`maria@loja-x.local`), **a pessoa nunca poderá
   recuperar a senha sozinha**. O dono vira o único caminho — o que exige a ação
   `redefinir-senha` na mesma Edge Function.

Recomendação: implementar o padrão primeiro; o alternativo só quando aparecer um
cliente que realmente esbarre nisso. E, se aparecer, preferir e-mail real
(mesmo pessoal) a e-mail sintético.

---

## 7. Decisão 5 — desligar não é apagar

**Nunca apagar o usuário do Auth.** `activity_log.actor_id` é `on delete set
null` justamente para o registro do que a pessoa fez sobreviver a ela — e
`actor_name` guarda o nome como era na hora, pelo mesmo motivo. Apagar também
deixaria `cash_registers.opened_by` órfão em turnos já fechados.

Desligar = `profiles.status = 'suspended'`, que já existe.

### ⚠️ Mas suspender hoje não expulsa ninguém

Confirmado no código: `requireCustomer` (`lib/sessao.ts`) lê
`tenant_id, role_id, full_name, is_platform_admin` e **não olha `status`**. O
app mobile olha — mas só no login (`sessionAdapter`).

Consequência: a pessoa suspensa **continua vendendo** até o token dela expirar.
Para quem acabou de demitir alguém, "removi o acesso" precisa significar agora,
não daqui a uma hora.

Três coisas a fazer junto:

1. `requireCustomer` passa a recusar `status != 'active'`;
2. a Edge Function chama `admin.auth.admin.signOut(userId, 'global')` ao
   suspender, derrubando as sessões abertas em todos os computadores;
3. confirmar se `current_tenant_id()` (usada por todo o RLS) considera o status
   — se considerar, o banco já fecha e os dois itens acima viram reforço.

---

## 8. O fluxo, fim a fim

```
Portal (Configurações › Equipe)
  │  dono preenche: nome, e-mail, tipo de acesso
  ▼
Server Action  ─── repassa o JWT do usuário ───►  Edge Function `equipe`
                                                    │
   1. quem é você?      JWT → auth.uid() → profiles → tenant_id + papel
   2. pode?             tem permissão `team`? não está mexendo num is_owner?
                        o role_id pedido é deste tenant e não é is_owner?
   3. convida           admin.auth.admin.inviteUserByEmail(email, {
                          redirectTo: <portal>/auth/confirmar })
   4. cria o perfil     rpc('tenant_create_employee', {          ← transacional
                          p_user_id, p_tenant_id, p_full_name, p_role_id })
   5. compensa          RPC falhou? admin.deleteUser(userId)
                        (o usuário do Auth está fora da transação do banco —
                         mesmo problema e mesma solução do console, passo 7)
   6. registra          log_activity('employee.invited', …)
                                                    │
  ◄─────────────────── ok / erro nomeado ───────────┘
  │
  ▼
router.refresh() → a pessoa aparece na lista como "convite pendente"
```

Enquanto o convite não é aceito, a linha existe em `profiles` e a tela precisa
distinguir os três estados: **convite pendente**, **ativo**, **suspenso**. Um
convite pendente parecendo "ativo" faz o dono achar que a pessoa já pode entrar.

---

## 9. O que muda no banco

| mudança | por quê |
|---|---|
| função `tenant_create_employee` (`security definer`, transacional) | perfil criado inteiro ou não criado — espelha `admin_create_tenant` |
| `profiles.invited_at` (ou `status = 'invited'`) | separar "convidado" de "ativo" na tela |
| chave de permissão `team` em `roles.permissions` | §4 |
| revisar RLS de UPDATE em `profiles` | §1.1 — impedir editar colega e impedir editar `is_owner` |
| *(se um dia)* `plans.max_users` | hoje nada limita quantos funcionários um cliente cria. Se virar regra comercial, ela pertence ao plano e é checada na Edge Function — nunca só na tela |

---

## 10. Armadilhas — o que NÃO fazer

- **Não** aceitar `tenant_id` ou `role_id` sem validar contra o tenant de quem
  chamou. `role_id` de outro negócio criaria um funcionário com permissões
  atravessadas.
- **Não** deixar a autorização só na tela. A Edge Function é pública.
- **Não** criar o `profiles` antes do convite dar certo: sobraria funcionário
  sem login. E **não** criar o usuário sem compensação: sobraria e-mail ocupado
  por um cadastro que não existe (o console já aprendeu isso, passo 7).
- **Não** apagar ninguém. §7.
- **Não** reaproveitar a conta do dono "só para o balconista usar". É o atalho
  que todo cliente vai pedir, e ele apaga o histórico inteiro — todas as vendas
  passariam a ser do dono.
- **Não** resolver "mais de um computador" com conta por computador. §5.1.

---

## 11. Ordem sugerida

A segurança vem antes do recurso: o item 1 conserta um furo que **já existe**, e
os outros o ampliam se ele não for fechado.

1. **Fechar a escalada de privilégio** (§1.1) — permissão `team`, proteção do
   `is_owner`, checagem no servidor. *Independe do resto e vale sozinho.*
2. **Fazer a suspensão valer na hora** (§7) — `status` no `requireCustomer` +
   `signOut` global.
3. **A mensagem do caixa dizer quem abriu e quando** (§5.3a) — pequeno, e é o
   que faz o segundo computador parar de parecer quebrado.
4. **Edge Function `equipe` + `tenant_create_employee`** — o cadastro em si.
5. **Tela**: modal de convite, os três estados na lista, reenviar convite.
6. *(se aparecer a necessidade)* senha provisória e redefinição pelo dono (§6).

---

## 12. Em aberto — decisão de produto, não técnica

1. **Um funcionário pode existir em dois negócios?** Hoje `profiles.tenant_id` é
   uma coluna só: uma pessoa pertence a um negócio. Um contador que atende duas
   lojas precisaria de duas contas. Mudar isso é uma tabela de vínculo e mexe em
   todo o RLS — **não** encarar sem uma demanda real.
2. **Quantos funcionários cabem no plano?** Hoje, ilimitado.
3. **O dono pode ver o e-mail de quem já cadastrou?** Ele vive em `auth.users`,
   fora do alcance do RLS — a aba Equipe mostra o campo vazio hoje. Se precisar
   aparecer, sai da mesma Edge Function.
