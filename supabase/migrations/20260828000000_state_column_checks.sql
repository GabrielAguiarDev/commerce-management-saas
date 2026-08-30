-- =====================================================================
-- CHECK nas colunas de estado — e a normalização que precisa vir antes.
--
-- POR QUE AGORA: o levantamento do portal (docs/api/portal-client-pendencias
-- §3.2.3) verificou que o banco ACEITA qualquer texto nessas colunas — um
-- '__x__' entrou em sales.payment_method, sales.status, costs.type,
-- costs.origin e cash_registers.status. Três aplicações escrevem nelas (portal
-- do cliente, painel admin e app mobile) e o vocabulário estava vivendo em
-- três arquivos de TypeScript. Isso já divergiu uma vez, e custou dinheiro:
--
--   O app gravava 'debit_card'/'credit_card' e o portal gravava
--   'debit'/'credit'. O `paymentFromDb` do portal cai em 'cash' para o que
--   não reconhece, então TODA VENDA NO CARTÃO feita pelo celular era lida
--   como venda em dinheiro: entrava no "esperado na gaveta" do fechamento e
--   o caixa fechava com falta todo dia.
--
-- Os dois lados já foram unificados no código. Este arquivo é o que impede a
-- divergência de voltar — daqui em diante o banco recusa a grafia errada na
-- hora do INSERT, em vez de deixá-la aparecer semanas depois como um caixa que
-- não bate.
--
-- POR QUE CHECK E NÃO ENUM: um enum novo exige ALTER TYPE para cada valor que
-- entrar, e o `ALTER TYPE ... ADD VALUE` não roda dentro de transação em
-- versões mais antigas do Postgres. Um CHECK se troca com um DROP e um ADD na
-- mesma migration. O ganho de integridade é o mesmo.
--
-- O QUE ACONTECE SE JÁ HOUVER LIXO NA COLUNA: a migration PARA, e diz qual
-- valor e em qual coluna. Ela não conserta sozinha — corrigir dado de venda no
-- escuro é pior do que não rodar. As duas únicas correções automáticas são as
-- duas grafias de cartão do bloco 1, que são conhecidas e inequívocas.
--
-- IDEMPOTENTE: rodar de novo não faz nada. Pode ser reaplicada sem medo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Normalização: as duas grafias que o app mobile gravava.
--
--    Só estas duas, e só nesta coluna. São uma tradução de rótulo, não uma
--    reinterpretação de dado: 'debit_card' e 'debit' sempre quiseram dizer a
--    mesma coisa para o mesmo negócio.
-- ---------------------------------------------------------------------
update public.sales
   set payment_method = case payment_method
                          when 'debit_card'  then 'debit'
                          when 'credit_card' then 'credit'
                        end
 where payment_method in ('debit_card', 'credit_card');

-- ---------------------------------------------------------------------
-- 1b. O CELULAR QUE JÁ ESTÁ NA MÃO DO LOJISTA.
--
-- O app foi corrigido para gravar 'debit'/'credit', mas a versão antiga
-- continua instalada até a pessoa atualizar — e ela vende hoje. Pior: o app
-- tem fila offline, então há venda gravada no aparelho, com a grafia velha,
-- esperando internet para subir.
--
-- Se o CHECK do bloco 2 fosse a única defesa, o dia da migration seria o dia
-- em que essas vendas passariam a ser RECUSADAS na sincronização — venda
-- perdida por causa de um rótulo, que é exatamente o desastre que este
-- arquivo existe para evitar.
--
-- Então o banco traduz antes de conferir. O gatilho roda BEFORE INSERT OR
-- UPDATE, normaliza as duas grafias conhecidas, e só depois o CHECK olha. O
-- app velho continua vendendo; a coluna continua limpa.
--
-- QUANDO REMOVER: quando não houver mais instalação antiga em campo. Até lá
-- ele é barato — duas comparações de texto por venda.
-- ---------------------------------------------------------------------
create or replace function public.normalize_sale_payment_method()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.payment_method = 'debit_card' then
    new.payment_method := 'debit';
  elsif new.payment_method = 'credit_card' then
    new.payment_method := 'credit';
  end if;
  return new;
end;
$$;

comment on function public.normalize_sale_payment_method is
  'Traduz as grafias de cartão que o app mobile gravava antes da unificação (debit_card/credit_card) para o vocabulário canônico, para que uma versão antiga do app em campo continue conseguindo registrar venda depois do CHECK.';

drop trigger if exists sales_normalize_payment_method on public.sales;

create trigger sales_normalize_payment_method
  before insert or update of payment_method on public.sales
  for each row
  execute function public.normalize_sale_payment_method();

-- ---------------------------------------------------------------------
-- 2. O vocabulário, num lugar só.
--
--    Esta tabela é o miolo da migration: é ela que um revisor precisa
--    conferir contra `apps/portal-client/lib/dados/*.ts`,
--    `apps/mobile/src/domain/shared/dbEnums.ts` e
--    `apps/portal-admin/lib/*.ts`. O laço abaixo é só mecânica.
--
--    NULL é sempre aceito — um CHECK não se aplica a NULL, e tornar essas
--    colunas NOT NULL é uma decisão diferente, que quebraria escrita de quem
--    hoje omite o campo e depende do DEFAULT da coluna.
-- ---------------------------------------------------------------------
do $$
declare
  r          record;
  v_offend   text;
  v_name     text;
begin
  for r in
    select * from (values
      -- tabela                 coluna            valores aceitos
      ('sales',            'payment_method', array['cash', 'pix', 'debit', 'credit']),
      ('sales',            'status',         array['completed', 'refunded']),
      ('costs',            'type',           array['fixed', 'variable']),
      ('costs',            'origin',         array['manual', 'stock']),
      ('stock_movements',  'type',           array['in', 'out', 'adjustment', 'sale']),
      ('cash_registers',   'status',         array['open', 'closed']),
      ('cash_movements',   'type',           array['withdrawal', 'deposit']),
      -- 'waiting_client' é "o suporte respondeu e a bola está com o cliente".
      ('support_tickets',  'status',         array['open', 'in_progress', 'waiting_client', 'resolved']),
      -- 'low'/'normal'/'high'/'urgent': ninguém ESCREVE priority hoje (vem do
      -- DEFAULT da coluna), mas `toPriority` do admin lê exatamente estes.
      ('support_tickets',  'priority',       array['low', 'normal', 'high', 'urgent']),
      -- 'client' é o cliente; 'admin' é o painel; 'support' e 'system' são
      -- lidos pelos dois lados. Gravar 'customer' aqui faria a mensagem do
      -- cliente aparecer como se fosse do suporte.
      ('support_messages', 'sender_side',    array['client', 'support', 'admin', 'system']),
      ('tenants',          'status',         array['active', 'inactive']),
      ('profiles',         'status',         array['active', 'suspended'])
    ) as t(tbl, col, allowed)
  loop
    -- 2a. Existe algo fora do vocabulário? Diz o quê, e para.
    execute format(
      'select string_agg(distinct %I::text, '', '' order by %I::text) '
      'from public.%I where %I is not null and not (%I::text = any($1))',
      r.col, r.col, r.tbl, r.col, r.col
    ) into v_offend using r.allowed;

    if v_offend is not null then
      raise exception
        'public.%.% tem valor fora do vocabulário: [%]. Corrija essas linhas e rode de novo.',
        r.tbl, r.col, v_offend;
    end if;

    -- 2b. Cria o CHECK, se ainda não existir.
    v_name := format('%s_%s_vocab_check', r.tbl, r.col);

    if not exists (
      select 1
        from pg_constraint
       where conname = v_name
         and conrelid = format('public.%I', r.tbl)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I::text = any(%L::text[]))',
        r.tbl, v_name, r.col, r.allowed
      );
      raise notice 'criado: %', v_name;
    end if;
  end loop;
end $$;
