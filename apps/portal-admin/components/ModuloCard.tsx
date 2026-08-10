"use client";

import { css } from "@aguiar/ui";
import { useAdmin } from "@/components/AdminProvider";
import { moduleIcon } from "@/lib/styleKit";
import { AccessTag } from "@/components/shared";

/** Grade de módulos — mesma medida usada na ficha do cliente. */
export function ModuleGrid({
  columns = 3,
  children,
}: {
  columns?: number;
  children: React.ReactNode;
}) {
  const { isMobile } = useAdmin();

  return (
    <div
      // No celular é uma coluna só, e a margem do cartão encolhe: dois módulos
      // lado a lado numa tela estreita deixariam a descrição em fiapos.
      style={css(
        "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(232px,100%),1fr));gap:14px;" +
          (isMobile
            ? "padding:14px"
            : "padding:20px 24px;max-width:" + Math.min(4, Math.max(2, columns)) * 400 + "px"),
      )}
    >
      {children}
    </div>
  );
}

interface ModuleCardProps {
  initials: string;
  name: string;
  description: string;
  on: boolean;
  /** Texto do estado, ex.: "Ativo para este cliente" / "Incluído". */
  estado: string;
  /** Módulo de acesso (app mobile): ganha a etiqueta ao lado do nome. */
  acesso?: boolean;
  tagAcesso?: string;
  ajudaAcesso?: string;
  /** Sem `alternar`, o card fica somente leitura (plano de pacote fechado). */
  toggle?: () => void;
  blocked?: boolean;
}

/**
 * Card de módulo com toggle. É o mesmo componente da ficha do cliente e da tela
 * de cadastro — manter os dois com a mesma aparência é justamente o motivo de
 * ele existir separado.
 */
export function ModuleCard({
  initials,
  name,
  description,
  on,
  estado,
  acesso,
  tagAcesso,
  ajudaAcesso,
  toggle,
  blocked,
}: ModuleCardProps) {
  const readOnly = blocked || !toggle;

  return (
    <div
      onClick={readOnly ? undefined : toggle}
      role={readOnly ? undefined : "switch"}
      aria-checked={readOnly ? undefined : on}
      aria-disabled={readOnly || undefined}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={
        readOnly
          ? undefined
          : (e) => {
              // Um card clicável precisa responder ao teclado como um controle.
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle?.();
              }
            }
      }
      style={css(
        "display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:11px;" +
          "transition:border-color .12s,background .12s;" +
          (on
            ? "border:1px solid var(--accent-line);background:var(--accent-soft);"
            : "border:1px solid var(--border-soft);background:var(--surface);") +
          (readOnly ? "cursor:default;" : "cursor:pointer;"),
      )}
    >
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px")}>
        <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
          <div style={css(moduleIcon(on))}>{initials}</div>
          <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
            <span style={css("display:flex;align-items:center;gap:7px;min-width:0")}>
              <span style={css("font-size:14px;font-weight:600;color:var(--text)")}>{name}</span>
              {acesso && tagAcesso && (
                <AccessTag label={tagAcesso} ajuda={ajudaAcesso ?? tagAcesso} />
              )}
            </span>
            <span
              style={css(
                "font-size:11px;font-weight:500;white-space:nowrap;color:" +
                  (on ? "var(--pos)" : "var(--muted)"),
              )}
            >
              {estado}
            </span>
          </div>
        </div>

        <div
          style={css(
            "width:44px;height:24px;flex:none;border-radius:99px;padding:3px;display:flex;" +
              "transition:background .15s;background:" +
              (on ? "var(--accent)" : "var(--border)") +
              (readOnly ? ";opacity:.65" : ""),
          )}
        >
          <div
            style={css(
              "width:18px;height:18px;border-radius:99px;background:#fff;" +
                "box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .15s;" +
                "transform:translateX(" +
                (on ? "20px" : "0") +
                ")",
            )}
          />
        </div>
      </div>
      <p style={css("margin:0;font-size:12px;color:var(--text2);line-height:1.5")}>{description}</p>
    </div>
  );
}
