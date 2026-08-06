export type {
  Atividade,
  Capacidades,
  ChaveModulo,
  Membro,
  Plano,
  Tenant,
} from './tenantTypes';
export { CHAVES_MODULO, TenantError } from './tenantTypes';
export { derivarCapacidades, rotularModulos } from './tenantAdapter';
export {
  tenantKeys,
  useAtividades,
  useCapacidades,
  useEquipe,
  useSalvarDadosDoNegocio,
  useTenantAtual,
} from './useCases/useTenant';
