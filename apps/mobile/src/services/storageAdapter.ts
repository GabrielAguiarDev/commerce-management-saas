import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * ADAPTER DE ARMAZENAMENTO.
 *
 * Quem chama diz O QUE quer guardar (preferência ou credencial), não ONDE.
 * Se amanhã trocarmos AsyncStorage por MMKV, ou SecureStore por Keychain
 * direto, muda este arquivo e nada mais.
 *
 * A divisão não é estética: token de sessão em AsyncStorage é texto puro no
 * disco do aparelho. Credencial vai para o SecureStore (Keychain/Keystore);
 * preferência e flag de onboarding, que não valem nada para um atacante e
 * precisam ser lidas de forma síncrona pelo zustand, ficam no AsyncStorage.
 */

export interface StorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, amount: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const plainStorage: StorageAdapter = {
  read: (key) => AsyncStorage.getItem(key),
  write: (key, amount) => AsyncStorage.setItem(key, amount),
  remove: (key) => AsyncStorage.removeItem(key),
};

export const secureStorage: StorageAdapter = {
  read: (key) => SecureStore.getItemAsync(key),
  write: (key, amount) => SecureStore.setItemAsync(key, amount),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

/** Chaves em um lugar só, para não existirem duas grafias da mesma coisa. */
export const STORAGE_KEYS = {
  session: 'aguiarone.sessao',
  preferences: 'aguiarone.preferencias',
  tokenAcesso: 'aguiarone.token',
} as const;
