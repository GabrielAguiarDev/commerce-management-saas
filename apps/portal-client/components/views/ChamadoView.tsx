"use client";

import { EnviarArquivo } from "@/components/EnviarArquivo";
import { NavLink } from "@/components/NavLink";
import { usePortal } from "@/components/PortalProvider";
import { primaryButton, Button, css, MONO, PANEL, SANS, Empty } from "@aguiar/ui";
import { fileNameOf, isStoragePath, openAttachment, SUPPORT_BUCKET } from "@/lib/arquivos";
import { canReply, SP_STATUS } from "@/lib/dados/chamados";
import { dateLabel, initialsOf } from "@/lib/formato";
import { ROUTES } from "@/lib/rotas";
import type { TicketMessage } from "@/types/types";

/**
 * A conversa de um chamado.
 *
 * O cliente e o suporte aparecem com fundos diferentes para a leitura em
 * diagonal funcionar; o que o sistema registra (resolvido, reaberto) não é
 * mensagem de ninguém e vira uma linha divisória.
 */
export function ChamadoView({ id }: { id: string }) {
  const { s, a, d } = usePortal();
  const ticket = d.tickets.find((c) => c.id === id);

  if (!ticket) {
    return (
      <Empty
        title="Chamado não encontrado"
        text="Ele pode ter sido removido, ou o endereço está errado."
        action="Ver todos os chamados"
        onAction={() => a.goTo(ROUTES.support)}
        standout
      />
    );
  }

  const st = SP_STATUS[ticket.status];
  const reply = canReply(ticket);
  const f = s.replyForm;
  const first = ticket.messages[0];

  return (
    <div>
      <NavLink
        href={ROUTES.support}
        className="hv-linha2"
        style={css(
          "display:inline-flex;align-items:center;gap:8px;margin-bottom:13px;padding:8px 13px;border-radius:10px;" +
            `border:1px solid var(--border);background:var(--surface);color:var(--text2);font:600 12.5px ${SANS}`,
        )}
      >
        <span style={css(`font:600 13px/1 ${MONO}`)}>‹</span>Todos os chamados
      </NavLink>

      <div style={css(`padding:17px 19px;${PANEL}`)}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap")}>
          <div style={css("min-width:0;flex:1")}>
            <div style={css(`font:600 10.5px ${MONO};letter-spacing:.12em;color:var(--muted)`)}>
              PROTOCOLO {ticket.id}
            </div>
            <h1
              style={css(
                `margin:6px 0 0;font:700 19px/1.3 ${SANS};letter-spacing:-.01em;text-wrap:pretty`,
              )}
            >
              {ticket.subject}
            </h1>
            <p style={css(`margin:6px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
              {ticket.category} · aberto em {dateLabel(first.d, first.time)} ·{" "}
              {ticket.messages.length} {ticket.messages.length === 1 ? "mensagem" : "mensagens"}
            </p>
          </div>
          <span
            style={css(
              `flex:none;padding:7px 14px;border-radius:999px;background:${st.bg};color:${st.color};font:600 12px ${SANS}`,
            )}
          >
            {st.label}
          </span>
        </div>
      </div>

      <div style={css("display:flex;flex-direction:column;gap:10px;margin-top:12px")}>
        {ticket.messages.map((m, i) => (
          <Message key={i} msg={m} />
        ))}
      </div>

      {reply ? (
        <div style={css(`margin-top:12px;padding:16px;${PANEL}`)}>
          <div style={css(`font:600 13.5px ${SANS}`)}>Responder ao suporte</div>
          <p style={css(`margin:4px 0 11px;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
            O atendimento é por chamado: sua resposta entra na fila e a devolutiva aparece aqui. Não é
            preciso ficar com a tela aberta.
          </p>

          <textarea
            value={f.text}
            onChange={(e) => a.set({ replyForm: { ...f, text: e.target.value } })}
            rows={3}
            placeholder="Escreva sua resposta para o suporte..."
            style={css(
              "width:100%;box-sizing:border-box;resize:vertical;padding:12px 13px;border:1px solid var(--border);" +
                `border-radius:11px;background:var(--surface2);font:400 13.5px/1.55 ${SANS};color:var(--text);outline:none`,
            )}
          />

          {f.attachment && (
            <div
              style={css(
                "display:inline-flex;align-items:center;gap:9px;margin-top:10px;padding:7px 8px 7px 11px;" +
                  `border:1px solid var(--border);border-radius:9px;background:var(--surface2);font:600 11.5px ${SANS};color:var(--text2)`,
              )}
            >
              <span style={css(`font:600 10px ${MONO};letter-spacing:.08em;color:var(--muted)`)}>IMG</span>
              {fileNameOf(f.attachment)}
              <Button
                onClick={() => a.set({ replyForm: { ...f, attachment: "" } })}
                title="Remover anexo"
                style={css(
                  `width:20px;height:20px;border-radius:6px;background:var(--surface3);color:var(--muted);font:600 12px/1 ${MONO}`,
                )}
              >
                ×
              </Button>
            </div>
          )}

          <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px")}>
            <EnviarArquivo
              bucket={SUPPORT_BUCKET}
              onDone={(path) => a.set({ replyForm: { ...f, attachment: path } })}
              style={css(
                `display:inline-block;padding:11px 15px;border-radius:10px;border:1px dashed var(--border2);background:var(--surface2);color:var(--text2);font:600 12.5px ${SANS}`,
              )}
            >
              Anexar print
            </EnviarArquivo>
            <span style={css("flex:1;min-width:0")} />
            <Button
              onClick={() =>
                a.confirm({
                  title: "Marcar como resolvido?",
                  text: "O chamado vai para o histórico e o suporte para de acompanhá-lo.",
                  summary: ticket.subject,
                  detail: `Protocolo ${ticket.id} · ${ticket.category}`,
                  reversal: "Se o problema voltar, é só reabrir — a conversa continua guardada.",
                  button: "Marcar resolvido",
                  buttonBg: "var(--pos)",
                  buttonInk: "#fff",
                  color: "var(--pos)",
                  action: () => a.resolveTicket(ticket.id),
                })
              }
              className="hv-pos-borda"
              style={css(
                `padding:12px 17px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--pos);font:600 13px ${SANS}`,
              )}
            >
              Já está resolvido
            </Button>
            <Button
              onClick={() =>
                f.text.trim()
                  ? a.replyToTicket(ticket.id)
                  : a.notify("Escreva a sua resposta", "warn")
              }
              className="hv-brilho"
              style={css(primaryButton("sm"))}
            >
              Enviar resposta
            </Button>
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
          <Button
            onClick={() => a.reopenTicket(ticket.id)}
            className="hv-borda"
            style={css(
              `flex:none;padding:12px 18px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text);font:600 13px ${SANS}`,
            )}
          >
            Reabrir chamado
          </Button>
        </div>
      )}
    </div>
  );
}

function Message({ msg: m }: { msg: TicketMessage }) {
  const { d } = usePortal();

  if (m.author === "system") {
    return (
      <div style={css("display:flex;align-items:center;gap:10px;padding:2px 4px")}>
        <span style={css("flex:1;height:1px;background:var(--border)")} />
        <span style={css(`flex:none;font:500 11.5px ${SANS};color:var(--muted)`)}>
          {m.text} · {dateLabel(m.d, m.time)}
        </span>
        <span style={css("flex:1;height:1px;background:var(--border)")} />
      </div>
    );
  }

  const fromSupport = m.author === "support";
  const author = fromSupport ? "Suporte Aguiar One" : d.business.user.name;

  return (
    <div
      style={css(
        "display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:13px;" +
          `border:1px solid ${fromSupport ? "var(--accent-soft)" : "var(--border)"};` +
          `background:${fromSupport ? "var(--accent-soft)" : "var(--surface)"}`,
      )}
    >
      <span
        style={css(
          "flex:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
            `font:700 11px ${MONO};` +
            (fromSupport
              ? "background:var(--accent);color:var(--accent-ink)"
              : "background:var(--surface3);color:var(--text2)"),
        )}
      >
        {fromSupport ? "SP" : initialsOf(author)}
      </span>

      <span style={css("flex:1;min-width:0")}>
        <span style={css("display:flex;align-items:baseline;gap:9px;flex-wrap:wrap")}>
          <span
            style={css(`font:600 13px ${SANS};color:${fromSupport ? "var(--accent)" : "var(--text)"}`)}
          >
            {author}
          </span>
          <span style={css(`font:500 11.5px ${MONO};color:var(--muted)`)}>
            {dateLabel(m.d, m.time)}
          </span>
        </span>

        <span
          style={css(
            `display:block;margin-top:7px;font:400 13.5px/1.62 ${SANS};color:var(--text2);white-space:pre-line;text-wrap:pretty`,
          )}
        >
          {m.text}
        </span>

        {m.attachment && <Attachment path={m.attachment} />}
      </span>
    </div>
  );
}

/**
 * O anexo de uma mensagem.
 *
 * O bucket é privado: não existe URL fixa para colocar num `href`, e é por
 * isso que abrir é uma AÇÃO e não um link — a URL assinada só passa a existir
 * no clique, e vale por um minuto.
 *
 * O `isStoragePath` separa os anexos de verdade das linhas antigas, gravadas
 * quando o botão só escrevia `"print-da-tela.png"` sem arquivo nenhum atrás.
 * Essas continuam aparecendo, e continuam sem abrir: transformá-las em botão
 * seria prometer de novo o que já não existe.
 */
function Attachment({ path }: { path: string }) {
  const { a } = usePortal();

  const chip =
    "display:inline-flex;align-items:center;gap:8px;margin-top:10px;padding:7px 11px;" +
    `border:1px solid var(--border);border-radius:9px;background:var(--surface);font:600 11.5px ${SANS};color:var(--text2)`;
  const tag = `font:600 10px ${MONO};letter-spacing:.08em;color:var(--muted)`;

  if (!isStoragePath(path)) {
    return (
      <span style={css(chip)} title="Este anexo é de antes do envio de arquivos e não pode ser aberto.">
        <span style={css(tag)}>IMG</span>
        {path}
      </span>
    );
  }

  return (
    <Button
      onClick={async () => {
        const erro = await openAttachment(path);
        if (erro) a.notify(erro, "error");
      }}
      className="hv-linha2"
      title="Abrir o anexo numa nova aba"
      style={css(chip)}
    >
      <span style={css(tag)}>IMG</span>
      {fileNameOf(path)}
    </Button>
  );
}
