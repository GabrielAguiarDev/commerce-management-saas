-- =====================================================================
-- SUPORTE EM TEMPO REAL — fim do `postgres_changes`.
--
-- Desde 20260929000000 o suporte chega aos clientes por Broadcast do banco
-- (trigger → `realtime.send` → tópicos privados). As duas tabelas continuavam
-- na publicação `supabase_realtime` só por compatibilidade com app instalado
-- na versão anterior. Não há usuário nessa versão (29/09/2026, sistema ainda
-- sem clientes), então ela sai agora.
--
-- Por que tirar, e não só deixar: com as tabelas na publicação, o serviço
-- Realtime decodifica o WAL de toda escrita em `support_messages` e
-- `support_tickets` e confere o RLS para cada inscrito de `postgres_changes` —
-- custo sem ninguém do outro lado, e um segundo caminho de entrega que alguém
-- poderia voltar a usar sem perceber que ele não escala.
--
-- A publicação em si é da plataforma e fica; só as duas tabelas saem.
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

do $$
declare
  tabela text;
begin
  foreach tabela in array array['support_messages', 'support_tickets'] loop
    if exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = tabela
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', tabela);
    end if;
  end loop;
end
$$;
