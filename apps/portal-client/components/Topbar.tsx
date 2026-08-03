"use client";

import { usePathname } from "next/navigation";
import { usePortal } from "@/components/PortalProvider";
import { css, MONO, SANS } from "@/lib/css";
import { brl, dataPorExtenso } from "@/lib/formato";
import { faturamento, produtosEmFalta } from "@/lib/selectors";
import { ROTA_PDV, ROTAS } from "@/lib/rotas";
import { botaoPrimario, NUM } from "@/lib/styleKit";

/**
 * A barra de topo carrega o número que a pessoa mais quer ver — quanto vendeu
 * hoje — e os avisos que não podem esperar ela abrir uma tela.
 */
export function Topbar() {
  const { s, a, tem, isMobile, isDesktop } = usePortal();
  const pathname = usePathname();

  const vendasHoje = brl(faturamento(s.vendas.filter((v) => v.d === 0)));
  const alertas = produtosEmFalta(s.produtos);
  const caixaAberto = !!s.caixaAberto;

  // O PDV já é a tela de vender; oferecer "Nova venda" ali seria redundante.
  const noPdv = pathname === ROTA_PDV;

  return (
    <header
      style={css(
        "position:sticky;top:0;z-index:40;background:var(--surface);border-bottom:1px solid var(--border)",
      )}
    >
      <div
        style={css(
          `display:flex;align-items:center;gap:12px;padding:${isMobile ? "10px 14px" : "12px 22px"};min-height:64px`,
        )}
      >
        {isMobile && (
          <button
            onClick={() => a.set({ navAberto: true })}
            title="Menu"
            style={css(
              "flex:none;width:36px;height:36px;border-radius:9px;border:1px solid var(--border);" +
                `background:var(--surface2);color:var(--text2);font:600 14px ${MONO}`,
            )}
          >
            ≡
          </button>
        )}

        <div style={css("min-width:0;flex:1;display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
          {isDesktop ? (
            <div
              style={css(
                "display:flex;align-items:baseline;gap:8px;padding-right:14px;margin-right:2px;border-right:1px solid var(--border)",
              )}
            >
              <span style={css(`font:400 12px ${SANS};color:var(--muted)`)}>Vendas de hoje</span>
              <span style={css(`font:700 19px/1 ${SANS};color:var(--text);${NUM}`)}>{vendasHoje}</span>
            </div>
          ) : (
            <div style={css("min-width:0")}>
              <div style={css(`font:400 10.5px/1.2 ${SANS};color:var(--muted)`)}>Vendas de hoje</div>
              <div style={css(`font:700 17px/1.15 ${SANS};${NUM}`)}>{vendasHoje}</div>
            </div>
          )}

          {tem("caixa") && (
            <button
              onClick={() => a.irPara(ROTAS.caixa)}
              title="Ver o caixa"
              style={css(
                "display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border-radius:999px;" +
                  `background:${caixaAberto ? "var(--pos-soft)" : "var(--surface3)"};` +
                  `color:${caixaAberto ? "var(--pos)" : "var(--muted)"};font:600 11.5px ${SANS}`,
              )}
            >
              <span
                style={css(
                  `width:7px;height:7px;border-radius:50%;background:${caixaAberto ? "var(--pos)" : "var(--muted)"}`,
                )}
              />
              {caixaAberto ? `Caixa aberto desde ${s.caixaAberto?.abertura}` : "Caixa fechado"}
            </button>
          )}

          {isDesktop && (
            <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>{dataPorExtenso()}</span>
          )}
        </div>

        <div style={css("flex:none;display:flex;align-items:center;gap:8px")}>
          {tem("estoque") && alertas.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                a.set({ notifAberto: !s.notifAberto });
              }}
              title="Alertas do negócio"
              className="hv-borda"
              style={css(
                "position:relative;width:36px;height:36px;border-radius:9px;border:1px solid var(--border);" +
                  `background:var(--surface2);color:var(--text2);font:600 13px ${MONO}`,
              )}
            >
              !
              <span
                style={css(
                  "position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;" +
                    `border-radius:999px;background:var(--danger);color:#fff;font:700 10px/17px ${MONO}`,
                )}
              >
                {alertas.length}
              </span>
            </button>
          )}

          <button
            onClick={a.toggleTema}
            title={s.tema === "claro" ? "Usar tema escuro" : "Usar tema claro"}
            className="hv-borda"
            style={css(
              "width:36px;height:36px;border-radius:9px;border:1px solid var(--border);" +
                `background:var(--surface2);color:var(--text2);font:600 13px ${MONO}`,
            )}
          >
            {s.tema === "claro" ? "☾" : "☀"}
          </button>

          {isDesktop && tem("vendas") && !noPdv && (
            <button
              onClick={() => a.irPara(ROTA_PDV)}
              className="hv-brilho"
              style={css(`display:flex;align-items:center;gap:9px;${botaoPrimario("sm")}`)}
            >
              <span style={css(`font:600 15px/1 ${MONO}`)}>+</span>Nova venda
            </button>
          )}
        </div>
      </div>

      {s.notifAberto && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={css(
            "position:absolute;right:14px;top:60px;width:290px;max-width:calc(100vw - 28px);z-index:50;" +
              "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
              "box-shadow:var(--shadow-lg);overflow:hidden;animation:pop .16s ease",
          )}
        >
          <div style={css(`padding:11px 13px;border-bottom:1px solid var(--border);font:600 12.5px ${SANS}`)}>
            Alertas do negócio
          </div>
          {alertas.map((p) => (
            <div
              key={p.id}
              style={css("display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid var(--border)")}
            >
              <span
                style={css("flex:none;width:6px;height:6px;margin-top:6px;border-radius:50%;background:var(--warn)")}
              />
              <span>
                <span style={css(`display:block;font:600 12.5px/1.35 ${SANS}`)}>{p.nome}</span>
                <span style={css(`display:block;font:400 11.5px/1.4 ${SANS};color:var(--muted)`)}>
                  {p.estoque === 0
                    ? "Acabou"
                    : `Restam ${p.estoque} ${p.estoque === 1 ? "unidade" : "unidades"}`}
                </span>
              </span>
            </div>
          ))}
          <button
            onClick={() => a.set({ notifAberto: false })}
            style={css(`width:100%;padding:10px;font:600 12px ${SANS};color:var(--accent)`)}
          >
            Fechar
          </button>
        </div>
      )}
    </header>
  );
}
