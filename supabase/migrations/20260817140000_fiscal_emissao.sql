-- =====================================================================
-- FASE 2 DA NOTA FISCAL — o CAMINHO DA EMISSÃO (parte de banco).
--
-- Depende de `20260817120000_fiscal_cadastro.sql`.
--
-- O que entra aqui:
--   1. `sales.customer_document` — o "CPF na nota";
--   2. `create_sale`  — a venda numa transação só (dívida antiga, ver
--      `docs/api/portal-client-pendencias.md` §3.2), agora BLOQUEANTE:
--      uma venda sem itens vira um documento fiscal de valor errado;
--   3. `enqueue_fiscal_document` — o portal pede o documento, o banco o
--      cria. O portal NÃO insere em `fiscal_documents` (não tem policy
--      para isso, de propósito: quem grava nota é a Edge Function);
--   4. `fiscal_document_payload` — a leitura que a Edge Function usa
--      para montar o JSON da Focus NFe, com a herança dos padrões já
--      resolvida DENTRO do banco;
--   5. `mark_fiscal_document` — a escrita de volta do resultado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. O "CPF na nota".
--
-- É o campo mais visível da NFC-e para quem está do outro lado do balcão,
-- e o PDV não tinha onde guardá-lo. Nulo é o caso normal: consumidor não
-- identificado é perfeitamente válido numa NFC-e.
--
-- Só dígitos, 11 (CPF) ou 14 (CNPJ) — e o CNPJ aqui é um caso que a
-- própria SEFAZ está fechando: desde 04/05/2026 a NFC-e não pode mais ser
-- emitida contra CNPJ (Ajuste SINIEF 43/2025), o que exige NF-e modelo 55.
-- A coluna aceita os dois porque quem recusa é a regra de emissão, não o
-- cadastro — e guardar o número permite a tela explicar POR QUE aquela
-- venda não gerou NFC-e.
-- ---------------------------------------------------------------------
alter table public.sales
  add column if not exists customer_document text,
  add column if not exists customer_name text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_customer_document_format') then
    alter table public.sales
      add constraint sales_customer_document_format
      check (customer_document is null or customer_document ~ '^\d{11}$|^\d{14}$');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. A referência que vai ao provedor.
--
-- A Focus NFe identifica cada documento por uma `ref` NOSSA, escolhida
-- por nós e única para sempre naquele CNPJ. Reenviar a mesma `ref` é o
-- que impede uma nota duplicada quando a rede cai entre o POST e a
-- resposta — o provedor devolve o documento que já existe em vez de
-- emitir outro.
--
-- Por isso ela nasce COM a linha, e não no momento do envio: se fosse
-- gerada a cada tentativa, cada retentativa viraria uma nota nova.
-- ---------------------------------------------------------------------
alter table public.fiscal_documents
  add column if not exists reference text;

create unique index if not exists fiscal_documents_reference_uidx
  on public.fiscal_documents (reference)
  where reference is not null;

-- =====================================================================
-- 3. CREATE_SALE — a venda numa transação só
--
-- POR QUE AGORA: registrar uma venda eram duas escritas em sequência
-- (`sales` e depois `sale_items`), e o PostgREST não tem transação entre
-- chamadas. Se a segunda falhasse, ficava uma venda sem itens.
--
-- Sem nota, isso era um incômodo no relatório. COM nota, é um documento
-- fiscal de R$ 0,00 — ou de valor errado — enviado à SEFAZ, que não se
-- apaga depois. Deixou de ser melhoria e virou pré-requisito.
--
-- SECURITY INVOKER (o padrão, sem `security definer`): a função roda com
-- os privilégios de quem chamou, então as políticas de RLS de `sales` e
-- `sale_items` continuam valendo linha a linha. Fazê-la `definer` para
-- "simplificar" trocaria uma transação por um furo no isolamento.
--
-- O TRIGGER DE ESTOQUE CONTINUA VALENDO. Inserir em `sale_items` desconta
-- `products.stock_quantity` e grava o `stock_movements` do tipo 'sale' —
-- comportamento verificado no banco e documentado em `app/vendas/
-- actions.ts`. Ele roda dentro desta transação, o que é uma melhoria de
-- graça: venda desfeita agora desfaz a baixa junto.
-- =====================================================================
create or replace function public.create_sale(
  p_payment_method   text,
  p_items            jsonb,
  p_customer_document text default null,
  p_customer_name     text default null,
  p_sold_at          timestamptz default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid;
  v_sale   uuid;
  v_total  numeric;
  v_count  int;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception 'sem tenant na sessão';
  end if;

  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count = 0 then
    raise exception 'a venda precisa de pelo menos um item';
  end if;

  -- O total é somado AQUI, a partir dos itens, e não recebido pronto.
  -- O valor que o navegador afirma não é prova de nada: uma requisição
  -- forjada poderia mandar itens de R$ 200 e total de R$ 2. Como a nota
  -- fiscal sai deste número, ele precisa vir do banco.
  select sum((i->>'quantity')::numeric * (i->>'unit_price')::numeric)
    into v_total
    from jsonb_array_elements(p_items) as i;

  if v_total is null or v_total < 0 then
    raise exception 'total inválido para a venda';
  end if;

  insert into public.sales (
    tenant_id, user_id, total, payment_method, status, sold_at,
    customer_document, customer_name
  )
  values (
    v_tenant, auth.uid(), v_total, p_payment_method, 'completed',
    coalesce(p_sold_at, now()),
    nullif(regexp_replace(coalesce(p_customer_document, ''), '\D', '', 'g'), ''),
    nullif(btrim(coalesce(p_customer_name, '')), '')
  )
  returning id into v_sale;

  insert into public.sale_items (
    tenant_id, sale_id, product_id, product_name, quantity, unit_price, subtotal
  )
  select
    v_tenant,
    v_sale,
    nullif(i->>'product_id', '')::uuid,
    i->>'product_name',
    (i->>'quantity')::numeric,
    (i->>'unit_price')::numeric,
    (i->>'quantity')::numeric * (i->>'unit_price')::numeric
  from jsonb_array_elements(p_items) as i;

  return v_sale;
end;
$$;

grant execute on function public.create_sale(text, jsonb, text, text, timestamptz) to authenticated;

-- =====================================================================
-- 4. ENQUEUE_FISCAL_DOCUMENT — o portal pede, o banco cria
--
-- `fiscal_documents` só tem policy de SELECT para quem tem sessão. É
-- deliberado: se o navegador pudesse inserir ali, daria para forjar uma
-- nota "autorizada" que nunca existiu na SEFAZ. Quem grava documento é a
-- Edge Function, com `service_role`.
--
-- Mas o portal precisa PEDIR um. Esta função é essa porta: ela cria a
-- linha em 'pending' e não deixa o chamador escolher nada que importe —
-- ambiente, série e modelo saem do cadastro, não do argumento.
-- =====================================================================
create or replace function public.enqueue_fiscal_document(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant  uuid;
  v_cfg     public.tenant_fiscal_settings%rowtype;
  v_doc     uuid;
  v_goods   int;
  v_existing uuid;
begin
  v_tenant := public.current_tenant_id();
  if v_tenant is null then
    raise exception 'sem tenant na sessão';
  end if;

  -- A venda tem de ser deste tenant. A checagem é explícita porque esta
  -- função é `security definer` — aqui dentro o RLS não protege mais.
  if not exists (
    select 1 from public.sales s
     where s.id = p_sale_id and s.tenant_id = v_tenant
  ) then
    raise exception 'venda não encontrada';
  end if;

  select * into v_cfg
    from public.tenant_fiscal_settings
   where tenant_id = v_tenant;

  -- Sem cadastro fiscal não há o que enfileirar. Não é erro: é o estado
  -- de todo cliente que ainda não configurou. Devolver null deixa a
  -- venda seguir sem nota, que é exatamente o comportamento desejado.
  if v_cfg.tenant_id is null or v_cfg.tax_id is null then
    return null;
  end if;

  -- Já existe documento vivo para esta venda? Reemitir criaria uma
  -- segunda nota para a mesma venda — o erro mais caro desta área.
  -- Só um documento REJEITADO pode ser refeito.
  select id into v_existing
    from public.fiscal_documents
   where sale_id = p_sale_id
     and status <> 'rejected'
   limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- SERVIÇO NÃO ENTRA EM NFC-e. Banho, consulta e afins vão em NFS-e, que
  -- é municipal e ainda não é emitida aqui. Uma venda só de serviços não
  -- gera documento nenhum; uma venda mista gera a NFC-e das mercadorias
  -- (a NFS-e da outra metade fica para quando existir).
  select count(*) into v_goods
    from public.sale_items si
    left join public.products p on p.id = si.product_id
   where si.sale_id = p_sale_id
     and coalesce(p.is_service, false) = false;

  if v_goods = 0 then
    return null;
  end if;

  insert into public.fiscal_documents (
    tenant_id, sale_id, model, environment, series, status, reference
  )
  values (
    v_tenant,
    p_sale_id,
    '65',
    v_cfg.environment,
    v_cfg.nfce_series,
    'pending',
    -- A `ref` da Focus: única para sempre neste CNPJ. O id do documento
    -- serve bem — é uuid, nasce com a linha e nunca se repete.
    'af-' || replace(gen_random_uuid()::text, '-', '')
  )
  returning id into v_doc;

  return v_doc;
end;
$$;

revoke all on function public.enqueue_fiscal_document(uuid) from public, anon;
grant execute on function public.enqueue_fiscal_document(uuid) to authenticated;

-- =====================================================================
-- 5. FISCAL_DOCUMENT_PAYLOAD — tudo que a nota precisa, numa consulta
--
-- POR QUE NO BANCO E NÃO NA EDGE FUNCTION: a herança do padrão fiscal
-- ("campo vazio no produto usa o do negócio") é uma REGRA, e ela já é
-- aplicada na tela do produto. Repeti-la em TypeScript na Edge Function
-- criaria duas implementações da mesma coisa — e o dia em que
-- divergissem, a tela mostraria um NCM e a nota sairia com outro.
--
-- `security definer` porque quem chama é a Edge Function com
-- `service_role`, que já passa por cima do RLS de qualquer jeito; ter a
-- consulta aqui mantém a regra num lugar só.
-- =====================================================================
create or replace function public.fiscal_document_payload(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc  public.fiscal_documents%rowtype;
  v_cfg  public.tenant_fiscal_settings%rowtype;
  v_sale public.sales%rowtype;
  v_out  jsonb;
begin
  select * into v_doc from public.fiscal_documents where id = p_document_id;
  if v_doc.id is null then
    raise exception 'documento não encontrado';
  end if;

  select * into v_cfg from public.tenant_fiscal_settings where tenant_id = v_doc.tenant_id;
  select * into v_sale from public.sales where id = v_doc.sale_id;

  select jsonb_build_object(
    'document', jsonb_build_object(
      'id',          v_doc.id,
      'reference',   v_doc.reference,
      'model',       v_doc.model,
      'environment', v_doc.environment,
      'series',      v_doc.series,
      'attempts',    v_doc.attempts
    ),
    'emitter', jsonb_build_object(
      'tax_id',      v_cfg.tax_id,
      'legal_name',  v_cfg.legal_name,
      'state_code',  v_cfg.state_code,
      'tax_regime',  v_cfg.tax_regime
    ),
    'sale', jsonb_build_object(
      'id',                v_sale.id,
      'sold_at',           v_sale.sold_at,
      'total',             v_sale.total,
      'payment_method',    v_sale.payment_method,
      'customer_document', v_sale.customer_document,
      'customer_name',     v_sale.customer_name
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'number',      row_number() over (order by si.id),
          'code',        coalesce(nullif(p.barcode, ''), si.product_id::text, 'AVULSO'),
          'description', si.product_name,
          'quantity',    si.quantity,
          'unit_price',  si.unit_price,
          'total',       si.subtotal,
          -- A HERANÇA, resolvida aqui: o campo do produto vence; vazio
          -- cai no padrão do negócio. Mesma regra da tela.
          'ncm',         coalesce(nullif(p.ncm, ''), v_cfg.default_ncm),
          'cest',        nullif(p.cest, ''),
          'cfop',        coalesce(nullif(p.cfop, ''), v_cfg.default_cfop),
          'icms_code',   coalesce(nullif(p.icms_code, ''), v_cfg.default_icms_code),
          'origin',      coalesce(p.origin, v_cfg.default_origin, 0),
          'unit',        coalesce(nullif(p.unit, ''), 'un'),
          'tax_unit',    coalesce(nullif(p.tax_unit, ''), upper(coalesce(nullif(p.unit, ''), 'un'))),
          'gtin',        nullif(p.gtin, '')
        )
        order by si.id
      )
      from public.sale_items si
      left join public.products p on p.id = si.product_id
      where si.sale_id = v_doc.sale_id
        -- Serviço fica de fora: ele não entra em NFC-e.
        and coalesce(p.is_service, false) = false
    ), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.fiscal_document_payload(uuid) from public, anon, authenticated;

-- =====================================================================
-- 6. MARK_FISCAL_DOCUMENT — a escrita de volta
--
-- Também `security definer` e também só para a Edge Function. O portal
-- nunca escreve status de nota: se pudesse, "autorizado" seria uma
-- afirmação do navegador, e não da SEFAZ.
-- =====================================================================
create or replace function public.mark_fiscal_document(
  p_document_id      uuid,
  p_status           text,
  p_protocol         text default null,
  p_access_key       text default null,
  p_number           bigint default null,
  p_series           smallint default null,
  p_xml_url          text default null,
  p_danfe_url        text default null,
  p_rejection_reason text default null,
  p_provider         text default null,
  p_provider_ref     text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.fiscal_documents
     set status           = p_status,
         protocol         = coalesce(p_protocol, protocol),
         access_key       = coalesce(p_access_key, access_key),
         number           = coalesce(p_number, number),
         series           = coalesce(p_series, series),
         xml_url          = coalesce(p_xml_url, xml_url),
         danfe_url        = coalesce(p_danfe_url, danfe_url),
         -- Zera a rejeição quando a nota passa: manter o texto de um erro
         -- já superado faria a tela contar uma história errada.
         rejection_reason = case when p_status = 'authorized' then null
                                 else coalesce(p_rejection_reason, rejection_reason) end,
         authorized_at    = case when p_status = 'authorized' then coalesce(authorized_at, now())
                                 else authorized_at end,
         provider         = coalesce(p_provider, provider),
         provider_ref     = coalesce(p_provider_ref, provider_ref),
         attempts         = attempts + 1
   where id = p_document_id;
end;
$$;

revoke all on function public.mark_fiscal_document(uuid, text, text, text, bigint, smallint, text, text, text, text, text)
  from public, anon, authenticated;
