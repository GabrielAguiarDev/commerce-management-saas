-- =====================================================================
-- INTEGRIDADE NAO FISCAL: remover o lancamento de custo morto do estoque
-- =====================================================================
--
-- `stock_movements.type` aceita somente `in`, `out`, `adjustment` e `sale`,
-- mas o trigger legado testava `type = 'entry'`. Corrigi-lo para `in` nao e
-- seguro: os clientes atuais (portal e mobile) ja criam explicitamente o
-- custo da compra depois de `apply_stock_movement`, pois so a camada que
-- iniciou a operacao sabe distinguir compra de outras entradas positivas.
-- Ativar o trigger para toda entrada criaria duas despesas para a mesma
-- compra. Por isso removemos o caminho morto em vez de ampliar seu alcance.
--
-- `costs.stock_movement_id` fica preservada por compatibilidade com dados
-- historicos e integracoes; esta migration nao muda RLS nem objetos fiscais.
-- Os DROPs sao idempotentes para reaplicacao pelo pipeline de banco.

drop trigger if exists trg_cost_from_stock on public.stock_movements;
drop function if exists public.cost_from_stock_entry();

comment on column public.costs.stock_movement_id is
  'Vinculo legado/opcional com estoque. Entradas nao geram custo por trigger: portal e mobile registram a compra explicitamente para nao confundir outras entradas positivas com despesa.';
