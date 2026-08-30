/**
 * ESCRITOR DE XLSX — bytes de uma planilha de verdade, sem dependência nenhuma.
 *
 * ┌─ POR QUE NÃO CSV ──────────────────────────────────────────────────────┐
 * │ CSV não tem tipo. Um `1.234,56` num arquivo separado por vírgula vira   │
 * │ duas colunas; separado por ponto e vírgula, o mesmo arquivo abre certo  │
 * │ no Excel em português e errado no visualizador do iPhone. Não há        │
 * │ escolha de separador que funcione nos dois, porque o formato não diz    │
 * │ qual é — quem adivinha é o programa que abriu.                          │
 * │                                                                        │
 * │ No XLSX o número é número, o texto é texto, e não sobra nada para       │
 * │ adivinhar. É a mesma decisão do portal (`lib/xlsx.ts`), pelo mesmo      │
 * │ motivo: uma planilha ilegível é pior que planilha nenhuma.              │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ POR QUE NÃO IMPORTAMOS A DO PORTAL ───────────────────────────────────┐
 * │ Aquela devolve um `Blob` e usa `TextEncoder` — duas coisas do           │
 * │ navegador. Esta devolve `Uint8Array` e traz o próprio codificador       │
 * │ UTF-8, porque o que existe no Hermes muda de versão para versão do      │
 * │ React Native, e um export que quebra na atualização do SDK é pior do    │
 * │ que trinta linhas repetidas.                                           │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * SEM COMPRESSÃO (método `stored`). O relatório tem dezenas de linhas, não
 * milhares: implementar deflate para economizar 8 KB seria trocar um problema
 * que não existe por um algoritmo que pode ter bug.
 *
 * É PURO: nenhuma linha conhece React Native, e por isso a suíte do jest node
 * consegue gerar o arquivo e conferir o que saiu.
 */

/** Uma célula. Número sai como número — é o ponto de existir este arquivo. */
export type Cell = string | number | null;

export interface Sheet {
  /** Vira o nome da aba. Máx. 31 caracteres, sem `[]:*?/\` — o Excel recusa. */
  name: string;
  /** A primeira linha, em negrito e congelada. */
  header: string[];
  rows: Cell[][];
}

/* -------------------------------------------------------------------------- */
/* XML                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Caracteres de controle são ILEGAIS em XML 1.0, e o Excel recusa a planilha
 * INTEIRA por causa de um só — dizendo que o arquivo está corrompido, o que
 * manda procurar o defeito no lugar errado. Some com eles em vez de escapá-los.
 */
const CONTROLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

function escapeXml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(CONTROLE, '');
}

/** `0` → `A`, `26` → `AA`. A referência da célula é letra + número da linha. */
function columnName(index: number): string {
  let name = '';
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

/** O nome da aba, podado para o que o Excel aceita — ver o comentário acima. */
function sheetName(raw: string): string {
  const limpo = raw.replace(/[[\]:*?/\\]/g, ' ').trim();
  return (limpo || 'Planilha').slice(0, 31);
}

/**
 * Os estilos, na ordem em que o `cellXfs` os declara. O índice É o `s=` da
 * célula: no formato isso é número mágico, não nome.
 */
const ESTILO = { normal: 0, cabecalho: 1 } as const;

function cellXml(ref: string, value: Cell, style: number): string {
  if (value === null || value === '') return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }

  // `t="inlineStr"` põe o texto DENTRO da célula. A alternativa é a tabela de
  // strings compartilhadas, que economiza espaço num arquivo grande e aqui só
  // acrescentaria uma parte a mais para errar.
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function rowXml(cells: Cell[], rowNumber: number, isHeader: boolean): string {
  const estilo = isHeader ? ESTILO.cabecalho : ESTILO.normal;
  const conteudo = cells
    .map((c, i) => cellXml(`${columnName(i)}${rowNumber}`, c, estilo))
    .join('');
  return `<row r="${rowNumber}">${conteudo}</row>`;
}

/**
 * A LARGURA DE CADA COLUNA, medida pelo conteúdo.
 *
 * Sem isto o Excel usa 8,43 caracteres para tudo e "Ração Golden 15kg" aparece
 * como "Ração Go…". Quem abre uma planilha cortada acha que ela veio errada, e
 * não que basta arrastar a borda — e o remédio (arrastar coluna por coluna) é
 * justamente o trabalho que exportar deveria poupar.
 *
 * O 60 é teto de segurança: uma observação longa numa célula não pode empurrar
 * as outras colunas para fora da página impressa.
 */
function colsXml(sheet: Sheet): string {
  const total = Math.max(sheet.header.length, ...sheet.rows.map((r) => r.length), 0);
  if (total === 0) return '';

  const larguras = Array.from({ length: total }, (_, i) => {
    const textos = [sheet.header[i], ...sheet.rows.map((r) => r[i])];
    const maior = textos.reduce<number>(
      (max, v) => (v === null || v === undefined ? max : Math.max(max, String(v).length)),
      0,
    );
    // +2 de folga: a fonte não é monoespaçada e o negrito do cabeçalho ocupa
    // um pouco mais do que a contagem de letras sugere.
    return Math.min(Math.max(maior + 2, 10), 60);
  });

  const cols = larguras
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  return `<cols>${cols}</cols>`;
}

function worksheetXml(sheet: Sheet): string {
  const linhas = [
    rowXml(sheet.header, 1, true),
    ...sheet.rows.map((r, i) => rowXml(r, i + 2, false)),
  ].join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // Congela o cabeçalho: rolar cem linhas sem saber de que coluna é o número
    // é o mesmo que não ter cabeçalho.
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView></sheetViews>' +
    // A ORDEM É OBRIGATÓRIA no esquema: `sheetViews`, depois `cols`, depois
    // `sheetData`. Fora dela o Excel recusa a planilha inteira.
    colsXml(sheet) +
    `<sheetData>${linhas}</sheetData>` +
    '</worksheet>'
  );
}

function workbookXml(sheets: Sheet[]): string {
  const abas = sheets
    .map(
      (s, i) =>
        `<sheet name="${escapeXml(sheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${abas}</sheets>` +
    '</workbook>'
  );
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  // A ordem aqui É o `ESTILO` lá em cima. Mexer numa sem mexer na outra troca
  // o visual de todas as células de uma vez.
  '<cellXfs count="2">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '</styleSheet>';

function contentTypesXml(count: number): string {
  const abas = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    abas +
    '</Types>'
  );
}

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

function workbookRels(count: number): string {
  const abas = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    abas +
    `<Relationship Id="rId${count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'
  );
}

/* -------------------------------------------------------------------------- */
/* ZIP                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * UTF-8 na mão.
 *
 * `TextEncoder` existe no Hermes de algumas versões do React Native e não de
 * outras. Vinte linhas de código conhecido valem mais do que uma dependência
 * de runtime que só falha no aparelho de alguém.
 */
function utf8(text: string): Uint8Array {
  const out: number[] = [];

  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);

    // Par substituto: um emoji ocupa duas posições na string e é UM caractere.
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = (code - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
        i += 1;
      }
    }

    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return Uint8Array.from(out);
}

/** A tabela do CRC-32, montada uma vez. É o que o ZIP usa para conferir. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = -1;
  for (let i = 0; i < bytes.length; i += 1) {
    // `?? 0` só para o `noUncheckedIndexedAccess`: o índice vem do próprio
    // `length`, então nunca sai da faixa.
    c = (CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/**
 * Monta o pacote ZIP: entradas locais, diretório central e o fecho.
 *
 * Sem compressão e SEM CARIMBO DE HORA — o campo fica zerado, o que é
 * perfeitamente válido e faz o mesmo relatório gerar exatamente os mesmos
 * bytes duas vezes. É o que torna o teste possível.
 */
function zip(files: { name: string; content: string }[]): Uint8Array {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const bloco = (size: number) => {
    const buffer = new ArrayBuffer(size);
    return { view: new DataView(buffer), bytes: new Uint8Array(buffer) };
  };

  for (const file of files) {
    const nome = utf8(file.name);
    const dados = utf8(file.content);
    const crc = crc32(dados);

    const local = bloco(30 + nome.length);
    local.view.setUint32(0, 0x04034b50, true); // assinatura da entrada
    local.view.setUint16(4, 20, true); // versão necessária
    local.view.setUint16(6, 0x0800, true); // nome em UTF-8
    local.view.setUint16(8, 0, true); // método: stored
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, dados.length, true);
    local.view.setUint32(22, dados.length, true);
    local.view.setUint16(26, nome.length, true);
    local.bytes.set(nome, 30);

    const dir = bloco(46 + nome.length);
    dir.view.setUint32(0, 0x02014b50, true);
    dir.view.setUint16(4, 20, true);
    dir.view.setUint16(6, 20, true);
    dir.view.setUint16(8, 0x0800, true);
    dir.view.setUint16(10, 0, true);
    dir.view.setUint32(16, crc, true);
    dir.view.setUint32(20, dados.length, true);
    dir.view.setUint32(24, dados.length, true);
    dir.view.setUint16(28, nome.length, true);
    dir.view.setUint32(42, offset, true); // onde a entrada local começa
    dir.bytes.set(nome, 46);

    partes.push(local.bytes, dados);
    central.push(dir.bytes);
    offset += local.bytes.length + dados.length;
  }

  const tamanhoCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = bloco(22);
  fim.view.setUint32(0, 0x06054b50, true);
  fim.view.setUint16(8, files.length, true);
  fim.view.setUint16(10, files.length, true);
  fim.view.setUint32(12, tamanhoCentral, true);
  fim.view.setUint32(16, offset, true);

  const todos = [...partes, ...central, fim.bytes];
  const total = todos.reduce((a, b) => a + b.length, 0);
  const saida = new Uint8Array(total);

  let cursor = 0;
  for (const parte of todos) {
    saida.set(parte, cursor);
    cursor += parte.length;
  }

  return saida;
}

/** Os bytes do `.xlsx`, prontos para gravar em disco. */
export function createXlsx(sheets: Sheet[]): Uint8Array {
  const abas = sheets.length ? sheets : [{ name: 'Planilha', header: [], rows: [] }];

  return zip([
    { name: '[Content_Types].xml', content: contentTypesXml(abas.length) },
    { name: '_rels/.rels', content: ROOT_RELS },
    { name: 'xl/workbook.xml', content: workbookXml(abas) },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels(abas.length) },
    { name: 'xl/styles.xml', content: STYLES_XML },
    ...abas.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: worksheetXml(s),
    })),
  ]);
}
