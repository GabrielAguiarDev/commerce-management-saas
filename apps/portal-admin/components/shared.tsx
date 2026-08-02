"use client";

import { css, MONO } from "@/lib/css";
import { AcessoIcone } from "@/lib/icons";
import { avatar, CARD_METRICA, iniciais } from "@/lib/styleKit";
import type { Cliente, Idioma, Plano } from "@/types/types";

export interface Metrica {
  rotulo: string;
  valor: string | number;
  delta: string;
  /** Declaration string from one of the `badge*` helpers. */
  deltaStyle: string;
  ponto: string;
  nota: string;
  acao?: () => void;
}

/** The KPI row that opens both the overview and the finance view. */
export function MetricasGrid({ metricas }: { metricas: Metrica[] }) {
  return (
    <div
      style={css(
        "display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:16px;align-items:stretch",
      )}
    >
      {metricas.map((m) => (
        <div
          key={m.rotulo}
          onClick={m.acao}
          style={css(CARD_METRICA + (m.acao ? "cursor:pointer;" : ""))}
        >
          <div
            style={css(
              "display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:20px",
            )}
          >
            <span
              style={css(
                "font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--tx3);font-weight:600",
              )}
            >
              {m.rotulo}
            </span>
            <span style={css(m.deltaStyle)}>{m.delta}</span>
          </div>
          <span
            style={css(
              `font-family:${MONO};font-size:30px;font-weight:600;line-height:1;` +
                "letter-spacing:-.03em;color:var(--tx)",
            )}
          >
            {m.valor}
          </span>
          <div
            style={css("display:flex;align-items:center;gap:7px;margin-top:auto;min-height:18px")}
          >
            <div style={css(m.ponto)} />
            <span style={css("font-size:11.5px;color:var(--tx2);line-height:1.4")}>{m.nota}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Avatar + business name + module count, the leading cell of every list. */
export function CelulaNegocio({
  cliente,
  plano,
  totalMods,
  id,
}: {
  cliente: Cliente;
  /** O plano do cliente, para a cor do avatar. Vem de `plans`. */
  plano?: Plano;
  totalMods: number;
  id: Idioma;
}) {
  return (
    <div style={css("display:flex;align-items:center;gap:11px;min-width:0")}>
      <div style={css(avatar(plano))}>{iniciais(cliente.nome)}</div>
      <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
        <span
          style={css(
            "font-size:13.5px;font-weight:500;color:var(--tx);white-space:nowrap;" +
              "overflow:hidden;text-overflow:ellipsis",
          )}
        >
          {cliente.nome}
        </span>
        <span style={css("font-size:11px;color:var(--tx3)")}>
          {cliente.mods.length +
            (id === "pt" ? ` de ${totalMods} módulos ativos` : ` of ${totalMods} modules on`)}
        </span>
      </div>
    </div>
  );
}

/** Pill marking a module that unlocks the mobile app rather than a section. */
export function TagAcesso({
  rotulo,
  ajuda,
  bloco,
}: {
  rotulo: string;
  ajuda: string;
  bloco?: boolean;
}) {
  return (
    <span
      title={ajuda}
      style={css(
        "display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:600;" +
          "letter-spacing:.05em;text-transform:uppercase;color:var(--tx3);" +
          "border:1px solid var(--lineSoft);border-radius:99px;padding:2px 7px 2px 5px;" +
          (bloco ? "width:fit-content;" : "flex:none;"),
      )}
    >
      <AcessoIcone />
      {rotulo}
    </span>
  );
}

/** Search field shared by the customers, support and payments toolbars. */
export function CampoBusca({
  valor,
  onChange,
  placeholder,
  estiloCaixa,
  compacto,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  estiloCaixa: string;
  compacto?: boolean;
}) {
  return (
    <div
      className="campo-caixa"
      style={css("display:flex;align-items:center;gap:8px;padding:0 11px;" + estiloCaixa)}
    >
      <span style={css("font-size:13px;color:var(--tx3)")}>⌕</span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={css(
          "flex:1;border:none;background:none;outline:none;color:var(--tx);" +
            (compacto ? "padding:9px 0;font-size:12.5px" : "padding:10px 0;font-size:13.5px"),
        )}
      />
    </div>
  );
}
