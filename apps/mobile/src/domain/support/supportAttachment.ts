import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { supabase } from '@services/supabase';

/**
 * O ANEXO DO CHAMADO — escolher, enviar e abrir.
 *
 * O bucket é `support-attachments`, PRIVADO, e o caminho segue a convenção que
 * faz o RLS funcionar:
 *
 *     <tenant_id>/<arquivo>
 *
 * A primeira pasta é sempre o uuid do negócio, e é ela que a policy de
 * `storage.objects` confere. Um arquivo salvo fora dessa convenção não é lido
 * por ninguém — de propósito: melhor um envio que some do que um que vaza para
 * o negócio vizinho. Ver `supabase/migrations/20260828030000_storage_buckets.sql`.
 *
 * ⚠️ O ARQUIVO NÃO PASSA PELO NOSSO SERVIDOR. Vai direto do aparelho para o
 * Storage, com a sessão de quem está usando — quem autoriza é a policy, não um
 * endpoint nosso.
 */

const BUCKET = 'support-attachments';

export type AttachResult =
  | { ok: true; path: string }
  | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

/** Só o que o bucket aceita, e o que um print de celular produz. */
function mimeOf(uri: string): string {
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

/**
 * Nome de arquivo que sobrevive a uma URL.
 *
 * A chave do objeto viaja numa URL assinada; acento, espaço e `#` viram escape
 * ou quebram o caminho.
 */
function safeName(uri: string): string {
  const base = uri.split('?')[0]?.split('/').pop() ?? 'anexo.jpg';
  const limpo = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (limpo || 'anexo.jpg').slice(-60);
}

/**
 * Abre a galeria, envia e devolve o CAMINHO.
 *
 * O ENVIO ACONTECE NA ESCOLHA, e não junto com o chamado: subir um print leva
 * segundos, e cobrá-los do botão "Enviar chamado" faria a pessoa achar que ele
 * travou. O formulário guarda só o caminho do que já está no Storage.
 *
 * Permissão negada não é erro nem falha de rede — é uma resposta, e a tela diz
 * outra coisa para cada uma. `canAskAgain: false` significa que o sistema não
 * vai mais perguntar, e a única saída é os ajustes do aparelho.
 */
export async function pickAndUploadAttachment(tenantId: string): Promise<AttachResult> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return { ok: false, reason: 'denied' };

  const escolha = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Sem edição: quem manda um print de erro precisa da tela INTEIRA, e um
    // recorte obrigatório é o caminho mais curto para o suporte receber
    // justamente a metade que não interessa.
    allowsEditing: false,
    // O bucket recusa acima de 10 MB. Comprimir aqui é mais gentil do que
    // deixar o envio falhar depois de a pessoa esperar.
    quality: 0.7,
  });

  if (escolha.canceled || !escolha.assets?.[0]) return { ok: false, reason: 'cancelled' };

  const asset = escolha.assets[0];

  try {
    // `bytes()` e não `fetch(uri).then(r => r.blob())`: o Blob do React Native
    // não expõe o conteúdo de forma confiável para o cliente do Supabase, e o
    // resultado é um arquivo de 0 byte no bucket — que sobe sem erro nenhum.
    const bytes = await new File(asset.uri).bytes();
    const contentType = asset.mimeType ?? mimeOf(asset.uri);
    const path = `${tenantId}/${Date.now()}-${safeName(asset.fileName ?? asset.uri)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType });
    if (error) return { ok: false, reason: 'failed' };

    return { ok: true, path };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * O nome para mostrar. Tira a pasta e o carimbo de tempo — eles servem ao
 * banco e à policy, não a quem lê a conversa.
 */
export function attachmentName(path: string): string {
  const last = path.split('/').pop() ?? path;
  return last.replace(/^\d{10,}-/, '');
}

/** Um caminho do Storage sempre tem a pasta do tenant na frente. */
export const isStoragePath = (v: string) => v.includes('/');

/**
 * Abre o anexo.
 *
 * Bucket privado não tem URL fixa: pedimos uma assinada, válida por um minuto,
 * na hora do toque. A do portal dura o mesmo tempo e pelo mesmo motivo — o
 * print pode ter faturamento e nome de cliente dentro.
 */
export async function openAttachment(path: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return false;

  await Linking.openURL(data.signedUrl);
  return true;
}
