"use client";

import { css } from "@/lib/css";
import { iconeMod } from "@/lib/styleKit";
import { TagAcesso } from "@/components/shared";

/** Grade de módulos — mesma medida usada na ficha do cliente. */
export function GradeModulos({
  colunas = 3,
  children,
}: {
  colunas?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={css(
        "display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:14px;" +
          "padding:20px 24px;max-width:" +
          Math.min(4, Math.max(2, colunas)) * 400 +
          "px",
      )}
    >
      {children}
    </div>
  );
}

interface ModuloCardProps {
  sigla: string;
  nome: string;
  descricao: string;
  ligado: boolean;
  /** Texto do estado, ex.: "Ativo para este cliente" / "Incluído". */
  estado: string;
  /** Módulo de acesso (app mobile): ganha a etiqueta ao lado do nome. */
  acesso?: boolean;
  tagAcesso?: string;
  ajudaAcesso?: string;
  /** Sem `alternar`, o card fica somente leitura (plano de pacote fechado). */
  alternar?: () => void;
  bloqueado?: boolean;
}

/**
 * Card de módulo com toggle. É o mesmo componente da ficha do cliente e da tela
 * de cadastro — manter os dois com a mesma aparência é justamente o motivo de
 * ele existir separado.
 */
export function ModuloCard({
  sigla,
  nome,
  descricao,
  ligado,
  estado,
  acesso,
  tagAcesso,
  ajudaAcesso,
  alternar,
  bloqueado,
}: ModuloCardProps) {
  const somenteLeitura = bloqueado || !alternar;

  return (
    <div
      onClick={somenteLeitura ? undefined : alternar}
      role={somenteLeitura ? undefined : "switch"}
      aria-checked={somenteLeitura ? undefined : ligado}
      aria-disabled={somenteLeitura || undefined}
      tabIndex={somenteLeitura ? undefined : 0}
      onKeyDown={
        somenteLeitura
          ? undefined
          : (e) => {
              // Um card clicável precisa responder ao teclado como um controle.
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                alternar?.();
              }
            }
      }
      style={css(
        "display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:11px;" +
          "transition:border-color .12s,background .12s;" +
          (ligado
            ? "border:1px solid var(--accLine);background:var(--accSoft);"
            : "border:1px solid var(--lineSoft);background:var(--panel);") +
          (somenteLeitura ? "cursor:default;" : "cursor:pointer;"),
      )}
    >
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px")}>
        <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
          <div style={css(iconeMod(ligado))}>{sigla}</div>
          <div style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
            <span style={css("display:flex;align-items:center;gap:7px;min-width:0")}>
              <span style={css("font-size:14px;font-weight:600;color:var(--tx)")}>{nome}</span>
              {acesso && tagAcesso && (
                <TagAcesso rotulo={tagAcesso} ajuda={ajudaAcesso ?? tagAcesso} />
              )}
            </span>
            <span
              style={css(
                "font-size:11px;font-weight:500;white-space:nowrap;color:" +
                  (ligado ? "var(--ok)" : "var(--tx3)"),
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
              (ligado ? "var(--acc)" : "var(--neuLine)") +
              (somenteLeitura ? ";opacity:.65" : ""),
          )}
        >
          <div
            style={css(
              "width:18px;height:18px;border-radius:99px;background:#fff;" +
                "box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .15s;" +
                "transform:translateX(" +
                (ligado ? "20px" : "0") +
                ")",
            )}
          />
        </div>
      </div>
      <p style={css("margin:0;font-size:12px;color:var(--tx2);line-height:1.5")}>{descricao}</p>
    </div>
  );
}
