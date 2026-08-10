"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setTicketStatus, replyToTicket } from "@/app/suporte/actions";
import { useAdmin } from "@/components/AdminProvider";
import { TextArea, Button, SearchField, css, MONO } from "@aguiar/ui";
import { currentTicket } from "@/lib/state";
import { ticketBadge, priorityBadge } from "@/lib/styleKit";
import { chip } from "@aguiar/ui";
import type { TicketStatus } from "@/types/types";

export function SuporteView() {
  const { s, a, cs, empty, isMobile } = useAdmin();
  const { L } = a;
  const id = s.language;
  const router = useRouter();
  // A transição segura o `router.refresh()` — o re-render com a lista relida.
  const [recarregando, iniciarRecarga] = useTransition();
  // E este é o sinal de "há uma gravação em curso", que trava o field de
  // resposta. O girador de cada botão não vem daqui: vem da promessa que ele
  // mesmo devolve, para que só o botão clicado gire.
  const [gravando, setGravando] = useState(false);
  const ocupado = gravando || recarregando;

  // Abaixo desta largura os dois painéis não cabem lado a lado, e a tela
  // empilha. É o mesmo corte do resto do painel (ver `lib/telas.ts`).
  const compact = isMobile;

  const t = currentTicket(s);
  const ticketCustomer =
    (t && (cs.find((x) => x.id === t.customerId) || s.customers.find((x) => x.id === t.customerId))) ||
    null;
  const customerName = ticketCustomer ? ticketCustomer.name : L.customer;

  const qc = s.ticketSearch.trim().toLowerCase();
  const list = s.tickets.filter((x) => {
    const cl = cs.find((y) => y.id === x.customerId);
    return (
      (s.ticketFilter === "all" || x.status === s.ticketFilter) &&
      (!qc || (cl && cl.name.toLowerCase().includes(qc)) || x.subject[id].toLowerCase().includes(qc))
    );
  });

  const statusLabel = (st: TicketStatus) =>
    st === "open" ? L.open : st === "inProgress" ? L.inProgress : L.resolved;

  // As duas ações abaixo gravam no Supabase e pedem ao servidor que releia a
  // lista (`revalidatePath` na action + `router.refresh()` aqui). Não mexemos
  // no estado local: quem manda no que aparece é o banco, e assim a tela nunca
  // mostra um status que a gravação não confirmou.
  const marcar = async (status: TicketStatus) => {
    if (!t) return;
    setGravando(true);
    try {
      const r = await setTicketStatus(t.id, status);
      if (!r.ok) return a.toast(r.message, "error");
      iniciarRecarga(() => router.refresh());
    } finally {
      setGravando(false);
    }
  };

  const sendReply = async () => {
    const txt = s.resposta.trim();
    if (!t || !txt) return;
    setGravando(true);
    try {
      const r = await replyToTicket(t.id, txt);
      if (!r.ok) return a.toast(r.message, "error");
      a.set({ resposta: "" });
      a.toast(L.toastResposta);
      iniciarRecarga(() => router.refresh());
    } finally {
      setGravando(false);
    }
  };

  const botaoCabecalho =
    "border:1px solid var(--border);background:var(--surface);color:var(--text2);font-size:12px;" +
    "padding:8px 12px;border-radius:8px;cursor:pointer";

  /**
   * A conversa abre no fim, como qualquer aplicativo de mensagem: o que importa
   * é a última fala, não a primeira. Roda ao trocar de chamado e ao chegar uma
   * mensagem nova (a contagem muda depois que o servidor confirma a gravação).
   *
   * Salta direto para o fim em vez de animar: numa troca de chamado a rolagem
   * suave mostraria a conversa inteira passando, que é ruído, não informação.
   */
  const messagesPanel = useRef<HTMLDivElement>(null);
  const messageCount = t?.messages.length ?? 0;
  useEffect(() => {
    const el = messagesPanel.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.chamadoSel, messageCount]);

  // Molde comum aos dois painéis. `min-height:0` é o que autoriza um item flex a
  // encolher abaixo do conteúdo — sem ele, o filho com `overflow-y:auto` cresce
  // e o scroll vaza para a página em vez de acontecer aqui dentro.
  const panel =
    "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
    "display:flex;flex-direction:column;overflow:hidden;min-height:0;";

  return (
    <div
      style={css(
        // `flex:1` em vez de `height:100%`: a raiz é um item flex da casca, e
        // crescer para preencher é mais confiável do que medir contra o pai.
        "display:flex;gap:16px;align-items:stretch;flex:1;min-height:0;" +
          (compact ? "flex-direction:column" : ""),
      )}
    >
      <section
        style={css(
          panel +
            (compact
              ? // Empilhado, a lista fica com uma faixa própria no topo e a
                // conversa herda o resto; as duas seguem rolando por dentro.
                "flex:0 0 auto;max-height:38%;"
              : "flex:1 1 340px;max-width:400px;"),
        )}
      >
        {/* Busca e filtros ficam presos ao topo do painel: `flex:none` impede
            que encolham quando a lista abaixo fica longa. */}
        <div
          style={css(
            "flex:none;padding:14px 16px;border-bottom:1px solid var(--border-soft);display:flex;" +
              "flex-direction:column;gap:10px",
          )}
        >
          <SearchField
            value={s.ticketSearch}
            onChange={(v) => a.set({ ticketSearch: v })}
            placeholder={L.buscarChamado}
            boxCssText=""
            compact
          />
          <div style={css("display:flex;gap:6px;flex-wrap:wrap")}>
            {(
              [
                ["all", L.todosChamados],
                ["open", L.open],
                ["inProgress", L.inProgress],
                ["resolved", L.resolved],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                onClick={() => a.set({ ticketFilter: k })}
                style={css(chip(s.ticketFilter === k))}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div style={css("flex:1;min-height:0;overflow-y:auto")}>
          {(empty || s.tickets.length === 0) && (
            <div
              style={css(
                // `height:100%` centra o estado vazio no painel inteiro, e não
                // logo abaixo dos filtros.
                "height:100%;display:flex;flex-direction:column;align-items:center;" +
                  "justify-content:center;gap:11px;padding:40px 20px;text-align:center",
              )}
            >
              {/* Ler os chamados pode falhar (sessão, RLS, rede). Nesse caso a
                  lista vazia é sintoma, não notícia boa — dizer "tudo tranquilo"
                  aqui esconderia o problema. */}
              <div
                style={css(
                  "width:44px;height:44px;border-radius:12px;display:flex;" +
                    "align-items:center;justify-content:center;font-size:17px;font-weight:700;" +
                    (s.ticketsError
                      ? "background:var(--danger-soft);border:1px solid var(--danger-line);color:var(--danger);"
                      : "background:var(--pos-soft);border:1px solid var(--pos-line);color:var(--pos);"),
                )}
              >
                {s.ticketsError ? "!" : "✓"}
              </div>
              <span style={css("font-size:13.5px;font-weight:600;color:var(--text)")}>
                {s.ticketsError ? L.erroChamadosTitulo : L.vazioSuporteTitulo}
              </span>
              <span
                style={css("font-size:12px;color:var(--text2);line-height:1.55;max-width:32ch")}
              >
                {s.ticketsError || L.vazioSuporteTexto}
              </span>
            </div>
          )}

          {(empty ? [] : list).map((x) => {
            const cl = cs.find((y) => y.id === x.customerId);
            return (
              <div
                key={x.id}
                onClick={() => a.set({ chamadoSel: x.id })}
                style={css(
                  "display:flex;flex-direction:column;gap:7px;padding:13px 16px;" +
                    "border-bottom:1px solid var(--border-soft);cursor:pointer;" +
                    (x.id === s.chamadoSel
                      ? "background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent);"
                      : ""),
                )}
              >
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:10px",
                  )}
                >
                  <span
                    style={css(
                      "font-size:12.5px;font-weight:600;color:var(--text);white-space:nowrap;" +
                        "overflow:hidden;text-overflow:ellipsis",
                    )}
                  >
                    {cl ? cl.name : L.customer}
                  </span>
                  <span style={css(priorityBadge(x.prioridade))}>
                    {x.prioridade === "alta" ? L.alta : x.prioridade === "media" ? L.average : L.baixa}
                  </span>
                </div>
                <span style={css("font-size:12.5px;color:var(--text2);line-height:1.4")}>
                  {x.subject[id]}
                </span>
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:10px",
                  )}
                >
                  <span style={css(ticketBadge(x.status))}>{statusLabel(x.status)}</span>
                  <span style={css(`font-family:${MONO};font-size:10.5px;color:var(--muted)`)}>
                    {x.data}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        style={css(
          panel + "min-width:0;" + (compact ? "flex:1 1 auto;" : "flex:6 1 440px;"),
        )}
      >
        {/* Cabeçalho do chamado — fixo no topo do painel. */}
        <div
          style={css(
            "flex:none;border-bottom:1px solid var(--border-soft);display:flex;" +
              "align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;" +
              "background:var(--surface2);padding:" +
              (compact ? "13px 14px" : "16px 20px"),
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:5px;min-width:0")}>
            <h3 style={css("margin:0;font-size:15.5px;font-weight:600;color:var(--text)")}>
              {t ? t.subject[id] : ""}
            </h3>
            <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap")}>
              <span style={css("font-size:12.5px;color:var(--text2)")}>{customerName}</span>
              <span style={css("color:var(--muted);font-size:11px")}>·</span>
              <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
                {t ? t.data : ""}
              </span>
              {t && <span style={css(ticketBadge(t.status))}>{statusLabel(t.status)}</span>}
            </div>
          </div>

          {/* Sem chamado selecionado não há o que marcar nem a quem responder. */}
          {t && (
            <div style={css("display:flex;gap:7px;flex-wrap:wrap")}>
              <Button
                onClick={() => ticketCustomer && a.openCustomer(ticketCustomer.id)}
                disabled={!ticketCustomer}
                className="hv-acc-borda"
                style={css(botaoCabecalho + (ticketCustomer ? "" : ";opacity:.5;cursor:default"))}
              >
                {L.verCliente}
              </Button>
              <Button
                onClick={() => marcar("inProgress")}
                disabled={ocupado}
                className="hv-acc-borda"
                style={css(botaoCabecalho)}
              >
                {L.emAndamento}
              </Button>
              <Button
                onClick={() => marcar("resolved")}
                disabled={ocupado}
                className="hv-brilho-sm"
                style={css(
                  "border:1px solid var(--pos-line);background:var(--pos-soft);color:var(--pos);" +
                    "font-size:12px;font-weight:500;padding:8px 12px;border-radius:8px",
                )}
              >
                {L.marcarResolvido}
              </Button>
            </div>
          )}
        </div>

        {/* A thread — a única parte que rola deste painel. */}
        <div
          ref={messagesPanel}
          style={css(
            "flex:1;min-height:0;overflow-y:auto;display:flex;" +
              "flex-direction:column;gap:14px;background:var(--bg);padding:" +
              (compact ? "14px" : "20px"),
          )}
        >
          {(t ? t.messages : []).map((m, i) => {
            const adm = m.from === "admin";
            return (
              <div
                key={i}
                style={css(
                  "display:flex;" + (adm ? "justify-content:flex-end" : "justify-content:flex-start"),
                )}
              >
                <div
                  style={css(
                    // Mais folga no celular: 70% de uma tela estreita quebra
                    // frases curtas em três linhas.
                    `max-width:${compact ? "85%" : "70%"};` +
                      "display:flex;flex-direction:column;gap:5px;padding:12px 14px;" +
                      "border-radius:12px;" +
                      (adm
                        ? "background:var(--accent);color:var(--accent-ink);border-bottom-right-radius:4px;"
                        : "background:var(--surface);border:1px solid var(--border);color:var(--text);" +
                          "border-bottom-left-radius:4px;"),
                  )}
                >
                  <span
                    style={css(
                      "font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;" +
                        "opacity:" +
                        (adm ? ".8" : ".55"),
                    )}
                  >
                    {adm ? L.voce : customerName}
                  </span>
                  <p style={css("margin:0;font-size:13px;line-height:1.55")}>
                    {typeof m.text === "string" ? m.text : m.text[id]}
                  </p>
                  <span
                    style={css(
                      `font-family:${MONO};font-size:10px;opacity:` + (adm ? ".75" : ".55"),
                    )}
                  >
                    {m.at}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Caixa de resposta — presa ao rodapé, nunca rola com as mensagens. */}
        {/* No celular o campo e o botão empilham: lado a lado, o campo ficaria
            com metade da largura para escrever um parágrafo. */}
        <div
          style={css(
            "flex:none;border-top:1px solid var(--border-soft);display:flex;gap:10px;" +
              "background:var(--surface);" +
              (compact
                ? "padding:12px 14px;flex-direction:column;align-items:stretch"
                : "padding:14px 20px;align-items:flex-end"),
          )}
        >
          <TextArea
            value={s.resposta}
            onChange={(e) => a.set({ resposta: e.target.value })}
            placeholder={L.escrevaResposta}
            aria-label={L.escrevaResposta}
            disabled={!t || ocupado}
            cssText={
              "resize:none;line-height:1.5;" +
              (compact ? "min-height:52px" : "flex:1;min-height:64px")
            }
          />
          <Button
            onClick={sendReply}
            // Sem chamado aberto o clique não teria para onde ir. O duplo
            // clique, que gravaria a resposta duas vezes, quem barra é o
            // próprio botão enquanto espera a promessa.
            disabled={!t || ocupado || !s.resposta.trim()}
            loadingLabel={L.enviando}
            className="hv-brilho"
            style={css(
              "background:var(--accent);border:1px solid var(--accent);color:var(--accent-ink);font-size:13px;" +
                "font-weight:500;padding:11px 18px;border-radius:9px" +
                (compact ? ";display:flex;align-items:center;justify-content:center" : ""),
            )}
          >
            {L.reply}
          </Button>
        </div>
      </section>
    </div>
  );
}
