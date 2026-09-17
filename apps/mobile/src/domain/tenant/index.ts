export type {
  Activity,
  Capabilities,
  ChaveModulo,
  Membro,
  Plano,
  Tenant,
} from './tenantTypes';
export { CHAVES_MODULO, TenantError } from './tenantTypes';
export { deriveCapabilities, labelModules } from './tenantAdapter';
export {
  tenantKeys,
  useActivities,
  useCapabilities,
  useTeam,
  useSaveBusinessDetails,
  useSaveAcceptedPaymentMethods,
  usePaymentPreferencesSync,
  useCurrentTenant,
} from './useCases/useTenant';
