import { createXlsx } from '../xlsx';

/**
 * O ESCRITOR DE XLSX É TESTÁVEL PORQUE É PURO — nenhuma linha dele conhece
 * React Native, e o ZIP não carimba hora, então o mesmo conteúdo produz sempre
 * os mesmos bytes.
 *
 * O que se testa aqui é o que quebra o arquivo INTEIRO no leitor: a assinatura
 * do ZIP, o XML mal formado, o número virando texto. Um erro em qualquer um
 * deles não aparece como célula errada — aparece como "não foi possível abrir",
 * e aí não há o que depurar do lado de quem recebeu.
 */

/**
 * Abre o pacote andando pelas ENTRADAS LOCAIS, e não procurando o nome no
 * meio dos bytes.
 *
 * A busca ingênua acha `xl/worksheets/sheet1.xml` primeiro dentro do
 * `[Content_Types].xml`, que cita o caminho — e devolve o arquivo errado
 * fazendo o teste falhar por motivo nenhum. As entradas são `stored`, então
 * ler é só recortar.
 */
function readParts(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Record<string, string> = {};
  let at = 0;

  while (at + 30 <= bytes.length && view.getUint32(at, true) === 0x04034b50) {
    const tamanho = view.getUint32(at + 18, true);
    const nomeLen = view.getUint16(at + 26, true);
    const extraLen = view.getUint16(at + 28, true);

    const nome = Buffer.from(bytes.slice(at + 30, at + 30 + nomeLen)).toString('utf8');
    const inicio = at + 30 + nomeLen + extraLen;
    out[nome] = Buffer.from(bytes.slice(inicio, inicio + tamanho)).toString('utf8');

    at = inicio + tamanho;
  }

  return out;
}

const readPart = (bytes: Uint8Array, name: string): string => readParts(bytes)[name] ?? '';

const planilha = () =>
  createXlsx([
    {
      name: 'Vendas por dia',
      header: ['Dia', 'Vendido'],
      rows: [
        ['seg', 181.9],
        ['ter', 0],
        ['Ração & café', 1234.56],
      ],
    },
  ]);

describe('createXlsx', () => {
  it('começa com a assinatura de um ZIP', () => {
    const bytes = planilha();
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('traz as partes que o Excel exige para abrir o arquivo', () => {
    const texto = Buffer.from(planilha()).toString('binary');
    for (const parte of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(texto).toContain(parte);
    }
  });

  /**
   * O ponto de existir este arquivo em vez de um CSV: número é `<v>`, sem
   * `t="inlineStr"`. Se isto virar texto, a planilha abre bonita e não soma.
   */
  it('grava número como número e texto como texto', () => {
    const sheet = readPart(planilha(), 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('<v>181.9</v>');
    expect(sheet).toContain('<v>1234.56</v>');
    expect(sheet).toContain('<t xml:space="preserve">seg</t>');
  });

  it('grava o zero, que não é célula vazia', () => {
    expect(readPart(planilha(), 'xl/worksheets/sheet1.xml')).toContain('<v>0</v>');
  });

  it('escapa o & — um só deixaria o XML inválido e o arquivo irrecuperável', () => {
    const sheet = readPart(planilha(), 'xl/worksheets/sheet1.xml');
    expect(sheet).toContain('Ração &amp; café');
  });

  it('respeita a ordem obrigatória do esquema: sheetViews, cols, sheetData', () => {
    const sheet = readPart(planilha(), 'xl/worksheets/sheet1.xml');
    expect(sheet.indexOf('<sheetViews>')).toBeLessThan(sheet.indexOf('<cols>'));
    expect(sheet.indexOf('<cols>')).toBeLessThan(sheet.indexOf('<sheetData>'));
  });

  it('poda o nome da aba para o que o Excel aceita', () => {
    const bytes = createXlsx([
      { name: 'Relatório: 2026/08 [rascunho] com um nome bem comprido', header: [], rows: [] },
    ]);
    const workbook = readPart(bytes, 'xl/workbook.xml');

    expect(workbook).not.toContain('[rascunho]');

    const nome = /<sheet name="([^"]*)"/.exec(workbook)?.[1] ?? '';
    expect(nome.length).toBeLessThanOrEqual(31);
    expect(nome).not.toMatch(/[[\]:*?/\\]/);
  });

  it('sobrevive a uma lista vazia em vez de gerar um pacote sem aba', () => {
    const texto = Buffer.from(createXlsx([])).toString('binary');
    expect(texto).toContain('xl/worksheets/sheet1.xml');
  });
});
