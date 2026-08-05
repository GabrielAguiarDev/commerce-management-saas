"use client";

import { Button, css, MONO, SANS } from "@aguiar/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CARD =
  "background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;" +
  "display:flex;flex-direction:column;gap:16px;box-shadow:var(--shadow-lg)";

const FIELD =
  "width:100%;border:1.5px solid var(--border2);background:var(--surface2);color:var(--text);" +
  `border-radius:11px;padding:13px 14px;font:500 14px ${SANS};outline:none`;

const LABEL = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/** O motivo pelo qual o middleware devolveu a pessoa para cá. */
const REASONS: Record<string, string> = {
  "e-admin":
    "Esta conta é de administrador da plataforma. Use o painel admin, não o portal do cliente.",
  "sem-negocio":
    "Esta conta ainda não está ligada a um negócio. Fale com o suporte para liberar o seu acesso.",
};

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setSenha] = useState("");
  const [loading, setCarregando] = useState(false);
  const [error, setErro] = useState<string | null>(REASONS[params.get("error") ?? ""] ?? null);

  /**
   * Entra com e-mail e senha.
   *
   * Roda no NAVEGADOR e usa o cliente público — é o suficiente: o Supabase
   * valida a credencial e devolve a sessão num cookie. Quem decide se esta
   * conta pode usar o portal é o middleware, no próximo carregamento.
   */
  const signIn = async () => {
    const e = email.trim();
    if (!e || !password) {
      setErro("Informe e-mail e senha.");
      return;
    }

    setCarregando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: password });

    if (error) {
      // Não distinguimos "e-mail não existe" de "senha errada": isso contaria a
      // quem tenta adivinhar quais e-mails têm conta.
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }

    // `refresh` antes de navegar: o layout é Server Component e precisa ser
    // refeito já com a sessão nova, ou a primeira tela viria vazia.
    router.refresh();
    router.replace("/");
  };

  return (
    <div
      style={css(
        "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)",
      )}
    >
      <div style={css("width:100%;max-width:400px")}>
        <div style={css("display:flex;align-items:center;gap:11px;margin-bottom:18px")}>
          <span
            style={css(
              "flex:none;width:40px;height:40px;border-radius:11px;background:var(--petrol);color:#fff;" +
                `display:flex;align-items:center;justify-content:center;font:700 14px ${MONO};letter-spacing:-.5px`,
            )}
          >
            A1
          </span>
          <div>
            <div style={css(`font:700 16px/1.2 ${SANS};color:var(--text)`)}>Aguiar One</div>
            <div style={css(`margin-top:2px;font:500 12px ${SANS};color:var(--muted)`)}>
              Portal do seu negócio
            </div>
          </div>
        </div>

        <form
          style={css(CARD)}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!loading) void signIn();
          }}
        >
          <div>
            <h1 style={css(`margin:0;font:700 19px/1.25 ${SANS}`)}>Entrar no portal</h1>
            <p style={css(`margin:5px 0 0;font:400 13px/1.5 ${SANS};color:var(--muted)`)}>
              Use o e-mail que você cadastrou com a nossa equipe.
            </p>
          </div>

          <div>
            <label style={css(LABEL)} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="voce@seunegocio.com.br"
              style={css(FIELD)}
            />
          </div>

          <div>
            <label style={css(LABEL)} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setSenha(ev.target.value)}
              placeholder="••••••••"
              style={css(FIELD)}
            />
          </div>

          {error && (
            <div
              style={css(
                "padding:11px 13px;border-radius:10px;background:var(--warn-soft);" +
                  `font:600 12.5px/1.45 ${SANS};color:var(--danger)`,
              )}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Quem espera aqui é o `onSubmit` do formulário — o Enter no field
              de senha também entra —, então o carregamento vem de fora. */}
          <Button
            type="submit"
            loading={loading}
            loadingLabel="Entrando…"
            className="hv-brilho"
            style={css(
              `padding:14px;border-radius:11px;font:700 14px ${SANS};` +
                "background:var(--accent);color:var(--accent-ink)",
            )}
          >
            Entrar
          </Button>

          <p style={css(`margin:0;text-align:center;font:400 11.5px/1.5 ${SANS};color:var(--muted)`)}>
            Esqueceu a senha ou não consegue entrar? Fale com a nossa equipe.
          </p>
        </form>
      </div>
    </div>
  );
}
