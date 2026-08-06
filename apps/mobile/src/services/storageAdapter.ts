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

export interface AdaptadorDeArmazenamento {
  ler(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string): Promise<void>;
  remover(chave: string): Promise<void>;
}

export const armazenamentoComum: AdaptadorDeArmazenamento = {
  ler: (chave) => AsyncStorage.getItem(chave),
  gravar: (chave, valor) => AsyncStorage.setItem(chave, valor),
  remover: (chave) => AsyncStorage.removeItem(chave),
};

export const armazenamentoSeguro: AdaptadorDeArmazenamento = {
  ler: (chave) => SecureStore.getItemAsync(chave),
  gravar: (chave, valor) => SecureStore.setItemAsync(chave, valor),
  remover: (chave) => SecureStore.deleteItemAsync(chave),
};

/** Chaves em um lugar só, para não existirem duas grafias da mesma coisa. */
export const CHAVES_ARMAZENAMENTO = {
  sessao: 'aguiarone.sessao',
  preferencias: 'aguiarone.preferencias',
  tokenAcesso: 'aguiarone.token',
} as const;
