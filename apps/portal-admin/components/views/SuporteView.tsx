"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { mudarStatusChamado, responderChamado } from "@/app/suporte/actions";
import { useAdmin } from "@/components/AdminProvider";
import { AreaTexto, CampoBusca, css, MONO } from "@aguiar/ui";
import { chamadoAtual } from "@/lib/state";
import { badgeChamado, prioridadeBadge } from "@/lib/styleKit";
import { chip } from "@aguiar/ui";
import type { StatusChamado } from "@/types/types";

export function SuporteView() {
  const { s, a, cs, vazio } = useAdmin();
  const { L } = a;
  const id = s.idioma;
  const router = useRouter();
  // `useTransition` mantém a interface responsiva enquanto a Server Action
  // roda, e dá o sinal para desabilitar o botão sem inventar um estado próprio.
  const [enviando, iniciarEnvio] = useTransition();

  // Abaixo desta largura os dois painéis não cabem lado a lado, e a tela
  // empilha. O sinal é o mesmo que o Financeiro já usa (ver AdminProvider).
  const compacto = s.larguraTela < 900;

  const t = chamadoAtual(s);
  const clienteChamado =
    (t && (cs.find((x) => x.id === t.clienteId) || s.clientes.find((x) => x.id === t.clienteId))) ||
    null;
  const nomeCliente = clienteChamado ? clienteChamado.nome : L.cliente;

  const qc = s.buscaChamado.trim().toLowerCase();
  const lista = s.chamados.filter((x) => {
    const cl = cs.find((y) => y.id === x.clienteId);
    return (
      (s.filtroChamado === "todos" || x.status === s.filtroChamado) &&
      (!qc || (cl && cl.nome.toLowerCase().includes(qc)) || x.assunto[id].toLowerCase().includes(qc))
    );
  });

  const rotuloStatus = (st: StatusChamado) =>
    st === "aberto" ? L.aberto : st === "andamento" ? L.andamento : L.resolvido;

  // As duas ações abaixo gravam no Supabase e pedem ao servidor que releia a
  // lista (`revalidatePath` na action + `router.refresh()` aqui). Não mexemos
  // no estado local: quem manda no que aparece é o banco, e assim a tela nunca
  // mostra um status que a gravação não confirmou.
  const marcar = (status: StatusChamado) => {
    if (!t) return;
    iniciarEnvio(async () => {
      const r = await mudarStatusChamado(t.id, status);
      if (!r.ok) return a.toast(r.mensagem, "erro");
      router.refresh();
    });
  };

  const enviarResposta = () => {
    const txt = s.resposta.trim();
    if (!t || !txt) return;
    iniciarEnvio(async () => {
      const r = await responderChamado(t.id, txt);
      if (!r.ok) return a.toast(r.mensagem, "erro");
      a.set({ resposta: "" });
      a.toast(L.toastResposta);
      router.refresh();
    });
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
  const painelMensagens = useRef<HTMLDivElement>(null);
  const totalMsgs = t?.msgs.length ?? 0;
  useEffect(() => {
    const el = painelMensagens.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.chamadoSel, totalMsgs]);

  // Molde comum aos dois painéis. `min-height:0` é o que autoriza um item flex a
  // encolher abaixo do conteúdo — sem ele, o filho com `overflow-y:auto` cresce
  // e o scroll vaza para a página em vez de acontecer aqui dentro.
  const painel =
    "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
    "display:flex;flex-direction:column;overflow:hidden;min-height:0;";

  return (
    <div
      style={css(
        // `flex:1` em vez de `height:100%`: a raiz é um item flex da casca, e
        // crescer para preencher é mais confiável do que medir contra o pai.
        "display:flex;gap:16px;align-items:stretch;flex:1;min-height:0;" +
          (compacto ? "flex-direction:column" : ""),
      )}
    >
      <section
        style={css(
          painel +
            (compacto
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
          <CampoBusca
            valor={s.buscaChamado}
            onChange={(v) => a.set({ buscaChamado: v })}
            placeholder={L.buscarChamado}
            estiloCaixa=""
            compacto
          />
          <div style={css("display:flex;gap:6px;flex-wrap:wrap")}>
            {(
              [
                ["todos", L.todosChamados],
                ["aberto", L.aberto],
                ["andamento", L.andamento],
                ["resolvido", L.resolvido],
              ] as const
            ).map(([k, rotulo]) => (
              <button
                key={k}
                onClick={() => a.set({ filtroChamado: k })}
                style={css(chip(s.filtroChamado === k))}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div style={css("flex:1;min-height:0;overflow-y:auto")}>
          {(vazio || s.chamados.length === 0) && (
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
                    (s.erroChamados
                      ? "background:var(--danger-soft);border:1px solid var(--danger-line);color:var(--danger);"
                      : "background:var(--pos-soft);border:1px solid var(--pos-line);color:var(--pos);"),
                )}
              >
                {s.erroChamados ? "!" : "✓"}
              </div>
              <span style={css("font-size:13.5px;font-weight:600;color:var(--text)")}>
                {s.erroChamados ? L.erroChamadosTitulo : L.vazioSuporteTitulo}
              </span>
              <span
                style={css("font-size:12px;color:var(--text2);line-height:1.55;max-width:32ch")}
              >
                {s.erroChamados || L.vazioSuporteTexto}
              </span>
            </div>
          )}

          {(vazio ? [] : lista).map((x) => {
            const cl = cs.find((y) => y.id === x.clienteId);
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
                    {cl ? cl.nome : L.cliente}
                  </span>
                  <span style={css(prioridadeBadge(x.prioridade))}>
                    {x.prioridade === "alta" ? L.alta : x.prioridade === "media" ? L.media : L.baixa}
                  </span>
                </div>
                <span style={css("font-size:12.5px;color:var(--text2);line-height:1.4")}>
                  {x.assunto[id]}
                </span>
                <div
                  style={css(
                    "display:flex;align-items:center;justify-content:space-between;gap:10px",
                  )}
                >
                  <span style={css(badgeChamado(x.status))}>{rotuloStatus(x.status)}</span>
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
          painel + "min-width:0;" + (compacto ? "flex:1 1 auto;" : "flex:6 1 440px;"),
        )}
      >
        {/* Cabeçalho do chamado — fixo no topo do painel. */}
        <div
          style={css(
            "flex:none;padding:16px 20px;border-bottom:1px solid var(--border-soft);display:flex;" +
              "align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;" +
              "background:var(--surface2)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:5px;min-width:0")}>
            <h3 style={css("margin:0;font-size:15.5px;font-weight:600;color:var(--text)")}>
              {t ? t.assunto[id] : ""}
            </h3>
            <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap")}>
              <span style={css("font-size:12.5px;color:var(--text2)")}>{nomeCliente}</span>
              <span style={css("color:var(--muted);font-size:11px")}>·</span>
              <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
                {t ? t.data : ""}
              </span>
              {t && <span style={css(badgeChamado(t.status))}>{rotuloStatus(t.status)}</span>}
            </div>
          </div>

          {/* Sem chamado selecionado não há o que marcar nem a quem responder. */}
          {t && (
            <div style={css("display:flex;gap:7px;flex-wrap:wrap")}>
              <button
                onClick={() => clienteChamado && a.abrirCliente(clienteChamado.id)}
                disabled={!clienteChamado}
                className="hv-acc-borda"
                style={css(botaoCabecalho + (clienteChamado ? "" : ";opacity:.5;cursor:default"))}
              >
                {L.verCliente}
              </button>
              <button
                onClick={() => marcar("andamento")}
                disabled={enviando}
                className="hv-acc-borda"
                style={css(botaoCabecalho + (enviando ? ";opacity:.6;cursor:progress" : ""))}
              >
                {L.emAndamento}
              </button>
              <button
                onClick={() => marcar("resolvido")}
                disabled={enviando}
                className="hv-brilho-sm"
                style={css(
                  "border:1px solid var(--pos-line);background:var(--pos-soft);color:var(--pos);" +
                    "font-size:12px;font-weight:500;padding:8px 12px;border-radius:8px;" +
                    (enviando ? "opacity:.6;cursor:progress" : "cursor:pointer"),
                )}
              >
                {L.marcarResolvido}
              </button>
            </div>
          )}
        </div>

        {/* A thread — a única parte que rola deste painel. */}
        <div
          ref={painelMensagens}
          style={css(
            "flex:1;min-height:0;overflow-y:auto;padding:20px;display:flex;" +
              "flex-direction:column;gap:14px;background:var(--bg)",
          )}
        >
          {(t ? t.msgs : []).map((m, i) => {
            const adm = m.de === "admin";
            return (
              <div
                key={i}
                style={css(
                  "display:flex;" + (adm ? "justify-content:flex-end" : "justify-content:flex-start"),
                )}
              >
                <div
                  style={css(
                    "max-width:70%;display:flex;flex-direction:column;gap:5px;padding:12px 14px;" +
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
                    {adm ? L.voce : nomeCliente}
                  </span>
                  <p style={css("margin:0;font-size:13px;line-height:1.55")}>
                    {typeof m.texto === "string" ? m.texto : m.texto[id]}
                  </p>
                  <span
                    style={css(
                      `font-family:${MONO};font-size:10px;opacity:` + (adm ? ".75" : ".55"),
                    )}
                  >
                    {m.quando}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Caixa de resposta — presa ao rodapé, nunca rola com as mensagens. */}
        <div
          style={css(
            "flex:none;padding:14px 20px;border-top:1px solid var(--border-soft);display:flex;" +
              "gap:10px;align-items:flex-end;background:var(--surface)",
          )}
        >
          <AreaTexto
            value={s.resposta}
            onChange={(e) => a.set({ resposta: e.target.value })}
            placeholder={L.escrevaResposta}
            aria-label={L.escrevaResposta}
            disabled={!t || enviando}
            estilo="flex:1;resize:none;min-height:64px;line-height:1.5"
          />
          <button
            onClick={enviarResposta}
            // Sem chamado aberto, ou com um envio em curso, o clique não teria
            // para onde ir — e um duplo clique gravaria a resposta duas vezes.
            disabled={!t || enviando || !s.resposta.trim()}
            className="hv-brilho"
            style={css(
              "background:var(--accent);border:1px solid var(--accent);color:var(--accent-ink);font-size:13px;" +
                "font-weight:500;padding:11px 18px;border-radius:9px;" +
                (!t || enviando || !s.resposta.trim()
                  ? "opacity:.55;cursor:default"
                  : "cursor:pointer"),
            )}
          >
            {enviando ? L.enviando : L.responder}
          </button>
        </div>
      </section>
    </div>
  );
}
