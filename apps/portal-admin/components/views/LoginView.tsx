"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { BRAND, Button, css, MOBILE_BREAKPOINT } from "@aguiar/ui";
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

/**
 * O corpo de cada uma das quatro telas de acesso.
 *
 * Já não é um cartão: quem faz esse papel agora é a metade clara inteira, ao
 * lado do banner. Sobrou o empilhamento — mantido em função porque a tela de
 * "link enviado" respira num ritmo mais apertado que as outras.
 */
const stack = (gap = "18px") => `display:flex;flex-direction:column;gap:${gap}`;

const STACK = stack();

/**
 * O campo. Moldura, hover e anel de foco vêm da classe `.field` dos tokens —
 * por isso a borda NÃO é redeclarada aqui: em `style` ela venceria a regra de
 * `:focus-visible` e o campo perderia o foco visível. O inline traz só o que
 * esta tela tem de próprio: um campo mais alto e mais macio que o do resto do
 * console, porque aqui ele é o assunto da página.
 */
const FIELD = "padding:13px 14px;border-radius:11px;font-size:14px";

const LABEL =
  "font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)";

/**
 * O botão principal. O degradê vai do `--accent` ao `--accent-hi`, e os dois
 * viram com o tema — o botão continua sendo o mesmo botão no claro e no escuro.
 */
const PRIMARY =
  "background:linear-gradient(90deg, var(--accent), var(--accent-hi));border:none;" +
  "color:var(--accent-ink);font-size:14px;font-weight:700;padding:14px;border-radius:11px;" +
  "cursor:pointer";

/**
 * O fundo do painel do banner.
 *
 * É o mesmo petrol quase preto do arquivo — o `--side` da barra lateral —, e
 * existe para o instante ANTES da imagem carregar: sem ele o primeiro quadro da
 * tela é metade branca, e a página pisca ao ser preenchida.
 */
const BANNER_INK = BRAND.ink;

export function LoginView() {
  const { s, a } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const params = useSearchParams();
  const nf = passwordStrength(s.password1);
  const pt = s.language === "pt";

  // Abaixo disso o banner sai e o formulário fica com a tela inteira. O estado
  // nasce em 1440, e é essa a largura que o servidor renderiza: assim o
  // primeiro pixel vem na versão de desktop em vez de saltar.
  const isMobile = s.screenWidth < MOBILE_BREAKPOINT;

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

  /** O cabeçalho de cada tela, centrado como na entrada do portal do cliente. */
  const header = (heading: string, sub: string) => (
    <div style={css("text-align:center")}>
      <h1 style={css("margin:0;font-size:26px;font-weight:700;line-height:1.2;color:var(--text)")}>
        {heading}
      </h1>
      <p style={css("margin:8px 0 0;font-size:13.5px;line-height:1.5;color:var(--muted)")}>{sub}</p>
    </div>
  );

  const copyright = `Copyright © ${new Date().getFullYear()} Aguiar One. ${L.direitosReservados}`;

  return (
    <div style={css("position:fixed;inset:0;z-index:60;display:flex;background:var(--surface)")}>
      {/*
        A metade da marca. Só no desktop: abaixo de 900px ela viraria uma tarja
        de imagem espremida por cima do formulário, e o que a pessoa veio fazer
        aqui é entrar. No lugar dela, o formulário ganha o ladrilho do "A".

        Toda a mensagem — logo, tarja "Área administrativa", título, subtítulo e
        os três pilares — está DENTRO do arquivo: é a arte da marca, não um
        texto que esta tela remonta com `<h1>` e `<p>` por cima de um fundo. Por
        isso o `alt` é vazio e o painel é `aria-hidden`: para quem usa leitor de
        tela isto é decoração, e o nome do console já vem no `<title>` da página
        e no letreiro ao lado do formulário.
      */}
      {!isMobile && (
        <div
          aria-hidden
          style={css(
            `position:relative;flex:1 1 50%;min-width:0;overflow:hidden;background:${BANNER_INK}`,
          )}
        >
          <Image
            src="/images/banner-login.png"
            alt=""
            fill
            priority
            sizes="50vw"
            /**
             * A imagem é quadrada e o painel é uma coluna alta: com `cover` o
             * que sobra é cortado nas LATERAIS. `object-position` puxa o corte
             * para a direita — o texto da arte mora na metade esquerda, e é ele
             * que não pode encostar na borda; o que cede é o "A" de fundo.
             */
            style={{ objectFit: "cover", objectPosition: "12% center" }}
          />

          {/* A base da arte é escura, mas não uniformemente: esta sombra é o
              que garante o contraste da linha de copyright em cima dela. */}
          <div
            style={css(
              "position:absolute;left:0;right:0;bottom:0;height:200px;pointer-events:none;" +
                `background:linear-gradient(to top, ${BANNER_INK}, transparent)`,
            )}
          />

          <p
            style={css(
              "position:absolute;left:44px;right:44px;bottom:34px;margin:0;font-size:12px;" +
                "line-height:1.5;color:rgba(234,244,245,.6)",
            )}
          >
            {copyright}
          </p>
        </div>
      )}

      {/* A metade do formulário. `overflow-y` porque a moldura é `fixed`: a tela
          de senha nova é a mais alta das quatro e, num notebook baixo, é ela
          que precisa poder rolar em vez de ser cortada. */}
      <div
        style={css(
          "flex:1 1 50%;min-width:0;overflow-y:auto;display:flex;align-items:center;" +
            `justify-content:center;padding:${isMobile ? "32px 22px" : "40px 48px"}`,
        )}
      >
        <div style={css("width:100%;max-width:380px;display:flex;flex-direction:column;gap:26px")}>
          {/* No celular o banner não entra, e sem ele a tela chegaria sem
              nenhuma marca. É o "A" azul em PNG transparente, o mesmo do topo
              do console: pousa direto na superfície clara e não recebe cor nem
              fundo daqui. */}
          {isMobile && (
            <div style={css("display:flex;align-items:center;justify-content:center;gap:12px")}>
              <Logo size={42} priority />
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
          )}

          {s.authView === "login" && (
            <>
              <div style={css(STACK)}>
                {header(L.entrarTitulo, L.entrarSub)}

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
                    className="field"
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
                    className="field"
                    style={css(FIELD)}
                  />
                </label>

                {error && (
                  <span
                    role="alert"
                    style={css(
                      "font-size:12px;color:var(--danger);background:var(--danger-soft);" +
                        "border:1px solid var(--danger-line);border-radius:10px;padding:11px 13px",
                    )}
                  >
                    {error}
                  </span>
                )}

                {/* O Enter no field de senha chama o mesmo `signIn()`, e por
                    isso o carregamento também entra por fora. */}
                <Button
                  onClick={signIn}
                  loading={loading}
                  loadingLabel={pt ? "Entrando…" : "Signing in…"}
                  className="hv-glow"
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
                    "align-self:center;background:none;border:none;color:var(--accent-text);" +
                      "font-size:12.5px;cursor:pointer;padding:0",
                  )}
                >
                  {L.forgot}
                </Button>
              </div>

              <div style={css("display:flex;justify-content:center")}>
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
            <div style={css(STACK)}>
              {header(title, detail)}

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(LABEL)}>{L.criarSenha}</span>
                <input
                  type="password"
                  value={s.password1}
                  onChange={(e) => a.set({ password1: e.target.value })}
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
                  className="field"
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
                className="hv-glow"
                style={css(PRIMARY + ";margin-top:2px")}
              >
                {L.salvarSenha}
              </Button>
              {back}
            </div>
          )}

          {s.authView === "forgot" && (
            <div style={css(STACK)}>
              {header(title, detail)}

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(LABEL)}>{L.email}</span>
                <input
                  value={s.recoveryEmail}
                  onChange={(e) => a.set({ recoveryEmail: e.target.value })}
                  placeholder="nome@negocio.com.br"
                  className="field"
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
                className="hv-glow"
                style={css(PRIMARY)}
              >
                {L.enviarLink}
              </Button>
              {back}
            </div>
          )}

          {s.authView === "sent" && (
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
                {title}
              </h1>
              <p style={css("margin:0;font-size:13px;color:var(--muted);line-height:1.55")}>
                {L.linkEnviado}
              </p>
              <Button
                onClick={() =>
                  a.set({ authView: "login", password1: "", password2: "", recoveryEmail: "" })
                }
                className="hv-acc-border"
                style={css(
                  "margin-top:4px;border:1px solid var(--border);background:var(--surface);" +
                    "color:var(--text2);font-size:12.5px;font-weight:500;padding:10px 16px;" +
                    "border-radius:10px;cursor:pointer",
                )}
              >
                {L.voltarLogin}
              </Button>
            </div>
          )}

          <div style={css("display:flex;flex-direction:column;align-items:center;gap:8px")}>
            <span style={css("font-size:11.5px;color:var(--muted)")}>{L.acessoRestrito}</span>

            {/* No desktop o copyright fica sobre o banner; sem ele, é aqui. */}
            {isMobile && (
              <span style={css("font-size:11px;line-height:1.5;color:var(--muted)")}>
                {copyright}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
