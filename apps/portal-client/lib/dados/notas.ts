import type { FiscalDocument, FiscalStatus } from "@/types/types";

/**
 * O vocabulário da tela de Notas.
 *
 * As chaves em inglês são as do banco; os rótulos, o que a pessoa lê. A
 * tradução mora aqui pelo mesmo motivo de `lib/dados/vendas.ts`: trocar uma
 * palavra da interface não deve virar migração.
 */

export const STATUS_LABEL: Record<FiscalStatus, string> = {
  pending: "Na fila",
  processing: "Processando",
  authorized: "Autorizada",
  rejected: "Recusada",
  cancelled: "Cancelada",
  denied: "Denegada",
};

/**
 * O que cada situação quer dizer para quem está no balcão — em consequência,
 * não em jargão. "Denegada" não significa nada para o dono do petshop; "a
 * Receita bloqueou a emissão para este CNPJ" significa.
 */
export const STATUS_NOTE: Record<FiscalStatus, string> = {
  pending: "Ainda não foi enviada. O sistema tenta sozinho.",
  processing: "Enviada; esperando a resposta da SEFAZ.",
  authorized: "Válida. Não pode mais ser apagada nem editada.",
  rejected: "A SEFAZ recusou. Corrija o motivo e reenvie.",
  cancelled: "Foi autorizada e depois cancelada.",
  denied: "A Receita bloqueou a emissão para este CNPJ. Fale com o seu contador.",
};

export const STATUS_TONE: Record<FiscalStatus, { color: string; bg: string }> = {
  pending: { color: "var(--muted)", bg: "var(--surface2)" },
  processing: { color: "var(--warn)", bg: "var(--warn-soft)" },
  authorized: { color: "var(--pos)", bg: "var(--pos-soft)" },
  rejected: { color: "var(--danger)", bg: "var(--warn-soft)" },
  cancelled: { color: "var(--muted)", bg: "var(--surface2)" },
  denied: { color: "var(--danger)", bg: "var(--warn-soft)" },
};

/** Só o que a pessoa pode reenviar. Autorizada e cancelada não voltam. */
export function canResend(f: FiscalDocument): boolean {
  return f.status === "rejected" || f.status === "pending";
}

/**
 * A chave de acesso em blocos de quatro, como sai impressa no DANFE.
 *
 * Não é enfeite: é assim que ela é conferida no site da SEFAZ, e 44 dígitos
 * corridos são impossíveis de ler em voz alta para um cliente ao telefone.
 */
export function formatAccessKey(k: string): string {
  return k.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export const MODEL_LABEL: Record<string, string> = {
  "65": "NFC-e",
  "55": "NF-e",
  nfse: "NFS-e",
};
