/**
 * Um escritor de XLSX mínimo, escrito à mão.
 *
 * POR QUE NÃO CSV: o separador é uma escolha sem resposta certa. Com `;` (o que
 * o Excel em português espera) o Quick Look e o Numbers do Mac dividem pela
 * vírgula decimal e picam "181,90" em duas colunas; com `,` o Excel em
 * português é que erra. Um .xlsx não tem separador — número é número, texto é
 * texto, e abre igual no Excel, no Numbers e no Google Planilhas.
 *
 * POR QUE NÃO SheetJS: mesma conta do `pdf.ts`. Uma planilha de relatório é
 * texto, número e negrito; isso o formato faz com quatro XMLs num zip.
 *
 * O QUE ELE FAZ: várias abas, texto e número, sete estilos (título, nota,
 * cabeçalho, dinheiro, porcentagem, inteiro, rótulo), largura de coluna e
 * cabeçalho congelado.
 * O QUE ELE NÃO FAZ: fórmulas, mesclagem, cor por célula, gráfico, imagem.
 *
 * O zip é gravado SEM COMPRESSÃO (método 0). Deflate exigiria zlib, que não
 * existe no navegador sem dependência; um relatório tem dezenas de kB, e o
 * ganho não paga o peso de embutir um compressor.
 */

export type StyleKey =
  | "default"
  | "title"
  | "note"
  | "header"
  | "money"
  | "percent"
  | "int"
  | "label";

export type SheetCell =
  | null
  | { kind: "text"; value: string; style?: StyleKey }
  | { kind: "number"; value: number; style?: StyleKey }
  /**
   * Fórmula COM o resultado já calculado junto.
   *
   * O `value` não é redundância: quem abre o arquivo mostra o valor guardado
   * até recalcular, e um leitor que não recalcula sozinho (várias
   * visualizações rápidas, o Quick Look entre elas) mostraria célula vazia no
   * lugar do total. A fórmula é o que faz o total reagir a um filtro; o valor
   * é o que faz ele aparecer antes disso.
   */
  | { kind: "formula"; formula: string; value: number; style?: StyleKey };

export interface Sheet {
  name: string;
  rows: SheetCell[][];
  /** Linha (1-based) abaixo da qual a rolagem começa; o topo fica fixo. */
  freezeBelowRow?: number;
  /** Intervalo do autofiltro, ex. "A4:G120" — só cabeçalho e dados. */
  autoFilter?: string;
}

/** A ordem aqui É o índice do estilo dentro de `cellXfs`, lá embaixo. */
const STYLE_INDEX: Record<StyleKey, number> = {
  default: 0,
  title: 1,
  note: 2,
  header: 3,
  money: 4,
  percent: 5,
  int: 6,
  label: 7,
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number): string {
  let name = "";
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/**
 * Nome de aba que o Excel aceita: até 31 caracteres, sem `[]:*?/\`, único.
 *
 * O Excel recusa o arquivo INTEIRO por um nome inválido — não é um aviso, é
 * uma planilha que não abre.
 */
function sheetNames(sheets: Sheet[]): string[] {
  const used = new Set<string>();
  return sheets.map((s, i) => {
    const clean = s.name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || `Aba ${i + 1}`;
    let name = clean;
    let n = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = ` (${n++})`;
      name = clean.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

/** Largura em caracteres, do conteúdo mais largo da coluna. */
function columnWidths(rows: SheetCell[][]): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      if (!cell) return;
      // O número é medido já formatado: "1.234,56" ocupa mais que "1234.56".
      const text =
        cell.kind === "text"
          ? cell.value
          : cell.style === "money"
            ? cell.value.toFixed(2)
            : String(cell.value);
      // Nota e título transbordam para as colunas vazias ao lado; deixá-los
      // ditar a largura da primeira coluna abriria um vão absurdo.
      const measured = cell.style === "note" || cell.style === "title" ? 0 : text.length;
      widths[i] = Math.max(widths[i] ?? 0, measured);
    });
  }
  return widths.map((w) => Math.min(Math.max(w + 3, 11), 60));
}

function sheetXml(sheet: Sheet): string {
  const widths = columnWidths(sheet.rows);
  const cols = widths.length
    ? `<cols>${widths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join("")}</cols>`
    : "";

  const freeze = sheet.freezeBelowRow
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freezeBelowRow}" ` +
      `topLeftCell="A${sheet.freezeBelowRow + 1}" activePane="bottomLeft" state="frozen"/>` +
      `</sheetView></sheetViews>`
    : "";

  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          if (!cell) return "";
          const ref = `${columnName(c)}${r + 1}`;
          const style = cell.style ? ` s="${STYLE_INDEX[cell.style]}"` : "";
          if (cell.kind === "formula") {
            const cached = Number.isFinite(cell.value) ? `<v>${cell.value}</v>` : "";
            return `<c r="${ref}"${style}><f>${escapeXml(cell.formula)}</f>${cached}</c>`;
          }
          if (cell.kind === "number") {
            // Número não finito não tem representação no formato: vira vazio,
            // que a planilha entende, em vez de um arquivo recusado.
            if (!Number.isFinite(cell.value)) return `<c r="${ref}"${style}/>`;
            return `<c r="${ref}"${style}><v>${cell.value}</v></c>`;
          }
          return (
            `<c r="${ref}"${style} t="inlineStr">` +
            `<is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`
          );
        })
        .join("");
      return cells ? `<row r="${r + 1}">${cells}</row>` : "";
    })
    .join("");

  // A ORDEM DOS ELEMENTOS É OBRIGATÓRIA no esquema: sheetViews, cols,
  // sheetData e só então autoFilter. Fora de ordem, o Excel recusa o arquivo.
  const filter = sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : "";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    freeze +
    cols +
    `<sheetData>${rows}</sheetData>` +
    filter +
    `</worksheet>`
  );
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  // 164 é o primeiro id livre para formato próprio; de 0 a 163 são reservados.
  `<numFmts count="3">` +
  `<numFmt numFmtId="164" formatCode="#,##0.00"/>` +
  `<numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/>` +
  `<numFmt numFmtId="166" formatCode="0"/>` +
  `</numFmts>` +
  `<fonts count="4">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="14"/><name val="Calibri"/></font>` +
  `</fonts>` +
  // O fill 0 (none) e o fill 1 (gray125) são obrigatórios e nesta ordem.
  `<fills count="3">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/>` +
  `<bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2">` +
  `<border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left/><right/><top/><bottom style="thin">` +
  `<color rgb="FFD1D5DB"/></bottom><diagonal/></border>` +
  `</borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="8">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" ` +
  `applyFont="1" applyFill="1" applyBorder="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/* -------------------------------------------------------------------------- */
/* O zip                                                                       */
/* -------------------------------------------------------------------------- */

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
  crc: number;
  offset: number;
}

/**
 * Um zip com entradas STORED (sem compressão).
 *
 * A flag 0x0800 marca os nomes como UTF-8. Sem ela, um nome fora do ASCII
 * seria lido em cp437 — aqui todos são ASCII, mas a flag é o que mantém isso
 * verdadeiro se algum dia deixarem de ser.
 */
function zip(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  const header = (size: number) => {
    const buffer = new ArrayBuffer(size);
    return { view: new DataView(buffer), bytes: new Uint8Array(buffer) };
  };

  for (const file of files) {
    const name = encoder.encode(file.name);
    const bytes = encoder.encode(file.content);
    const crc = crc32(bytes);
    const start = offset;

    const { view, bytes: local } = header(30);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // versão necessária
    view.setUint16(6, 0x0800, true); // nomes em UTF-8
    view.setUint16(8, 0, true); // método: stored
    view.setUint16(10, 0, true); // hora
    view.setUint16(12, 0x2821, true); // data fixa: 01/01/2020
    view.setUint32(14, crc, true);
    view.setUint32(18, bytes.length, true);
    view.setUint32(22, bytes.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    push(local);
    push(name);
    push(bytes);

    entries.push({ name: file.name, bytes, crc, offset: start });
  }

  const centralStart = offset;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const { view, bytes: central } = header(46);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true); // versão de quem criou
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0x2821, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.bytes.length, true);
    view.setUint32(24, entry.bytes.length, true);
    view.setUint16(28, name.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    push(central);
    push(name);
  }

  const { view, bytes: end } = header(22);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, offset - centralStart, true);
  view.setUint32(16, centralStart, true);
  push(end);

  return new Blob(chunks as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function createXlsx(sheets: Sheet[]): Blob {
  const names = sheetNames(sheets);
  const stylesRel = `rId${sheets.length + 1}`;

  const files = [
    {
      name: "[Content_Types].xml",
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ` +
        `ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-` +
        `officedocument.spreadsheetml.sheet.main+xml"/>` +
        sheets
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ` +
              `ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join("") +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-` +
        `officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: "_rels/.rels",
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/` +
        `relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        names
          .map(
            (name, i) =>
              `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
          )
          .join("") +
        `</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        sheets
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/` +
              `officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join("") +
        `<Relationship Id="${stylesRel}" Type="http://schemas.openxmlformats.org/officeDocument/` +
        `2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/styles.xml", content: STYLES_XML },
    ...sheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: sheetXml(sheet),
    })),
  ];

  return zip(files);
}
