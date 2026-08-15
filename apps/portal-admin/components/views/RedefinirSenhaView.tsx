"use client";

import { Button, css } from "@aguiar/ui";
import { useState } from "react";
import { setNewPassword } from "@/app/redefinir-senha/actions";
import { useAdmin } from "@/components/AdminProvider";
import { AUTH_BUTTON, AuthNotice, AuthShell, FIELD, LABEL, STACK } from "@/components/AuthShell";
import { MIN_PASSWORD, passwordProblem } from "@/lib/senha";

/** 0 = inutilizável, 3 = forte. Comprimento, classes misturadas, e o resto. */
function passwordStrength(v: string): number {
  if (!v) return 0;
  let n = 0;
  if (v.length >= MIN_PASSWORD) n++;
  if (/\d/.test(v) && /[a-zA-Z]/.test(v)) n++;
  if (v.length >= MIN_PASSWORD + 4 || /[^\w\s]/.test(v)) n++;
  return n;
}

/**
 * A escolha da nova senha.
 *
 * A pessoa já está autenticada quando chega aqui — quem trocou o token do
 * e-mail por sessão foi `app/auth/confirmar/route.ts`, e quem confere se essa
 * sessão existe é `app/redefinir-senha/page.tsx`, antes desta tela renderizar.
 * Em caso de sucesso esta tela não navega: a Server Action encerra a sessão e
 * redireciona para o login por conta própria, e é por isso que não há nada
 * depois do `await`.
 *
 * A barrinha de força é só orientação visual — quem decide o que passa é
 * `passwordProblem`, no cliente e de novo no servidor.
 */
export function RedefinirSenhaView({ email }: { email: string }) {
  const { a } = useAdmin();
  const { L } = a;

  const [password, setSenha] = useState("");
  const [confirmation, setConfirmacao] = useState("");
  const [loading, setCarregando] = useState(false);
  const [error, setErro] = useState<string | null>(null);

  const nf = passwordStrength(password);

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
      title={L.redefinirTitulo}
      subtitle={email ? L.definindoSenhaDe.replace("{email}", email) : L.redefinirSub}
    >
      <form
        style={css(STACK)}
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

        <label style={css("display:flex;flex-direction:column;gap:6px")}>
          <span style={css(LABEL)}>{L.criarSenha}</span>
          <input
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(ev) => {
              setErro(null);
              setSenha(ev.target.value);
            }}
            placeholder="••••••••"
            className="field"
            style={css(FIELD)}
          />

          <div style={css("display:flex;gap:5px;padding-top:2px")}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={css(
                  "flex:1;height:4px;border-radius:99px;background:" +
                    (nf >= i
                      ? nf === 1
                        ? "var(--danger)"
                        : nf === 2
                          ? "var(--warn)"
                          : "var(--pos)"
                      : "var(--border)"),
                )}
              />
            ))}
          </div>

          <span
            style={css(
              "font-size:11.5px;font-weight:500;color:" +
                (nf === 0
                  ? "var(--muted)"
                  : nf === 1
                    ? "var(--danger)"
                    : nf === 2
                      ? "var(--warn)"
                      : "var(--pos)"),
            )}
          >
            {nf === 0
              ? L.minimoSenha.replace("{n}", String(MIN_PASSWORD))
              : nf === 1
                ? L.forcaFraca
                : nf === 2
                  ? L.forcaMedia
                  : L.forcaForte}
          </span>
        </label>

        <label style={css("display:flex;flex-direction:column;gap:6px")}>
          <span style={css(LABEL)}>{L.confirmarSenha}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(ev) => {
              setErro(null);
              setConfirmacao(ev.target.value);
            }}
            placeholder="••••••••"
            className="field"
            style={css(FIELD)}
          />
        </label>

        {error && <AuthNotice tone="danger">{error}</AuthNotice>}

        <Button
          type="submit"
          loading={loading}
          loadingLabel={L.salvando}
          className="hv-glow"
          style={css(AUTH_BUTTON)}
        >
          {L.salvarSenha}
        </Button>

        <p
          style={css(
            "margin:0;text-align:center;font-size:12px;line-height:1.5;color:var(--muted)",
          )}
        >
          {L.entrarDeNovo}
        </p>
      </form>
    </AuthShell>
  );
}
