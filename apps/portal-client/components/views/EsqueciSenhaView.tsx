"use client";

import { Button, css, SANS } from "@aguiar/ui";
import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/app/esqueci-senha/actions";
import { AUTH_BUTTON, AuthNotice, AuthShell, FIELD, LABEL } from "@/components/AuthShell";

/**
 * "Esqueci minha senha": a pessoa informa o e-mail e recebe o link.
 *
 * A tela NÃO diz se aquele e-mail tem conta — nem no texto, nem mostrando um
 * erro diferente. Ver o comentário sobre sigilo em `app/esqueci-senha/actions.ts`.
 */
export function EsqueciSenhaView() {
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

  if (sent)
    return (
      <AuthShell
        title="Verifique seu e-mail"
        subtitle="Se houver uma conta com esse endereço, o link para criar uma nova senha já está a caminho."
      >
        <AuthNotice tone="pos">
          O link vale por tempo limitado e só pode ser usado uma vez. Não esqueça de olhar a caixa
          de spam.
        </AuthNotice>

        <p style={css(`margin:0;text-align:center;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
          Não chegou?{" "}
          {/* Volta ao formulário no próprio componente: recarregar a rota
              perderia o e-mail que a pessoa acabou de digitar. */}
          <button
            type="button"
            onClick={() => setEnviado(false)}
            style={css(
              "padding:0;border:0;background:none;cursor:pointer;text-decoration:underline;" +
                `font:600 12px ${SANS};color:var(--accent-text)`,
            )}
          >
            Tentar com outro e-mail
          </button>
        </p>

        <p style={css(`margin:0;text-align:center;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
          <Link href="/login" style={css("color:var(--accent-text);text-decoration:underline")}>
            Voltar para a entrada
          </Link>
        </p>
      </AuthShell>
    );

  return (
    <AuthShell
      title="Esqueceu a senha?"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova."
    >
      <form
        style={css("display:flex;flex-direction:column;gap:18px")}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!loading) void submit();
        }}
      >
        <div>
          <label style={css(LABEL)} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="voce@seunegocio.com.br"
            className="field"
            style={css(FIELD)}
          />
        </div>

        {error && <AuthNotice tone="danger">{error}</AuthNotice>}

        <Button
          type="submit"
          loading={loading}
          loadingLabel="Enviando…"
          className="hv-glow"
          style={css(AUTH_BUTTON)}
        >
          Enviar link
        </Button>

        <p style={css(`margin:0;text-align:center;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
          Lembrou a senha?{" "}
          <Link href="/login" style={css("color:var(--accent-text);text-decoration:underline")}>
            Voltar para a entrada
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
