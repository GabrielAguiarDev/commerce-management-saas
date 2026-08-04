"use client";

import { css, MONO, SANS } from "@aguiar/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CARTAO =
  "background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;" +
  "display:flex;flex-direction:column;gap:16px;box-shadow:var(--shadow-lg)";

const CAMPO =
  "width:100%;border:1.5px solid var(--border2);background:var(--surface2);color:var(--text);" +
  `border-radius:11px;padding:13px 14px;font:500 14px ${SANS};outline:none`;

const ROTULO = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/** O motivo pelo qual o middleware devolveu a pessoa para cá. */
const MOTIVOS: Record<string, string> = {
  "e-admin":
    "Esta conta é de administrador da plataforma. Use o painel admin, não o portal do cliente.",
  "sem-negocio":
    "Esta conta ainda não está ligada a um negócio. Fale com o suporte para liberar o seu acesso.",
};

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(MOTIVOS[params.get("erro") ?? ""] ?? null);

  /**
   * Entra com e-mail e senha.
   *
   * Roda no NAVEGADOR e usa o cliente público — é o suficiente: o Supabase
   * valida a credencial e devolve a sessão num cookie. Quem decide se esta
   * conta pode usar o portal é o middleware, no próximo carregamento.
   */
  const entrar = async () => {
    const e = email.trim();
    if (!e || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }

    setCarregando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: senha });

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
          style={css(CARTAO)}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!carregando) void entrar();
          }}
        >
          <div>
            <h1 style={css(`margin:0;font:700 19px/1.25 ${SANS}`)}>Entrar no portal</h1>
            <p style={css(`margin:5px 0 0;font:400 13px/1.5 ${SANS};color:var(--muted)`)}>
              Use o e-mail que você cadastrou com a nossa equipe.
            </p>
          </div>

          <div>
            <label style={css(ROTULO)} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="voce@seunegocio.com.br"
              style={css(CAMPO)}
            />
          </div>

          <div>
            <label style={css(ROTULO)} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(ev) => setSenha(ev.target.value)}
              placeholder="••••••••"
              style={css(CAMPO)}
            />
          </div>

          {erro && (
            <div
              style={css(
                "padding:11px 13px;border-radius:10px;background:var(--warn-soft);" +
                  `font:600 12.5px/1.45 ${SANS};color:var(--danger)`,
              )}
              role="alert"
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className={carregando ? undefined : "hv-brilho"}
            style={css(
              `padding:14px;border-radius:11px;font:700 14px ${SANS};` +
                (carregando
                  ? "background:var(--surface3);color:var(--muted);cursor:progress"
                  : "background:var(--accent);color:var(--accent-ink)"),
            )}
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>

          <p style={css(`margin:0;text-align:center;font:400 11.5px/1.5 ${SANS};color:var(--muted)`)}>
            Esqueceu a senha ou não consegue entrar? Fale com a nossa equipe.
          </p>
        </form>
      </div>
    </div>
  );
}
