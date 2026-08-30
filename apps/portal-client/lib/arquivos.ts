import { LOGO_BUCKET, SUPPORT_BUCKET } from "@/lib/buckets";
import { createClient } from "@/lib/supabase/client";

/**
 * Envio de arquivo para o Storage — a logo do negócio e o anexo do chamado.
 *
 * ┌─ POR QUE O UPLOAD NÃO PASSA POR UMA SERVER ACTION ─────────────────────┐
 * │ Toda ESCRITA NO BANCO do portal passa por Server Action, e isso não     │
 * │ muda: quem grava `tenants.logo_path` e `support_messages.attachment_url`│
 * │ continua sendo uma action, conferindo as linhas afetadas.               │
 * │                                                                        │
 * │ O BYTE do arquivo é outra história. Uma Server Action é uma requisição  │
 * │ ao servidor Next, e o corpo dela tem teto: 1 MB por padrão. Um print de │
 * │ celular passa disso com folga — a pessoa veria "Body exceeded limit"    │
 * │ sem entender o que fez de errado. Subir o teto só moveria o problema e  │
 * │ faria o arquivo trafegar duas vezes: navegador → Next → Storage.        │
 * │                                                                        │
 * │ Aqui ele vai direto ao Storage, com a sessão da pessoa. Quem autoriza é │
 * │ a policy de `storage.objects`, que confere se a primeira pasta do       │
 * │ caminho é o tenant de quem está enviando — a mesma tranca de sempre,    │
 * │ no mesmo lugar de sempre.                                              │
 * └────────────────────────────────────────────────────────────────────────┘
 */

export { LOGO_BUCKET, SUPPORT_BUCKET };

/**
 * Os mesmos limites declarados nos buckets (20260828030000_storage_buckets.sql).
 *
 * Repetidos aqui só para a MENSAGEM ser humana. Quem recusa de verdade é o
 * Storage: estes números podem ficar desatualizados sem abrir brecha nenhuma,
 * porque não é este `if` que protege nada.
 */
const LIMITS: Record<string, { bytes: number; label: string; accept: string }> = {
  [LOGO_BUCKET]: {
    bytes: 2 * 1024 * 1024,
    label: "2 MB",
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
  },
  [SUPPORT_BUCKET]: {
    bytes: 10 * 1024 * 1024,
    label: "10 MB",
    accept: "image/png,image/jpeg,image/webp,image/heic,application/pdf",
  },
};

export const acceptOf = (bucket: string) => LIMITS[bucket]?.accept ?? "";

export type UploadResult = { ok: true; path: string } | { ok: false; message: string };

/**
 * Nome de arquivo que o Storage aceita e que ainda dá para ler.
 *
 * A chave do objeto viaja numa URL. Acento, espaço e `#` viram escape ou
 * quebram o caminho, então o nome é normalizado — mas NÃO descartado: quem
 * abre o chamado escreveu "erro no caixa.png" por um motivo, e o suporte lê
 * esse nome antes de abrir a imagem.
 */
function safeName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Sem nome utilizável ainda precisamos de um: o caminho não pode terminar
  // na barra do tenant.
  return (clean || "arquivo").slice(-60);
}

/**
 * Envia e devolve o CAMINHO, no formato `<tenant_id>/<epoch>-<nome>`.
 *
 * O carimbo de tempo no nome não é enfeite. Sem ele, trocar a logo gravaria
 * por cima do mesmo caminho — e caminho igual é URL igual, que a CDN do
 * Storage já entregou e vai continuar entregando em cache. A pessoa trocaria
 * a imagem e continuaria vendo a antiga, sem nada a fazer a respeito.
 */
export async function uploadFile(
  bucket: string,
  tenantId: string,
  file: File,
): Promise<UploadResult> {
  const limit = LIMITS[bucket];
  if (limit && file.size > limit.bytes) {
    return { ok: false, message: `O arquivo passa de ${limit.label}. Escolha um menor.` };
  }

  const path = `${tenantId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await createClient()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type || undefined });

  if (error) return { ok: false, message: uploadMessage(error.message) };
  return { ok: true, path };
}

/**
 * O Storage responde em inglês e para quem programa. Quem está no balcão
 * precisa de outra frase — e sobretudo precisa saber o que FAZER.
 */
function uploadMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("mime") || m.includes("not supported")) {
    return "Esse tipo de arquivo não é aceito aqui. Envie uma imagem (PNG, JPG ou WEBP).";
  }
  if (m.includes("exceeded") || m.includes("too large") || m.includes("payload")) {
    return "O arquivo é grande demais. Escolha um menor.";
  }
  if (m.includes("row-level security") || m.includes("unauthorized")) {
    return "Você não tem permissão para enviar arquivos deste negócio.";
  }
  return "Não foi possível enviar o arquivo. Tente de novo.";
}

/** Um caminho do Storage sempre tem a pasta do tenant na frente. */
export const isStoragePath = (v: string) => v.includes("/");

/**
 * O nome para mostrar. Tira a pasta e o carimbo de tempo — eles servem ao
 * banco e à CDN, não a quem lê a conversa.
 */
export function fileNameOf(path: string): string {
  const last = path.split("/").pop() ?? path;
  return last.replace(/^\d{10,}-/, "");
}

/** A logo é bucket público: a URL sai do caminho, sem ida ao servidor. */
export function logoUrl(path: string): string {
  return createClient().storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Abre o anexo do chamado.
 *
 * O bucket é privado de propósito — o print pode ter faturamento e nome de
 * cliente dentro — então não existe URL fixa: pedimos uma assinada, válida por
 * pouco tempo, na hora do clique.
 *
 * A ABA É ABERTA ANTES DO `await`. Navegador só aceita `window.open` enquanto
 * o clique ainda está sendo processado; depois de esperar a rede, ele trata a
 * abertura como pop-up e bloqueia — e o botão não faria nada, sem erro nenhum.
 */
export async function openAttachment(path: string): Promise<string | null> {
  const tab = window.open("", "_blank", "noopener,noreferrer");

  const { data, error } = await createClient()
    .storage.from(SUPPORT_BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    tab?.close();
    return "Não foi possível abrir o anexo. Tente de novo.";
  }

  if (tab) tab.location.href = data.signedUrl;
  // Aba bloqueada por extensão ou configuração: a navegação na própria aba é
  // pior, mas é melhor do que o clique não fazer nada.
  else window.location.href = data.signedUrl;
  return null;
}
