"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { ehDoMesCorrente } from "@/lib/datas";
import { planoPorChave } from "@/lib/planos";
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
  const altaPrioridade = (vazio ? [] : s.chamados).filter(
    (t) => t.prioridade === "alta" && t.status !== "resolvido",
  ).length;
  // Cadastrados neste mês, contados a partir de `tenants.created_at` — antes
  // era o número 2 escrito na mão.
  const novos = vazio ? [] : cs.filter((x) => ehDoMesCorrente(x.data));
  const neutro = badgeNeutro();

  const metricas: Metrica[] = [
    {
      rotulo: L.mrrLabel,
      valor: mrr,
      // Sem histórico de MRR no banco não há com o que comparar, então o
      // "delta" mostra a composição do valor em vez de um percentual fictício.
      delta: vazio ? "—" : `${pagos.length}/${cs.length}`,
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
      valor: novos.length,
      delta: novos.length === 0 ? "—" : `+${novos.length}`,
      nota:
        novos.length === 0
          ? id === "pt"
            ? "nada no período"
            : "nothing in the period"
          : novos.length === 1
            ? id === "pt"
              ? "cadastro neste mês"
              : "signup this month"
            : id === "pt"
              ? "cadastros neste mês"
              : "signups this month",
      ponto: ponto(novos.length === 0 ? "var(--neuLine)" : "var(--warn)"),
      deltaStyle: novos.length === 0 ? neutro : badgeWarn(),
      acao: () => a.ir(ROTAS.clientes),
    },
    {
      rotulo: L.chamadosLabel,
      valor: abertos,
      // Era "SLA 4h" fixo — não existe SLA configurado em lugar nenhum. No
      // lugar vai um número que o banco sabe: os chamados de prioridade alta.
      delta: altaPrioridade > 0 ? `${altaPrioridade} ${L.altaCurto}` : "—",
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

  /**
   * Atividade recente, montada a partir do que o banco realmente sabe.
   *
   * O protótipo trazia três eventos escritos na mão, com nomes de negócios que
   * nunca existiram. Não há tabela de auditoria/eventos, então o que dá para
   * mostrar honestamente são dois fatos datados: cadastros (`tenants.created_at`)
   * e chamados abertos (`support_tickets.created_at`). Se um dia existir uma
   * tabela de eventos, é aqui que ela entra.
   */
  const atividade = vazio
    ? []
    : [
        ...recentes.slice(0, 3).map((c) => ({
          chave: "cliente:" + c.id,
          texto:
            id === "pt"
              ? `${c.nome} cadastrada no plano ${nomePlano(s.planos, c.plano, id)}`
              : `${c.nome} signed up on the ${nomePlano(s.planos, c.plano, id)} plan`,
          quando: c.data,
          cor: "var(--ok)",
        })),
        ...s.chamados.slice(0, 2).map((t) => {
          const cl = cs.find((x) => x.id === t.clienteId);
          return {
            chave: "chamado:" + t.id,
            texto:
              (id === "pt" ? "Chamado de " : "Ticket from ") +
              (cl ? cl.nome : L.cliente) +
              ": " +
              t.assunto[id],
            quando: t.data,
            cor: t.status === "resolvido" ? "var(--acc)" : "var(--warn)",
          };
        }),
      ]
        // Mais recente primeiro, misturando as duas origens.
        .sort((x, y) => ts(y.quando) - ts(x.quando))
        .slice(0, 4);

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
              <CelulaNegocio
                cliente={c}
                plano={planoPorChave(s.planos, c.plano)}
                totalMods={s.modulos.length}
                id={id}
              />
              <span style={css("font-size:12.5px;color:var(--tx2)")}>{c.segmento[id]}</span>
              <span style={css(planoBadge(planoPorChave(s.planos, c.plano)))}>{nomePlano(s.planos, c.plano, id)}</span>
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

          {!vazio && opts.mostrarPainelAtividade && atividade.length > 0 && (
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
                <div key={e.chave} style={css("display:flex;gap:11px;align-items:flex-start")}>
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
