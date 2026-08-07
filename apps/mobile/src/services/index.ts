export {
  plainStorage,
  secureStorage,
  STORAGE_KEYS,
  type StorageAdapter,
} from './storageAdapter';

// `supabase` NÃO é reexportado daqui de propósito: importar o barrel só para
// pegar o storage traria junto o cliente, que abre uma inscrição no AppState no
// momento em que o módulo carrega. Quem precisa do cliente importa
// `@services/supabase` direto — é o que todos os `*Api.ts` fazem.
export { LargeSecureStore } from './secureSessionStorage';
