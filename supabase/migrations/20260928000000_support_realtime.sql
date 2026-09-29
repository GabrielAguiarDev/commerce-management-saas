-- =====================================================================
-- SUPORTE EM TEMPO REAL — fase 1: as duas tabelas entram na publicação.
--
-- Hoje uma resposta nova no chamado só aparece depois de recarregar a tela. A
-- publicação `supabase_realtime` já existe no banco, mas SEM TABELA NENHUMA —
-- então nenhum cliente recebe evento de nada. Esta migration põe nela as duas
-- tabelas do atendimento, e é tudo que o banco precisa fazer pela fase 1.
--
-- O QUE O EVENTO CARREGA: nada que a tela use. Quem recebe o evento invalida a
-- consulta que já existe (react-query no app, `router.refresh()` nos portais) e
-- relê pelo caminho de sempre, com RLS, adapters e i18n. Ver
-- `docs/architecture/suporte-tempo-real.md`.
--
-- POR QUE ISSO NÃO ABRE DADO DE NINGUÉM: o Realtime entrega um evento apenas a
-- quem conseguiria dar SELECT naquela linha. As policies de `support_tickets` e
-- `support_messages` — inclusive as RESTRICTIVE de
-- `20260917010000_role_module_rls.sql` — liberam só o membro ATIVO do próprio
-- tenant e o `is_platform_admin()`; `anon` é negado. Logo um cliente não recebe
-- evento de chamado de outro negócio, e o admin recebe de todos, que é
-- exatamente o recorte que o console precisa.
--
-- `REPLICA IDENTITY` fica no padrão (a chave primária), de propósito: só
-- precisamos saber QUE mudou — INSERT de mensagem, UPDATE de
-- status/`last_message_at`/`read_by_recipient` —, nunca o valor antigo. Subir
-- para `FULL` dobraria o WAL destas tabelas sem ninguém ler o `old`.
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

do $$
declare
  tabela text;
begin
  -- A publicação é criada pela própria plataforma (Supabase), não por este
  -- projeto. Se ela não existir, o `add table` falharia com uma mensagem que
  -- não diz o que fazer — este aviso diz.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception
      'publicação supabase_realtime ausente: o Realtime não está habilitado neste banco';
  end if;

  foreach tabela in array array['support_messages', 'support_tickets'] loop
    if not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = tabela
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tabela);
    end if;
  end loop;
end
$$;
