import { css } from "@aguiar/ui";
import { COPY } from "@/lib/dictionary";
import { DISPLAY, grid } from "@/lib/styleKit";

const TILE =
  "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px;";
const TILE_LABEL = "font-size:11.5px;color:var(--muted);margin-bottom:6px;";
const tileValue = (color: string) =>
  `font-family:${DISPLAY};font-weight:800;font-size:21px;color:${color};`;
const CHIP =
  "background:var(--surface);border:1px solid var(--border);border-radius:999px;" +
  "padding:7px 12px;font-size:11.5px;color:var(--text3);font-weight:500;";

/**
 * As sete barras da semana, em porcentagem da altura da caixa.
 *
 * São números inventados, escolhidos para desenhar uma semana que sobe sem
 * subir em linha reta — uma sequência crescente perfeita não parece um negócio
 * de verdade. As duas últimas ganham cor porque são o "hoje" e a véspera: é o
 * que faz o "+18%" ao lado ter a que se referir.
 */
const WEEK = [44, 60, 38, 72, 56, 86, 100];

/**
 * O painel que acompanha a primeira dobra.
 *
 * É ILUSTRAÇÃO, não um preview ao vivo: os números vêm do dicionário e não de
 * lugar nenhum. Por isso a coisa inteira é `aria-hidden` e carrega um `alt`
 * escrito à mão logo ao lado — quem ouve a página recebe uma frase, e não
 * quatorze números soltos fora de contexto.
 */
export function DashboardPreview() {
  return (
    <div style={css("position:relative")}>
      {/* O texto que substitui a ilustração para quem não a vê. */}
      <span
        style={css(
          "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap",
        )}
      >
        {COPY.hero.panel.alt}
      </span>

      <div
        aria-hidden="true"
        style={css(
          "background:var(--surface3);border-radius:18px;padding:14px;" +
            "box-shadow:0 24px 60px rgba(0,0,0,.32)",
        )}
      >
        {/* A moldura de janela: dois pontos e a legenda. */}
        <div style={css("display:flex;align-items:center;gap:7px;padding:2px 4px 12px")}>
          <div style={css("width:9px;height:9px;border-radius:50%;background:var(--chrome)")} />
          <div style={css("width:9px;height:9px;border-radius:50%;background:var(--chrome)")} />
          <div
            style={css(
              `margin-left:auto;font-size:11px;color:var(--muted2);font-family:${DISPLAY};font-weight:600`,
            )}
          >
            {COPY.hero.panel.caption}
          </div>
        </div>

        {/* Vendas, custos e lucro. O lucro é o único em verde: é o número que a
            página inteira promete mostrar. */}
        <div style={css(grid(120, 10) + "margin-bottom:12px")}>
          <div style={css(TILE)}>
            <div style={css(TILE_LABEL)}>{COPY.hero.panel.sales}</div>
            <div style={css(tileValue("var(--ink)"))}>{COPY.hero.panel.salesValue}</div>
          </div>
          <div style={css(TILE)}>
            <div style={css(TILE_LABEL)}>{COPY.hero.panel.costs}</div>
            <div style={css(tileValue("var(--ink)"))}>{COPY.hero.panel.costsValue}</div>
          </div>
          <div style={css(TILE)}>
            <div style={css(TILE_LABEL)}>{COPY.hero.panel.profit}</div>
            <div style={css(tileValue("var(--pos)"))}>{COPY.hero.panel.profitValue}</div>
          </div>
        </div>

        <div
          style={css(
            "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px",
          )}
        >
          <div
            style={css(
              "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px",
            )}
          >
            <div
              style={css(
                `font-family:${DISPLAY};font-weight:700;font-size:13.5px;color:var(--ink)`,
              )}
            >
              {COPY.hero.panel.chartTitle}
            </div>
            <div style={css("font-size:11.5px;color:var(--pos);font-weight:600")}>
              {COPY.hero.panel.chartDelta}
            </div>
          </div>
          <div style={css("display:flex;align-items:flex-end;gap:8px;height:96px")}>
            {WEEK.map((height, i) => (
              <div
                key={i}
                style={css(
                  `flex:1;height:${height}%;border-radius:5px 5px 3px 3px;background:` +
                    (i === WEEK.length - 1
                      ? "var(--petrol)"
                      : i === WEEK.length - 2
                        ? "var(--accent)"
                        : "var(--bar)"),
                )}
              />
            ))}
          </div>
        </div>

        {/* As pílulas: dois módulos ligados e um por ligar. É a promessa de
            "monte do seu jeito" dita em miniatura, antes da dobra que explica. */}
        <div style={css("display:flex;gap:8px;flex-wrap:wrap;margin-top:12px")}>
          <div style={css(CHIP)}>{COPY.hero.panel.tagSales}</div>
          <div style={css(CHIP)}>{COPY.hero.panel.tagCosts}</div>
          <div
            style={css(
              "border:1px dashed var(--dashed);border-radius:999px;padding:7px 12px;" +
                "font-size:11.5px;color:var(--muted2)",
            )}
          >
            {COPY.hero.panel.tagStock}
          </div>
        </div>
      </div>
    </div>
  );
}
