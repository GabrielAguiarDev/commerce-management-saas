import { brl } from "@/lib/formato";
import { createPdf } from "@/lib/pdf";
import type { Cell, Report, ReportSection } from "@/lib/relatorio";
import { columnName, createXlsx, type Sheet, type SheetCell } from "@/lib/xlsx";

/**
 * As duas saídas do relatório: um PDF para ler e uma planilha para trabalhar.
 *
 * Nenhuma das duas passa pelo servidor. Baixar é um gesto do navegador — quem
 * tem o `Blob` — e mandar o retrato inteiro para uma rota só para receber o
 * mesmo arquivo de volta seria uma viagem à toa numa tela que já tem todos os
 * números na mão.
 */

/** Para o PDF: o número já formatado para ler. */
function pdfCell(cell: Cell): string {
  if (typeof cell === "string") return cell;
  if ("money" in cell) return brl(cell.money);
  if ("pct" in cell) return `${cell.pct.toFixed(0)}%`;
  return String(cell.qtd);
}

/** Dinheiro tem duas casas. Guardar 7397.100000000002 é ruído binário. */
function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Para a planilha: número DE VERDADE, com o formato certo — dá para somar. */
function sheetCell(cell: Cell): SheetCell {
  if (typeof cell === "string") return { kind: "text", value: cell };
  if ("money" in cell) return { kind: "number", value: cents(cell.money), style: "money" };
  if ("pct" in cell) return { kind: "number", value: cell.pct, style: "percent" };
  return { kind: "number", value: cell.qtd, style: "int" };
}

/**
 * Coluna de número vai à direita, para as casas decimais se alinharem.
 *
 * Basta UMA célula numérica na coluna: a de variação começa com "sem base de
 * comparação" em texto e mesmo assim é uma coluna de número.
 */
function alignment(section: ReportSection): ("left" | "right")[] {
  return section.columns.map((_, i) =>
    section.rows.some((r) => r[i] != null && typeof r[i] !== "string") ? "right" : "left",
  );
}

/** "Padaria do Zé" + "30 dias" → "relatorio-padaria-do-ze-30-dias". */
export function reportFileName(report: Report, extension: string): string {
  const slug = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const parts = ["relatorio", slug(report.business), slug(report.period)].filter(Boolean);
  return `${parts.join("-")}.${extension}`;
}

/**
 * Entrega o arquivo ao navegador.
 *
 * O `revokeObjectURL` espera um instante: revogar no mesmo tick cancelaria o
 * download que o clique acabou de começar em alguns navegadores.
 */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* -------------------------------------------------------------------------- */
/* Planilha                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Uma aba por seção, e não tudo empilhado numa folha só.
 *
 * Empilhado, achar "Vendas detalhadas" no meio do arquivo é rolar às cegas — e
 * uma tabela abaixo da outra impede a coluna de ter uma largura que sirva às
 * duas. Com abas, cada seção tem cabeçalho congelado e larguras próprias.
 */
function reportSheets(report: Report): Sheet[] {
  // A MESMA LINHA NO TOPO DE TODA ABA. O bloco de identificação inteiro só
  // cabe na primeira, mas uma aba viaja sozinha: é comum mandar só "Vendas
  // detalhadas" para o contador, e sem esta linha ela chega sem dizer de que
  // negócio é nem de que período.
  const context =
    `${report.business} · ${report.period} (${report.window}) · gerado em ${report.generatedAt}` +
    (report.comparison ? ` · comparado com ${report.comparison}` : "");

  return report.sections.map((section) => {
    const rows: SheetCell[][] = [[{ kind: "text", value: context, style: "note" }], []];

    rows.push([{ kind: "text", value: section.title, style: "title" }]);
    if (section.note) rows.push([{ kind: "text", value: section.note, style: "note" }]);
    rows.push([]);

    if (section.rows.length === 0) {
      rows.push([{ kind: "text", value: section.empty ?? "Sem dados no período.", style: "note" }]);
      return { name: section.title, rows };
    }

    const headerRow = rows.length + 1;
    rows.push(
      section.columns.map((c) => ({ kind: "text" as const, value: c, style: "header" as const })),
    );

    const firstData = headerRow + 1;
    for (const row of section.rows) rows.push(row.map(sheetCell));
    const lastData = headerRow + section.rows.length;

    if (section.sum?.length) {
      const total: SheetCell[] = section.columns.map((_, c) => {
        if (c === 0) return { kind: "text", value: "Total", style: "label" };
        if (!section.sum?.includes(c)) return null;
        const cells = section.rows.map((r) => r[c]);
        const style = cells.some((x) => x && typeof x !== "string" && "money" in x)
          ? "money"
          : "int";
        const value = cents(
          cells.reduce<number>((acc, cell) => {
            if (!cell || typeof cell === "string") return acc;
            return acc + ("money" in cell ? cell.money : "pct" in cell ? cell.pct : cell.qtd);
          }, 0),
        );
        const column = columnName(c);
        // SUBTOTAL(109;…) e não SUM: o 109 ignora o que o autofiltro escondeu,
        // então filtrar por "Pix" faz o total virar o total do Pix. Com SUM o
        // rodapé continuaria mostrando o total de tudo, embaixo de uma tabela
        // que mostra uma parte — que é pior do que não ter total nenhum.
        return {
          kind: "formula",
          formula: `SUBTOTAL(109,${column}${firstData}:${column}${lastData})`,
          value,
          style,
        };
      });
      rows.push([]);
      rows.push(total);
    }

    return {
      name: section.title,
      rows,
      freezeBelowRow: headerRow,
      // Autofiltro só onde ele serve: numa tabela de quatro linhas a seta no
      // cabeçalho é enfeite, e ainda esconde parte do rótulo.
      autoFilter:
        section.rows.length >= 8
          ? `A${headerRow}:${columnName(section.columns.length - 1)}${lastData}`
          : undefined,
    };
  });
}

export function reportXlsxBlob(report: Report): Blob {
  return createXlsx(reportSheets(report));
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                         */
/* -------------------------------------------------------------------------- */

export function reportPdfBlob(report: Report): Blob {
  const period = report.period.toLowerCase();
  const pdf = createPdf({ footer: `${report.business} · Relatório de ${period}` });

  pdf.text(report.business, { size: 18, bold: true });
  pdf.text(`Relatório de ${period} · ${report.window}`, {
    size: 10,
    color: [0.45, 0.49, 0.53],
    gapBefore: 2,
  });
  pdf.text(
    `Gerado em ${report.generatedAt}` +
      (report.comparison ? ` · comparado com ${report.comparison}` : ""),
    { size: 8.5, color: [0.45, 0.49, 0.53] },
  );
  pdf.rule(8);

  for (const section of report.sections) {
    if (section.csvOnly) continue;
    // Título, nota, cabeçalho e duas linhas: o bastante para a seção não
    // começar no pé da página com a tabela toda na seguinte.
    pdf.reserve(110);
    pdf.text(section.title, { size: 12, bold: true, gapBefore: 12 });
    if (section.note) {
      pdf.text(section.note, { size: 8.5, color: [0.45, 0.49, 0.53], gapAfter: 4 });
    } else {
      pdf.space(4);
    }
    if (section.rows.length === 0) {
      pdf.text(section.empty ?? "Sem dados no período.", { size: 9, color: [0.45, 0.49, 0.53] });
      continue;
    }
    pdf.table({
      columns: section.columns,
      rows: section.rows.map((row) => row.map(pdfCell)),
      align: alignment(section),
    });
  }

  pdf.text(
    "As listagens linha a linha (vendas e custos) estão na planilha — no PDF elas virariam dezenas de páginas.",
    { size: 8, color: [0.45, 0.49, 0.53], gapBefore: 14 },
  );

  return pdf.toBlob();
}
