-- =====================================================================
-- Contato de WhatsApp da plataforma, legível pelo app mobile.
--
-- MOTIVO: a tela de bloqueio do app ("Seu plano ainda não inclui o
-- aplicativo") precisa abrir o WhatsApp do suporte. O número vive em
-- `platform_settings`, chave 'whatsapp_contact' — mas essa tabela tem
-- política `is_platform_admin`, então o usuário de tenant recebe ZERO
-- LINHAS (200, não 403) e o app não tem como saber o número.
--
-- POR QUE UMA FUNÇÃO, E NÃO UMA POLÍTICA NA TABELA: `platform_settings` é
-- um chaveiro genérico. Hoje guarda também `trial_days`, `default_modules`
-- e `inactivity_notify`; amanhã guardará o que mais aparecer. Uma policy
-- de SELECT na tabela — mesmo restrita a uma chave — é uma superfície que
-- precisa ser revista a cada chave nova, e revisão que depende de alguém
-- lembrar é revisão que uma hora não acontece.
--
-- A função expõe UM valor e mais nada. A tabela continua fechada.
-- =====================================================================

create or replace function public.platform_whatsapp_contact()
returns text
language sql
-- STABLE: não escreve nada, e o resultado é o mesmo dentro da consulta.
stable
-- SECURITY DEFINER: roda com os privilégios do dono, que é o que permite
-- ler `platform_settings` sem afrouxar o RLS dela para ninguém.
security definer
-- search_path fixo: impede que um schema malicioso no caminho de busca
-- sequestre o nome `platform_settings`. Obrigatório em SECURITY DEFINER.
set search_path = public, pg_temp
as $$
  -- `value` é JSONB. `#>> '{}'` extrai o escalar como TEXTO — sem isso, um
  -- valor guardado como string JSON voltaria com as aspas ("5573...") e o
  -- link do WhatsApp sairia com aspas dentro do número.
  select value #>> '{}'
    from public.platform_settings
   where key = 'whatsapp_contact'
$$;

-- ---------------------------------------------------------------------
-- Quem pode executar.
--
-- Uma função nasce executável por PUBLIC. Numa SECURITY DEFINER isso é
-- porta dos fundos — aqui o estrago seria pequeno (é um telefone de
-- suporte, feito para ser público), mas o hábito de revogar primeiro é o
-- que evita o dia em que a função devolver algo que não devia.
--
-- `anon` fica de fora de propósito: o número só interessa a quem já está
-- logado e viu a tela de bloqueio. Sem isso, seria um endpoint aberto de
-- onde se raspa o contato da plataforma sem nem ter conta.
-- ---------------------------------------------------------------------
revoke all on function public.platform_whatsapp_contact() from public;
revoke all on function public.platform_whatsapp_contact() from anon;
grant execute on function public.platform_whatsapp_contact() to authenticated;

comment on function public.platform_whatsapp_contact is
  'Telefone de WhatsApp do suporte, em formato internacional só com dígitos. Exposto a qualquer autenticado; a tabela platform_settings continua restrita ao admin.';

-- ---------------------------------------------------------------------
-- O valor. `on conflict` para a migration poder rodar de novo sem erro e
-- para não sobrescrever um número já ajustado pelo painel admin.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value)
values ('whatsapp_contact', to_jsonb('5573999935628'::text))
on conflict (key) do nothing;
