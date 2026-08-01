"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { css } from "@/lib/css";
import { MarcaIcone } from "@/lib/icons";
import { ROTAS } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/client";

/** 0 = unusable, 3 = strong. Length, mixed classes, then length-or-symbol. */
function forcaSenha(v: string): number {
  if (!v) return 0;
  let n = 0;
  if (v.length >= 8) n++;
  if (/\d/.test(v) && /[a-zA-Z]/.test(v)) n++;
  if (v.length >= 12 || /[^\w\s]/.test(v)) n++;
  return n;
}

const cartao = (gap = "16px") =>
  "background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:26px;" +
  `display:flex;flex-direction:column;gap:${gap};box-shadow:0 12px 32px rgba(9,26,33,.09)`;

const CARTAO = cartao();

const CAMPO =
  "border:1px solid var(--line);background:var(--field);color:var(--tx);border-radius:9px;" +
  "padding:11px 13px;font-size:13.5px;outline:none";

const ROTULO =
  "font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--tx3)";

const PRIMARIO =
  "background:var(--acc);border:1px solid var(--acc);color:var(--accTx);font-size:14px;" +
  "font-weight:600;padding:12px;border-radius:9px;cursor:pointer";

export function LoginView() {
  const { s, a } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const params = useSearchParams();
  const nf = forcaSenha(s.senha1);
  const pt = s.idioma === "pt";

  // Estado do próprio formulário de acesso: não é sessão do painel, então não
  // vale a pena guardar no estado global.
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(
    // O middleware manda para cá quem está logado mas não é admin da plataforma.
    params.get("erro") === "nao-admin"
      ? pt
        ? "Esta conta não é de administrador da plataforma."
        : "This account is not a platform administrator."
      : null,
  );

  /**
   * Entra com e-mail e senha.
   *
   * Segurança: roda no NAVEGADOR, então usa o cliente público (anon). É o
   * suficiente — o Supabase valida a credencial e devolve a sessão em cookie.
   * A `service_role` não tem nada a ver com login e não aparece aqui.
   */
  const entrar = async () => {
    const email = s.loginEmail.trim();
    if (!email || !s.loginSenha) {
      setErro(pt ? "Informe e-mail e senha." : "Enter your email and password.");
      return;
    }

    setErro(null);
    setCarregando(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: s.loginSenha,
    });

    if (error || !data.user) {
      // Mensagem única para e-mail inexistente e senha errada: dizer qual dos
      // dois falhou entregaria a um estranho quais e-mails têm conta aqui.
      setErro(pt ? "E-mail ou senha inválidos." : "Invalid email or password.");
      setCarregando(false);
      return;
    }

    // Este painel é só do admin da plataforma. A checagem definitiva está no
    // middleware (que roda em toda requisição); esta aqui existe para explicar
    // o problema na hora, em vez de deixar a pessoa ser expulsa sem entender.
    const { data: perfil } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", data.user.id)
      .single();

    if (!perfil?.is_platform_admin) {
      await supabase.auth.signOut();
      setErro(
        pt
          ? "Esta conta não tem acesso ao painel administrativo."
          : "This account cannot access the admin panel.",
      );
      setCarregando(false);
      return;
    }

    a.set({ loginSenha: "" });
    // `refresh` para o layout reler os clientes já com a sessão nova.
    router.refresh();
    router.push(ROTAS.visao);
  };

  /** Envia o link de redefinição para o e-mail informado. */
  const enviarLinkRecuperacao = async () => {
    const email = s.emailRec.trim();
    if (!email) {
      setErro(pt ? "Informe o e-mail." : "Enter your email.");
      return;
    }

    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${ROTAS.login}`,
    });
    setCarregando(false);

    // Confirmamos o envio mesmo quando o e-mail não existe: responder
    // "não encontrado" revelaria quem tem conta.
    if (error) console.error("[login] resetPasswordForEmail:", error.message);
    a.set({ authView: "enviado" });
  };

  const titulo =
    s.authView === "esqueci" || s.authView === "enviado" ? L.esqueciTitulo : L.redefinirTitulo;
  const sub =
    s.authView === "esqueci"
      ? L.esqueciSub
      : s.authView === "enviado"
        ? L.linkEnviado
        : L.redefinirSub;

  /**
   * Grava a senha nova. Só funciona depois de abrir o link enviado por e-mail:
   * é ele que cria a sessão de recuperação que autoriza esta troca.
   */
  const salvarNovaSenha = async () => {
    if (!s.senha1 || s.senha1 !== s.senha2) {
      a.toast(L.toastErroSenha, "erro");
      return;
    }

    setErro(null);
    setCarregando(true);
    const { error } = await createClient().auth.updateUser({ password: s.senha1 });
    setCarregando(false);

    if (error) {
      setErro(
        pt
          ? "Não foi possível trocar a senha. Abra novamente o link enviado por e-mail."
          : "Could not change the password. Open the emailed link again.",
      );
      return;
    }

    a.set({ authView: "login", senha1: "", senha2: "" });
    a.toast(L.toastSenha);
  };

  const voltar = (
    <button
      onClick={() => a.set({ authView: "login", senha1: "", senha2: "", emailRec: "" })}
      className="hv-acc"
      style={css(
        "align-self:center;background:none;border:none;color:var(--tx3);font-size:12.5px;" +
          "cursor:pointer;padding:0",
      )}
    >
      {L.voltarLogin}
    </button>
  );

  return (
    <div
      style={css(
        "position:fixed;inset:0;z-index:60;background:var(--bg);display:flex;align-items:center;" +
          "justify-content:center;padding:24px",
      )}
    >
      <div
        style={css(
          "width:100%;max-width:392px;display:flex;flex-direction:column;gap:26px",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:12px")}>
          <div
            style={css(
              "width:42px;height:42px;flex:none;border-radius:12px;background:var(--acc);" +
                "color:var(--accTx);display:flex;align-items:center;justify-content:center",
            )}
          >
            <MarcaIcone size={22} />
          </div>
          <div style={css("display:flex;flex-direction:column;gap:2px")}>
            <span
              style={css(
                "font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--tx)",
              )}
            >
              Aguiar One
            </span>
            <span
              style={css(
                "font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)",
              )}
            >
              {L.console}
            </span>
          </div>
        </div>

        {s.authView === "login" && (
          <>
            <div style={css(CARTAO)}>
              <div style={css("display:flex;flex-direction:column;gap:4px")}>
                <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>
                  {L.entrarTitulo}
                </h2>
                <p style={css("margin:0;font-size:12.5px;color:var(--tx2)")}>{L.entrarSub}</p>
              </div>

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(ROTULO)}>{L.email}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={s.loginEmail}
                  onChange={(e) => {
                    setErro(null);
                    a.set({ loginEmail: e.target.value });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void entrar()}
                  placeholder="nome@aguiarone.com.br"
                  style={css(CAMPO)}
                />
              </label>

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(ROTULO)}>{L.senha}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={s.loginSenha}
                  onChange={(e) => {
                    setErro(null);
                    a.set({ loginSenha: e.target.value });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void entrar()}
                  placeholder="••••••••"
                  style={css(CAMPO)}
                />
              </label>

              {erro && (
                <span
                  role="alert"
                  style={css(
                    "font-size:12px;color:var(--bad);background:var(--badBg);" +
                      "border:1px solid var(--badLine);border-radius:8px;padding:9px 11px",
                  )}
                >
                  {erro}
                </span>
              )}

              <button
                onClick={() => void entrar()}
                disabled={carregando}
                className="hv-bright"
                style={css(
                  PRIMARIO + ";margin-top:2px" + (carregando ? ";opacity:.6;cursor:progress" : ""),
                )}
              >
                {carregando ? (pt ? "Entrando…" : "Signing in…") : L.entrar}
              </button>
              <button
                onClick={() => {
                  setErro(null);
                  a.set({ authView: "esqueci", senha1: "", senha2: "" });
                }}
                className="hv-acc-hi"
                style={css(
                  "align-self:center;background:none;border:none;color:var(--acc);" +
                    "font-size:12.5px;cursor:pointer;padding:0",
                )}
              >
                {L.esqueci}
              </button>
            </div>

            <div style={css("display:flex;justify-content:flex-end;gap:14px;flex-wrap:wrap")}>
              <button
                onClick={() => a.set({ authView: "redefinir", senha1: "", senha2: "" })}
                className="hv-acc"
                style={css(
                  "background:none;border:none;color:var(--tx3);font-size:11.5px;cursor:pointer;" +
                    "padding:0;text-decoration:underline",
                )}
              >
                {L.verRedefinir}
              </button>
            </div>
          </>
        )}

        {s.authView === "redefinir" && (
          <div style={css(CARTAO)}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}>
              <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>
                {titulo}
              </h2>
              <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.5")}>{sub}</p>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.criarSenha}</span>
              <input
                type="password"
                value={s.senha1}
                onChange={(e) => a.set({ senha1: e.target.value })}
                placeholder="••••••••"
                style={css(CAMPO)}
              />
              <div style={css("display:flex;gap:5px;padding-top:2px")}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={css(
                      "flex:1;height:4px;border-radius:99px;background:" +
                        (nf >= i
                          ? nf === 1
                            ? "var(--bad)"
                            : nf === 2
                              ? "var(--warn)"
                              : "var(--ok)"
                          : "var(--neuLine)"),
                    )}
                  />
                ))}
              </div>
              <span
                style={css(
                  "font-size:11.5px;font-weight:500;color:" +
                    (nf === 0
                      ? "var(--tx3)"
                      : nf === 1
                        ? "var(--bad)"
                        : nf === 2
                          ? "var(--warn)"
                          : "var(--ok)"),
                )}
              >
                {nf === 0
                  ? L.forcaVazia
                  : nf === 1
                    ? L.forcaFraca
                    : nf === 2
                      ? L.forcaMedia
                      : L.forcaForte}
              </span>
            </label>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.confirmarSenha}</span>
              <input
                type="password"
                value={s.senha2}
                onChange={(e) => a.set({ senha2: e.target.value })}
                placeholder="••••••••"
                style={css(CAMPO)}
              />
            </label>

            {erro && (
              <span role="alert" style={css("font-size:12px;color:var(--bad)")}>
                {erro}
              </span>
            )}

            <button
              onClick={() => void salvarNovaSenha()}
              disabled={carregando}
              className="hv-bright"
              style={css(
                PRIMARIO + ";margin-top:2px" + (carregando ? ";opacity:.6;cursor:progress" : ""),
              )}
            >
              {L.salvarSenha}
            </button>
            {voltar}
          </div>
        )}

        {s.authView === "esqueci" && (
          <div style={css(CARTAO)}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}>
              <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>
                {titulo}
              </h2>
              <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.5")}>{sub}</p>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.email}</span>
              <input
                value={s.emailRec}
                onChange={(e) => a.set({ emailRec: e.target.value })}
                placeholder="nome@negocio.com.br"
                style={css(CAMPO)}
              />
            </label>

            {erro && (
              <span role="alert" style={css("font-size:12px;color:var(--bad)")}>
                {erro}
              </span>
            )}

            <button
              onClick={() => void enviarLinkRecuperacao()}
              disabled={carregando}
              className="hv-bright"
              style={css(PRIMARIO + (carregando ? ";opacity:.6;cursor:progress" : ""))}
            >
              {L.enviarLink}
            </button>
            {voltar}
          </div>
        )}

        {s.authView === "enviado" && (
          <div style={css(cartao("14px"))}>
            <div
              style={css(
                "width:38px;height:38px;border-radius:10px;background:var(--okBg);" +
                  "border:1px solid var(--okLine);color:var(--ok);display:flex;align-items:center;" +
                  "justify-content:center;font-size:16px;font-weight:700",
              )}
            >
              ✓
            </div>
            <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>{titulo}</h2>
            <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.55")}>
              {L.linkEnviado}
            </p>
            <button
              onClick={() => a.set({ authView: "login", senha1: "", senha2: "", emailRec: "" })}
              className="hv-acc-line"
              style={css(
                "align-self:flex-start;border:1px solid var(--line);background:var(--panel);" +
                  "color:var(--tx2);font-size:12.5px;font-weight:500;padding:9px 14px;" +
                  "border-radius:9px;cursor:pointer",
              )}
            >
              {L.voltarLogin}
            </button>
          </div>
        )}

        <div style={css("display:flex;align-items:center;justify-content:center;gap:12px")}>
          <span style={css("font-size:11.5px;color:var(--tx3)")}>{L.acessoRestrito}</span>
        </div>
      </div>
    </div>
  );
}
