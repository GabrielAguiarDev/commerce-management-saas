-- Confere o que a API REST não alcança: os CHECKs, o gatilho e a função de
-- 20260828000000_state_column_checks.sql.
--
-- Rode no editor SQL do Supabase. Esperado: 14 linhas, todas com existe = true.
-- Qualquer linha com false quer dizer que aquela migration parou antes daquele
-- ponto — e a coluna correspondente ainda aceita qualquer texto.

with esperado(tabela, coluna) as (
  values
    ('sales',            'payment_method'),
    ('sales',            'status'),
    ('costs',            'type'),
    ('costs',            'origin'),
    ('stock_movements',  'type'),
    ('cash_registers',   'status'),
    ('cash_movements',   'type'),
    ('support_tickets',  'status'),
    ('support_tickets',  'priority'),
    ('support_messages', 'sender_side'),
    ('tenants',          'status'),
    ('profiles',         'status')
)
select
  'CHECK'                                                as tipo,
  e.tabela || '.' || e.coluna                            as objeto,
  (c.conname is not null)                                as existe
from esperado e
left join pg_constraint c
       on c.conname  = format('%s_%s_vocab_check', e.tabela, e.coluna)
      and c.conrelid = format('public.%I', e.tabela)::regclass

union all

-- O gatilho de compatibilidade: é ele que deixa o app antigo, já instalado no
-- celular, continuar registrando venda depois dos CHECKs.
select
  'função',
  'normalize_sale_payment_method',
  exists (select 1 from pg_proc where proname = 'normalize_sale_payment_method')

union all

select
  'gatilho',
  'sales_normalize_payment_method',
  exists (
    select 1 from pg_trigger
     where tgname = 'sales_normalize_payment_method'
       and tgrelid = 'public.sales'::regclass
  )

order by existe, tipo, objeto;
