/**
 * O catálogo de produtos em CSV, nos dois sentidos: importar e exportar.
 *
 * OS DOIS MORAM AQUI DE PROPÓSITO. `IMPORT_FIELDS` é a definição única das
 * colunas, e dela saem quatro coisas: o modelo que o admin baixa, os selects do
 * mapeamento, a validação da importação e o arquivo exportado. Uma coluna nova
 * entra numa lista só e aparece nas quatro — enquanto uma exportação com lista
 * própria envelheceria em silêncio, e o arquivo que ela gera deixaria de servir
 * para reimportar sem que ninguém percebesse até alguém tentar.
 *
 * Módulo PURO: sem React, sem Supabase, sem uma única palavra de interface. A
 * tela chama isto para mostrar a conferência ao admin, e a Server Action chama
 * EXATAMENTE o mesmo código antes de gravar — uma Server Action é um endpoint
 * HTTP, e o que o navegador afirmou ter validado não vale nada. Duas
 * implementações da mesma regra divergiriam no dia em que uma mudasse.
 *
 * Por isso os problemas saem daqui como CÓDIGO (`priceInvalid`), e não como
 * frase: quem traduz é o dicionário do painel, nos dois idiomas.
 */

import { csvLine, slug, type Delimiter } from "@/lib/csv";

/* -------------------------------------------------------------------------- */
/* Campos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Os campos do sistema, na ordem em que aparecem no modelo e na tela.
 *
 * Os nomes estão em português porque são o CABEÇALHO DO ARQUIVO que o
 * comerciante recebe e preenche — é texto de interface, não identificador de
 * código. A tradução para as colunas de `products` acontece em `toRow`.
 */
export const IMPORT_FIELDS = [
  "nome",
  "preco",
  "custo",
  "categoria",
  "codigo_barras",
  "unidade",
  "estoque_inicial",
  "estoque_minimo",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Sem nome e sem preço não existe produto; o resto é opcional. */
export const REQUIRED_FIELDS: ImportField[] = ["nome", "preco"];

/**
 * Teto de linhas por importação.
 *
 * Uma Server Action trafega o corpo inteiro numa requisição só, e o Next limita
 * esse corpo (1MB por padrão). Recusar com um número claro é melhor do que
 * deixar a requisição ser cortada e o admin ver "erro de rede" sem entender que
 * o arquivo era grande demais.
 *
 * Mora aqui, e não na Server Action, porque um módulo `"use server"` só pode
 * exportar função assíncrona — e a tela precisa do número para avisar ANTES de
 * mandar o arquivo.
 */
export const MAX_ROWS = 2000;

/**
 * Qual coluna do arquivo alimenta cada campo. `null` é "não usar".
 *
 * O índice é posicional (a 3ª coluna do arquivo, não a coluna chamada "preço"):
 * arquivo de sistema antigo repete nome de cabeçalho, e às vezes não tem
 * cabeçalho nenhum.
 */
export type Mapping = Record<ImportField, number | null>;

export const EMPTY_MAPPING: Mapping = {
  nome: null,
  preco: null,
  custo: null,
  categoria: null,
  codigo_barras: null,
  unidade: null,
  estoque_inicial: null,
  estoque_minimo: null,
};

/**
 * Os nomes de coluna que já vimos significarem cada campo.
 *
 * É o que faz o arquivo exportado de outro sistema entrar pré-mapeado, sem o
 * admin ter que casar oito selects na mão. Quando não bate, o select existe.
 */
const ALIASES: Record<ImportField, string[]> = {
  nome: [
    "nome_produto",
    "nome",
    "name",
    "produto",
    "product",
    "descricao",
    "description",
    "item",
    "titulo",
  ],
  preco: ["preco_venda", "valor_venda", "preco_unitario", "preco", "price", "valor", "venda"],
  custo: ["preco_custo", "valor_custo", "custo_unitario", "custo", "cost", "compra"],
  categoria: ["categoria", "category", "grupo", "group", "setor", "familia", "departamento"],
  codigo_barras: [
    "codigo_barras",
    "barcode",
    "ean",
    "gtin",
    "codigo",
    "code",
    "sku",
    "referencia",
  ],
  unidade: ["unidade_medida", "unidade", "unit", "unid", "und", "un", "medida", "sigla"],
  estoque_inicial: [
    "estoque_inicial",
    "estoque_atual",
    "est_atual",
    "qtd_estoque",
    "qtde_estoque",
    "atual",
    "estoque",
    "stock",
    "quantidade",
    "qtd",
    "qtde",
    "saldo",
    "quantity",
  ],
  estoque_minimo: [
    "estoque_minimo",
    "stock_min",
    "estoque_min",
    "est_min",
    "minimo",
    "min",
    "minimum",
    "reposicao",
  ],
};

/**
 * Palavras de ligação, que o cabeçalho de planilha usa e não significam nada.
 *
 * Tirá-las é o que faz "Preço de Venda" virar `preco_venda` e cair EXATO num
 * apelido, em vez de exigir um apelido novo para cada jeito de escrever a mesma
 * coisa. Também é o que separa "preço de custo" de "preço de venda" sem
 * heurística nenhuma: viram `preco_custo` e `preco_venda`.
 */
const STOPWORDS = new Set(["de", "do", "da", "dos", "das", "em", "por", "para", "the", "of"]);

/** "Preço de Venda" → "preco_venda". Sem acento, sem caixa, sem pontuação. */
export function normalizeHeader(header: string): string {
  const parts = header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .split("_")
    .filter((p) => p !== "" && !STOPWORDS.has(p));

  return parts.join("_");
}

/**
 * O quanto este apelido explica este cabeçalho. Zero é "não é isto".
 *
 * O cabeçalho IGUAL ao apelido vale muito mais do que o apelido escondido
 * dentro dele, e entre dois escondidos ganha o mais longo — é o que faz
 * "codigo_barras_ean" ir para o código de barras, e não para um "codigo"
 * genérico de outro campo.
 */
function aliasScore(header: string, alias: string): number {
  if (header === alias) return 1000 + alias.length;

  const parts = header.split("_");
  const wanted = alias.split("_");

  for (let i = 0; i + wanted.length <= parts.length; i++) {
    if (wanted.every((seg, j) => parts[i + j] === seg)) return 100 + alias.length;
  }

  return 0;
}

/**
 * O mapeamento sugerido a partir do cabeçalho do arquivo.
 *
 * A escolha é GULOSA sobre todos os pares (campo, coluna) ordenados por
 * confiança, e não campo a campo na ordem do modelo. A diferença aparece num
 * arquivo com "código" e "código de barras": campo a campo, o primeiro campo a
 * pedir levaria a coluna errada só por vir antes na lista; assim cada coluna
 * fica com o campo que melhor a explica.
 *
 * Uma coluna serve a um campo só, e um campo a uma coluna só.
 */
export function autoMap(headers: string[]): Mapping {
  const normalized = headers.map(normalizeHeader);
  const candidates: { field: ImportField; column: number; score: number }[] = [];

  IMPORT_FIELDS.forEach((field, fieldOrder) => {
    normalized.forEach((header, column) => {
      if (!header) return;
      const best = Math.max(...ALIASES[field].map((alias) => aliasScore(header, alias)));
      // O desempate é estável: primeiro a ordem dos campos no modelo, depois a
      // das colunas no arquivo. Sem ele, dois cabeçalhos igualmente plausíveis
      // trocariam de lugar entre uma leitura e outra.
      if (best > 0) candidates.push({ field, column, score: best * 100 - fieldOrder });
    });
  });

  candidates.sort((a, b) => b.score - a.score || a.column - b.column);

  const mapping: Mapping = { ...EMPTY_MAPPING };
  const usedColumns = new Set<number>();

  for (const { field, column } of candidates) {
    if (mapping[field] !== null || usedColumns.has(column)) continue;
    mapping[field] = column;
    usedColumns.add(column);
  }

  return mapping;
}

/** Os campos obrigatórios que ainda não têm coluna. Vazio significa "pode seguir". */
export function missingRequired(mapping: Mapping): ImportField[] {
  return REQUIRED_FIELDS.filter((f) => mapping[f] === null);
}

/* -------------------------------------------------------------------------- */
/* Números                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * O texto de uma célula virando dinheiro em REAIS (é assim que `products.price`
 * guarda — `numeric`, não centavos).
 *
 * Aceita o que aparece de verdade numa planilha de comércio: `10,50`, `10.50`,
 * `R$ 1.234,56`, `1 234,56`.
 *
 * A ambiguidade real é o ponto sozinho: `1.234` é mil duzentos e trinta e
 * quatro no Brasil e um e duzentos e trinta e quatro milésimos nos EUA. Só
 * tratamos como separador de milhar quando o número INTEIRO tem a forma de
 * milhar (`1.234`, `10.500`, `1.234.567`) — preço com três casas decimais não
 * existe, e um `10.50` continua valendo dez e cinquenta.
 */
export function parseDecimal(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.\-]/g, "").trim();
  if (!cleaned) return null;

  let normalized: string;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Manda quem aparece por último: é o separador decimal.
    const decimalIsComma = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".");
    normalized = decimalIsComma
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * O mesmo, para quantidade — que é contagem, e não dinheiro.
 *
 * `10,0` e `10.00` passam valendo 10: planilha exporta quantidade com casa
 * decimal o tempo todo. Fração de verdade (`2,5`) é recusada, porque
 * `stock_quantity` conta unidades inteiras.
 */
export function parseCount(raw: string): number | null {
  const value = parseDecimal(raw);
  if (value === null || !Number.isInteger(value)) return null;
  return value;
}

/* -------------------------------------------------------------------------- */
/* Validação                                                                   */
/* -------------------------------------------------------------------------- */

/** Por que uma linha não entra. Traduzido pelo dicionário, nunca aqui. */
export type IssueCode =
  | "nameMissing"
  | "priceMissing"
  | "priceInvalid"
  | "priceNotPositive"
  | "costInvalid"
  | "stockInvalid"
  | "minStockInvalid"
  | "duplicateInFile"
  | "duplicateName"
  | "duplicateBarcode";

export type RowStatus = "ok" | "error" | "duplicate";

/** Um produto já validado, no vocabulário do nosso banco. */
export interface ImportedProduct {
  name: string;
  price: number;
  cost: number | null;
  category: string | null;
  barcode: string | null;
  unit: string;
  /** `null` quando o produto não vai controlar estoque. */
  stockQuantity: number | null;
  stockMin: number | null;
}

export interface RowResult {
  /** A linha no ARQUIVO, contando o cabeçalho — é o que o admin vê no Excel. */
  line: number;
  status: RowStatus;
  issues: IssueCode[];
  /** O produto pronto para gravar; `null` quando a linha tem erro. */
  product: ImportedProduct | null;
  /** O nome cru, para nomear a linha no relatório mesmo quando ela é inválida. */
  rawName: string;
}

/** Nomes e códigos de barras que o tenant JÁ tem, para a checagem de duplicidade. */
export interface ExistingKeys {
  names: string[];
  barcodes: string[];
}

/** Unidade padrão de quem não informou. Mesma que o cadastro do portal usa. */
const DEFAULT_UNIT = "un";

/** Nome e código de barras comparam sem caixa e sem espaço nas pontas. */
function key(value: string): string {
  return value.trim().toLowerCase();
}

function cell(row: string[], index: number | null): string {
  if (index === null) return "";
  return (row[index] ?? "").trim();
}

/**
 * O arquivo inteiro conferido linha a linha.
 *
 * Ordem das decisões, e ela importa: primeiro o que torna a linha IMPOSSÍVEL
 * (sem nome, preço inválido), depois o que a torna SUSPEITA (já existe). Uma
 * linha sem nome não pode ser duplicada de nada — reportá-la como duplicata
 * esconderia o problema de verdade.
 *
 * Linhas em branco somem daqui SEM virar erro: elas chegam inteiras (ver
 * `parseCsv`) só para que a numeração continue batendo com a da planilha, e uma
 * linha vazia não é um produto mal preenchido — é um respiro que alguém deixou
 * no arquivo.
 *
 * @param rows      as linhas de dados, sem o cabeçalho
 * @param firstLine número da primeira linha no arquivo (2 quando há cabeçalho)
 */
export function analyzeRows(
  rows: string[][],
  mapping: Mapping,
  existing: ExistingKeys,
  firstLine = 2,
): RowResult[] {
  const knownNames = new Set(existing.names.map(key));
  const knownBarcodes = new Set(existing.barcodes.filter(Boolean).map(key));
  // O que já apareceu NESTE arquivo. Uma planilha migrada de sistema antigo
  // costuma trazer o mesmo item duas vezes; sem isto, a segunda ocorrência
  // entraria limpa porque o banco ainda não a conhecia.
  const seenNames = new Set<string>();
  const seenBarcodes = new Set<string>();

  const results: RowResult[] = [];

  rows.forEach((row, i) => {
    const line = firstLine + i;
    if (row.every((c) => c.trim() === "")) return;

    const name = cell(row, mapping.nome);
    const rawPrice = cell(row, mapping.preco);
    const rawCost = cell(row, mapping.custo);
    const rawStock = cell(row, mapping.estoque_inicial);
    const rawMinStock = cell(row, mapping.estoque_minimo);
    const issues: IssueCode[] = [];

    if (!name) issues.push("nameMissing");

    let price: number | null = null;
    if (!rawPrice) {
      issues.push("priceMissing");
    } else {
      price = parseDecimal(rawPrice);
      if (price === null) issues.push("priceInvalid");
      else if (price <= 0) issues.push("priceNotPositive");
    }

    let cost: number | null = null;
    if (rawCost) {
      cost = parseDecimal(rawCost);
      if (cost === null || cost < 0) issues.push("costInvalid");
    }

    let stockQuantity: number | null = null;
    if (rawStock) {
      stockQuantity = parseCount(rawStock);
      if (stockQuantity === null || stockQuantity < 0) issues.push("stockInvalid");
    }

    let stockMin: number | null = null;
    if (rawMinStock) {
      stockMin = parseCount(rawMinStock);
      if (stockMin === null || stockMin < 0) issues.push("minStockInvalid");
    }

    if (issues.length > 0) {
      results.push({ line, status: "error", issues, product: null, rawName: name });
      return;
    }

    const barcode = cell(row, mapping.codigo_barras) || null;
    const nameKey = key(name);
    const barcodeKey = barcode ? key(barcode) : null;

    const duplicates: IssueCode[] = [];
    if (seenNames.has(nameKey) || (barcodeKey && seenBarcodes.has(barcodeKey))) {
      duplicates.push("duplicateInFile");
    }
    if (knownNames.has(nameKey)) duplicates.push("duplicateName");
    if (barcodeKey && knownBarcodes.has(barcodeKey)) duplicates.push("duplicateBarcode");

    seenNames.add(nameKey);
    if (barcodeKey) seenBarcodes.add(barcodeKey);

    const product: ImportedProduct = {
      name,
      // `price!` é seguro: um preço nulo teria virado erro acima.
      price: price as number,
      cost,
      category: cell(row, mapping.categoria) || null,
      barcode,
      unit: cell(row, mapping.unidade) || DEFAULT_UNIT,
      stockQuantity,
      stockMin,
    };

    results.push({
      line,
      status: duplicates.length > 0 ? "duplicate" : "ok",
      issues: duplicates,
      product,
      rawName: name,
    });
  });

  return results;
}

/* -------------------------------------------------------------------------- */
/* Tradução para a tabela `products`                                           */
/* -------------------------------------------------------------------------- */

/**
 * Um produto validado virando a linha que vai para o banco.
 *
 * ────────────────────────────────────────────────────────────────────────
 * O ESTOQUE INICIAL VAI DIRETO EM `stock_quantity` — E ISSO É DE PROPÓSITO.
 *
 * A tentação é chamar `apply_stock_movement` para deixar rastro. Não fazemos,
 * por dois motivos:
 *
 *  1. Saldo inicial de migração NÃO É COMPRA. Um `stock_movements` do tipo
 *     `in` faria a migração inteira aparecer como entrada de mercadoria nos
 *     relatórios do período — o comerciante veria um "gasto" de milhares de
 *     reais no dia em que trocou de sistema, sem ter comprado nada.
 *  2. Não há gatilho nenhum em `products` (o único que existe está em
 *     `sale_items`, e desconta estoque a cada venda). Escrever a coluna aqui
 *     é a operação mais simples possível, e não dispara efeito colateral.
 *
 * Contrapartida assumida: o histórico de movimentações nasce vazio. O saldo
 * começa em N sem uma linha que explique de onde veio. Registrar essa origem
 * exigiria um tipo novo em `stock_movements`, que tem chave estrangeira para a
 * tabela de tipos — ou seja, migração de banco.
 * ────────────────────────────────────────────────────────────────────────
 *
 * `tracks_stock` é DERIVADO: só controla estoque quem informou saldo inicial ou
 * mínimo. Ligar para todo mundo encheria a tela de alertas de "sem estoque" no
 * dia seguinte à importação, para produtos que o dono nunca quis contar.
 *
 * `is_favorite` fica falso: o favorito é o que aparece na grade de "Vender" sem
 * busca, e ele existe para o punhado de itens de giro rápido. Trezentos
 * produtos favoritados de uma vez tornam a grade inútil.
 */
export function toRow(product: ImportedProduct, tenantId: string) {
  const tracksStock = product.stockQuantity !== null || product.stockMin !== null;

  return {
    tenant_id: tenantId,
    name: product.name,
    price: product.price,
    // `null` e não `0`: produto sem custo cadastrado não tem custo ZERO — zero
    // faria a margem do relatório aparecer como 100% de lucro.
    cost: product.cost,
    category: product.category,
    barcode: product.barcode,
    unit: product.unit,
    is_service: false,
    is_favorite: false,
    is_active: true,
    tracks_stock: tracksStock,
    stock_quantity: tracksStock ? (product.stockQuantity ?? 0) : 0,
    stock_min: tracksStock ? (product.stockMin ?? 0) : 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Modelo                                                                      */
/* -------------------------------------------------------------------------- */

/** A linha de exemplo do modelo, na ordem de `IMPORT_FIELDS`. */
export const TEMPLATE_EXAMPLE: string[] = [
  "Ração Golden Adulto 15kg",
  "189,90",
  "142,50",
  "Alimentação",
  "7896029081234",
  "un",
  "12",
  "3",
];

/* -------------------------------------------------------------------------- */
/* Exportação                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ponto e vírgula, nos dois sentidos.
 *
 * É o separador de lista do Excel em português: um CSV com vírgula abre lá numa
 * coluna só, e o comerciante que recebe o arquivo conclui que ele veio
 * quebrado. A LEITURA continua aceitando os três separadores (ver
 * `detectDelimiter`) — esta constante é só para o que nós escrevemos.
 */
export const CATALOG_DELIMITER: Delimiter = ";";

/** A linha de `products` como a exportação precisa dela. */
export interface CatalogRow {
  name: string | null;
  /** `numeric` do Postgres chega como número OU como texto, conforme o driver. */
  price: number | string | null;
  cost: number | string | null;
  category: string | null;
  barcode: string | null;
  unit: string | null;
  stock_quantity: number | string | null;
  stock_min: number | string | null;
  tracks_stock: boolean | null;
}

/**
 * 189.9 → "189,90". Vazio quando não há valor.
 *
 * Vírgula decimal e NENHUM separador de milhar, de propósito: é a forma que
 * `parseDecimal` lê sem ambiguidade nenhuma, então o arquivo exportado volta
 * pela importação com o mesmo número que saiu. Um "1.234,56" também voltaria
 * certo, mas gastaria a única regra ambígua que existe aqui sem precisar.
 */
export function formatDecimal(value: number | string | null): string {
  if (value === null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "";
}

/** Quantidade: inteiro, sem casa decimal. Vazio quando não há valor. */
export function formatCount(value: number | string | null): string {
  if (value === null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "";
}

/**
 * Uma linha do banco virando as células do CSV, na ordem de `IMPORT_FIELDS`.
 *
 * `estoque_inicial` sai do `stock_quantity` ATUAL — é o saldo de hoje que o
 * outro sistema precisa receber como saldo inicial dele.
 *
 * Produto que não controla estoque exporta as duas colunas VAZIAS, e não zero.
 * Zero é "acabou", que é coisa bem diferente de "não conto" — e, na volta pela
 * importação, um zero ligaria `tracks_stock` e faria o comerciante receber
 * alerta de estoque de um produto que ele nunca quis contar.
 */
export function toExportRow(row: CatalogRow): string[] {
  const tracks = row.tracks_stock === true;

  return [
    row.name ?? "",
    formatDecimal(row.price),
    formatDecimal(row.cost),
    row.category ?? "",
    row.barcode ?? "",
    row.unit ?? "",
    tracks ? formatCount(row.stock_quantity) : "",
    tracks ? formatCount(row.stock_min) : "",
  ];
}

/**
 * O arquivo inteiro: cabeçalho de `IMPORT_FIELDS` mais as linhas.
 *
 * Serve tanto ao modelo em branco quanto à exportação do catálogo — é o mesmo
 * arquivo, com conteúdo diferente. O BOM que o Excel precisa para os acentos
 * quem põe é o `baixarCsv` do painel.
 */
export function catalogCsvLines(rows: string[][]): string[] {
  return [
    csvLine([...IMPORT_FIELDS], CATALOG_DELIMITER),
    ...rows.map((r) => csvLine(r, CATALOG_DELIMITER)),
  ];
}

/** "produtos-petshop-amigo-fiel-2026-08-10.csv" */
export function catalogFileName(customerName: string, date = new Date()): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return `produtos-${slug(customerName, "cliente")}-${day}.csv`;
}
