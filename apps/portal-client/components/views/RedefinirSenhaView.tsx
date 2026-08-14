"use client";

import { Button, css, SANS } from "@aguiar/ui";
import { useState } from "react";
import { setNewPassword } from "@/app/redefinir-senha/actions";
import { AUTH_BUTTON, AuthNotice, AuthShell, FIELD, LABEL } from "@/components/AuthShell";
import { MIN_PASSWORD, passwordProblem } from "@/lib/senha";

/**
 * A escolha da nova senha.
 *
 * A pessoa já está autenticada quando chega aqui — quem trocou o token do
 * e-mail por sessão foi `app/auth/confirmar/route.ts`. Em caso de sucesso esta
 * tela não navega: a Server Action encerra a sessão e redireciona para o login
 * por conta própria, e é por isso que não há nada depois do `await`.
 */
export function RedefinirSenhaView({ email }: { email: string }) {
  const [password, setSenha] = useState("");
  const [confirmation, setConfirmacao] = useState("");
  const [loading, setCarregando] = useState(false);
  const [error, setErro] = useState<string | null>(null);

  const submit = async () => {
    // A resposta imediata da tela. A mesma regra roda de novo no servidor.
    const problem = passwordProblem(password, confirmation);
    if (problem) {
      setErro(problem);
      return;
    }

    setCarregando(true);
    setErro(null);

    const r = await setNewPassword(password, confirmation);

    // Só chega aqui quando deu errado: no caminho feliz a ação redireciona, e
    // esta promessa nunca resolve.
    if (!r.ok) {
      setErro(r.message);
      setCarregando(false);
    }
  };

  return (
    <AuthShell
      title="Criar nova senha"
      subtitle={
        email ? `Você está definindo a senha de ${email}.` : "Escolha a nova senha da sua conta."
      }
    >
      <form
        style={css("display:flex;flex-direction:column;gap:18px")}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!loading) void submit();
        }}
      >
        {/*
          O campo de usuário escondido é para os gerenciadores de senha: sem ele
          o navegador vê dois campos de senha soltos e não sabe A QUAL conta a
          nova senha pertence — muitos deixam de oferecer a atualização.
        */}
        <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

        <div>
          <label style={css(LABEL)} htmlFor="senha">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(ev) => setSenha(ev.target.value)}
            placeholder="••••••••"
            className="field"
            style={css(FIELD)}
          />
          <p style={css(`margin:6px 0 0;font:400 11.5px/1.4 ${SANS};color:var(--muted)`)}>
            Pelo menos {MIN_PASSWORD} caracteres.
          </p>
        </div>

        <div>
          <label style={css(LABEL)} htmlFor="confirmacao">
            Repita a nova senha
          </label>
          <input
            id="confirmacao"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(ev) => setConfirmacao(ev.target.value)}
            placeholder="••••••••"
            className="field"
            style={css(FIELD)}
          />
        </div>

        {error && <AuthNotice tone="danger">{error}</AuthNotice>}

        <Button
          type="submit"
          loading={loading}
          loadingLabel="Salvando…"
          className="hv-glow"
          style={css(AUTH_BUTTON)}
        >
          Salvar nova senha
        </Button>

        <p style={css(`margin:0;text-align:center;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
          Por segurança, você vai entrar de novo com a senha nova.
        </p>
      </form>
    </AuthShell>
  );
}
