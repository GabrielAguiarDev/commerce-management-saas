"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, LabeledField, css, MONO, ModalFooter, FIELD_LABEL, SANS } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { SP_CATEGORIES } from "@/lib/dados/chamados";

/**
 * Abrir chamado.
 *
 * A categoria vem antes da descrição de propósito: escolher "Problema técnico"
 * ou "Financeiro" muda o que a pessoa entende que precisa contar, e o exemplo
 * embaixo de cada opção faz esse trabalho melhor do que um texto de ajuda.
 */
export function NewTicketModal() {
  const { s, a } = usePortal();
  const f = s.ticketForm;

  const subjectError = f.submitted && f.subject.trim().length < 5;
  const descriptionError = f.submitted && f.description.trim().length < 15;

  const set = (p: Partial<typeof f>) => a.set({ ticketForm: { ...f, ...p } });

  return (
    <ModalFrame
      closeLabel="Fechar"
      title="Abrir chamado"
      subtitle="Conte o que aconteceu. A resposta chega aqui no portal, normalmente em até 1 dia útil."
      width={540}
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.sendTicket}
          confirmText="Enviar chamado"
        />
      }
    >
      <LabeledField
        label="Assunto"
        value={f.subject}
        onChange={(v) => set({ subject: v })}
        placeholder="Ex.: não consigo fechar o caixa"
        error={subjectError}
        message="Escreva um assunto com pelo menos 5 letras."
      />

      <div>
        <label style={css(FIELD_LABEL)}>Categoria</label>
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px")}>
          {SP_CATEGORIES.map(([name, note]) => {
            const active = f.category === name;
            return (
              <Button
                key={name}
                onClick={() => set({ category: name })}
                style={css(
                  `display:flex;flex-direction:column;gap:3px;padding:11px 13px;border:1px solid ${active ? "var(--accent)" : "var(--border)"};` +
                    `border-radius:11px;background:${active ? "var(--accent-soft)" : "var(--surface2)"};text-align:left`,
                )}
              >
                <span
                  style={css(
                    `font:600 12.5px ${SANS};color:${active ? "var(--accent)" : "var(--text)"}`,
                  )}
                >
                  {name}
                </span>
                <span
                  style={css(
                    `font:400 11px/1.35 ${SANS};color:${active ? "var(--accent)" : "var(--muted)"}`,
                  )}
                >
                  {note}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={css(FIELD_LABEL)}>O que aconteceu</label>
        <textarea
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={5}
          placeholder="Descreva o passo a passo, o que você esperava e o que apareceu na tela."
          style={css(
            `width:100%;box-sizing:border-box;resize:vertical;padding:12px 13px;border:1px solid ${descriptionError ? "var(--danger)" : "var(--border)"};` +
              `border-radius:11px;background:var(--surface2);font:400 13.5px/1.55 ${SANS};color:var(--text);outline:none`,
          )}
        />
        {descriptionError && (
          <div style={css(`margin-top:6px;font:600 11.5px ${SANS};color:var(--danger)`)}>
            Conte com um pouco mais de detalhe — ajuda a resolver mais rápido.
          </div>
        )}
      </div>

      <div>
        <label style={css(FIELD_LABEL)}>Anexo (opcional)</label>
        {f.attachment ? (
          <div
            style={css(
              `display:inline-flex;align-items:center;gap:9px;padding:9px 9px 9px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);font:600 12px ${SANS};color:var(--text2)`,
            )}
          >
            <span style={css(`font:600 10px ${MONO};letter-spacing:.08em;color:var(--muted)`)}>IMG</span>
            {f.attachment}
            <Button
              onClick={() => set({ attachment: "" })}
              title="Remover anexo"
              style={css(
                `width:22px;height:22px;border-radius:6px;background:var(--surface3);color:var(--muted);font:600 12px/1 ${MONO}`,
              )}
            >
              ×
            </Button>
          </div>
        ) : (
          <Button
            // Sem backend de upload nesta fase: o anexo é registrado pelo nome,
            // que é o que a conversa precisa mostrar.
            onClick={() => set({ attachment: "print-da-tela.png" })}
            style={css(
              "display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:15px;" +
                `border:1px dashed var(--border2);border-radius:11px;background:var(--surface2);color:var(--text2);font:600 12.5px ${SANS}`,
            )}
          >
            <span style={css(`font:600 12px/1 ${MONO};color:var(--muted)`)}>IMG</span>
            Anexar imagem ou print da tela
          </Button>
        )}
      </div>
    </ModalFrame>
  );
}
