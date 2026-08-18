"use client";

import {
  Button,
  css,
  Empty,
  KpiStrip,
  LIST,
  MONO,
  PANEL,
  PANEL_TITLE,
  pill,
  PILL_GROUP,
  SANS,
  ScreenHeader,
} from "@aguiar/ui";
import { useState } from "react";
import { usePortal } from "@/components/PortalProvider";
import {
  canResend,
  formatAccessKey,
  MODEL_LABEL,
  STATUS_LABEL,
  STATUS_NOTE,
  STATUS_TONE,
} from "@/lib/dados/notas";
import { brl, dateLabel, totalV } from "@/lib/formato";
import type { FiscalDocument, FiscalStatus } from "@/types/types";

/**
 * As notas emitidas.
 *
 * O CADASTRO fiscal não está aqui — ele é configuração e vive em
 * Configurações › Dados fiscais. Esta tela é a operação: o que saiu, o que a
 * SEFAZ recusou e por quê.
 *
 * A COLUNA MAIS IMPORTANTE É O MOTIVO DA RECUSA. Uma nota recusada sem
 * explicação vira chamado de suporte; com o texto da SEFAZ na tela, quase
 * sempre é o próprio cliente que corrige o NCM e reenvia.
 */

type Filter = "all" | FiscalStatus;

const FILTERS: { key: Filter; name: string }[] = [
  { key: "all", name: "Todas" },
  { key: "rejected", name: "Recusadas" },
  { key: "pending", name: "Na fila" },
  { key: "authorized", name: "Autorizadas" },
];

export function NotasView() {
  const { a, isMobile, d } = usePortal();

  /**
   * O filtro desta tela NÃO entra no `PortalState`.
   *
   * Os outros filtros do portal moram lá porque precisam sobreviver à troca de
   * tela — a pessoa filtra Vendas, abre um produto, volta. Aqui não: a lista é
   * curta e o recorte é momentâneo. Guardá-lo na sessão engordaria o estado
   * global sem ninguém ganhar nada.
   */
  const [filter, setFilter] = useState<Filter>("all");

  const docs = d.fiscalDocuments;
  const list = filter === "all" ? docs : docs.filter((f) => f.status === filter);

  const authorized = docs.filter((f) => f.status === "authorized").length;
  const rejected = docs.filter((f) => f.status === "rejected").length;
  const queued = docs.filter((f) => f.status === "pending" || f.status === "processing").length;

  // Homologação é ambiente de TESTE: nada que sai dela tem valor fiscal. Dizer
  // isso no topo evita a confusão mais cara desta tela — alguém achar que já
  // está emitindo de verdade.
  const testing = d.fiscal.environment !== "production";

  return (
    <div>
      <ScreenHeader
        title="Notas fiscais"
        subtitle="O que foi emitido nas suas vendas, e o que a SEFAZ recusou."
      />

      {testing && (
        <div
          style={css(
            "display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;padding:12px 14px;" +
              "border:1px dashed var(--warn);border-radius:12px;background:var(--warn-soft)",
          )}
        >
          <span
            style={css(
              `flex:none;padding:3px 9px;border-radius:999px;background:var(--warn);color:#fff;font:600 10.5px ${SANS}`,
            )}
          >
            Teste
          </span>
          <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}>
            Você está em <strong>homologação</strong>. As notas daqui servem para conferir o
            cadastro e <strong>não têm valor fiscal</strong> — não entregue nenhuma a cliente. A
            troca para produção fica em Configurações › Dados fiscais.
          </p>
        </div>
      )}

      <KpiStrip
        columns={isMobile ? "1fr 1fr" : "repeat(3, 1fr)"}
        kpis={[
          { label: "Autorizadas", value: String(authorized), color: "var(--pos)" },
          {
            label: "Recusadas",
            value: String(rejected),
            color: rejected ? "var(--danger)" : undefined,
            note: rejected ? "Corrija e reenvie" : "Nenhuma",
          },
          { label: "Na fila", value: String(queued), note: "O sistema tenta sozinho" },
        ]}
      />

      <div style={css(PILL_GROUP + ";margin-bottom:14px")} role="tablist">
        {FILTERS.map((o) => (
          <Button
            key={o.key}
            role="tab"
            aria-selected={filter === o.key}
            onClick={() => setFilter(o.key)}
            cssText={pill(filter === o.key)}
          >
            {o.name}
          </Button>
        ))}
      </div>

      <div style={css(PANEL)}>
        <div style={css("padding:15px 18px;border-bottom:1px solid var(--border)")}>
          <h2 style={css(PANEL_TITLE)}>
            {list.length} {list.length === 1 ? "nota" : "notas"}
          </h2>
        </div>

        {list.length === 0 ? (
          <div style={css("padding:18px")}>
            <Empty
              title={docs.length === 0 ? "Nenhuma nota ainda" : "Nada com esse filtro"}
              text={
                docs.length === 0
                  ? "Assim que você registrar uma venda com o cadastro fiscal completo, a nota aparece aqui sozinha."
                  : "Troque o filtro para ver as outras."
              }
            />
          </div>
        ) : (
          <div style={css(LIST)}>
            {list.map((f) => (
              <Row key={f.id} doc={f} onResend={() => a.resendDocument(f.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ doc, onResend }: { doc: FiscalDocument; onResend: () => unknown }) {
  const { d, isMobile } = usePortal();
  const tone = STATUS_TONE[doc.status];

  // A nota é da venda: mostrar o valor dela é o que permite reconhecer qual
  // venda é essa sem abrir nada.
  const sale = doc.saleId ? d.sales.find((v) => v.id === doc.saleId) : undefined;

  return (
    <div
      style={css(
        "display:flex;flex-direction:column;gap:8px;padding:13px 18px;border-bottom:1px solid var(--border)",
      )}
    >
      <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
        <span
          style={css(
            `flex:none;padding:3px 10px;border-radius:999px;background:${tone.bg};color:${tone.color};font:600 11px ${SANS}`,
          )}
        >
          {STATUS_LABEL[doc.status]}
        </span>

        <span style={css(`font:600 13px ${SANS}`)}>
          {MODEL_LABEL[doc.model] ?? doc.model}
          {doc.number ? ` nº ${doc.number}` : ""}
          {doc.series ? ` · série ${doc.series}` : ""}
        </span>

        <span style={css(`flex:1;min-width:0;font:500 12px ${SANS};color:var(--muted)`)}>
          {dateLabel(doc.d, doc.time)}
          {sale ? ` · ${brl(totalV(sale))}` : ""}
        </span>

        {doc.danfeUrl && (
          <a
            href={doc.danfeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={css(
              `flex:none;padding:7px 12px;border:1px solid var(--border2);border-radius:9px;` +
                `background:var(--surface2);color:var(--text2);font:600 12px ${SANS};text-decoration:none`,
            )}
          >
            Ver nota
          </a>
        )}

        {canResend(doc) && (
          <Button
            onClick={onResend}
            loadingLabel="Enviando…"
            className="hv-borda"
            style={css(
              `flex:none;padding:8px 13px;border:1px solid var(--accent);border-radius:9px;` +
                `background:var(--accent-soft);color:var(--accent);font:600 12px ${SANS}`,
            )}
          >
            Reenviar
          </Button>
        )}
      </div>

      <div style={css(`font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
        {STATUS_NOTE[doc.status]}
      </div>

      {/*
        O MOTIVO DA RECUSA, em destaque e na íntegra. É o texto que a SEFAZ
        devolveu, sem resumo: um "Rejeição 778: NCM inválido" é feio de ler e é
        exatamente o que o contador precisa ouvir para dizer o que fazer.
      */}
      {doc.rejectionReason && (
        <div
          style={css(
            `padding:9px 11px;border-radius:9px;background:var(--warn-soft);border:1px solid var(--border2);` +
              `font:500 11.5px/1.5 ${SANS};color:var(--text2)`,
          )}
        >
          {doc.rejectionReason}
        </div>
      )}

      {doc.accessKey && (
        <div
          style={css(
            `font:500 ${isMobile ? "10.5" : "11"}px ${MONO};color:var(--muted);word-break:break-all`,
          )}
        >
          {formatAccessKey(doc.accessKey)}
        </div>
      )}
    </div>
  );
}
