"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  css,
  HScroll,
  KpiStrip,
  MONO,
  Panel,
  ScreenHeader,
  Select,
  Switch,
  TABLE_HEADER,
} from "@aguiar/ui";
import { useAdmin } from "@/components/AdminProvider";
import {
  fetchExistingKeys,
  importProducts,
  type ImportResult,
} from "@/app/clientes/[id]/actions";
import { csvLine, decodeCsv, isBlankRow, parseCsv, slug } from "@/lib/csv";
import {
  analyzeRows,
  autoMap,
  catalogCsvLines,
  CATALOG_DELIMITER,
  EMPTY_MAPPING,
  IMPORT_FIELDS,
  MAX_ROWS,
  missingRequired,
  REQUIRED_FIELDS,
  TEMPLATE_EXAMPLE,
  type ExistingKeys,
  type ImportField,
  type IssueCode,
  type Mapping,
} from "@/lib/produtosCsv";
import { customerHref, ROUTES } from "@/lib/rotas";
import { customerById } from "@/lib/state";
import type { Dic } from "@/lib/dictionary";

/**
 * Importação de catálogo por CSV, dentro da ficha de um cliente.
 *
 * A tela é uma esteira de quatro etapas que se revelam à medida que a anterior
 * fica de pé — modelo, arquivo, mapeamento, conferência —, e não um assistente
 * de telas separadas: o admin precisa poder voltar duas etapas e trocar um
 * select sem perder o arquivo já lido.
 *
 * SEGURANÇA: este arquivo roda no navegador e NÃO fala com o Supabase. Ele lê o
 * CSV, mostra o que encontrou e entrega as LINHAS CRUAS para a Server Action,
 * que revalida tudo com o mesmo módulo puro antes de gravar. A conferência daqui
 * é para quem olha; a que vale é a do servidor.
 */

/** O rótulo de cada campo do sistema, nos dois idiomas. */
function fieldLabels(L: Dic): Record<ImportField, string> {
  return {
    nome: L.colunaNome,
    preco: L.colunaPreco,
    custo: L.colunaCusto,
    categoria: L.colunaCategoria,
    codigo_barras: L.colunaCodigoBarras,
    unidade: L.colunaUnidade,
    estoque_inicial: L.colunaEstoqueInicial,
    estoque_minimo: L.colunaEstoqueMinimo,
  };
}

/** O motivo de uma linha ficar de fora, em texto. Os códigos vêm do módulo puro. */
function issueLabels(L: Dic): Record<IssueCode, string> {
  return {
    nameMissing: L.issueNameMissing,
    priceMissing: L.issuePriceMissing,
    priceInvalid: L.issuePriceInvalid,
    priceNotPositive: L.issuePriceNotPositive,
    costInvalid: L.issueCostInvalid,
    stockInvalid: L.issueStockInvalid,
    minStockInvalid: L.issueMinStockInvalid,
    duplicateInFile: L.issueDuplicateInFile,
    duplicateName: L.issueDuplicateName,
    duplicateBarcode: L.issueDuplicateBarcode,
  };
}

/** Quantas linhas do arquivo a prévia mostra antes de o admin decidir. */
const PREVIEW_ROWS = 8;

/** Quantas linhas problemáticas a tela lista; o resto sai no CSV de rejeitados. */
const ISSUE_ROWS = 15;

const CELL = `padding:9px 12px;font:500 12px ${MONO};color:var(--text);white-space:nowrap`;
const SECTION_NOTE = "margin:0;font-size:12.5px;line-height:1.5;color:var(--text2)";

export function ImportarProdutosView({ customerId }: { customerId: string }) {
  const { s, a, isMobile } = useAdmin();
  const { L, toast } = a;
  const router = useRouter();
  const c = customerById(s, customerId);

  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  /** O arquivo inteiro, cabeçalho incluído. Vazio enquanto nada foi escolhido. */
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Mapping>(EMPTY_MAPPING);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  /** Nomes e códigos que o cliente já tem, para a checagem de duplicidade. */
  const [existing, setExisting] = useState<ExistingKeys>({ names: [], barcodes: [] });
  const [result, setResult] = useState<Extract<ImportResult, { ok: true }> | null>(null);

  const labels = fieldLabels(L);
  const issues = issueLabels(L);

  // Um cliente excluído deixa a URL órfã; a lista é onde aterrissar. Mesmo
  // guard da ficha, pelo mesmo motivo.
  useEffect(() => {
    if (!c) router.replace(ROUTES.customers);
  }, [c, router]);

  /**
   * O catálogo atual do cliente, lido uma vez ao entrar na tela.
   *
   * Falhar aqui não impede importar: só faz a tela deixar de avisar sobre
   * duplicados. O servidor confere de novo, contra o catálogo do instante da
   * gravação — então um aviso perdido não vira produto duplicado no banco sem
   * que o admin tenha escolhido isso.
   */
  useEffect(() => {
    let alive = true;
    fetchExistingKeys(customerId).then((res) => {
      if (!alive) return;
      if (res.ok) setExisting(res.keys);
      else toast(res.message, "warning");
    });
    return () => {
      alive = false;
    };
  }, [customerId, toast]);

  // `dataRows` guarda as linhas em branco de propósito — é o que mantém a
  // numeração dos erros igual à da planilha (ver `parseCsv`). Quem conta e quem
  // mostra usa `filledRows`; quem valida e quem grava recebe `dataRows`.
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const filledRows = dataRows.filter((r) => !isBlankRow(r));
  const headers = hasHeader ? (rows[0] ?? []) : [];
  const columnCount = rows.reduce((max, r) => Math.max(max, r.length), 0);

  /** O que impede este arquivo de seguir adiante. `null` é "pode continuar". */
  const fileIssue: string | null =
    rows.length === 0
      ? null
      : filledRows.length === 0
        ? L.erroSemLinhas
        : filledRows.length > MAX_ROWS
          ? L.erroLimiteLinhas
              .replace("{n}", String(filledRows.length))
              .replace("{max}", String(MAX_ROWS))
          : null;

  const loaded = rows.length > 0 && !fileIssue;
  const missing = missingRequired(mapping);
  const mapped = loaded && missing.length === 0;

  // A conferência é derivada do arquivo, do mapeamento e do catálogo — nunca
  // guardada em estado. Um select trocado tem que refletir na hora, e um
  // resultado gravado ficaria velho sem ninguém perceber.
  const analysis = useMemo(
    () => (mapped ? analyzeRows(dataRows, mapping, existing, hasHeader ? 2 : 1) : []),
    [mapped, dataRows, mapping, existing, hasHeader],
  );

  const okCount = analysis.filter((r) => r.status === "ok").length;
  const errorCount = analysis.filter((r) => r.status === "error").length;
  const duplicateCount = analysis.filter((r) => r.status === "duplicate").length;
  const willImport = okCount + (skipDuplicates ? 0 : duplicateCount);

  /** As linhas que ficam de fora com a escolha atual sobre duplicados. */
  const leftOut = analysis.filter(
    (r) => r.status === "error" || (r.status === "duplicate" && skipDuplicates),
  );

  const columnName = (i: number) => headers[i]?.trim() || `${L.colunaNumero} ${i + 1}`;

  const reset = () => {
    setFileName("");
    setRows([]);
    setMapping(EMPTY_MAPPING);
    setReadError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const readFile = async (file: File) => {
    setResult(null);
    setReadError(null);

    try {
      const parsed = parseCsv(decodeCsv(await file.arrayBuffer()));
      setFileName(file.name);
      setRows(parsed);
      // O mapeamento é sugerido aqui, no evento, e não num efeito: assim um
      // ajuste manual do admin sobrevive a qualquer re-render.
      setMapping(parsed.length > 0 ? autoMap(parsed[0]) : EMPTY_MAPPING);
      if (parsed.length === 0) setReadError(L.erroArquivoVazio);
    } catch {
      setFileName(file.name);
      setRows([]);
      setReadError(L.erroLeitura);
    }
  };

  /** Ligar/desligar o cabeçalho muda o que é dado e o que é rótulo de coluna. */
  const toggleHeader = () => {
    const next = !hasHeader;
    setHasHeader(next);
    setMapping(next && rows.length > 0 ? autoMap(rows[0]) : EMPTY_MAPPING);
  };

  const downloadTemplate = () => {
    // O mesmo montador que a exportação usa — o modelo em branco e o catálogo
    // exportado são o MESMO arquivo, com conteúdo diferente.
    a.baixarCsv(catalogCsvLines([TEMPLATE_EXAMPLE]), "aguiar-one-modelo-produtos.csv");
  };

  const downloadRejected = () => {
    if (!result || result.rejected.length === 0) return;
    const head = csvLine([L.colunaLinha, L.colunaProduto, L.colunaMotivo], CATALOG_DELIMITER);
    const body = result.rejected.map((r) =>
      csvLine(
        [String(r.line), r.name || L.semNome, r.issues.map((i) => issues[i]).join(" · ")],
        CATALOG_DELIMITER,
      ),
    );
    a.baixarCsv([head, ...body], `aguiar-one-nao-importados-${slug(c?.name ?? "", "cliente")}.csv`);
  };

  const runImport = async () => {
    const res = await importProducts(customerId, dataRows, mapping, skipDuplicates);
    if (!res.ok) return toast(res.message, "error");
    setResult(res);
    toast(L.toastImportado);
  };

  if (!c) return null;

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <Button
        onClick={() => a.goTo(customerHref(customerId))}
        className="hv-acc"
        style={css(
          "align-self:flex-start;background:none;border:none;color:var(--text2);font-size:12.5px;" +
            "cursor:pointer;padding:0",
        )}
      >
        ← {L.voltarAoCliente}
      </Button>

      <ScreenHeader title={L.importar} subtitle={`${L.subtituloImportar} ${c.name}.`} />

      {result ? (
        <Resumo
          result={result}
          onDownload={downloadRejected}
          onAgain={() => reset()}
          onBack={() => a.goTo(customerHref(customerId))}
        />
      ) : (
        <>
          {/* ── 1 · Modelo ─────────────────────────────────────────────── */}
          <Panel
            title={L.passo1Titulo}
            note={L.passo1Nota}
            action={
              <Button
                onClick={downloadTemplate}
                className="hv-acc-borda"
                style={css(
                  "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                    "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer",
                )}
              >
                {L.baixarModelo}
              </Button>
            }
          >
            <p style={css(SECTION_NOTE + ";margin-bottom:12px")}>{L.formatoNota}</p>
            <div style={css("display:flex;flex-wrap:wrap;gap:7px")}>
              {IMPORT_FIELDS.map((f) => {
                const required = REQUIRED_FIELDS.includes(f);
                return (
                  <span
                    key={f}
                    style={css(
                      "display:inline-flex;align-items:center;gap:6px;border-radius:99px;" +
                        "padding:5px 11px;font-size:11.5px;font-weight:500;border:1px solid " +
                        (required
                          ? "var(--accent);background:var(--accent-soft);color:var(--accent)"
                          : "var(--border);background:var(--surface2);color:var(--text2)"),
                    )}
                  >
                    <span style={css(`font-family:${MONO};font-size:11px`)}>{f}</span>
                    <span style={css("opacity:.75")}>
                      {labels[f]}
                      {required ? ` · ${L.colunaObrigatoria}` : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          </Panel>

          {/* ── 2 · Arquivo ────────────────────────────────────────────── */}
          <Panel title={L.passo2Titulo} note={L.passo2Nota}>
            <div style={css("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  // O campo é esvaziado assim que o arquivo é lido: sem isso,
                  // escolher DE NOVO o mesmo arquivo — depois de corrigi-lo no
                  // Excel, que é o caminho normal aqui — não dispararia evento
                  // nenhum, e a tela seguiria mostrando a leitura antiga.
                  e.target.value = "";
                  if (file) void readFile(file);
                }}
                style={css("display:none")}
              />
              <Button
                onClick={() => inputRef.current?.click()}
                className="hv-brilho"
                style={css(
                  "border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);" +
                    "font-size:12.5px;font-weight:600;padding:10px 16px;border-radius:9px;cursor:pointer",
                )}
              >
                {rows.length > 0 || readError ? L.trocarArquivo : L.escolherArquivo}
              </Button>
              <span
                style={css(
                  `font-family:${MONO};font-size:12px;color:` +
                    (fileName ? "var(--text)" : "var(--muted)"),
                )}
              >
                {fileName || L.nenhumArquivo}
              </span>
              {rows.length > 0 && !readError && (
                <span style={css("font-size:12px;color:var(--muted)")}>
                  {filledRows.length} {L.linhasLidas}
                </span>
              )}
            </div>

            {(readError || fileIssue) && <Aviso texto={readError ?? fileIssue ?? ""} />}

            {rows.length > 0 && !readError && columnCount === 1 && (
              <Aviso texto={L.erroUmaColuna} tone="warning" />
            )}

            {rows.length > 0 && !readError && (
              <>
                <div
                  style={css(
                    "margin:14px -18px 0;border-top:1px solid var(--border);" +
                      "border-bottom:1px solid var(--border)",
                  )}
                >
                  <Switch
                    on={hasHeader}
                    onToggle={toggleHeader}
                    title={L.temCabecalho}
                    note={L.temCabecalhoNota}
                  />
                </div>

                <h3
                  style={css(
                    "margin:16px 0 3px;font-size:13px;font-weight:600;color:var(--text)",
                  )}
                >
                  {L.previaTitulo}
                </h3>
                <p style={css(SECTION_NOTE + ";margin-bottom:10px")}>{L.previaNota}</p>

                <HScroll style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
                  <table style={css("border-collapse:collapse;width:100%")}>
                    <thead>
                      <tr>
                        {Array.from({ length: columnCount }, (_, i) => (
                          <th key={i} style={css(TABLE_HEADER + ";padding:9px 12px;text-align:left")}>
                            {columnName(i)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filledRows.slice(0, PREVIEW_ROWS).map((row, r) => (
                        <tr key={r} style={css("border-top:1px solid var(--border-soft)")}>
                          {Array.from({ length: columnCount }, (_, i) => (
                            <td key={i} style={css(CELL)}>
                              {row[i] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </HScroll>
              </>
            )}
          </Panel>

          {/* ── 3 · Mapeamento ─────────────────────────────────────────── */}
          {loaded && (
            <Panel title={L.passo3Titulo} note={L.passo3Nota}>
              <div
                style={css(
                  "display:grid;gap:14px;" +
                    (isMobile
                      ? "grid-template-columns:1fr"
                      : "grid-template-columns:repeat(auto-fit,minmax(230px,1fr))"),
                )}
              >
                {IMPORT_FIELDS.map((f) => {
                  const required = REQUIRED_FIELDS.includes(f);
                  const empty = mapping[f] === null;
                  return (
                    <label key={f} style={css("display:flex;flex-direction:column;gap:6px")}>
                      <span
                        style={css(
                          "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;" +
                            "font-weight:600;color:" +
                            (required && empty ? "var(--danger)" : "var(--muted)"),
                        )}
                      >
                        {labels[f]}
                        {required ? " *" : ""}
                      </span>
                      <Select
                        value={mapping[f] === null ? "" : String(mapping[f])}
                        onChange={(e) =>
                          setMapping((m) => ({
                            ...m,
                            [f]: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        boxCssText="width:100%"
                        cssText="width:100%;font-size:12.5px"
                      >
                        <option value="">{L.colunaIgnorar}</option>
                        {Array.from({ length: columnCount }, (_, i) => (
                          <option key={i} value={i}>
                            {columnName(i)}
                          </option>
                        ))}
                      </Select>
                    </label>
                  );
                })}
              </div>

              {missing.length > 0 && <Aviso texto={L.faltaObrigatorio} />}
            </Panel>
          )}

          {/* ── 4 · Conferência ────────────────────────────────────────── */}
          {mapped && (
            <Panel title={L.passo4Titulo} note={L.passo4Nota}>
              <KpiStrip
                columns="repeat(3,minmax(0,1fr))"
                kpis={[
                  { label: L.prontosLabel, value: String(okCount), color: "var(--pos)" },
                  {
                    label: L.comErroLabel,
                    value: String(errorCount),
                    color: errorCount > 0 ? "var(--danger)" : undefined,
                  },
                  {
                    label: L.duplicadosLabel,
                    value: String(duplicateCount),
                    color: duplicateCount > 0 ? "var(--warn)" : undefined,
                  },
                ]}
              />

              <div
                style={css(
                  "margin:0 -18px;border-top:1px solid var(--border);" +
                    "border-bottom:1px solid var(--border)",
                )}
              >
                <Switch
                  on={skipDuplicates}
                  onToggle={() => setSkipDuplicates((v) => !v)}
                  title={L.pularDuplicados}
                  note={L.pularDuplicadosNota}
                />
              </div>

              <p style={css(SECTION_NOTE + ";margin-top:14px")}>{L.notaEstoque}</p>

              {leftOut.length > 0 && (
                <>
                  <h3
                    style={css("margin:18px 0 10px;font-size:13px;font-weight:600;color:var(--text)")}
                  >
                    {L.linhasIgnoradas}
                  </h3>
                  <HScroll style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
                    <table style={css("border-collapse:collapse;width:100%")}>
                      <thead>
                        <tr>
                          <th style={css(TABLE_HEADER + ";padding:9px 12px;text-align:left")}>
                            {L.colunaLinha}
                          </th>
                          <th style={css(TABLE_HEADER + ";padding:9px 12px;text-align:left")}>
                            {L.colunaProduto}
                          </th>
                          <th style={css(TABLE_HEADER + ";padding:9px 12px;text-align:left")}>
                            {L.colunaMotivo}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leftOut.slice(0, ISSUE_ROWS).map((r) => (
                          <tr key={r.line} style={css("border-top:1px solid var(--border-soft)")}>
                            <td style={css(CELL + ";color:var(--muted)")}>{r.line}</td>
                            <td style={css(CELL)}>{r.rawName || L.semNome}</td>
                            <td
                              style={css(
                                "padding:9px 12px;font-size:12px;color:" +
                                  (r.status === "error" ? "var(--danger)" : "var(--warn)"),
                              )}
                            >
                              {r.issues.map((i) => issues[i]).join(" · ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HScroll>
                  {leftOut.length > ISSUE_ROWS && (
                    <p style={css("margin:9px 0 0;font-size:12px;color:var(--muted)")}>
                      + {leftOut.length - ISSUE_ROWS} {L.maisLinhas}
                    </p>
                  )}
                </>
              )}

              <div
                style={css(
                  "display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px",
                )}
              >
                <Button
                  onClick={runImport}
                  disabled={willImport === 0}
                  className="hv-brilho"
                  loadingLabel={L.importarAgora}
                  style={css(
                    "font-size:13px;font-weight:600;padding:11px 20px;border-radius:9px;" +
                      "display:flex;align-items:center;justify-content:center;" +
                      (isMobile ? "flex:1;" : "") +
                      (willImport === 0
                        ? "border:1px solid var(--border);background:var(--surface3);color:var(--muted);cursor:not-allowed;"
                        : "border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);cursor:pointer;"),
                  )}
                >
                  {willImport === 0 ? L.nadaParaImportar : `${L.importarAgora} (${willImport})`}
                </Button>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

/** Uma faixa de aviso — vermelha por padrão, âmbar quando é só uma ressalva. */
function Aviso({ texto, tone = "danger" }: { texto: string; tone?: "danger" | "warning" }) {
  const danger = tone === "danger";
  return (
    <p
      style={css(
        "margin:14px 0 0;padding:11px 13px;border-radius:9px;font-size:12.5px;line-height:1.5;" +
          "border:1px solid " +
          (danger
            ? "var(--danger-line);background:var(--danger-soft);color:var(--danger)"
            : "var(--warn-line);background:var(--warn-soft);color:var(--warn)"),
      )}
    >
      {texto}
    </p>
  );
}

/**
 * O que aconteceu, depois de gravar.
 *
 * Os três números vêm do SERVIDOR, e não da conferência da tela: é o servidor
 * que revalida e grava, e é o número dele que corresponde ao que existe no
 * banco. Repetir aqui a contagem local anunciaria um total que pode não ter
 * sido gravado.
 */
function Resumo({
  result,
  onDownload,
  onAgain,
  onBack,
}: {
  result: Extract<ImportResult, { ok: true }>;
  onDownload: () => void;
  onAgain: () => void;
  onBack: () => void;
}) {
  const { a, isMobile } = useAdmin();
  const { L } = a;

  return (
    <Panel title={L.resumoTitulo}>
      <KpiStrip
        columns="repeat(3,minmax(0,1fr))"
        kpis={[
          { label: L.resumoImportados, value: String(result.imported), color: "var(--pos)" },
          { label: L.resumoIgnoradosErro, value: String(result.skippedErrors) },
          { label: L.resumoIgnoradosDuplicados, value: String(result.skippedDuplicates) },
        ]}
      />

      {result.rejected.length > 0 && (
        <p style={css(SECTION_NOTE + ";margin-bottom:14px")}>{L.baixarRejeitadosNota}</p>
      )}

      <div
        style={css(
          "display:flex;gap:9px;flex-wrap:wrap" + (isMobile ? ";flex-direction:column" : ""),
        )}
      >
        {result.rejected.length > 0 && (
          <Button
            onClick={onDownload}
            className="hv-acc-borda"
            style={css(
              "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                "font-size:12.5px;font-weight:500;padding:10px 16px;border-radius:9px;cursor:pointer;" +
                "display:flex;align-items:center;justify-content:center",
            )}
          >
            {L.baixarRejeitados}
          </Button>
        )}
        <Button
          onClick={onAgain}
          className="hv-acc-borda"
          style={css(
            "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
              "font-size:12.5px;font-weight:500;padding:10px 16px;border-radius:9px;cursor:pointer;" +
              "display:flex;align-items:center;justify-content:center",
          )}
        >
          {L.novaImportacao}
        </Button>
        <Button
          onClick={onBack}
          className="hv-brilho"
          style={css(
            "border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);" +
              "font-size:12.5px;font-weight:600;padding:10px 16px;border-radius:9px;cursor:pointer;" +
              "display:flex;align-items:center;justify-content:center",
          )}
        >
          {L.voltarAoCliente}
        </Button>
      </div>
    </Panel>
  );
}
