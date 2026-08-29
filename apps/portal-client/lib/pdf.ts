/**
 * Um escritor de PDF mínimo, escrito à mão.
 *
 * O portal não carrega jsPDF nem pdfmake por causa de dois botões: as duas
 * bibliotecas pesam centenas de kB no bundle de um app que roda offline no
 * balcão. Um relatório é texto em tabela — e isso o formato faz com um punhado
 * de operadores.
 *
 * O QUE ELE FAZ: texto em Helvetica (normal e negrito), tabelas paginadas com
 * cabeçalho repetido, retângulos coloridos, A4 retrato.
 * O QUE ELE NÃO FAZ: imagens, fontes embutidas, quebra de linha automática
 * dentro da célula — o texto que não cabe é truncado com reticências.
 *
 * As duas armadilhas do formato, ambas tratadas aqui:
 *
 * 1. A tabela `xref` guarda o deslocamento em BYTES de cada objeto. Por isso o
 *    arquivo é montado como texto de code units <= 0xFF e só depois vira bytes:
 *    assim o `length` do JavaScript e o byte contado pelo leitor são o mesmo
 *    número. Um caractere multibyte no meio quebraria todos os offsets — que é
 *    o motivo de `toWinAnsi` existir.
 * 2. A origem do sistema de coordenadas é o canto INFERIOR esquerdo. Aqui
 *    dentro `y` conta de cima para baixo, como todo mundo pensa, e a conversão
 *    acontece num lugar só.
 */

export type RGB = [number, number, number];

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const BOTTOM = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ACCENTS = /[\u0300-\u036f]/g;

/** Larguras da Helvetica, por 1000 unidades de corpo — vindas da AFM da fonte. */
const WIDTHS: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
  "·": 278, "×": 584, "…": 1000,
};

/** O que a WinAnsiEncoding representa fora do Latin-1, e alguns apelidos. */
const WIN_ANSI: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
  "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
  "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92,
  "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c,
  "ž": 0x9e, "Ÿ": 0x9f,
  // O menos tipográfico que `brlDelta` usa vira o hífen comum.
  "−": 0x2d,
};

/**
 * Texto onde cada code unit vale exatamente um byte do arquivo.
 *
 * O que a codificação não tem perde o acento antes de virar "?": "Acai" é
 * menos ruim do que "A?a?".
 */
function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 32 && code <= 126) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
      continue;
    }
    const mapped = WIN_ANSI[ch];
    if (mapped != null) {
      out += String.fromCharCode(mapped);
      continue;
    }
    const plain = ch.normalize("NFD").replace(ACCENTS, "");
    out += plain.length === 1 && (plain.codePointAt(0) ?? 0) < 0x100 ? plain : "?";
  }
  return out;
}

/** `\`, `(` e `)` têm significado dentro de uma string PDF. */
function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textWidth(text: string, size: number, bold = false): number {
  let total = 0;
  for (const ch of toWinAnsi(text)) {
    const base = ch.normalize("NFD").replace(ACCENTS, "") || ch;
    total += WIDTHS[base] ?? WIDTHS[ch] ?? (/[0-9]/.test(ch) ? 556 : 500);
  }
  // A Bold é ~3% mais larga que a Regular. A diferença só decide onde truncar,
  // e para isso essa margem chega perto o bastante.
  return (total / 1000) * size * (bold ? 1.03 : 1);
}

/**
 * Corta no que couber e marca o corte, para uma coluna nunca invadir a vizinha.
 *
 * A tolerância de 0,01pt existe porque a largura da coluna é calculada como
 * `largura do texto + padding` e depois consultada como `coluna - padding`: o
 * ponto flutuante devolve às vezes um ulp a menos, e sem ela um cabeçalho que
 * dimensionou a própria coluna sairia truncado nela.
 */
export function ellipsize(text: string, max: number, size: number, bold = false): string {
  if (textWidth(text, size, bold) <= max + 0.01) return text;
  let cut = text;
  while (cut.length > 1 && textWidth(cut + "…", size, bold) > max) {
    cut = cut.slice(0, -1);
  }
  return cut.trimEnd() + "…";
}

export interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: RGB;
  /** Espaço aberto ANTES da linha. */
  gapBefore?: number;
  /** Espaço aberto depois da linha, além da altura dela. */
  gapAfter?: number;
}

export interface Table {
  columns: string[];
  rows: string[][];
  /** Uma entrada por coluna; ausente equivale a tudo à esquerda. */
  align?: ("left" | "right")[];
  size?: number;
}

export interface PdfBuilder {
  /** Uma linha de texto; vira a página sozinha quando não cabe. */
  text: (content: string, options?: TextOptions) => void;
  table: (t: Table) => void;
  rule: (gapBefore?: number) => void;
  space: (height: number) => void;
  /**
   * Vira a página se não restarem `height` pontos.
   *
   * É o que impede um título de ficar sozinho no pé da página com a tabela na
   * seguinte: quem vai escrever o par pede o espaço dos dois antes de começar.
   */
  reserve: (height: number) => void;
  toBlob: () => Blob;
}

export interface PdfOptions {
  /** Impresso no rodapé de toda página, à esquerda. */
  footer?: string;
}

const INK: RGB = [0.09, 0.11, 0.13];
const BODY: RGB = [0.25, 0.28, 0.31];
const MUTED: RGB = [0.45, 0.49, 0.53];
const LINE: RGB = [0.85, 0.87, 0.89];
const ZEBRA: RGB = [0.968, 0.973, 0.978];

export function createPdf(options: PdfOptions = {}): PdfBuilder {
  const pages: string[][] = [];
  let ops: string[] = [];
  /** Distância do topo da página até onde a próxima coisa será escrita. */
  let y = MARGIN;

  const startPage = () => {
    ops = [];
    pages.push(ops);
    y = MARGIN;
  };
  startPage();

  const draw = (
    content: string,
    x: number,
    baseline: number,
    size: number,
    bold: boolean,
    color: RGB,
  ) => {
    ops.push(
      `${color[0]} ${color[1]} ${color[2]} rg`,
      "BT",
      `/${bold ? "F2" : "F1"} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${(PAGE_HEIGHT - baseline).toFixed(2)} Tm`,
      `(${escape(toWinAnsi(content))}) Tj`,
      "ET",
    );
  };

  const rect = (x: number, top: number, w: number, h: number, color: RGB) => {
    ops.push(
      `${color[0]} ${color[1]} ${color[2]} rg`,
      `${x.toFixed(2)} ${(PAGE_HEIGHT - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  };

  /** Garante `needed` pontos livres antes do rodapé, virando a página se faltar. */
  const ensure = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - BOTTOM) startPage();
  };

  const text: PdfBuilder["text"] = (content, o = {}) => {
    const size = o.size ?? 10;
    const height = size * 1.35;
    y += o.gapBefore ?? 0;
    ensure(height);
    draw(content, MARGIN, y + size, size, o.bold ?? false, o.color ?? INK);
    y += height + (o.gapAfter ?? 0);
  };

  const space: PdfBuilder["space"] = (height) => {
    y += height;
  };

  const rule: PdfBuilder["rule"] = (gapBefore = 6) => {
    y += gapBefore;
    ensure(1);
    rect(MARGIN, y, CONTENT_WIDTH, 0.6, LINE);
    y += 6;
  };

  const table: PdfBuilder["table"] = (t) => {
    const size = t.size ?? 8.6;
    const align = t.align ?? t.columns.map(() => "left" as const);
    const pad = 7;
    const rowHeight = size * 2.1;

    // Largura natural de cada coluna: o maior conteúdo que ela tem. O mínimo é
    // o cabeçalho, que nunca é truncado — "Saiu no período…" seria uma coluna
    // sem nome, e ninguém sabe ler a tabela sem ele.
    const minimum = t.columns.map((c) => textWidth(c, size, true) + pad * 2);
    const natural = t.columns.map((c, i) =>
      Math.max(
        minimum[i],
        t.rows.reduce((max, r) => Math.max(max, textWidth(r[i] ?? "", size)), 0) + pad * 2,
      ),
    );
    const total = natural.reduce((a, w) => a + w, 0);

    let widths: number[];
    if (total <= CONTENT_WIDTH) {
      // A sobra vai toda para a primeira coluna, onde estão os nomes;
      // espalhá-la pelas numéricas só abriria buracos entre os números.
      widths = natural.map((w, i) => (i === 0 ? w + (CONTENT_WIDTH - total) : w));
    } else {
      // Quem tem folga sobre o próprio cabeçalho é quem paga o excesso, na
      // proporção da folga: assim a coluna de nomes longos encolhe muito e as
      // de número, que já estão no osso, quase não se mexem.
      const slack = natural.map((w, i) => w - minimum[i]);
      const slackTotal = slack.reduce((a, w) => a + w, 0);
      const excess = total - CONTENT_WIDTH;
      widths =
        slackTotal > excess
          ? natural.map((w, i) => w - (slack[i] / slackTotal) * excess)
          : // Nem os cabeçalhos cabem: só resta encolher tudo por igual.
            natural.map((w) => (w / total) * CONTENT_WIDTH);
    }

    const offsets = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((a, w) => a + w, 0));

    const cellX = (i: number, value: string, bold: boolean) =>
      align[i] === "right"
        ? offsets[i] + widths[i] - pad - textWidth(value, size, bold)
        : offsets[i] + pad;

    const header = () => {
      ensure(rowHeight * 2);
      rect(MARGIN, y, CONTENT_WIDTH, rowHeight, ZEBRA);
      const baseline = y + (rowHeight + size * 0.72) / 2;
      t.columns.forEach((c, i) => {
        const label = ellipsize(c, widths[i] - pad * 2, size, true);
        draw(label, cellX(i, label, true), baseline, size, true, MUTED);
      });
      y += rowHeight;
      rect(MARGIN, y, CONTENT_WIDTH, 0.6, LINE);
      y += 0.6;
    };

    header();

    t.rows.forEach((row, r) => {
      if (y + rowHeight > PAGE_HEIGHT - BOTTOM) {
        startPage();
        header();
      }
      if (r % 2 === 1) rect(MARGIN, y, CONTENT_WIDTH, rowHeight, ZEBRA);
      const baseline = y + (rowHeight + size * 0.72) / 2;
      row.forEach((cell, i) => {
        if (i >= widths.length) return;
        const value = ellipsize(cell ?? "", widths[i] - pad * 2, size);
        draw(value, cellX(i, value, false), baseline, size, false, i === 0 ? INK : BODY);
      });
      y += rowHeight;
    });

    rect(MARGIN, y, CONTENT_WIDTH, 0.6, LINE);
    y += 0.6;
  };

  const toBlob = () => {
    const footer = options.footer ?? "";

    // O rodapé só pode ser escrito agora: antes disto não se sabe quantas
    // páginas o documento tem, e "de N" faz parte dele.
    pages.forEach((page, i) => {
      const label = `Página ${i + 1} de ${pages.length}`;
      const baseline = PAGE_HEIGHT - BOTTOM + 22;
      const line = (content: string, x: number) =>
        page.push(
          `${MUTED[0]} ${MUTED[1]} ${MUTED[2]} rg`,
          "BT",
          "/F1 7.5 Tf",
          `1 0 0 1 ${x.toFixed(2)} ${(PAGE_HEIGHT - baseline).toFixed(2)} Tm`,
          `(${escape(toWinAnsi(content))}) Tj`,
          "ET",
        );
      if (footer) line(footer, MARGIN);
      line(label, PAGE_WIDTH - MARGIN - textWidth(label, 7.5));
    });

    const pageIds = pages.map((_, i) => 5 + i * 2);
    const objects: string[] = [];

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] =
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] ` +
      `/Count ${pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    pages.forEach((page, i) => {
      const id = pageIds[i];
      const stream = page.join("\n");
      objects[id] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`;
      objects[id + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    let file = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = file.length;
      file += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xref = file.length;
    const count = objects.length;
    file += `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let id = 1; id < count; id++) {
      file += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
    }
    file += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

    const bytes = new Uint8Array(file.length);
    for (let i = 0; i < file.length; i++) bytes[i] = file.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  };

  return { text, table, rule, space, reserve: ensure, toBlob };
}
