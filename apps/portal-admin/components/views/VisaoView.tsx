"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { calcMrr, cobraveis, fmtMrr } from "@/lib/money";
import { ROTAS } from "@/lib/rotas";
import { CelulaNegocio, MetricasGrid, type Metrica } from "@/components/shared";
import {
  badgeAcc,
  badgeNeutro,
  badgeOk,
  badgeWarn,
  nomePlano,
  planoBadge,
  ponto,
  ts,
} from "@/lib/styleKit";

export function VisaoView() {
  const { s, a, cs, vazio, opts } = useAdmin();
  const { L } = a;
  const id = s.idioma;

  const ativos = cs.filter((x) => x.status === "ativo");
  const pagos = cobraveis(cs);
  const mrr = fmtMrr(calcMrr(cs));
  const abertos = (vazio ? [] : s.chamados).filter((t) => t.status === "aberto").length;
  const andamento = (vazio ? [] : s.chamados).filter((t) => t.status === "andamento").length;
  const neutro = badgeNeutro();

  const metricas: Metrica[] = [
    {
      rotulo: L.mrrLabel,
      valor: mrr,
      delta: vazio ? "—" : "+18,7% " + L.vsMes,
      nota: vazio
        ? id === "pt"
          ? "nenhum cliente cobrável ainda"
          : "no billable customer yet"
        : pagos.length + " " + L.mrrNota,
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--ok)"),
      deltaStyle: vazio ? neutro : badgeOk(),
      acao: () => a.ir(ROTAS.planos),
    },
    {
      rotulo: L.clientesAtivosLabel,
      valor: ativos.length,
      delta: (vazio ? 0 : Math.round((ativos.length / Math.max(1, cs.length)) * 100)) + "%",
      nota: vazio
        ? id === "pt"
          ? "nenhum cliente cadastrado"
          : "no customer registered"
        : cs.length - ativos.length + " " + L.ativosNota,
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--bad)"),
      deltaStyle: vazio ? neutro : badgeAcc(),
      acao: () => {
        a.set({ status: "inativo" });
        a.ir(ROTAS.clientes);
      },
    },
    {
      rotulo: L.novosLabel,
      valor: vazio ? 0 : 2,
      delta: vazio ? "—" : "−1",
      nota: vazio
        ? id === "pt"
          ? "nada no período"
          : "nothing in the period"
        : "1 " + L.novosNota,
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--warn)"),
      deltaStyle: vazio ? neutro : badgeWarn(),
      acao: () => a.ir(ROTAS.clientes),
    },
    {
      rotulo: L.chamadosLabel,
      valor: abertos,
      delta: vazio ? "—" : "SLA 4h",
      nota: vazio
        ? id === "pt"
          ? "nenhum chamado aberto"
          : "no open ticket"
        : andamento + " " + L.chamadosNota,
      ponto: ponto(vazio ? "var(--neuLine)" : "var(--acc)"),
      deltaStyle: neutro,
      acao: () => a.ir(ROTAS.suporte),
    },
  ];

  const recentes = cs
    .slice()
    .sort((x, y) => ts(y.data) - ts(x.data))
    .slice(0, 6);

  const grade =
    "display:grid;grid-template-columns:minmax(180px,1.9fr) minmax(110px,1fr) 92px 100px;" +
    "gap:12px;min-width:560px;";

  const atividade = vazio
    ? []
    : [
        {
          texto:
            id === "pt"
              ? "Módulo Relatórios ativado para Lava-Jato Cristal"
              : "Reports module enabled for Lava-Jato Cristal",
          quando: id === "pt" ? "hoje, 09:12" : "today, 09:12",
          cor: "var(--acc)",
        },
        {
          texto:
            id === "pt"
              ? "Costura & Cia cadastrada no plano Gratuito"
              : "Costura & Cia signed up on the Free plan",
          quando: id === "pt" ? "ontem, 17:40" : "yesterday, 17:40",
          cor: "var(--ok)",
        },
        {
          texto:
            id === "pt"
              ? "Hortifruti Vale Verde marcada como inativa"
              : "Hortifruti Vale Verde marked inactive",
          quando: "22 jul, 11:05",
          cor: "var(--bad)",
        },
      ];

  return (
    <div style={css("display:flex;flex-direction:column;gap:20px")}>
      {vazio && (
        <div
          style={css(
            "display:flex;align-items:center;gap:14px;padding:16px 20px;" +
              "border:1px solid var(--accLine);background:var(--accSoft);border-radius:12px",
          )}
        >
          <div
            style={css(
              "width:34px;height:34px;flex:none;border-radius:9px;background:var(--acc);" +
                "color:var(--accTx);display:flex;align-items:center;justify-content:center;" +
                "font-size:15px;font-weight:700",
            )}
          >
            +
          </div>
          <div style={css("display:flex;flex-direction:column;gap:2px")}>
            <span style={css("font-size:13.5px;font-weight:600;color:var(--tx)")}>
              {L.vazioVisaoTitulo}
            </span>
            <span style={css("font-size:12.5px;color:var(--tx2);line-height:1.5")}>
              {L.vazioVisaoTexto}
            </span>
          </div>
          <button
            onClick={() => a.ir(ROTAS.clientes)}
            className="hv-bright"
            style={css(
              "margin-left:auto;flex:none;background:var(--acc);border:1px solid var(--acc);" +
                "color:var(--accTx);font-size:12.5px;font-weight:500;padding:9px 14px;" +
                "border-radius:9px;cursor:pointer",
            )}
          >
            {L.vazioClientesBotao}
          </button>
        </div>
      )}

      <MetricasGrid metricas={metricas} />

      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;align-items:stretch",
        )}
      >
        <section
          style={css(
            "background:var(--panel);border:1px solid var(--line);border-radius:12px;" +
              "overflow-x:auto;min-width:0;display:flex;flex-direction:column",
          )}
        >
          <div
            style={css(
              "display:flex;align-items:center;justify-content:space-between;padding:15px 20px;" +
                "border-bottom:1px solid var(--lineSoft);min-width:560px",
            )}
          >
            <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--tx)")}>
              {L.clientesRecentes}
            </h2>
            <button
              onClick={() => a.ir(ROTAS.clientes)}
              style={css(
                "background:none;border:none;color:var(--acc);font-size:12.5px;font-weight:500;" +
                  "cursor:pointer;padding:0",
              )}
            >
              {L.verTodos}
            </button>
          </div>

          <div
            style={css(
              grade +
                "padding:9px 20px;background:var(--head);border-bottom:1px solid var(--lineSoft);" +
                "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:600",
            )}
          >
            <span>{L.negocio}</span>
            <span>{L.segmento}</span>
            <span>{L.plano}</span>
            <span>{L.cadastro}</span>
          </div>

          {recentes.map((c) => (
            <div
              key={c.id}
              onClick={() => a.abrirCliente(c.id)}
              className="hv-row"
              style={css(
                grade +
                  "align-items:center;padding:12px 20px;border-bottom:1px solid var(--lineSoft);cursor:pointer",
              )}
            >
              <CelulaNegocio cliente={c} totalMods={s.modulos.length} id={id} />
              <span style={css("font-size:12.5px;color:var(--tx2)")}>{c.segmento[id]}</span>
              <span style={css(planoBadge(c.plano))}>{nomePlano(s.planos, c.plano, id)}</span>
              <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--tx3)`)}>
                {c.data}
              </span>
            </div>
          ))}
        </section>

        <section
          style={css(
            "background:var(--panel);border:1px solid var(--line);border-radius:12px;" +
              "padding:18px 20px 20px;display:flex;flex-direction:column;min-width:0",
          )}
        >
          <h2 style={css("margin:0 0 3px;font-size:14px;font-weight:600;color:var(--tx)")}>
            {L.adocao}
          </h2>
          <p style={css("margin:0 0 16px;font-size:11.5px;color:var(--tx3)")}>{L.adocaoSub}</p>

          <div style={css("display:flex;flex-direction:column;gap:13px")}>
            {s.modulos.map((m) => {
              const n = cs.filter((x) => x.mods.includes(m.k)).length;
              return (
                <div key={m.k} style={css("display:flex;flex-direction:column;gap:6px")}>
                  <div style={css("display:flex;justify-content:space-between;align-items:baseline")}>
                    <span style={css("font-size:12.5px;color:var(--tx2);font-weight:500")}>
                      {m.nome[id]}
                    </span>
                    <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--tx3)`)}>
                      {n}/{cs.length}
                    </span>
                  </div>
                  <div
                    style={css(
                      "height:6px;border-radius:99px;background:var(--neu);overflow:hidden",
                    )}
                  >
                    <div
                      style={css(
                        "height:100%;border-radius:99px;background:var(--acc);width:" +
                          Math.round((n / Math.max(1, cs.length)) * 100) +
                          "%",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!vazio && opts.mostrarPainelAtividade && (
            <div
              style={css(
                "margin-top:20px;padding-top:16px;border-top:1px solid var(--lineSoft);" +
                  "display:flex;flex-direction:column;gap:13px",
              )}
            >
              <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--tx)")}>
                {L.atividade}
              </h2>
              {atividade.map((e) => (
                <div key={e.texto} style={css("display:flex;gap:11px;align-items:flex-start")}>
                  <div style={css(ponto(e.cor) + ";margin-top:5px")} />
                  <div style={css("display:flex;flex-direction:column;gap:2px")}>
                    <span style={css("font-size:12.5px;color:var(--tx2);line-height:1.4")}>
                      {e.texto}
                    </span>
                    <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--tx3)`)}>
                      {e.quando}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
