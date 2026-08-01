"use client";

import { css } from "@/lib/css";

export type TomBarra = "alerta" | "neutro";

interface BarraAcoesProps {
  /** Texto de estado à esquerda. */
  estado: string;
  /** `alerta` pinta a barra de âmbar (há algo pendente). */
  tom: TomBarra;
  secundario: { rotulo: string; onClick: () => void; desabilitado?: boolean };
  primario: { rotulo: string; onClick?: () => void; desabilitado?: boolean; submit?: boolean };
}

/**
 * Barra fixa no rodapé com o estado do formulário e as duas ações. Mesma barra
 * da ficha do cliente, para as duas telas terminarem igual.
 */
export function BarraAcoes({ estado, tom, secundario, primario }: BarraAcoesProps) {
  const alerta = tom === "alerta";

  return (
    <div
      style={css(
        "position:sticky;bottom:0;z-index:7;display:flex;align-items:center;" +
          "justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 20px;" +
          "border-radius:12px;border:1px solid " +
          (alerta ? "var(--warnLine)" : "var(--line)") +
          ";background:var(--panel);box-shadow:0 -2px 16px rgba(6,20,26,.1)",
      )}
    >
      <span
        style={css(
          "display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500;color:" +
            (alerta ? "var(--warn)" : "var(--tx3)"),
        )}
      >
        <span
          style={css(
            "width:7px;height:7px;flex:none;border-radius:99px;background:" +
              (alerta ? "var(--warn)" : "var(--neuLine)"),
          )}
        />
        {estado}
      </span>

      <div style={css("display:flex;align-items:center;gap:9px")}>
        <button
          type="button"
          onClick={secundario.onClick}
          disabled={secundario.desabilitado}
          style={css(
            "font-size:13px;font-weight:500;padding:10px 16px;border-radius:9px;" +
              "border:1px solid var(--line);background:var(--panel);color:" +
              (secundario.desabilitado ? "var(--tx3)" : "var(--tx2)") +
              ";cursor:" +
              (secundario.desabilitado ? "not-allowed" : "pointer"),
          )}
        >
          {secundario.rotulo}
        </button>
        <button
          type={primario.submit ? "submit" : "button"}
          onClick={primario.onClick}
          disabled={primario.desabilitado}
          className={primario.desabilitado ? undefined : "hv-bright"}
          style={css(
            "font-size:13px;font-weight:600;padding:10px 18px;border-radius:9px;" +
              (primario.desabilitado
                ? "border:1px solid var(--line);background:var(--neu);color:var(--tx3);cursor:not-allowed;"
                : "border:1px solid var(--acc);background:var(--acc);color:var(--accTx);cursor:pointer;"),
          )}
        >
          {primario.rotulo}
        </button>
      </div>
    </div>
  );
}
