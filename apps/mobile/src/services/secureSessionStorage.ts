// Polyfill de `crypto.getRandomValues`. Precisa vir ANTES de qualquer uso —
// o React Native não traz a Web Crypto, e sem isto a chave de criptografia
// abaixo seria gerada a partir de um `crypto` inexistente.
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';

/**
 * ARMAZENAMENTO CRIPTOGRAFADO DA SESSÃO — o padrão "LargeSecureStore" da
 * documentação do Supabase.
 *
 * O PROBLEMA QUE ELE RESOLVE. A sessão do Supabase é dado sensível: contém o
 * `access_token` e o `refresh_token`, e quem tem o refresh token entra na conta
 * quantas vezes quiser. Guardá-la no AsyncStorage é gravá-la como TEXTO PURO no
 * disco do aparelho — legível em backup, em aparelho com root/jailbreak ou por
 * outro app com acesso ao sandbox. O lugar certo seria o SecureStore
 * (Keychain no iOS, Keystore no Android).
 *
 * MAS o SecureStore tem limite de ~2048 bytes por valor, e uma sessão do
 * Supabase passa disso com folga (dois JWTs + metadados do usuário). Gravá-la
 * direto ali falha em silêncio ou avisa no console e perde a sessão — o usuário
 * é deslogado a cada relaunch, sem explicação.
 *
 * A SOLUÇÃO. Divide-se o segredo do tamanho:
 *  - uma chave AES-256 aleatória por item vai para o SecureStore (32 bytes,
 *    bem abaixo do limite, protegida pelo hardware do aparelho);
 *  - o conteúdo cifrado com ela vai para o AsyncStorage, que não tem limite.
 *
 * Sem a chave, o que está no AsyncStorage é ruído. O ataque de ler o disco
 * deixa de funcionar sem antes quebrar o Keychain/Keystore.
 *
 * SIMPLIFICAÇÃO POSSÍVEL: trocar esta classe por `AsyncStorage` puro no
 * `createClient` faz tudo funcionar igual — só que com a sessão em texto puro.
 * É uma troca de segurança por ~40 linhas, e não vale a pena num app que
 * movimenta o dinheiro do cliente.
 */
/**
 * Erro de ARMAZENAMENTO da sessão — não de rede, não de credencial.
 *
 * Existe por causa de um bug que custou caro para diagnosticar: sem o módulo
 * nativo de aleatoriedade, a gravação da sessão falhava DEPOIS de o Supabase já
 * ter autenticado, e o `sessionService` traduzia a exceção em "Sem conexão com
 * o servidor". A mensagem mandava investigar rede, RLS e credencial — tudo
 * saudável. Um erro nomeado é o que impede a próxima pessoa de perder o mesmo
 * tempo.
 */
export class SessionStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionStorageError';
  }
}

/**
 * `crypto.getRandomValues` existe?
 *
 * `react-native-get-random-values` é um módulo NATIVO. Instalá-lo pelo pnpm não
 * o coloca dentro do app: é preciso reconstruir o binário (`pnpm ios` /
 * `pnpm android`, que rodam `expo run:*`). Num app já compilado antes da
 * instalação, o import passa e a chamada estoura — e estoura no meio do login,
 * longe da causa.
 */
function ensureRandomness(): void {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new SessionStorageError(
      'O módulo nativo `react-native-get-random-values` não está no binário. ' +
        'Ele foi adicionado ao package.json, mas dependência NATIVA exige ' +
        'reconstruir o app: rode `pnpm ios` (ou `pnpm android`). Recarregar o ' +
        'Metro não basta.',
    );
  }
}

export class LargeSecureStore {
  /** Cifra o valor e devolve o texto cifrado; a chave fica no SecureStore. */
  private async encrypt(key: string, value: string): Promise<string> {
    ensureRandomness();
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

    // CTR transforma o AES num cifrador de fluxo: aceita qualquer tamanho de
    // entrada sem padding, que é o que queremos para um JSON de tamanho
    // variável. A chave é NOVA a cada escrita, então o contador fixo em 1 não
    // reaproveita fluxo entre gravações diferentes.
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  /** `null` quando a chave sumiu do SecureStore — ver `getItem`. */
  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    try {
      return await this.decrypt(key, encrypted);
    } catch {
      // Dado ilegível (chave perdida, conteúdo truncado, formato de uma versão
      // anterior). Devolver `null` faz o Supabase tratar como "não há sessão" e
      // pedir login de novo — incômodo, porém recuperável. Deixar a exceção
      // subir travaria a inicialização do cliente e o app não abriria mais,
      // sem caminho de volta que não fosse desinstalar.
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encrypt(key, value);
      await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
      // Erro de armazenamento precisa continuar sendo erro de armazenamento até
      // a superfície. Engolir aqui seria pior: o login "daria certo" e a sessão
      // sumiria no relaunch, sem nunca ter dito nada.
      if (error instanceof SessionStorageError) throw error;
      throw new SessionStorageError(
        `Não foi possível gravar a sessão no aparelho: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async removeItem(key: string): Promise<void> {
    // Os DOIS lados, sempre. Deixar a chave órfã no SecureStore vazaria o
    // Keychain aos poucos, um item por logout.
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
