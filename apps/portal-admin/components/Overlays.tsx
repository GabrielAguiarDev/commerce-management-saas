"use client";

import { css } from "@/lib/css";
import type { DicaEstado, ToastEstado } from "@/types/types";

/** Transient confirmations, stacked bottom-right. */
export function Toasts({ toasts }: { toasts: ToastEstado[] }) {
  return (
    <div
      style={css(
        "position:fixed;bottom:22px;right:22px;z-index:120;display:flex;flex-direction:column;" +
          "gap:9px;pointer-events:none;align-items:flex-end",
      )}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={css(
            "display:flex;align-items:center;gap:10px;padding:12px 15px;border-radius:10px;" +
              "box-shadow:0 10px 26px rgba(6,20,26,.22);font-size:13px;font-weight:500;" +
              (t.tipo === "erro"
                ? "border:1px solid var(--badLine);background:var(--badBg);color:var(--bad);"
                : t.tipo === "alerta"
                  ? "border:1px solid var(--warnLine);background:var(--warnBg);color:var(--warn);"
                  : "border:1px solid var(--okLine);background:var(--okBg);color:var(--ok);"),
          )}
        >
          <span
            style={css(
              "width:18px;height:18px;flex:none;border-radius:99px;display:flex;align-items:center;" +
                "justify-content:center;font-size:11px;font-weight:700;" +
                (t.tipo === "erro"
                  ? "background:var(--bad);color:#fff;"
                  : t.tipo === "alerta"
                    ? "background:var(--warn);color:#fff;"
                    : "background:var(--ok);color:#fff;"),
            )}
          >
            {t.tipo === "ok" ? "✓" : "!"}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/** Names a sidebar icon once the rail is collapsed. */
export function Dica({ dica }: { dica: DicaEstado }) {
  return (
    <div
      role="tooltip"
      style={css(
        "position:fixed;z-index:95;pointer-events:none;white-space:nowrap;padding:6px 11px;" +
          "border-radius:8px;background:var(--sideCard);color:#fff;font-size:12px;font-weight:500;" +
          "box-shadow:0 6px 18px rgba(4,15,20,.35);transform:translateY(-50%);top:" +
          dica.top +
          "px;left:" +
          dica.left +
          "px",
      )}
    >
      {dica.texto}
    </div>
  );
}
