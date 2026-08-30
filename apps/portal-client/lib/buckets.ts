/**
 * Os nomes dos buckets e a regra do caminho — sem nenhuma dependência.
 *
 * Ficam aqui, e não em `lib/arquivos.ts`, porque as Server Actions precisam
 * deles e aquele arquivo abre o cliente do NAVEGADOR na primeira linha.
 * Importá-lo de dentro de um `"use server"` arrastaria código de navegador
 * para o servidor por causa de duas strings.
 */

export const LOGO_BUCKET = "tenant-logos";
export const SUPPORT_BUCKET = "support-attachments";

/**
 * O caminho é do tenant que está enviando?
 *
 * ┌─ POR QUE ISTO EXISTE, SE O RLS JÁ CONFERE ─────────────────────────────┐
 * │ O RLS do Storage protege o ARQUIVO: ninguém grava na pasta de outro    │
 * │ tenant. Mas o caminho que chega na Server Action é um texto qualquer   │
 * │ vindo do navegador, e a Server Action é um endpoint HTTP — dá para     │
 * │ chamá-la à mão com o caminho de outra pessoa.                          │
 * │                                                                        │
 * │ Sem esta checagem, um cliente poderia apontar a própria logo para o    │
 * │ arquivo de um concorrente (o bucket é público, a URL abre), ou pendurar│
 * │ na conversa dele um anexo que não é dele. Não vaza nada que já não     │
 * │ fosse público, mas grava mentira no banco — e o banco é onde a         │
 * │ mentira dura.                                                          │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function isOwnPath(path: string, tenantId: string): boolean {
  return path.startsWith(`${tenantId}/`) && !path.includes("..");
}
