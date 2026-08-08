-- =====================================================================
-- O contato de WhatsApp da plataforma, agora legível ANTES do login.
--
-- MOTIVO: a tela de entrada do app ganhou o rodapé "Ainda não tem conta?
-- Fale com o suporte". Não existe cadastro pelo aplicativo — a conta nasce
-- no painel admin, junto com o tenant e os módulos contratados —, então
-- esse rodapé leva a uma conversa, e é justamente quem AINDA NÃO TEM CONTA
-- que precisa dele.
--
-- A migration `20260807000000` concedeu `execute` só a `authenticated`, e
-- deixou `anon` de fora com esta justificativa: "o número só interessa a
-- quem já está logado e viu a tela de bloqueio". A premissa mudou; a
-- decisão muda com ela.
--
-- O QUE ISSO ABRE, exatamente: quem tiver a chave anon do projeto — que
-- viaja dentro do binário do app e deve ser tratada como pública — passa a
-- conseguir ler UM valor, o telefone de suporte da plataforma. É um número
-- feito para ser divulgado. A tabela `platform_settings` continua fechada:
-- a função expõe uma chave e mais nada, e `trial_days`, `default_modules`
-- e `inactivity_notify` seguem invisíveis para todo mundo que não é admin.
--
-- Ainda assim NÃO é uma concessão vazia: um endpoint público é um endpoint
-- raspável. Se um dia esse número virar um canal caro (um WhatsApp
-- Business com atendimento humano por contato), o caminho é trocar o
-- destino do botão pré-login por um link estático de marketing, e revogar
-- isto aqui.
-- =====================================================================

grant execute on function public.platform_whatsapp_contact() to anon;

comment on function public.platform_whatsapp_contact is
  'Telefone de WhatsApp do suporte, em formato internacional só com dígitos. Exposto a anon E authenticated: o app mobile precisa dele na tela de login, antes de haver sessão. A tabela platform_settings continua restrita ao admin.';
