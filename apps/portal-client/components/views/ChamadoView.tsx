"use client";

import { usePortal } from "@/components/PortalProvider";
import { botaoPrimario, css, MONO, PAINEL, SANS, Vazio } from "@aguiar/ui";
import { podeResponder, SP_STATUS } from "@/lib/dados/chamados";
import { rotuloData, siglaDe } from "@/lib/formato";
import { ROTAS } from "@/lib/rotas";
import type { MensagemChamado } from "@/types/types";

/**
 * A conversa de um chamado.
 *
 * O cliente e o suporte aparecem com fundos diferentes para a leitura em
 * diagonal funcionar; o que o sistema registra (resolvido, reaberto) não é
 * mensagem de ninguém e vira uma linha divisória.
 */
export function ChamadoView({ id }: { id: string }) {
  const { s, a, d } = usePortal();
  const chamado = d.chamados.find((c) => c.id === id);

  if (!chamado) {
    return (
      <Vazio
        titulo="Chamado não encontrado"
        texto="Ele pode ter sido removido, ou o endereço está errado."
        acao="Ver todos os chamados"
        onAcao={() => a.irPara(ROTAS.suporte)}
        destaque
      />
    );
  }

  const st = SP_STATUS[chamado.status];
  const responder = podeResponder(chamado);
  const f = s.formResposta;
  const primeira = chamado.msgs[0];

  return (
    <div>
      <button
        onClick={() => a.irPara(ROTAS.suporte)}
        className="hv-linha2"
        style={css(
          "display:inline-flex;align-items:center;gap:8px;margin-bottom:13px;padding:8px 13px;border-radius:10px;" +
            `border:1px solid var(--border);background:var(--surface);color:var(--text2);font:600 12.5px ${SANS}`,
        )}
      >
        <span style={css(`font:600 13px/1 ${MONO}`)}>‹</span>Todos os chamados
      </button>

      <div style={css(`padding:17px 19px;${PAINEL}`)}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap")}>
          <div style={css("min-width:0;flex:1")}>
            <div style={css(`font:600 10.5px ${MONO};letter-spacing:.12em;color:var(--muted)`)}>
              PROTOCOLO {chamado.id}
            </div>
            <h1
              style={css(
                `margin:6px 0 0;font:700 19px/1.3 ${SANS};letter-spacing:-.01em;text-wrap:pretty`,
              )}
            >
              {chamado.assunto}
            </h1>
            <p style={css(`margin:6px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
              {chamado.categoria} · aberto em {rotuloData(primeira.d, primeira.hora)} ·{" "}
              {chamado.msgs.length} {chamado.msgs.length === 1 ? "mensagem" : "mensagens"}
            </p>
          </div>
          <span
            style={css(
              `flex:none;padding:7px 14px;border-radius:999px;background:${st.bg};color:${st.cor};font:600 12px ${SANS}`,
            )}
          >
            {st.rotulo}
          </span>
        </div>
      </div>

      <div style={css("display:flex;flex-direction:column;gap:10px;margin-top:12px")}>
        {chamado.msgs.map((m, i) => (
          <Mensagem key={i} msg={m} />
        ))}
      </div>

      {responder ? (
        <div style={css(`margin-top:12px;padding:16px;${PAINEL}`)}>
          <div style={css(`font:600 13.5px ${SANS}`)}>Responder ao suporte</div>
          <p style={css(`margin:4px 0 11px;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
            O atendimento é por chamado: sua resposta entra na fila e a devolutiva aparece aqui. Não é
            preciso ficar com a tela aberta.
          </p>

          <textarea
            value={f.texto}
            onChange={(e) => a.set({ formResposta: { ...f, texto: e.target.value } })}
            rows={3}
            placeholder="Escreva sua resposta para o suporte..."
            style={css(
              "width:100%;box-sizing:border-box;resize:vertical;padding:12px 13px;border:1px solid var(--border);" +
                `border-radius:11px;background:var(--surface2);font:400 13.5px/1.55 ${SANS};color:var(--text);outline:none`,
            )}
          />

          {f.anexo && (
            <div
              style={css(
                "display:inline-flex;align-items:center;gap:9px;margin-top:10px;padding:7px 8px 7px 11px;" +
                  `border:1px solid var(--border);border-radius:9px;background:var(--surface2);font:600 11.5px ${SANS};color:var(--text2)`,
              )}
            >
              <span style={css(`font:600 10px ${MONO};letter-spacing:.08em;color:var(--muted)`)}>IMG</span>
              {f.anexo}
              <button
                onClick={() => a.set({ formResposta: { ...f, anexo: "" } })}
                title="Remover anexo"
                style={css(
                  `width:20px;height:20px;border-radius:6px;background:var(--surface3);color:var(--muted);font:600 12px/1 ${MONO}`,
                )}
              >
                ×
              </button>
            </div>
          )}

          <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px")}>
            <button
              onClick={() => a.set({ formResposta: { ...f, anexo: "print-da-tela.png" } })}
              style={css(
                `padding:11px 15px;border-radius:10px;border:1px dashed var(--border2);background:var(--surface2);color:var(--text2);font:600 12.5px ${SANS}`,
              )}
            >
              Anexar print
            </button>
            <span style={css("flex:1;min-width:0")} />
            <button
              onClick={() =>
                a.confirmar({
                  titulo: "Marcar como resolvido?",
                  texto: "O chamado vai para o histórico e o suporte para de acompanhá-lo.",
                  resumo: chamado.assunto,
                  sub: `Protocolo ${chamado.id} · ${chamado.categoria}`,
                  reversao: "Se o problema voltar, é só reabrir — a conversa continua guardada.",
                  btn: "Marcar resolvido",
                  btnBg: "var(--pos)",
                  btnFg: "#fff",
                  cor: "var(--pos)",
                  acao: () => a.resolverChamado(chamado.id),
                })
              }
              className="hv-pos-borda"
              style={css(
                `padding:12px 17px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--pos);font:600 13px ${SANS}`,
              )}
            >
              Já está resolvido
            </button>
            <button
              onClick={() =>
                f.texto.trim() ? a.responderChamado(chamado.id) : a.avisar("Escreva a sua resposta")
              }
              className="hv-brilho"
              style={css(botaoPrimario("sm"))}
            >
              Enviar resposta
            </button>
          </div>
        </div>
      ) : (
        <div
          style={css(
            "display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:12px;" +
              "padding:16px 18px;border:1px solid var(--border);border-radius:14px;background:var(--pos-soft)",
          )}
        >
          <div style={css("min-width:0")}>
            <div style={css(`font:700 13.5px ${SANS};color:var(--pos)`)}>
              Este chamado está resolvido
            </div>
            <p style={css(`margin:4px 0 0;font:400 12.5px/1.5 ${SANS};color:var(--text2)`)}>
              A conversa fica guardada no histórico. Se o problema voltar, é só reabrir — o suporte
              recebe tudo o que já foi conversado.
            </p>
          </div>
          <button
            onClick={() => a.reabrirChamado(chamado.id)}
            className="hv-borda"
            style={css(
              `flex:none;padding:12px 18px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text);font:600 13px ${SANS}`,
            )}
          >
            Reabrir chamado
          </button>
        </div>
      )}
    </div>
  );
}

function Mensagem({ msg: m }: { msg: MensagemChamado }) {
  const { d } = usePortal();

  if (m.autor === "sistema") {
    return (
      <div style={css("display:flex;align-items:center;gap:10px;padding:2px 4px")}>
        <span style={css("flex:1;height:1px;background:var(--border)")} />
        <span style={css(`flex:none;font:500 11.5px ${SANS};color:var(--muted)`)}>
          {m.texto} · {rotuloData(m.d, m.hora)}
        </span>
        <span style={css("flex:1;height:1px;background:var(--border)")} />
      </div>
    );
  }

  const doSuporte = m.autor === "suporte";
  const autor = doSuporte ? "Suporte Aguiar One" : d.negocio.user.nome;

  return (
    <div
      style={css(
        "display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:13px;" +
          `border:1px solid ${doSuporte ? "var(--accent-soft)" : "var(--border)"};` +
          `background:${doSuporte ? "var(--accent-soft)" : "var(--surface)"}`,
      )}
    >
      <span
        style={css(
          "flex:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
            `font:700 11px ${MONO};` +
            (doSuporte
              ? "background:var(--accent);color:var(--accent-ink)"
              : "background:var(--surface3);color:var(--text2)"),
        )}
      >
        {doSuporte ? "SP" : siglaDe(autor)}
      </span>

      <span style={css("flex:1;min-width:0")}>
        <span style={css("display:flex;align-items:baseline;gap:9px;flex-wrap:wrap")}>
          <span
            style={css(`font:600 13px ${SANS};color:${doSuporte ? "var(--accent)" : "var(--text)"}`)}
          >
            {autor}
          </span>
          <span style={css(`font:500 11.5px ${MONO};color:var(--muted)`)}>
            {rotuloData(m.d, m.hora)}
          </span>
        </span>

        <span
          style={css(
            `display:block;margin-top:7px;font:400 13.5px/1.62 ${SANS};color:var(--text2);white-space:pre-line;text-wrap:pretty`,
          )}
        >
          {m.texto}
        </span>

        {m.anexo && (
          <span
            style={css(
              "display:inline-flex;align-items:center;gap:8px;margin-top:10px;padding:7px 11px;" +
                `border:1px solid var(--border);border-radius:9px;background:var(--surface);font:600 11.5px ${SANS};color:var(--text2)`,
            )}
          >
            <span style={css(`font:600 10px ${MONO};letter-spacing:.08em;color:var(--muted)`)}>IMG</span>
            {m.anexo}
          </span>
        )}
      </span>
    </div>
  );
}
