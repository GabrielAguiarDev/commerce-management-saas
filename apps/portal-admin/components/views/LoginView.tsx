"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Button, css } from "@aguiar/ui";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { ROUTES } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/client";

/** 0 = unusable, 3 = strong. Length, mixed classes, then length-or-symbol. */
function passwordStrength(v: string): number {
  if (!v) return 0;
  let n = 0;
  if (v.length >= 8) n++;
  if (/\d/.test(v) && /[a-zA-Z]/.test(v)) n++;
  if (v.length >= 12 || /[^\w\s]/.test(v)) n++;
  return n;
}

const card = (gap = "16px") =>
  "background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:26px;" +
  `display:flex;flex-direction:column;gap:${gap};box-shadow:0 12px 32px rgba(9,26,33,.09)`;

const CARD = card();

const FIELD =
  "border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:9px;" +
  "padding:11px 13px;font-size:13.5px;outline:none";

const LABEL =
  "font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)";

const PRIMARY =
  "background:var(--accent);border:1px solid var(--accent);color:var(--accent-ink);font-size:14px;" +
  "font-weight:600;padding:12px;border-radius:9px;cursor:pointer";

export function LoginView() {
  const { s, a } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const params = useSearchParams();
  const nf = passwordStrength(s.password1);
  const pt = s.language === "pt";

  // Estado do próprio formulário de acesso: não é sessão do painel, então não
  // vale a pena guardar no estado global.
  const [loading, setCarregando] = useState(false);
  const [error, setErro] = useState<string | null>(
    // O middleware manda para cá quem está logado mas não é admin da plataforma.
    params.get("error") === "nao-admin"
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
  const signIn = async () => {
    const email = s.loginEmail.trim();
    if (!email || !s.loginPassword) {
      setErro(pt ? "Informe e-mail e senha." : "Enter your email and password.");
      return;
    }

    setErro(null);
    setCarregando(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: s.loginPassword,
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

    a.set({ loginPassword: "" });
    // `refresh` para o layout reler os clientes já com a sessão nova.
    router.refresh();
    router.push(ROUTES.overview);
  };

  /** Envia o link de redefinição para o e-mail informado. */
  const sendRecoveryLink = async () => {
    const email = s.recoveryEmail.trim();
    if (!email) {
      setErro(pt ? "Informe o e-mail." : "Enter your email.");
      return;
    }

    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${ROUTES.login}`,
    });
    setCarregando(false);

    // Confirmamos o envio mesmo quando o e-mail não existe: responder
    // "não encontrado" revelaria quem tem conta.
    if (error) console.error("[login] resetPasswordForEmail:", error.message);
    a.set({ authView: "sent" });
  };

  const title =
    s.authView === "forgot" || s.authView === "sent" ? L.esqueciTitulo : L.redefinirTitulo;
  const detail =
    s.authView === "forgot"
      ? L.esqueciSub
      : s.authView === "sent"
        ? L.linkEnviado
        : L.redefinirSub;

  /**
   * Grava a senha nova. Só funciona depois de abrir o link enviado por e-mail:
   * é ele que cria a sessão de recuperação que autoriza esta troca.
   */
  const saveNewPassword = async () => {
    if (!s.password1 || s.password1 !== s.password2) {
      a.toast(L.toastErroSenha, "error");
      return;
    }

    setErro(null);
    setCarregando(true);
    const { error } = await createClient().auth.updateUser({ password: s.password1 });
    setCarregando(false);

    if (error) {
      setErro(
        pt
          ? "Não foi possível trocar a senha. Abra novamente o link enviado por e-mail."
          : "Could not change the password. Open the emailed link again.",
      );
      return;
    }

    a.set({ authView: "login", password1: "", password2: "" });
    a.toast(L.toastSenha);
  };

  const back = (
    <Button
      onClick={() => a.set({ authView: "login", password1: "", password2: "", recoveryEmail: "" })}
      className="hv-acc"
      style={css(
        "align-self:center;background:none;border:none;color:var(--muted);font-size:12.5px;" +
          "cursor:pointer;padding:0",
      )}
    >
      {L.voltarLogin}
    </Button>
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
          <Logo size={42} radius={12} priority />
          <div style={css("display:flex;flex-direction:column;gap:2px")}>
            <Wordmark size={20} on="surface" />
            <span
              style={css(
                "font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)",
              )}
            >
              {L.console}
            </span>
          </div>
        </div>

        {s.authView === "login" && (
          <>
            <div style={css(CARD)}>
              <div style={css("display:flex;flex-direction:column;gap:4px")}>
                <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--text)")}>
                  {L.entrarTitulo}
                </h2>
                <p style={css("margin:0;font-size:12.5px;color:var(--text2)")}>{L.entrarSub}</p>
              </div>

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(LABEL)}>{L.email}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={s.loginEmail}
                  onChange={(e) => {
                    setErro(null);
                    a.set({ loginEmail: e.target.value });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void signIn()}
                  placeholder="nome@aguiarone.com.br"
                  style={css(FIELD)}
                />
              </label>

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(LABEL)}>{L.password}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={s.loginPassword}
                  onChange={(e) => {
                    setErro(null);
                    a.set({ loginPassword: e.target.value });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void signIn()}
                  placeholder="••••••••"
                  style={css(FIELD)}
                />
              </label>

              {error && (
                <span
                  role="alert"
                  style={css(
                    "font-size:12px;color:var(--danger);background:var(--danger-soft);" +
                      "border:1px solid var(--danger-line);border-radius:8px;padding:9px 11px",
                  )}
                >
                  {error}
                </span>
              )}

              {/* O Enter no field de senha chama o mesmo `entrar()`, e por
                  isso o carregamento também entra por fora. */}
              <Button
                onClick={signIn}
                loading={loading}
                loadingLabel={pt ? "Entrando…" : "Signing in…"}
                className="hv-brilho"
                style={css(PRIMARY + ";margin-top:2px")}
              >
                {L.signIn}
              </Button>
              <Button
                onClick={() => {
                  setErro(null);
                  a.set({ authView: "forgot", password1: "", password2: "" });
                }}
                className="hv-acc-hi"
                style={css(
                  "align-self:center;background:none;border:none;color:var(--accent);" +
                    "font-size:12.5px;cursor:pointer;padding:0",
                )}
              >
                {L.forgot}
              </Button>
            </div>

            <div style={css("display:flex;justify-content:flex-end;gap:14px;flex-wrap:wrap")}>
              <Button
                onClick={() => a.set({ authView: "reset", password1: "", password2: "" })}
                className="hv-acc"
                style={css(
                  "background:none;border:none;color:var(--muted);font-size:11.5px;cursor:pointer;" +
                    "padding:0;text-decoration:underline",
                )}
              >
                {L.verRedefinir}
              </Button>
            </div>
          </>
        )}

        {s.authView === "reset" && (
          <div style={css(CARD)}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}>
              <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--text)")}>
                {title}
              </h2>
              <p style={css("margin:0;font-size:12.5px;color:var(--text2);line-height:1.5")}>{detail}</p>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(LABEL)}>{L.criarSenha}</span>
              <input
                type="password"
                value={s.password1}
                onChange={(e) => a.set({ password1: e.target.value })}
                placeholder="••••••••"
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
                  ? L.forcaVazia
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
                value={s.password2}
                onChange={(e) => a.set({ password2: e.target.value })}
                placeholder="••••••••"
                style={css(FIELD)}
              />
            </label>

            {error && (
              <span role="alert" style={css("font-size:12px;color:var(--danger)")}>
                {error}
              </span>
            )}

            <Button
              onClick={saveNewPassword}
              loading={loading}
              className="hv-brilho"
              style={css(PRIMARY + ";margin-top:2px")}
            >
              {L.salvarSenha}
            </Button>
            {back}
          </div>
        )}

        {s.authView === "forgot" && (
          <div style={css(CARD)}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}>
              <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--text)")}>
                {title}
              </h2>
              <p style={css("margin:0;font-size:12.5px;color:var(--text2);line-height:1.5")}>{detail}</p>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(LABEL)}>{L.email}</span>
              <input
                value={s.recoveryEmail}
                onChange={(e) => a.set({ recoveryEmail: e.target.value })}
                placeholder="nome@negocio.com.br"
                style={css(FIELD)}
              />
            </label>

            {error && (
              <span role="alert" style={css("font-size:12px;color:var(--danger)")}>
                {error}
              </span>
            )}

            <Button
              onClick={sendRecoveryLink}
              loading={loading}
              className="hv-brilho"
              style={css(PRIMARY)}
            >
              {L.enviarLink}
            </Button>
            {back}
          </div>
        )}

        {s.authView === "sent" && (
          <div style={css(card("14px"))}>
            <div
              style={css(
                "width:38px;height:38px;border-radius:10px;background:var(--pos-soft);" +
                  "border:1px solid var(--pos-line);color:var(--pos);display:flex;align-items:center;" +
                  "justify-content:center;font-size:16px;font-weight:700",
              )}
            >
              ✓
            </div>
            <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--text)")}>{title}</h2>
            <p style={css("margin:0;font-size:12.5px;color:var(--text2);line-height:1.55")}>
              {L.linkEnviado}
            </p>
            <Button
              onClick={() => a.set({ authView: "login", password1: "", password2: "", recoveryEmail: "" })}
              className="hv-acc-borda"
              style={css(
                "align-self:flex-start;border:1px solid var(--border);background:var(--surface);" +
                  "color:var(--text2);font-size:12.5px;font-weight:500;padding:9px 14px;" +
                  "border-radius:9px;cursor:pointer",
              )}
            >
              {L.voltarLogin}
            </Button>
          </div>
        )}

        <div style={css("display:flex;align-items:center;justify-content:center;gap:12px")}>
          <span style={css("font-size:11.5px;color:var(--muted)")}>{L.acessoRestrito}</span>
        </div>
      </div>
    </div>
  );
}
