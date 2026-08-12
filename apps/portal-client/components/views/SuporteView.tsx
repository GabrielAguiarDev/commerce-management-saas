"use client";

import { usePortal } from "@/components/PortalProvider";
import { NewButton, Button, ScreenHeader, css, KpiStrip, PillGroup, MONO, SANS, Empty } from "@aguiar/ui";
import { SP_STATUS } from "@/lib/dados/chamados";
import { dateLabel } from "@/lib/formato";
import { ticketRoute } from "@/lib/rotas";
import { filterField } from "@/lib/styleKit";
import type { TicketStatus } from "@/types/types";

const FILTERS: { key: string; name: string }[] = [
  { key: "all", name: "Todos" },
  { key: "abertos", name: "Em aberto" },
  { key: "waiting", name: "Aguardando você" },
  { key: "resolved", name: "Resolvidos" },
];

/**
 * Suporte.
 *
 * O atendimento é por chamado, não por chat: a pessoa escreve, fecha o portal e
 * volta quando quiser. Por isso o selo "aguardando você" é o mais destacado da
 * lista — é o único que pede uma ação de quem está olhando.
 */
export function SuporteView() {
  const { s, a, isMobile, d } = usePortal();
  const f = s.fSuporte;
  const set = (p: Partial<typeof f>) => a.set({ fSuporte: { ...f, ...p } });

  const search = f.search.trim().toLowerCase();
  const filtered = d.tickets.filter((c) => {
    if (search && !c.subject.toLowerCase().includes(search) && !c.id.includes(search)) return false;
    if (f.status === "abertos" && c.status === "resolved") return false;
    if (f.status === "waiting" && c.status !== "waiting") return false;
    if (f.status === "resolved" && c.status !== "resolved") return false;
    return true;
  });

  const count = (st: TicketStatus) => d.tickets.filter((c) => c.status === st).length;
  const open = d.tickets.filter((c) => c.status !== "resolved").length;

  const kpis = [
    { label: "Em aberto", value: String(open), note: open ? "Ainda em atendimento" : "Nada pendente" },
    {
      label: "Aguardando você",
      value: String(count("waiting")),
      note: count("waiting") ? "O suporte espera sua resposta" : "Nenhuma resposta pendente",
      color: count("waiting") ? "var(--warn)" : "var(--pos)",
    },
    { label: "Resolvidos", value: String(count("resolved")), note: "No histórico", color: "var(--pos)" },
  ];

  return (
    <div>
      <ScreenHeader
        title="Suporte"
        subtitle="Precisa de ajuda? Abra um chamado e a gente responde por aqui — normalmente em até 1 dia útil."
        action={<NewButton text="Abrir chamado" onClick={a.openNewTicket} wide={isMobile} />}
      />

      {d.tickets.length === 0 ? (
        <div
          style={css(
            "display:flex;flex-direction:column;align-items:center;text-align:center;gap:7px;padding:48px 20px;" +
              "border:1px dashed var(--border2);border-radius:14px;background:var(--surface2)",
          )}
        >
          <span
            style={css(
              "width:46px;height:46px;border-radius:13px;background:var(--accent-soft);color:var(--accent-text);" +
                `display:flex;align-items:center;justify-content:center;font:700 15px ${MONO}`,
            )}
          >
            SP
          </span>
          <div style={css(`margin-top:2px;font:700 16px ${SANS}`)}>Nenhum chamado ainda</div>
          <p style={css(`margin:0;max-width:380px;font:400 13px/1.5 ${SANS};color:var(--muted)`)}>
            Travou em algo, apareceu um error ou ficou com dúvida? Abra um chamado contando o que
            aconteceu — a gente responde aqui mesmo.
          </p>
          <Button
            onClick={a.openNewTicket}
            className="hv-brilho"
            style={css(
              `margin-top:10px;padding:14px 24px;border-radius:12px;background:var(--accent);color:var(--accent-ink);font:700 14px ${SANS}`,
            )}
          >
            Abrir chamado
          </Button>
        </div>
      ) : (
        <>
          <KpiStrip kpis={kpis} columns={isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))"} />

          <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
            <input
              value={f.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Buscar pelo assunto do chamado"
              style={css(`flex:1;min-width:180px;${filterField()}`)}
            />
            <PillGroup
              options={FILTERS}
              current={f.status}
              onPick={(v) => set({ status: v })}
              size="sm"
            />
          </div>

          {filtered.length === 0 ? (
            <Empty
              title="Nenhum chamado com esse filtro"
              text="Tente outro termo de busca ou veja todos os chamados."
              action="Ver todos"
              onAction={() => set({ search: "", status: "all" })}
            />
          ) : (
            <>
              <div
                style={css(
                  "display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden",
                )}
              >
                {filtered.map((c) => {
                  const st = SP_STATUS[c.status];
                  const latest = c.messages[c.messages.length - 1];
                  return (
                    <Button
                      key={c.id}
                      onClick={() => {
                        a.markRead(c.id);
                        a.goTo(ticketRoute(c.id));
                      }}
                      className="hv-linha2"
                      style={css(
                        "display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface);text-align:left",
                      )}
                    >
                      <span
                        style={css(`flex:none;width:8px;height:8px;border-radius:50%;background:${st.dot}`)}
                      />
                      <span style={css("flex:1;min-width:0")}>
                        <span style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                          <span
                            style={css(
                              `font:${c.unread ? "700" : "600"} 13.5px ${SANS};color:var(--text)`,
                            )}
                          >
                            {c.subject}
                          </span>
                          {c.unread && (
                            <span
                              style={css(
                                `padding:2px 8px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font:600 10px ${SANS}`,
                              )}
                            >
                              nova resposta
                            </span>
                          )}
                        </span>
                        <span
                          style={css(
                            `display:block;margin-top:4px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`,
                          )}
                        >
                          #{c.id} · {c.category} · {c.messages.length}{" "}
                          {c.messages.length === 1 ? "mensagem" : "mensagens"} · última{" "}
                          {dateLabel(latest.d, latest.time)}
                        </span>
                      </span>
                      <span
                        style={css(
                          `flex:none;padding:4px 10px;border-radius:999px;background:${st.bg};color:${st.color};font:600 11px ${SANS};white-space:nowrap`,
                        )}
                      >
                        {st.label}
                      </span>
                      <span style={css(`flex:none;color:var(--muted);font:600 14px/1 ${MONO}`)}>›</span>
                    </Button>
                  );
                })}
              </div>
              <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
                {filtered.length} de {d.tickets.length} chamados
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
