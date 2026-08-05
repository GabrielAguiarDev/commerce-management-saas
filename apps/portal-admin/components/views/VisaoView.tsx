"use client";

import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { isCurrentMonth } from "@/lib/datas";
import { planByKey } from "@/lib/planos";
import { computeMrr, billable, formatMrr } from "@/lib/money";
import { ROUTES } from "@/lib/rotas";
import { BusinessCell, MetricsGrid, type Metric } from "@/components/shared";
import { planName, planBadge, panelBadge, ts } from "@/lib/styleKit";
import { dot } from "@aguiar/ui";

export function VisaoView() {
  const { s, a, cs, empty, options } = useAdmin();
  const { L } = a;
  const id = s.language;

  const active = cs.filter((x) => x.status === "active");
  const paid = billable(cs);
  const mrr = formatMrr(computeMrr(cs));
  const open = (empty ? [] : s.tickets).filter((t) => t.status === "open").length;
  const inProgress = (empty ? [] : s.tickets).filter((t) => t.status === "inProgress").length;
  const highPriority = (empty ? [] : s.tickets).filter(
    (t) => t.prioridade === "alta" && t.status !== "resolved",
  ).length;
  // Cadastrados neste mês, contados a partir de `tenants.created_at` — antes
  // era o número 2 escrito na mão.
  const createdThisMonth = empty ? [] : cs.filter((x) => isCurrentMonth(x.data));
  const neutro = panelBadge("neutral");

  const metrics: Metric[] = [
    {
      label: L.mrrLabel,
      value: mrr,
      // Sem histórico de MRR no banco não há com o que comparar, então o
      // "delta" mostra a composição do valor em vez de um percentual fictício.
      delta: empty ? "—" : `${paid.length}/${cs.length}`,
      note: empty
        ? id === "pt"
          ? "nenhum cliente cobrável ainda"
          : "no billable customer yet"
        : paid.length + " " + L.mrrNota,
      dot: dot(empty ? "var(--border)" : "var(--pos)"),
      deltaStyle: empty ? neutro : panelBadge("pos"),
      action: () => a.goTo(ROUTES.plans),
    },
    {
      label: L.clientesAtivosLabel,
      value: active.length,
      delta: (empty ? 0 : Math.round((active.length / Math.max(1, cs.length)) * 100)) + "%",
      note: empty
        ? id === "pt"
          ? "nenhum cliente cadastrado"
          : "no customer registered"
        : cs.length - active.length + " " + L.ativosNota,
      dot: dot(empty ? "var(--border)" : "var(--danger)"),
      deltaStyle: empty ? neutro : panelBadge("acc"),
      action: () => {
        a.set({ status: "inactive" });
        a.goTo(ROUTES.customers);
      },
    },
    {
      label: L.novosLabel,
      value: createdThisMonth.length,
      delta: createdThisMonth.length === 0 ? "—" : `+${createdThisMonth.length}`,
      note:
        createdThisMonth.length === 0
          ? id === "pt"
            ? "nada no período"
            : "nothing in the period"
          : createdThisMonth.length === 1
            ? id === "pt"
              ? "cadastro neste mês"
              : "signup this month"
            : id === "pt"
              ? "cadastros neste mês"
              : "signups this month",
      dot: dot(createdThisMonth.length === 0 ? "var(--border)" : "var(--warn)"),
      deltaStyle: createdThisMonth.length === 0 ? neutro : panelBadge("warn"),
      action: () => a.goTo(ROUTES.customers),
    },
    {
      label: L.chamadosLabel,
      value: open,
      // Era "SLA 4h" fixo — não existe SLA configurado em lugar nenhum. No
      // lugar vai um número que o banco sabe: os chamados de prioridade alta.
      delta: highPriority > 0 ? `${highPriority} ${L.altaCurto}` : "—",
      note: empty
        ? id === "pt"
          ? "nenhum chamado aberto"
          : "no open ticket"
        : inProgress + " " + L.chamadosNota,
      dot: dot(empty ? "var(--border)" : "var(--accent)"),
      deltaStyle: neutro,
      action: () => a.goTo(ROUTES.support),
    },
  ];

  const recent = cs
    .slice()
    .sort((x, y) => ts(y.data) - ts(x.data))
    .slice(0, 6);

  const grid =
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
  const activity = empty
    ? []
    : [
        ...recent.slice(0, 3).map((c) => ({
          key: "cliente:" + c.id,
          text:
            id === "pt"
              ? `${c.name} cadastrada no plano ${planName(s.plans, c.plan, id)}`
              : `${c.name} signed up on the ${planName(s.plans, c.plan, id)} plan`,
          at: c.data,
          color: "var(--pos)",
        })),
        ...s.tickets.slice(0, 2).map((t) => {
          const cl = cs.find((x) => x.id === t.customerId);
          return {
            key: "chamado:" + t.id,
            text:
              (id === "pt" ? "Chamado de " : "Ticket from ") +
              (cl ? cl.name : L.customer) +
              ": " +
              t.subject[id],
            at: t.data,
            color: t.status === "resolved" ? "var(--accent)" : "var(--warn)",
          };
        }),
      ]
        // Mais recente primeiro, misturando as duas origens.
        .sort((x, y) => ts(y.at) - ts(x.at))
        .slice(0, 4);

  return (
    <div style={css("display:flex;flex-direction:column;gap:20px")}>
      {empty && (
        <div
          style={css(
            "display:flex;align-items:center;gap:14px;padding:16px 20px;" +
              "border:1px solid var(--accent-line);background:var(--accent-soft);border-radius:12px",
          )}
        >
          <div
            style={css(
              "width:34px;height:34px;flex:none;border-radius:9px;background:var(--accent);" +
                "color:var(--accent-ink);display:flex;align-items:center;justify-content:center;" +
                "font-size:15px;font-weight:700",
            )}
          >
            +
          </div>
          <div style={css("display:flex;flex-direction:column;gap:2px")}>
            <span style={css("font-size:13.5px;font-weight:600;color:var(--text)")}>
              {L.vazioVisaoTitulo}
            </span>
            <span style={css("font-size:12.5px;color:var(--text2);line-height:1.5")}>
              {L.vazioVisaoTexto}
            </span>
          </div>
          <Button
            onClick={() => a.goTo(ROUTES.customers)}
            className="hv-brilho"
            style={css(
              "margin-left:auto;flex:none;background:var(--accent);border:1px solid var(--accent);" +
                "color:var(--accent-ink);font-size:12.5px;font-weight:500;padding:9px 14px;" +
                "border-radius:9px;cursor:pointer",
            )}
          >
            {L.vazioClientesBotao}
          </Button>
        </div>
      )}

      <MetricsGrid metrics={metrics} />

      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;align-items:stretch",
        )}
      >
        <section
          style={css(
            "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
              "overflow-x:auto;min-width:0;display:flex;flex-direction:column",
          )}
        >
          <div
            style={css(
              "display:flex;align-items:center;justify-content:space-between;padding:15px 20px;" +
                "border-bottom:1px solid var(--border-soft);min-width:560px",
            )}
          >
            <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--text)")}>
              {L.clientesRecentes}
            </h2>
            <Button
              onClick={() => a.goTo(ROUTES.customers)}
              style={css(
                "background:none;border:none;color:var(--accent);font-size:12.5px;font-weight:500;" +
                  "cursor:pointer;padding:0",
              )}
            >
              {L.verTodos}
            </Button>
          </div>

          <div
            style={css(
              grid +
                "padding:9px 20px;background:var(--surface2);border-bottom:1px solid var(--border-soft);" +
                "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600",
            )}
          >
            <span>{L.business}</span>
            <span>{L.segment}</span>
            <span>{L.plan}</span>
            <span>{L.cadastro}</span>
          </div>

          {recent.map((c) => (
            <div
              key={c.id}
              onClick={() => a.openCustomer(c.id)}
              className="hv-linha"
              style={css(
                grid +
                  "align-items:center;padding:12px 20px;border-bottom:1px solid var(--border-soft);cursor:pointer",
              )}
            >
              <BusinessCell
                customer={c}
                plan={planByKey(s.plans, c.plan)}
                totalMods={s.modules.length}
                id={id}
              />
              <span style={css("font-size:12.5px;color:var(--text2)")}>{c.segment[id]}</span>
              <span style={css(planBadge(planByKey(s.plans, c.plan)))}>{planName(s.plans, c.plan, id)}</span>
              <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
                {c.data}
              </span>
            </div>
          ))}
        </section>

        <section
          style={css(
            "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
              "padding:18px 20px 20px;display:flex;flex-direction:column;min-width:0",
          )}
        >
          <h2 style={css("margin:0 0 3px;font-size:14px;font-weight:600;color:var(--text)")}>
            {L.adocao}
          </h2>
          <p style={css("margin:0 0 16px;font-size:11.5px;color:var(--muted)")}>{L.adocaoSub}</p>

          <div style={css("display:flex;flex-direction:column;gap:13px")}>
            {s.modules.map((m) => {
              const n = cs.filter((x) => x.mods.includes(m.k)).length;
              return (
                <div key={m.k} style={css("display:flex;flex-direction:column;gap:6px")}>
                  <div style={css("display:flex;justify-content:space-between;align-items:baseline")}>
                    <span style={css("font-size:12.5px;color:var(--text2);font-weight:500")}>
                      {m.name[id]}
                    </span>
                    <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
                      {n}/{cs.length}
                    </span>
                  </div>
                  <div
                    style={css(
                      "height:6px;border-radius:99px;background:var(--surface3);overflow:hidden",
                    )}
                  >
                    <div
                      style={css(
                        "height:100%;border-radius:99px;background:var(--accent);width:" +
                          Math.round((n / Math.max(1, cs.length)) * 100) +
                          "%",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!empty && options.mostrarPainelAtividade && activity.length > 0 && (
            <div
              style={css(
                "margin-top:20px;padding-top:16px;border-top:1px solid var(--border-soft);" +
                  "display:flex;flex-direction:column;gap:13px",
              )}
            >
              <h2 style={css("margin:0;font-size:14px;font-weight:600;color:var(--text)")}>
                {L.activity}
              </h2>
              {activity.map((e) => (
                <div key={e.key} style={css("display:flex;gap:11px;align-items:flex-start")}>
                  <div style={css(dot(e.color) + ";margin-top:5px")} />
                  <div style={css("display:flex;flex-direction:column;gap:2px")}>
                    <span style={css("font-size:12.5px;color:var(--text2);line-height:1.4")}>
                      {e.text}
                    </span>
                    <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--muted)`)}>
                      {e.at}
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
