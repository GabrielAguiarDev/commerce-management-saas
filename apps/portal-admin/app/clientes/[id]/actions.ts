"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/autorizacao";
import { isBlankRow } from "@/lib/csv";
import {
  analyzeRows,
  MAX_ROWS,
  missingRequired,
  toExportRow,
  toRow,
  type CatalogRow,
  type ExistingKeys,
  type IssueCode,
  type Mapping,
} from "@/lib/produtosCsv";

/**
 * O catálogo de um cliente, do lado do servidor: importar e exportar.
 *
 * ───────────────────────────────────────────────────────────────────────
 * POR QUE A `service_role` AQUI, se o guia manda preferir o cliente de sessão
 *
 * Porque esta é uma das operações que SÓ ela consegue fazer — a mesma razão
 * que a libera em `app/clientes/actions.ts` para administrar o Auth.
 *
 * O RLS de `products` isola por `tenant_id = current_tenant_id()`, e o admin da
 * plataforma não pertence a tenant nenhum (`profiles.tenant_id` é nulo, ver
 * passo 8 do setup). Com o cliente de sessão, gravar no catálogo de um cliente
 * devolveria zero linhas afetadas — não por falta de permissão de verdade, mas
 * porque a política pergunta "é o SEU tenant?" e a resposta é sempre não.
 *
 * O que sustenta a segurança, então:
 *   1. `requireAdmin` roda ANTES, com o cliente de sessão, e prova pela tabela
 *      `profiles` que quem pediu é admin da plataforma;
 *   2. o `tenant_id` é gravado por nós em toda linha, vindo do parâmetro já
 *      conferido contra `tenants` — nunca do corpo da requisição;
 *   3. as linhas são revalidadas aqui do zero, com o mesmo módulo puro que a
 *      tela usou, então uma chamada forjada não injeta um produto que a
 *      conferência tinha reprovado.
 * ───────────────────────────────────────────────────────────────────────
 */

/** UUID v4 e afins. Barra um id de rota inventado antes de ele virar consulta. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Insere de 200 em 200: um `insert` único de milhares de linhas estoura o tempo. */
const CHUNK = 200;

export interface RejectedRow {
  line: number;
  name: string;
  issues: IssueCode[];
}

export type ImportResult =
  | {
      ok: true;
      imported: number;
      skippedErrors: number;
      skippedDuplicates: number;
      /** Linhas que ficaram de fora, para o admin baixar, corrigir e reimportar. */
      rejected: RejectedRow[];
    }
  | { ok: false; message: string };

export type ExistingResult = { ok: true; keys: ExistingKeys } | { ok: false; message: string };

/** `rows` vazio é um catálogo vazio, e não um erro — quem avisa é a tela. */
export type ExportResult = { ok: true; rows: string[][] } | { ok: false; message: string };

/** O cliente COM SESSÃO, que é o que `requireAdmin` devolve. */
type SessionClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Existe um cliente com este id?
 *
 * Lido com o cliente de SESSÃO de propósito: o admin da plataforma enxerga
 * todos os tenants por política de RLS, então esta leitura é uma segunda
 * confirmação de que quem pediu tem alcance sobre este registro — a
 * `service_role` responderia "sim" para qualquer um.
 */
async function tenantExists(supabase: SessionClient, tenantId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  return !error && !!data;
}

/**
 * Os nomes e códigos de barras que este cliente já tem no catálogo.
 *
 * Vem em duas listas cruas e não em produtos inteiros: quem chama só precisa
 * comparar chaves, e mandar o catálogo completo de um comerciante grande para o
 * navegador seria trafegar dado que ninguém vai mostrar.
 */
async function readExistingKeys(tenantId: string): Promise<ExistingResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("name, barcode")
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[importarProdutos] falha ao ler o catálogo:", error.message);
    return { ok: false, message: `Não foi possível ler o catálogo atual: ${error.message}` };
  }

  const rows = (data ?? []) as { name: string | null; barcode: string | null }[];
  return {
    ok: true,
    keys: {
      names: rows.map((r) => r.name ?? "").filter(Boolean),
      barcodes: rows.map((r) => r.barcode ?? "").filter(Boolean),
    },
  };
}

/**
 * O catálogo atual do cliente, para a tela avisar sobre duplicados ANTES de
 * importar.
 */
export async function fetchExistingKeys(tenantId: string): Promise<ExistingResult> {
  const auth = await requireAdmin("importar produtos");
  if (!auth.ok) return { ok: false, message: auth.message };

  if (!UUID_RE.test(tenantId)) return { ok: false, message: "Cliente inválido." };
  if (!(await tenantExists(auth.supabase, tenantId))) {
    return { ok: false, message: "Cliente não encontrado." };
  }

  return readExistingKeys(tenantId);
}

/**
 * Grava o catálogo importado.
 *
 * Recebe as LINHAS CRUAS e o mapeamento, não os produtos já prontos: assim a
 * validação que vale é a daqui. Se recebêssemos produtos montados, uma chamada
 * direta à action poderia gravar preço negativo ou nome vazio — a conferência
 * da tela é conveniência para quem olha, não uma tranca.
 *
 * Não há transação: o PostgREST não tem uma entre chamadas, e são vários lotes.
 * Se um lote falhar no meio, os anteriores ficam — e é isso que o resumo conta,
 * em vez de anunciar um total que o banco não gravou. Reimportar o arquivo
 * depois é seguro: as linhas já gravadas voltam marcadas como duplicadas.
 */
export async function importProducts(
  tenantId: string,
  rows: string[][],
  mapping: Mapping,
  skipDuplicates: boolean,
): Promise<ImportResult> {
  const auth = await requireAdmin("importar produtos");
  if (!auth.ok) return { ok: false, message: auth.message };

  if (!UUID_RE.test(tenantId)) return { ok: false, message: "Cliente inválido." };
  if (!(await tenantExists(auth.supabase, tenantId))) {
    return { ok: false, message: "Cliente não encontrado." };
  }

  // As linhas em branco chegam junto para a numeração dos erros bater com a da
  // planilha; elas não contam como produto nem para o limite.
  const filled = Array.isArray(rows) ? rows.filter((r) => Array.isArray(r) && !isBlankRow(r)) : [];

  if (filled.length === 0) {
    return { ok: false, message: "Nenhuma linha para importar." };
  }
  if (filled.length > MAX_ROWS) {
    return {
      ok: false,
      message: `O arquivo tem ${filled.length} produtos e o limite por importação é ${MAX_ROWS}. Divida a planilha e importe em partes.`,
    };
  }
  if (missingRequired(mapping).length > 0) {
    return { ok: false, message: "Indique quais colunas do arquivo têm o nome e o preço." };
  }

  // A duplicidade é conferida contra o catálogo NESTE instante, e não contra o
  // que a tela leu quando o admin abriu o arquivo: entre uma coisa e outra o
  // comerciante pode ter cadastrado o produto pelo próprio portal.
  const existing = await readExistingKeys(tenantId);
  if (!existing.ok) return existing;

  const results = analyzeRows(rows, mapping, existing.keys);

  const rejected: RejectedRow[] = [];
  let skippedErrors = 0;
  let skippedDuplicates = 0;
  const toInsert: ReturnType<typeof toRow>[] = [];

  for (const r of results) {
    if (r.status === "error" || !r.product) {
      skippedErrors++;
      rejected.push({ line: r.line, name: r.rawName, issues: r.issues });
      continue;
    }
    if (r.status === "duplicate" && skipDuplicates) {
      skippedDuplicates++;
      rejected.push({ line: r.line, name: r.rawName, issues: r.issues });
      continue;
    }
    toInsert.push(toRow(r.product, tenantId));
  }

  let imported = 0;
  const admin = createAdminClient();

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const batch = toInsert.slice(i, i + CHUNK);
    const { error } = await admin.from("products").insert(batch);

    if (error) {
      console.error("[importarProdutos] falha ao gravar lote:", error.message);
      return {
        ok: false,
        message:
          imported > 0
            ? `${imported} produtos foram importados e a gravação parou no produto seguinte: ${error.message}`
            : `Não foi possível importar: ${error.message}`,
      };
    }

    imported += batch.length;
  }

  return { ok: true, imported, skippedErrors, skippedDuplicates, rejected };
}

/**
 * O catálogo do cliente em células de CSV, prontas para virar arquivo.
 *
 * A montagem do arquivo fica no navegador (é lá que o download acontece, com o
 * BOM que o Excel precisa), mas as CÉLULAS saem daqui — formatadas pelo mesmo
 * módulo que a importação lê. É o que garante que o arquivo exportado volte
 * pela importação com os mesmos números que saíram.
 *
 * Ordenado por nome: o comerciante abre no Excel esperando o catálogo dele, não
 * a ordem em que os produtos foram cadastrados anos atrás.
 */
export async function exportProducts(tenantId: string): Promise<ExportResult> {
  const auth = await requireAdmin("exportar produtos");
  if (!auth.ok) return { ok: false, message: auth.message };

  if (!UUID_RE.test(tenantId)) return { ok: false, message: "Cliente inválido." };
  if (!(await tenantExists(auth.supabase, tenantId))) {
    return { ok: false, message: "Cliente não encontrado." };
  }

  // `service_role` pelo mesmo motivo da importação: o RLS de `products` filtra
  // por `tenant_id = current_tenant_id()`, e o admin da plataforma não tem
  // tenant — o cliente de sessão traria zero linhas de qualquer catálogo. O
  // `eq("tenant_id", ...)` abaixo é o que mantém o isolamento de pé: ele é o
  // filtro que o RLS faria, aplicado por nós, sobre um id já conferido.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("name, price, cost, category, barcode, unit, stock_quantity, stock_min, tracks_stock")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) {
    console.error("[exportarProdutos] falha ao ler o catálogo:", error.message);
    return { ok: false, message: `Não foi possível ler os produtos: ${error.message}` };
  }

  return { ok: true, rows: ((data ?? []) as CatalogRow[]).map(toExportRow) };
}
