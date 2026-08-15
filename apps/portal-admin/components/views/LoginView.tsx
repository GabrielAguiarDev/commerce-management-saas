"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Button, css } from "@aguiar/ui";
import { AUTH_BUTTON, AuthNotice, AuthShell, FIELD, LABEL } from "@/components/AuthShell";
import { ROUTES } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/client";

/**
 * A entrada do console.
 *
 * A casca — banner, ladrilho do celular, cabeçalho e copyright — mora agora em
 * `components/AuthShell.tsx`, compartilhada com as telas de senha. O que ficou
 * aqui é o formulário de entrada e o `signInWithPassword`, sem mudança de
 * comportamento.
 *
 * As telas de "esqueci minha senha" e de nova senha eram estados internos desta
 * (`authView`), alcançáveis por botão. Viraram ROTAS de verdade — `/esqueci-senha`
 * e `/redefinir-senha` —, e a segunda passou a exigir a sessão que só o link do
 * e-mail cria. O botão que abria o formulário de nova senha sem sessão nenhuma
 * saiu junto: ele não tinha como funcionar.
 */
export function LoginView() {
  const { s, a } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const params = useSearchParams();
  const pt = s.language === "pt";

  // Estado do próprio formulário de acesso: não é sessão do painel, então não
  // vale a pena guardar no estado global.
  const [loading, setCarregando] = useState(false);

  /**
   * O que a tela tem a dizer antes de qualquer tentativa.
   *
   * O nome do parâmetro é `erro`, em português — é o que o `proxy.ts` escreve
   * (`url.search = erro=…`) e o que a rota `/auth/confirmar` monta. Esta tela
   * lia `error`, em inglês, e por isso a explicação do "não é admin" nunca
   * aparecia: o middleware expulsava a pessoa para cá e ela via a entrada
   * limpa, sem motivo nenhum na tela.
   */
  const reason = params.get("erro") ?? "";

  const initialNotice =
    reason === "nao-admin"
      ? pt
        ? "Esta conta não é de administrador da plataforma."
        : "This account is not a platform administrator."
      : reason === "link_invalido"
        ? L.erroLinkInvalido
        : null;

  const [error, setErro] = useState<string | null>(initialNotice);

  // A confirmação da troca de senha, posta por `app/redefinir-senha/actions.ts`.
  // Não é erro nem resposta a uma tentativa: sai do caminho assim que a pessoa
  // começa a digitar, junto com o resto.
  const passwordChanged = params.get("senha_alterada") === "1";

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

  return (
    <AuthShell title={L.entrarTitulo} subtitle={L.entrarSub}>
      {/* A confirmação da senha trocada vem ANTES dos campos e em verde: ela
          não é a resposta a uma tentativa de entrar, é o desfecho do que a
          pessoa acabou de fazer na tela anterior. */}
      {passwordChanged && !error && <AuthNotice tone="pos">{L.senhaAlterada}</AuthNotice>}

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

      {error && <AuthNotice tone="danger">{error}</AuthNotice>}

      {/* O Enter no field de senha chama o mesmo `signIn()`, e por isso o
          carregamento também entra por fora. */}
      <Button
        onClick={signIn}
        loading={loading}
        loadingLabel={pt ? "Entrando…" : "Signing in…"}
        className="hv-glow"
        style={css(AUTH_BUTTON + ";margin-top:2px")}
      >
        {L.signIn}
      </Button>

      <Link
        href={ROUTES.esqueciSenha}
        className="hv-acc-hi"
        style={css(
          "align-self:center;background:none;border:none;color:var(--accent-text);" +
            "font-size:12.5px;cursor:pointer;padding:0;text-decoration:none",
        )}
      >
        {L.forgot}
      </Link>
    </AuthShell>
  );
}
