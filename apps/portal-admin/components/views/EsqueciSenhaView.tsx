"use client";

import { Button, css } from "@aguiar/ui";
import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/app/esqueci-senha/actions";
import { useAdmin } from "@/components/AdminProvider";
import { AUTH_BUTTON, AUTH_LINK, AuthNotice, AuthShell, FIELD, LABEL, stack, STACK } from "@/components/AuthShell";
import { ROUTES } from "@/lib/rotas";

/**
 * "Esqueci minha senha": a pessoa informa o e-mail e recebe o link.
 *
 * A tela NÃO diz se aquele e-mail tem conta — nem no texto, nem mostrando um
 * erro diferente. Ver o comentário sobre sigilo em `app/esqueci-senha/actions.ts`.
 *
 * O envio é uma Server Action, e não o `resetPasswordForEmail` do navegador: é
 * o que garante que o `redirectTo` saia de `NEXT_PUBLIC_SITE_URL`, o único
 * endereço que está na allowlist do Supabase.
 */
export function EsqueciSenhaView() {
  const { a } = useAdmin();
  const { L } = a;

  const [email, setEmail] = useState("");
  const [loading, setCarregando] = useState(false);
  const [error, setErro] = useState<string | null>(null);
  const [sent, setEnviado] = useState(false);

  const submit = async () => {
    setCarregando(true);
    setErro(null);

    const r = await requestPasswordReset(email);

    // O único erro que chega aqui é de ambiente ou de campo vazio. "Não existe
    // conta com esse e-mail" nunca vira erro: é sucesso, igual aos outros.
    if (!r.ok) {
      setErro(r.message);
      setCarregando(false);
      return;
    }

    setEnviado(true);
    setCarregando(false);
  };

  const voltar = (
    <p style={css("margin:0;text-align:center;font-size:12px;line-height:1.5;color:var(--muted)")}>
      <Link
        href={ROUTES.login}
        style={css("color:var(--accent-text);text-decoration:underline")}
      >
        {L.voltarLogin}
      </Link>
    </p>
  );

  if (sent)
    return (
      <AuthShell title={L.verifiqueEmail} subtitle={L.linkEnviado} header={false}>
        <div style={css(stack("14px") + ";align-items:center;text-align:center")}>
          <div
            style={css(
              "width:38px;height:38px;border-radius:10px;background:var(--pos-soft);" +
                "border:1px solid var(--pos-line);color:var(--pos);display:flex;" +
                "align-items:center;justify-content:center;font-size:16px;font-weight:700",
            )}
          >
            ✓
          </div>
          <h1 style={css("margin:0;font-size:22px;font-weight:700;color:var(--text)")}>
            {L.verifiqueEmail}
          </h1>
          <p style={css("margin:0;font-size:13px;color:var(--muted);line-height:1.55")}>
            {L.linkEnviado}
          </p>

          <AuthNotice tone="pos">{L.linkEnviadoNota}</AuthNotice>

          <p style={css("margin:0;font-size:12px;line-height:1.5;color:var(--muted)")}>
            {L.naoChegou}{" "}
            {/* Volta ao formulário no próprio componente: recarregar a rota
                perderia o e-mail que a pessoa acabou de digitar. */}
            <button
              type="button"
              onClick={() => setEnviado(false)}
              style={css(
                "padding:0;border:0;background:none;cursor:pointer;text-decoration:underline;" +
                  "font-size:12px;font-weight:600;color:var(--accent-text)",
              )}
            >
              {L.tentarOutroEmail}
            </button>
          </p>

          {voltar}
        </div>
      </AuthShell>
    );

  return (
    <AuthShell title={L.esqueciTitulo} subtitle={L.esqueciSub}>
      <form
        style={css(STACK)}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!loading) void submit();
        }}
      >
        <label style={css("display:flex;flex-direction:column;gap:6px")}>
          <span style={css(LABEL)}>{L.email}</span>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(ev) => {
              setErro(null);
              setEmail(ev.target.value);
            }}
            placeholder="nome@aguiarone.com.br"
            className="field"
            style={css(FIELD)}
          />
        </label>

        {error && <AuthNotice tone="danger">{error}</AuthNotice>}

        <Button
          type="submit"
          loading={loading}
          loadingLabel={L.enviando}
          className="hv-glow"
          style={css(AUTH_BUTTON)}
        >
          {L.enviarLink}
        </Button>

        <Link href={ROUTES.login} className="hv-acc" style={css(AUTH_LINK)}>
          {L.voltarLogin}
        </Link>
      </form>
    </AuthShell>
  );
}
