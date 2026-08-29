"use client";

import { css } from "@aguiar/ui";
import { useState } from "react";
import { COPY } from "@/lib/dictionary";
import { DISPLAY, ctaPrimary } from "@/lib/styleKit";

/**
 * O formulário de contato.
 *
 * ┌─ ELE NÃO ENVIA NADA, E ISSO ESTÁ ESCRITO NA TELA ──────────────────────┐
 * │ O botão monta um `mailto:` com o assunto e o corpo já preenchidos e    │
 * │ entrega ao aplicativo de e-mail do visitante. É o único jeito de esta  │
 * │ página continuar ESTÁTICA e sem chave de terceiro nenhuma — não há     │
 * │ servidor de e-mail, não há fila, não há caixa de spam para vigiar.     │
 * │                                                                        │
 * │ O preço disso é real: quem não tem e-mail configurado no aparelho      │
 * │ clica e não acontece nada. Por isso duas coisas são obrigatórias e     │
 * │ nenhuma é decoração: o aviso embaixo do botão, dizendo o que vai       │
 * │ acontecer, e o WhatsApp ao lado, que é o caminho de quem não usa       │
 * │ e-mail. Trocar isto por envio de verdade é uma Server Action e uma     │
 * │ chave — a página inteira continua igual.                               │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * O CORPO DO E-MAIL É MONTADO COM OS RÓTULOS DO DICIONÁRIO. Assim a mensagem
 * que chega já vem separada em nome, e-mail, negócio e texto, em vez de um
 * parágrafo solto de onde alguém precisa garimpar o telefone.
 */
export function ContactForm({ to, hasWhatsapp }: { to: string; hasWhatsapp: boolean }) {
  const f = COPY.pages.contact.form;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body = [
      `${f.name}: ${name}`,
      `${f.email}: ${email}`,
      business ? `${f.business}: ${business}` : null,
      "",
      message,
    ]
      .filter((l) => l !== null)
      .join("\n");

    // `encodeURIComponent` nas duas partes: sem ele um "&" no nome do negócio
    // cortaria o corpo do e-mail ao meio, e uma quebra de linha viraria espaço.
    window.location.href =
      `mailto:${to}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={onSubmit}>
      <h2
        style={css(
          `font-family:${DISPLAY};font-size:19px;font-weight:700;color:var(--petrol);margin:0 0 18px`,
        )}
      >
        {f.title}
      </h2>

      <Field id="nome" label={f.name}>
        <input
          id="nome"
          name="nome"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={f.namePlaceholder}
          style={css(INPUT)}
        />
      </Field>

      <Field id="email" label={f.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={f.emailPlaceholder}
          style={css(INPUT)}
        />
      </Field>

      <Field id="negocio" label={f.business}>
        <input
          id="negocio"
          name="negocio"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          placeholder={f.businessPlaceholder}
          style={css(INPUT)}
        />
      </Field>

      <Field id="mensagem" label={f.message}>
        <textarea
          id="mensagem"
          name="mensagem"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={f.messagePlaceholder}
          style={css(INPUT + "resize:vertical;min-height:120px")}
        />
      </Field>

      <button type="submit" className="lp-cta" style={css(ctaPrimary(15.5, "14px 24px") + "border:0;cursor:pointer")}>
        {f.submit}
      </button>

      {/* O aviso muda conforme o WhatsApp esteja ou não na página: ele aponta
          para o outro caminho, e o outro caminho nem sempre é o mesmo. */}
      <p style={css("font-size:13px;line-height:1.55;color:var(--muted);margin:14px 0 0")}>
        {hasWhatsapp ? f.note : f.noteNoWhatsapp}
      </p>
    </form>
  );
}

/**
 * `font:inherit` NÃO É DETALHE: sem ele o navegador desenha campo e botão na
 * fonte do sistema, e o formulário fica sendo a única parte do site que não
 * está em IBM Plex. `width:100%` com `box-sizing` do reset para o campo não
 * estourar a coluna por causa do próprio `padding`.
 */
const INPUT =
  "width:100%;box-sizing:border-box;font:inherit;font-size:15px;" +
  "padding:12px 14px;border-radius:12px;border:1px solid var(--border);" +
  "background:var(--surface);color:var(--ink);";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={css("margin-bottom:16px")}>
      <label
        htmlFor={id}
        style={css("display:block;font-size:13.5px;font-weight:600;color:var(--text3);margin-bottom:6px")}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
