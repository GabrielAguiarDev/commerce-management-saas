"use client";

import { ModalBase } from "@/components/modais/Base";
import { usePortal } from "@/components/PortalProvider";
import { css, MONO, SANS } from "@/lib/css";
import { brl, rotuloData, totalV } from "@/lib/formato";
import { NUM } from "@/lib/styleKit";
import type { Venda } from "@/types/types";

export function VendaDetalheModal({ venda }: { venda: Venda }) {
  const { a } = usePortal();
  const total = totalV(venda);

  return (
    <ModalBase
      titulo="Detalhes da venda"
      subtitulo={`${rotuloData(venda.d, venda.hora)} · ${venda.pag}`}
      largura={440}
      onFechar={a.fecharModal}
    >
      {venda.estornada && (
        <div
          style={css(
            `padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font:600 12.5px/1.45 ${SANS}`,
          )}
        >
          Esta venda foi estornada e não conta no faturamento. Ela continua no histórico para você ter
          o registro.
        </div>
      )}

      {venda.itens.map((l) => (
        <div
          key={l.nome}
          style={css(
            "display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid var(--border);border-radius:11px;background:var(--surface2)",
          )}
        >
          <span
            style={css(
              "flex:none;min-width:34px;height:34px;padding:0 8px;border-radius:9px;background:var(--surface3);" +
                `color:var(--text2);display:flex;align-items:center;justify-content:center;font:700 12.5px ${MONO}`,
            )}
          >
            {l.qtd}×
          </span>
          <span style={css(`flex:1;min-width:0;font:500 13px/1.35 ${SANS}`)}>{l.nome}</span>
          <span style={css(`flex:none;font:700 13px ${SANS};${NUM}`)}>{brl(l.qtd * l.preco)}</span>
        </div>
      ))}

      <div
        style={css(
          "display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid var(--border)",
        )}
      >
        <span style={css(`font:600 13px ${SANS};color:var(--text2)`)}>Total</span>
        <span
          style={css(
            `font:700 24px/1 ${SANS};${NUM};color:${venda.estornada ? "var(--muted)" : "var(--text)"}`,
          )}
        >
          {brl(total)}
        </span>
      </div>
    </ModalBase>
  );
}
