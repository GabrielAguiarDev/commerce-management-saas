-- =====================================================================
-- FASE 1 DA NOTA FISCAL — o CADASTRO. Nada aqui emite documento.
--
-- Ver `docs/fiscal/emissao-nota-fiscal.md` para o levantamento completo.
-- Esta migration entrega só o que a fase 1 precisa:
--
--   1. `tenant_fiscal_settings` — quem é o emitente e quais são os
--      padrões fiscais do catálogo dele;
--   2. `fiscal_credentials`     — os SEGREDOS, numa tabela que o portal
--      não consegue ler;
--   3. colunas fiscais em `products` — NCM, CFOP, CSOSN, GTIN…;
--   4. `fiscal_documents` / `fiscal_events` — o destino da fase 2, já
--      criados para que a fase 1 saiba para onde está caminhando;
--   5. o módulo `fiscal` no catálogo;
--   6. a política de UPDATE de `tenants` que FALTAVA (ver
--      `docs/api/portal-client-pendencias.md` §3.4) — sem ela a aba
--      "Dados do negócio" já não salvava, e a fiscal também não salvaria.
--
-- NOTA PARA QUEM LÊ ESTA PASTA PELA PRIMEIRA VEZ: `supabase/migrations/`
-- NÃO descreve o banco inteiro. `tenants`, `products`, `sales`,
-- `modules` e `profiles` nasceram fora do repositório, direto no projeto
-- Supabase. Esta migration DEPENDE de todas elas já existirem.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. `current_tenant_id()` — o tenant de quem está chamando.
--
-- A análise do portal já usa este nome nas políticas que sugeriu, mas a
-- função não está versionada aqui (nasceu no painel, como o resto do
-- schema base). Criar por cima com `create or replace` seria arriscado:
-- se a versão existente tiver outra semântica, todas as políticas do
-- banco mudariam de significado de uma vez, caladas.
--
-- Por isso a criação é CONDICIONAL: se já existe, esta migration não
-- toca nela e reaproveita a que o banco já usa.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc
     where proname = 'current_tenant_id'
       and pronamespace = 'public'::regnamespace
  ) then
    execute $f$
      create function public.current_tenant_id() returns uuid
      language sql
      stable
      security definer
      set search_path = public, pg_temp
      as $body$
        select tenant_id from public.profiles where id = auth.uid()
      $body$;
    $f$;
  end if;
end $$;

-- =====================================================================
-- 1. TENANTS — a política de UPDATE que faltava
--
-- Verificado na análise: o dono conseguia LER `tenants` e não conseguia
-- gravar (0 linhas afetadas). A aba Configurações › Dados salvava no
-- vazio, e a aba fiscal nasceria com o mesmo defeito.
--
-- A trava importante NÃO é a policy, é o GRANT por COLUNA. RLS decide
-- QUAIS LINHAS podem ser escritas; ele não sabe dizer "esta linha sim,
-- mas a coluna `plan` não". Sem o grant restrito, o dono poderia se dar
-- o plano mais caro de graça — ou zerar a própria mensalidade — com uma
-- chamada direta ao PostgREST, sem passar pela nossa interface.
--
-- O `revoke` antes é deliberado: em Postgres, GRANT de coluna SOMA ao
-- grant de tabela inteira, se houver um. Revogar primeiro é o que
-- garante que a lista abaixo seja o teto, e não um acréscimo.
-- ---------------------------------------------------------------------
revoke update on public.tenants from authenticated;

grant update (name, segment, phone, city) on public.tenants to authenticated;

drop policy if exists "dono atualiza o proprio negocio" on public.tenants;

create policy "dono atualiza o proprio negocio" on public.tenants
  for update
  to authenticated
  using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());

-- =====================================================================
-- 2. TENANT_FISCAL_SETTINGS — o emitente
--
-- POR QUE UMA TABELA E NÃO COLUNAS EM `tenants`, como a análise de
-- pendências supôs:
--
--   * `tenants` é escrita pelo ADMIN e guarda o que o cliente não pode
--     tocar (`plan`, `monthly_fee`, `status`). Cada coluna nova ali
--     obriga a mexer de novo no GRANT da seção 1 — uma coluna esquecida
--     na lista é uma coluna que o cliente não consegue salvar, e o
--     sintoma é uma tela que grava no vazio, exatamente o bug que esta
--     migration está consertando.
--   * São 20+ colunas de um assunto só, com ciclo de vida próprio
--     (mudam quando o contador manda, não quando o negócio muda de
--     telefone).
--   * O admin não lê nada disto hoje. Tabela separada mantém as
--     consultas dele intactas.
--
-- 1:1 com `tenants`: a PK É a FK. Não há `id` próprio porque um cadastro
-- fiscal não existe sem o negócio a que pertence.
-- ---------------------------------------------------------------------
create table if not exists public.tenant_fiscal_settings (
  tenant_id uuid primary key
            references public.tenants(id) on delete cascade,

  -- ── Identificação ────────────────────────────────────────────────
  -- `tenants.name` é o nome de fachada ("Petshop Amigo Fiel"); a nota
  -- sai com a RAZÃO SOCIAL, que é outra coisa e mora aqui.
  legal_name          text,

  -- Só dígitos: 11 (CPF, o MEI pessoa física) ou 14 (CNPJ). Guardar
  -- formatado obrigaria toda comparação a limpar a máscara antes, e a
  -- primeira que esquecesse criaria um duplicado invisível.
  tax_id              text,

  -- Inscrição estadual. Quem não tem é ISENTO — e isento não é o mesmo
  -- que "ainda não preenchi", por isso o booleano existe em vez de a
  -- ausência ser inferida do campo vazio.
  state_registration        text,
  state_registration_exempt boolean not null default false,

  -- Inscrição municipal: só pesa quando houver NFS-e (serviço).
  city_registration   text,

  -- CRT — Código de Regime Tributário. É ele que decide se o item da
  -- nota leva CSOSN (Simples) ou CST (Normal). Sem isto, nenhum padrão
  -- do catálogo faz sentido.
  --   1 Simples Nacional
  --   2 Simples Nacional — excesso de sublimite de receita bruta
  --   3 Regime Normal
  --   4 MEI
  tax_regime          smallint check (tax_regime between 1 and 4),

  -- ── Endereço fiscal ──────────────────────────────────────────────
  -- `tenants.city` continua existindo e continua sendo o endereço de
  -- CONTATO, que o admin lê. Este é o endereço do ESTABELECIMENTO, que
  -- é o que vai no XML — e nem sempre são o mesmo lugar.
  street              text,
  street_number       text,
  complement          text,
  district            text,
  zip_code            text,
  city_name           text,
  state_code          text check (state_code is null or state_code ~ '^[A-Z]{2}$'),

  -- O XML leva o CÓDIGO IBGE do município, não o nome dele. É o campo
  -- que mais some em integração fiscal: a tela mostra "Salvador", o
  -- arquivo precisa de 2927408.
  city_ibge_code      text check (city_ibge_code is null or city_ibge_code ~ '^\d{7}$'),

  -- ── Emissão ──────────────────────────────────────────────────────
  -- Cliente novo começa SEMPRE em homologação. Um default 'production'
  -- faria a primeira nota de teste virar documento fiscal de verdade,
  -- com receita declarada e sem venda.
  environment  text not null default 'homologation'
               check (environment in ('homologation', 'production')),

  nfce_series  smallint not null default 1 check (nfce_series between 1 and 999),
  nfe_series   smallint not null default 1 check (nfe_series between 1 and 999),

  -- ── Padrões fiscais do catálogo ──────────────────────────────────
  -- O PONTO MAIS IMPORTANTE DESTA TABELA para quem usa o portal.
  --
  -- NCM, CFOP e CSOSN são decisão do CONTADOR, não do lojista — e num
  -- petshop a esmagadora maioria dos produtos cai no mesmo conjunto.
  -- Sem um padrão, cadastrar 400 produtos significa digitar 400 vezes a
  -- mesma coisa, e a pessoa desiste no vigésimo.
  --
  -- A regra que isto cria: em `products`, coluna fiscal NULA significa
  -- "usa o padrão do negócio". Não significa "faltando".
  default_ncm         text check (default_ncm is null or default_ncm ~ '^\d{8}$'),
  default_cfop        text check (default_cfop is null or default_cfop ~ '^\d{4}$'),

  -- CSOSN (3 dígitos, Simples) ou CST de ICMS (2 dígitos, Normal). Uma
  -- coluna só porque o `tax_regime` já diz qual dos dois é: duas colunas
  -- deixariam sempre uma preenchida e a outra mentindo.
  default_icms_code   text,
  default_pis_cst     text,
  default_cofins_cst  text,

  -- Origem da mercadoria (0 nacional … 8 importada). 0 cobre o balcão.
  default_origin      smallint not null default 0 check (default_origin between 0 and 8),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Aceita 11 ou 14 dígitos, ou nada. O dígito verificador NÃO é
  -- checado aqui de propósito: escrever o cálculo do DV em plpgsql
  -- criaria uma segunda implementação da que já existe em
  -- `lib/dados/fiscal.ts`, e duas regras iguais em lugares diferentes
  -- divergem. O banco garante a FORMA; a aplicação garante o número.
  constraint tenant_fiscal_settings_tax_id_format
    check (tax_id is null or tax_id ~ '^\d{11}$' or tax_id ~ '^\d{14}$'),

  constraint tenant_fiscal_settings_zip_format
    check (zip_code is null or zip_code ~ '^\d{8}$')
);

comment on table public.tenant_fiscal_settings is
  'Dados do emitente e padrões fiscais do catálogo. Um por tenant. Sem segredo — ver fiscal_credentials.';

alter table public.tenant_fiscal_settings enable row level security;

drop policy if exists "tenant le o proprio cadastro fiscal" on public.tenant_fiscal_settings;
drop policy if exists "tenant escreve o proprio cadastro fiscal" on public.tenant_fiscal_settings;

create policy "tenant le o proprio cadastro fiscal" on public.tenant_fiscal_settings
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

-- `for all` cobre insert, update e delete. Aqui NÃO há grant por coluna:
-- a tabela inteira é do cliente, e nenhuma coluna dela decide preço,
-- plano ou acesso. É justamente o que a separação da seção 2 comprou.
create policy "tenant escreve o proprio cadastro fiscal" on public.tenant_fiscal_settings
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

grant select, insert, update on public.tenant_fiscal_settings to authenticated;

-- =====================================================================
-- 3. FISCAL_CREDENTIALS — os segredos
--
-- O CSC (Código de Segurança do Contribuinte) é o que assina o QR Code
-- da NFC-e. É SENHA: quem o tem, junto com o certificado, emite nota em
-- nome do cliente.
--
-- Por isso ele não pode morar em `tenant_fiscal_settings`: aquela tabela
-- o portal lê inteira, a cada navegação, e o valor viajaria até o
-- navegador do balcão dentro do payload do React Server Component.
--
-- O desenho aqui: NINGUÉM com sessão lê esta tabela. Não há policy de
-- select para `authenticated`, e sem policy o RLS nega. Quem escreve é
-- uma função `security definer` (seção 3.2) e quem lê é a Edge Function
-- da fase 2, com a `service_role`, que passa por cima do RLS por ser
-- dona do schema.
--
-- O portal precisa saber apenas UMA coisa: se está configurado ou não.
-- Isso é a view da seção 3.3, que expõe booleano e nunca o valor.
-- ---------------------------------------------------------------------
create table if not exists public.fiscal_credentials (
  tenant_id  uuid primary key
             references public.tenants(id) on delete cascade,

  -- O identificador do CSC (o "Id do token", 6 dígitos) não é segredo
  -- sozinho — ele vai no próprio QR Code da nota. Fica aqui só para não
  -- separar o par.
  csc_id     text,
  csc_token  text,

  -- A fase 2 decide se o certificado A1 fica no provedor (recomendado)
  -- ou no Storage. Esta coluna guarda a REFERÊNCIA ao que o provedor
  -- devolver — nunca o .pfx e nunca a senha dele.
  certificate_ref text,
  certificate_expires_at date,

  updated_at timestamptz not null default now()
);

comment on table public.fiscal_credentials is
  'SEGREDOS fiscais. Sem policy de select: nem o dono do tenant lê. Escrita só por set_fiscal_credentials().';

alter table public.fiscal_credentials enable row level security;

-- Sem GRANT e sem POLICY de leitura, de propósito. As duas ausências são
-- a proteção; não são esquecimento.
revoke all on public.fiscal_credentials from authenticated, anon;

-- ---------------------------------------------------------------------
-- 3.2 Gravar o CSC sem poder lê-lo de volta.
--
-- `security definer` roda com os privilégios do dono da função, então
-- ela escreve numa tabela que quem chamou não alcança. A checagem de
-- quem pode fazer isso é feita DENTRO — não dá para confiar no argumento
-- porque uma Server Action é um endpoint HTTP como outro qualquer.
--
-- Passar `null` num campo o MANTÉM como está. É o que permite à tela
-- salvar o Id do CSC sem obrigar a redigitar o token toda vez — a tela
-- nunca recebeu o token para poder devolvê-lo.
-- ---------------------------------------------------------------------
create or replace function public.set_fiscal_credentials(
  p_csc_id    text default null,
  p_csc_token text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
begin
  v_tenant := public.current_tenant_id();

  if v_tenant is null then
    raise exception 'sem tenant na sessão';
  end if;

  insert into public.fiscal_credentials (tenant_id, csc_id, csc_token)
  values (v_tenant, nullif(btrim(p_csc_id), ''), nullif(btrim(p_csc_token), ''))
  on conflict (tenant_id) do update
    set csc_id     = coalesce(nullif(btrim(p_csc_id), ''),    public.fiscal_credentials.csc_id),
        csc_token  = coalesce(nullif(btrim(p_csc_token), ''), public.fiscal_credentials.csc_token),
        updated_at = now();
end;
$$;

revoke all on function public.set_fiscal_credentials(text, text) from public, anon;
grant execute on function public.set_fiscal_credentials(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3.3 O que o portal PODE saber: se está configurado.
--
-- `security_invoker = off` (o padrão de view) faz a view rodar com os
-- privilégios de quem a criou, e é isso que lhe permite enxergar uma
-- tabela que o chamador não enxerga. O filtro por tenant é feito aqui
-- dentro — a view não devolve linha de outro cliente.
-- ---------------------------------------------------------------------
create or replace view public.v_fiscal_credentials_status as
  select c.tenant_id,
         c.csc_id,
         (c.csc_token is not null) as csc_token_set,
         c.certificate_ref is not null as certificate_set,
         c.certificate_expires_at,
         c.updated_at
    from public.fiscal_credentials c
   where c.tenant_id = public.current_tenant_id();

grant select on public.v_fiscal_credentials_status to authenticated;

-- =====================================================================
-- 4. PRODUCTS — o item da nota
--
-- Toda coluna é NULA por padrão, e nula quer dizer "usa o padrão do
-- negócio" (seção 2). Só o que foge da regra precisa ser preenchido
-- produto a produto — que é o único jeito de um catálogo de 400 itens
-- ficar fiscalmente correto sem 400 formulários.
-- ---------------------------------------------------------------------
alter table public.products
  -- Obrigatório em todo item da nota. Sem NCM válido a SEFAZ rejeita.
  add column if not exists ncm text,

  -- Só quando o produto está em substituição tributária. A maioria não.
  add column if not exists cest text,

  -- Origem da mercadoria (0..8). Nulo = padrão do negócio.
  add column if not exists origin smallint,

  -- POR QUE NÃO REAPROVEITAR `barcode`: a SEFAZ valida o dígito
  -- verificador do GTIN-8/12/13/14. O `barcode` de hoje é um campo
  -- livre, onde cabe o código interno da balança ("2100034") — que é
  -- perfeitamente útil para bipar no PDV e REPROVA a nota inteira.
  -- São dois campos com dois propósitos, e juntá-los quebraria o balcão
  -- para consertar o fiscal.
  add column if not exists gtin text,

  -- A unidade TRIBUTÁVEL, que nem sempre é a comercial: vende-se "fardo"
  -- e tributa-se "KG". Nula, o portal usa a comercial (`unit`).
  add column if not exists tax_unit text,

  add column if not exists cfop text,

  -- CSOSN (Simples) ou CST de ICMS (Normal) — o regime do emitente diz
  -- qual. Mesma decisão de `default_icms_code`.
  add column if not exists icms_code text,
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text,

  -- ── Reforma tributária ───────────────────────────────────────────
  -- A NT 2025.002 acrescentou estes três à NF-e e à NFC-e. Para Simples
  -- e MEI — o público deste SaaS — a obrigatoriedade em produção começa
  -- em 04/01/2027. As colunas nascem aqui, vazias, porque criá-las agora
  -- custa uma linha e criá-las em dezembro custa uma segunda migração
  -- sobre um catálogo já povoado.
  add column if not exists trib_class text,
  add column if not exists ibs_cst text,
  add column if not exists cbs_cst text;

-- As checagens vão como constraint separada para poderem ser nomeadas e
-- para `if not exists` da coluna não engolir a regra numa segunda
-- execução da migration.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_ncm_format') then
    alter table public.products
      add constraint products_ncm_format check (ncm is null or ncm ~ '^\d{8}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_cest_format') then
    alter table public.products
      add constraint products_cest_format check (cest is null or cest ~ '^\d{7}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_cfop_format') then
    alter table public.products
      add constraint products_cfop_format check (cfop is null or cfop ~ '^\d{4}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_origin_range') then
    alter table public.products
      add constraint products_origin_range check (origin is null or origin between 0 and 8);
  end if;

  -- GTIN tem 8, 12, 13 ou 14 dígitos. "SEM GTIN" é o valor que a SEFAZ
  -- espera de quem não tem código de barras — e é literal, em maiúsculas.
  if not exists (select 1 from pg_constraint where conname = 'products_gtin_format') then
    alter table public.products
      add constraint products_gtin_format
      check (gtin is null or gtin = 'SEM GTIN' or gtin ~ '^\d{8}$|^\d{12,14}$');
  end if;
end $$;

-- =====================================================================
-- 5. FISCAL_DOCUMENTS — o destino (fase 2)
--
-- Criada agora, vazia, por dois motivos: a fase 1 já pode mostrar a
-- coluna "Nota" no histórico de vendas dizendo "não emitida", e a forma
-- da tabela é o que impede a fase 1 de cadastrar dado que a fase 2 não
-- vai conseguir usar.
--
-- UM DOCUMENTO NÃO É UMA VENDA. `sale_id` é nulável porque existe
-- documento sem venda (uma NF-e de devolução, uma inutilização de faixa
-- de numeração) — e uma venda pode gerar DOIS documentos, quando o
-- carrinho mistura produto (NFC-e) e serviço (NFS-e).
-- ---------------------------------------------------------------------
create table if not exists public.fiscal_documents (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  sale_id    uuid references public.sales(id) on delete set null,

  -- '65' NFC-e, '55' NF-e, 'nfse' o serviço municipal. Texto e não
  -- inteiro porque a NFS-e não tem número de modelo nacional.
  model      text not null check (model in ('55', '65', 'nfse')),

  environment text not null check (environment in ('homologation', 'production')),

  -- Nascem nulos: são a SEFAZ que atribui, no aceite.
  series     smallint,
  number     bigint,
  access_key text check (access_key is null or access_key ~ '^\d{44}$'),
  protocol   text,

  -- O ciclo de vida inteiro do documento.
  --   pending    enfileirado, ainda não foi ao provedor
  --   processing no provedor / na SEFAZ, sem resposta final
  --   authorized autorizada — a partir daqui NÃO se apaga nem se edita
  --   rejected   recusada; `rejection_reason` diz o quê
  --   cancelled  autorizada e depois cancelada, dentro do prazo
  --   denied     denegada pelo fisco (irregularidade do emitente)
  status text not null default 'pending'
         check (status in ('pending','processing','authorized','rejected','cancelled','denied')),

  rejection_reason text,
  authorized_at    timestamptz,

  xml_url   text,
  danfe_url text,

  -- O identificador da nota no provedor escolhido. Ter isto guardado é o
  -- que permite reconciliar depois de um webhook perdido.
  provider     text,
  provider_ref text,

  -- Quantas vezes já se tentou. A fila de retentativa da fase 2 lê isto
  -- para parar de insistir num documento que sempre vai falhar.
  attempts smallint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fiscal_documents is
  'Um por documento fiscal. Preenchida a partir da fase 2; na fase 1 existe para a tela dizer "não emitida".';

-- A chave de acesso é única no Brasil inteiro; duas linhas com a mesma
-- significa documento duplicado, que é o erro mais caro desta área.
create unique index if not exists fiscal_documents_access_key_uidx
  on public.fiscal_documents (access_key)
  where access_key is not null;

create index if not exists fiscal_documents_tenant_created_idx
  on public.fiscal_documents (tenant_id, created_at desc);

create index if not exists fiscal_documents_sale_idx
  on public.fiscal_documents (sale_id)
  where sale_id is not null;

-- A fila da fase 2: só o que ainda está em aberto.
create index if not exists fiscal_documents_pending_idx
  on public.fiscal_documents (tenant_id, status)
  where status in ('pending', 'processing');

alter table public.fiscal_documents enable row level security;

drop policy if exists "tenant le os proprios documentos fiscais" on public.fiscal_documents;

-- SÓ LEITURA para quem tem sessão. Documento fiscal não é criado pela
-- interface: quem o cria é a Edge Function da fase 2, com service_role.
-- Deixar o navegador inserir aqui permitiria forjar uma nota "autorizada"
-- que nunca existiu na SEFAZ.
create policy "tenant le os proprios documentos fiscais" on public.fiscal_documents
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

grant select on public.fiscal_documents to authenticated;

-- ---------------------------------------------------------------------
-- 5.2 FISCAL_EVENTS — o que acontece DEPOIS da autorização.
--
-- Cancelamento, carta de correção e inutilização não alteram o
-- documento: são eventos ligados a ele. É por isso que são uma tabela e
-- não colunas — um documento pode ter vários, e a ordem importa.
-- ---------------------------------------------------------------------
create table if not exists public.fiscal_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.fiscal_documents(id) on delete cascade,

  type text not null check (type in ('cancellation', 'correction', 'disablement')),

  -- A SEFAZ exige justificativa de 15 a 255 caracteres no cancelamento.
  justification text,

  protocol text,
  status text not null default 'pending'
         check (status in ('pending', 'processing', 'accepted', 'rejected')),
  rejection_reason text,

  created_at timestamptz not null default now()
);

create index if not exists fiscal_events_document_idx
  on public.fiscal_events (document_id, created_at desc);

alter table public.fiscal_events enable row level security;

drop policy if exists "tenant le os proprios eventos fiscais" on public.fiscal_events;

create policy "tenant le os proprios eventos fiscais" on public.fiscal_events
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());

grant select on public.fiscal_events to authenticated;

-- =====================================================================
-- 6. `updated_at` — um gatilho para as três tabelas
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tenant_fiscal_settings_touch on public.tenant_fiscal_settings;
create trigger tenant_fiscal_settings_touch
  before update on public.tenant_fiscal_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists fiscal_documents_touch on public.fiscal_documents;
create trigger fiscal_documents_touch
  before update on public.fiscal_documents
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- 7. O MÓDULO `fiscal` no catálogo
--
-- O portal é modular: o menu e as telas montam-se a partir de
-- `v_active_modules`. Registrar o módulo aqui é o que permite ao admin
-- vendê-lo, e ao portal esconder as telas fiscais de quem não o tem.
--
-- `is_access = false`: é uma tela do portal, não uma liberação de app.
--
-- NÃO ligamos o módulo para ninguém. Quem decide que cliente passa a
-- ter Nota Fiscal é o admin, na ficha do cliente — a emissão tem custo
-- por nota e o preço disso é decisão comercial, não migração.
-- ---------------------------------------------------------------------
insert into public.modules (key, name, description, is_access)
values (
  'fiscal',
  'Nota Fiscal',
  'Cadastro fiscal do negócio e emissão de nota das vendas.',
  false
)
on conflict (key) do nothing;
