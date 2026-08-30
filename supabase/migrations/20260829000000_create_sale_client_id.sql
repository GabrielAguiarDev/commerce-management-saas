-- =====================================================================
-- CREATE_SALE — aceitar o id gerado no APARELHO, e fechar o total em
-- centavos.
--
-- ┌─ POR QUE O `p_id` ─────────────────────────────────────────────────────┐
-- │ O app mobile vende OFFLINE. A venda entra numa fila local com um uuid   │
-- │ gerado no próprio aparelho, e sobe depois. Esse uuid é o que torna a    │
-- │ subida REPETÍVEL SEM DUPLICAR: se a rede cair entre o INSERT e a        │
-- │ resposta, a segunda tentativa bate na chave primária e o Postgres       │
-- │ recusa com 23505 — que o app lê como "essa venda já entrou" em vez de   │
-- │ criar uma gêmea (ver `salesApi.recordSale` e `syncErrors.isDuplicate`). │
-- │                                                                        │
-- │ Sem um parâmetro de id, `create_sale` gera a chave por conta própria e  │
-- │ CADA REENVIO VIRA UMA VENDA NOVA. Foi por isso que o app não migrou     │
-- │ junto com o portal: trocaria uma venda órfã rara por faturamento        │
-- │ duplicado toda vez que a rede oscilasse no meio de uma sincronização.   │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- ┌─ POR QUE O ARREDONDAMENTO ─────────────────────────────────────────────┐
-- │ `sales.total`, `sale_items.subtotal` e `unit_price` são `numeric` SEM   │
-- │ escala: o Postgres guarda o que mandarem, com a precisão que vier.      │
-- │                                                                        │
-- │ Vender 0,5 kg a R$ 19,99 dá 9,995 — um valor que não existe em          │
-- │ dinheiro. Somando vários itens assim, o total do banco passa a          │
-- │ discordar do que a tela mostrou ao cliente, por centavos que ninguém    │
-- │ consegue explicar depois. E o pior: a NFC-e sai deste número.           │
-- │                                                                        │
-- │ A regra aqui é a que fecha a conta: arredonda CADA subtotal para        │
-- │ centavos, e o total é a SOMA DOS SUBTOTAIS ARREDONDADOS. Arredondar só  │
-- │ o total no fim deixaria a soma dos itens diferente dele — e uma nota    │
-- │ fiscal em que os itens não somam o total é uma nota rejeitada.          │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- ⚠️ É UM DROP + CREATE, não um `create or replace`. Acrescentar um argumento
-- muda a assinatura, e `create or replace` criaria uma SOBRECARGA: duas
-- funções `create_sale` conviveriam, e o PostgREST recusaria as duas com
-- PGRST203 ("could not choose the best candidate function"). O portal pararia
-- de vender no instante em que esta migration rodasse.
--
-- COMPATÍVEL COM QUEM JÁ CHAMA: `p_id` tem default `null` e entra por último.
-- O portal continua chamando sem ele, como sempre chamou.
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

drop function if exists public.create_sale(text, jsonb, text, text, timestamptz);

create or replace function public.create_sale(
  p_payment_method    text,
  p_items             jsonb,
  p_customer_document text default null,
  p_customer_name     text default null,
  p_sold_at           timestamptz default null,
  p_id                uuid default null
)
returns uuid
language plpgsql
-- SECURITY INVOKER (o padrão): a função roda com os privilégios de quem
-- chamou, então o RLS de `sales` e `sale_items` continua valendo linha a
-- linha. Fazê-la `definer` para "simplificar" trocaria uma transação por um
-- furo no isolamento entre negócios.
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

  -- O total é somado AQUI, a partir dos itens, e não recebido pronto. O valor
  -- que o navegador afirma não é prova de nada: uma requisição forjada poderia
  -- mandar itens de R$ 200 e total de R$ 2. Como a nota fiscal sai deste
  -- número, ele precisa vir do banco.
  --
  -- O `round` por item é o mesmo do INSERT lá embaixo — é o que garante que a
  -- soma feche com os itens gravados.
  select sum(round((i->>'quantity')::numeric * (i->>'unit_price')::numeric, 2))
    into v_total
    from jsonb_array_elements(p_items) as i;

  if v_total is null or v_total < 0 then
    raise exception 'total inválido para a venda';
  end if;

  insert into public.sales (
    id, tenant_id, user_id, total, payment_method, status, sold_at,
    customer_document, customer_name
  )
  values (
    -- `coalesce`: quem não manda id (o caminho online, do portal e do app) cai
    -- no uuid do banco, exatamente como antes.
    coalesce(p_id, gen_random_uuid()),
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
    round((i->>'quantity')::numeric * (i->>'unit_price')::numeric, 2)
  from jsonb_array_elements(p_items) as i;

  return v_sale;
end;
$$;

comment on function public.create_sale is
  'Cria a venda e os itens numa transação só. `p_id` aceita o uuid gerado no aparelho (fila offline do app), o que torna o reenvio idempotente: a segunda tentativa viola a chave primária em vez de duplicar a venda. Subtotais e total são arredondados em centavos — ver 20260829000000_create_sale_client_id.sql.';

grant execute on function public.create_sale(text, jsonb, text, text, timestamptz, uuid) to authenticated;
