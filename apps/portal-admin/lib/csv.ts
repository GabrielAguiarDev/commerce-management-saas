/**
 * Leitura e escrita de CSV, sem dependência externa.
 *
 * Existe porque o arquivo que chega na importação de produtos vem do sistema
 * ANTIGO do comerciante, e não de um formulário nosso: ele tem acento, tem
 * campo entre aspas com vírgula dentro, e foi salvo pelo Excel em português —
 * que separa com ponto e vírgula, não com vírgula. Nada disso é exótico; é o
 * caso comum. Um `split(",")` transformaria "Ração Golden 15kg, adulto" em duas
 * colunas e o admin só descobriria depois de importar.
 *
 * Tudo aqui é função pura, sem React e sem Supabase: o mesmo código roda no
 * navegador (para a prévia) e na Server Action (que revalida tudo do zero).
 */

/** Separadores que aparecem na prática, na ordem de preferência do desempate. */
const DELIMITERS = [",", ";", "\t"] as const;

export type Delimiter = (typeof DELIMITERS)[number];

/**
 * Bytes → texto, tentando UTF-8 e caindo para windows-1252.
 *
 * O `fatal: true` é o que faz a diferença: sem ele, um arquivo latin1 (o que um
 * ERP antigo de balcão exporta) não daria erro — viria com "Ra��o" e
 * seria importado assim, com o nome do produto corrompido no banco para sempre.
 * Com ele, a decodificação falha alto e tentamos a codificação certa.
 *
 * O BOM sai aqui, e não no parser: ele pertence à codificação, e deixá-lo
 * passar grudaria um caractere invisível no primeiro cabeçalho — que então não
 * casaria com "nome" no mapeamento automático.
 */
export function decodeCsv(bytes: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Quantas linhas são amostradas para o desempate do separador. */
const SAMPLE_ROWS = 5;

/** Quantos campos a PRIMEIRA linha teria com este separador. */
function fieldsInFirstRow(text: string, delimiter: string): number {
  const end = text.search(/[\r\n]/);
  const first = end === -1 ? text : text.slice(0, end);
  return sampleFieldCounts(first, delimiter)[0] ?? 1;
}

/**
 * Quantos campos cada uma das primeiras linhas teria com este separador.
 *
 * Conta respeitando aspas — senão um "Ração, ao quilo" dentro de aspas faria a
 * vírgula ganhar a eleição num arquivo que na verdade usa ponto e vírgula.
 */
function sampleFieldCounts(text: string, delimiter: string): number[] {
  const counts: number[] = [];
  let fields = 1;
  let quoted = false;

  for (let i = 0; i < text.length && counts.length < SAMPLE_ROWS; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch !== '"') continue;
      // `""` é uma aspa literal, não o fim do campo.
      if (text[i + 1] === '"') i++;
      else quoted = false;
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      fields++;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      // Linha em branco não vota: ela tem um campo com qualquer separador, e
      // enfileirada com as outras faria toda contagem parecer inconsistente.
      if (fields > 1) counts.push(fields);
      fields = 1;
    }
  }

  if (fields > 1 && counts.length < SAMPLE_ROWS) counts.push(fields);
  return counts;
}

/**
 * O separador do arquivo.
 *
 * Quem decide é o CABEÇALHO, e o peso dele é esmagador de propósito. A razão é
 * uma só: o cabeçalho é a única linha que não tem número dentro. Nas linhas de
 * dados, um preço brasileiro como `1.234,56` faz a vírgula parecer separador em
 * TODAS elas — um arquivo `nome;preco` legítimo seria lido como colunas
 * partidas no meio do preço, e cada produto entraria custando 1 real.
 *
 * As linhas seguintes entram só como desempate, e é o que salva o arquivo que
 * começa com um título numa célula só antes do cabeçalho de verdade: ali a
 * primeira linha não separa nada com separador nenhum, e quem decide passa a
 * ser a regularidade do resto — o mesmo número de colunas em toda linha.
 *
 * Empate de tudo fica com a vírgula, pela ordem de `DELIMITERS`.
 */
export function detectDelimiter(text: string): Delimiter {
  let best: Delimiter = ",";
  let bestScore = 0;

  for (const d of DELIMITERS) {
    const counts = sampleFieldCounts(text, d);
    const header = fieldsInFirstRow(text, d);
    const columns = counts.length > 0 ? Math.max(...counts) : 1;
    const steady = counts.length > 1 && counts.every((n) => n === counts[0]);

    // A regularidade vale meia coluna e a ABRANGÊNCIA vale um centésimo por
    // linha: nenhuma das duas chega a superar um separador que tenha encontrado
    // uma coluna a mais de verdade. A abrangência é o último desempate, e é ela
    // que decide o arquivo que começa com um título: entre dois separadores que
    // partem as linhas de dados no mesmo tanto de colunas, ganha aquele que
    // também explica o cabeçalho, porque terá partido MAIS linhas.
    const score = header * 1000 + columns + (steady ? 0.5 : 0) + counts.length * 0.01;

    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }

  return best;
}

/**
 * O texto do arquivo virando linhas de campos.
 *
 * Cobre o que o RFC 4180 pede e o que o mundo real entrega: aspas com o
 * separador dentro, `""` como aspa literal, quebra de linha DENTRO de um campo
 * entre aspas, e as três formas de fim de linha (`\r\n`, `\n`, `\r`).
 *
 * As linhas em branco FICAM, e isso é de propósito. Descartá-las aqui pareceria
 * limpeza, mas embaralharia a numeração: uma linha vazia no meio da planilha
 * faria todo erro seguinte apontar para a linha de cima, e o admin corrigiria o
 * produto errado no Excel. Quem as ignora é `analyzeRows`, que sabe em que
 * posição cada uma estava. Use `isBlankRow` para não contá-las.
 */
export function parseCsv(text: string, delimiter?: Delimiter): string[][] {
  const sep = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  const endField = () => {
    row.push(value.trim());
    value = "";
  };

  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        value += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      endField();
    } else if (ch === "\r") {
      // `\r\n` é um fim de linha só.
      if (text[i + 1] === "\n") i++;
      endRow();
    } else if (ch === "\n") {
      endRow();
    } else {
      value += ch;
    }
  }

  // O arquivo pode acabar sem quebra de linha; o que estiver no acumulador
  // ainda é uma linha.
  if (value !== "" || row.length > 0) endRow();

  // A única linha em branco que some é a ÚLTIMA: ela é o "\n" final que todo
  // editor grava, e não uma linha da planilha. Tirá-la não move a numeração de
  // nada que venha antes.
  while (rows.length > 0 && isBlankRow(rows[rows.length - 1])) rows.pop();

  return rows;
}

/** Uma linha sem nada em célula nenhuma — separadora, não produto. */
export function isBlankRow(row: string[]): boolean {
  return row.every((c) => c.trim() === "");
}

/**
 * Um valor pronto para ser escrito num CSV.
 *
 * Só coloca aspas quando precisa. Um nome com aspas dentro tem cada uma
 * duplicada, que é como o formato representa a aspa literal.
 */
export function csvValue(value: string, delimiter: Delimiter = ","): string {
  const needsQuotes =
    value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r");
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Uma linha de CSV a partir dos valores, no formato que `baixarCsv` espera. */
export function csvLine(values: string[], delimiter: Delimiter = ","): string {
  return values.map((v) => csvValue(v, delimiter)).join(delimiter);
}

/**
 * "Petshop Amigo Fiel" → "petshop-amigo-fiel", para o nome do arquivo baixado.
 *
 * Mesma normalização que o diálogo de histórico de pagamentos já usa; o acento
 * sai porque nem todo sistema de arquivos o trata bem num download.
 */
export function slug(name: string, fallback = "arquivo"): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}
