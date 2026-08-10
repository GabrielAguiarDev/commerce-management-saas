"use client";

import { Button, css } from "@aguiar/ui";
import { useAdmin } from "@/components/AdminProvider";

export type BarTone = "warning" | "neutral";

interface ActionBarProps {
  /** Texto de estado à esquerda. */
  estado: string;
  /** `alerta` pinta a barra de âmbar (há algo pendente). */
  tone: BarTone;
  secondary: { label: string; onClick: () => unknown; disabled?: boolean };
  primary: {
    label: string;
    /** Returning a promise makes the button wait for it, spinner and all. */
    onClick?: () => unknown;
    disabled?: boolean;
    submit?: boolean;
    /** For a submit button, whose wait belongs to the form, not to the click. */
    loading?: boolean;
  };
}

/**
 * Barra fixa no rodapé com o estado do formulário e as duas ações. Mesma barra
 * da ficha do cliente, para as duas telas terminarem igual.
 */
export function ActionBar({ estado, tone, secondary, primary }: ActionBarProps) {
  const { isMobile } = useAdmin();
  const alert = tone === "warning";

  return (
    <div
      // No celular a barra empilha: o texto de estado em cima, os dois botões
      // dividindo a linha de baixo. Lado a lado, "Descartar alterações" e
      // "Salvar" não cabem depois da frase de estado.
      style={css(
        "position:sticky;bottom:0;z-index:7;display:flex;" +
          (isMobile
            ? "gap:10px;flex-direction:column;align-items:stretch;padding:12px 14px;"
            : "gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 20px;") +
          "border-radius:12px;border:1px solid " +
          (alert ? "var(--warn-line)" : "var(--border)") +
          ";background:var(--surface);box-shadow:0 -2px 16px rgba(6,20,26,.1)",
      )}
    >
      <span
        style={css(
          "display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500;color:" +
            (alert ? "var(--warn)" : "var(--muted)"),
        )}
      >
        <span
          style={css(
            "width:7px;height:7px;flex:none;border-radius:99px;background:" +
              (alert ? "var(--warn)" : "var(--border)"),
          )}
        />
        {estado}
      </span>

      <div style={css("display:flex;align-items:center;gap:9px")}>
        <Button
          type="button"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          style={css(
            "font-size:13px;font-weight:500;padding:10px 16px;border-radius:9px;" +
              "display:flex;align-items:center;justify-content:center;" +
              (isMobile ? "flex:1;" : "") +
              "border:1px solid var(--border);background:var(--surface);color:" +
              (secondary.disabled ? "var(--muted)" : "var(--text2)") +
              ";cursor:" +
              (secondary.disabled ? "not-allowed" : "pointer"),
          )}
        >
          {secondary.label}
        </Button>
        <Button
          type={primary.submit ? "submit" : "button"}
          onClick={primary.onClick}
          disabled={primary.disabled}
          loading={primary.loading}
          className="hv-brilho"
          style={css(
            "font-size:13px;font-weight:600;padding:10px 18px;border-radius:9px;" +
              "display:flex;align-items:center;justify-content:center;" +
              (isMobile ? "flex:1;" : "") +
              (primary.disabled
                ? "border:1px solid var(--border);background:var(--surface3);color:var(--muted);cursor:not-allowed;"
                : "border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);cursor:pointer;"),
          )}
        >
          {primary.label}
        </Button>
      </div>
    </div>
  );
}
