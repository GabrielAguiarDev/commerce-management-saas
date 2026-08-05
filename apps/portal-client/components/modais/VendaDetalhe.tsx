"use client";

import { ModalFrame } from "@/components/modais/Base";
import { usePortal } from "@/components/PortalProvider";
import { css, MONO, NUM, SANS } from "@aguiar/ui";
import { brl, dateLabel, totalV } from "@/lib/formato";
import type { Sale } from "@/types/types";

export function VendaDetalheModal({ sale }: { sale: Sale }) {
  const { a } = usePortal();
  const total = totalV(sale);

  return (
    <ModalFrame
      closeLabel="Fechar"
      title="Detalhes da venda"
      subtitle={`${dateLabel(sale.d, sale.time)} · ${sale.payment}`}
      width={440}
      onClose={a.closeModal}
    >
      {sale.refunded && (
        <div
          style={css(
            `padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font:600 12.5px/1.45 ${SANS}`,
          )}
        >
          Esta sale foi estornada e não account no faturamento. Ela continua no histórico para você ter
          o registro.
        </div>
      )}

      {sale.items.map((l) => (
        <div
          key={l.name}
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
          <span style={css(`flex:1;min-width:0;font:500 13px/1.35 ${SANS}`)}>{l.name}</span>
          <span style={css(`flex:none;font:700 13px ${SANS};${NUM}`)}>{brl(l.qtd * l.price)}</span>
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
            `font:700 24px/1 ${SANS};${NUM};color:${sale.refunded ? "var(--muted)" : "var(--text)"}`,
          )}
        >
          {brl(total)}
        </span>
      </div>
    </ModalFrame>
  );
}
