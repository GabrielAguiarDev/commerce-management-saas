-- =====================================================================
-- SUPORTE DEIXA DE SER MÓDULO VENDÁVEL
--
-- O RLS de `support_tickets`/`support_messages` (20260917010000) já libera o
-- atendimento para todo membro ativo do tenant, sem conferir módulo. Mesmo
-- assim `support` continuava no catálogo `modules`, nos `module_keys` dos
-- planos, no `default_modules` da plataforma e em `tenant_modules`: o console
-- deixava ligar e desligar uma coisa que o banco nunca respeitou.
--
-- Agora `support` é uma capacidade essencial da conta (ver
-- `CORE_CAPABILITIES` em apps/portal-admin/lib/planos.ts e `BASE_MODULES` em
-- apps/portal-client/lib/modulos.ts). Esta migration remove a linha legada e
-- todas as referências a ela. O código já filtra a chave na leitura, então a
-- ordem de publicação (código antes ou depois desta migration) não importa.
--
-- Nada de chamados ou mensagens é tocado: só o cadastro do módulo.
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

-- Planos: tira a chave do pacote de cada plano.
update public.plans
   set module_keys = array_remove(module_keys, 'support')
 where 'support' = any (module_keys);

-- Módulos padrão de conta nova (jsonb array de chaves).
update public.platform_settings
   set value = coalesce(
         (select jsonb_agg(k) from jsonb_array_elements(value) k where k <> '"support"'::jsonb),
         '[]'::jsonb
       ),
       updated_at = now()
 where key = 'default_modules'
   and jsonb_typeof(value) = 'array'
   and value @> '["support"]'::jsonb;

-- Liberações por cliente. O FK com ON DELETE CASCADE já cuidaria disso, mas
-- deixar explícito documenta a intenção.
delete from public.tenant_modules where module_key = 'support';

-- A linha do catálogo.
delete from public.modules where key = 'support';
