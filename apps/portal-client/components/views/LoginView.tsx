"use client";

import { Button, css, PasswordField, SANS } from "@aguiar/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_BUTTON, AuthNotice, AuthShell, FIELD, LABEL } from "@/components/AuthShell";
import { usePortal } from "@/components/PortalProvider";
import { createClient } from "@/lib/supabase/client";

/**
 * O motivo pelo qual a pessoa foi devolvida para cá.
 *
 * Os três primeiros são do middleware (e da checagem de `signIn`, que usa as
 * mesmas regras). `link_invalido` vem de outro lugar — da
 * rota que abre o link do e-mail de senha (`app/auth/confirmar/route.ts`) —,
 * mas chega no mesmo `?erro=` e é lido do mesmo jeito.
 */
const REASONS: Record<string, string> = {
  "e-admin":
    "Esta conta é de administrador da plataforma. Use o painel admin, não o portal do cliente.",
  "sem-negocio":
    "Esta conta ainda não está ligada a um negócio. Fale com o suporte para liberar o seu acesso.",
  "acesso-suspenso":
    "O acesso desta conta está suspenso. Fale com o responsável pelo seu negócio.",
  link_invalido:
    "Este link de redefinição não vale mais: ele expira depois de um tempo e só pode ser usado uma vez.",
};

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const { a } = usePortal();
  // `a` é recriado a cada mudança de estado do portal; `a.set` é estável. Pôr
  // `a` nas dependências do efeito abaixo fazia um loop: o efeito chamava
  // `set`, o estado mudava, `a` mudava, o efeito rodava de novo.
  const setPortal = a.set;

  // O nome do parâmetro é o que o middleware escreve (`?erro=…`).
  const reasonKey = params.get("erro") ?? "";
  const reason = REASONS[reasonKey] ?? null;

  /** Link de senha vencido: além do aviso, a pessoa precisa do caminho de volta. */
  const invalidLink = reasonKey === "link_invalido";

  /** Veio de `/redefinir-senha`, com a senha nova já gravada. */
  const passwordChanged = params.get("senha_alterada") === "1";

  const [email, setEmail] = useState("");
  const [password, setSenha] = useState("");
  const [loading, setCarregando] = useState(false);
  const [attemptError, setErro] = useState<string | null>(null);

  /**
   * O que a pessoa lê. O erro da tentativa vem primeiro — é a resposta ao que
   * ela acabou de fazer; o motivo do middleware é o pano de fundo.
   *
   * O motivo é LIDO NO RENDER, e não guardado num estado inicial: esta tela
   * não remonta quando o middleware devolve a pessoa para cá. Ela nunca saiu
   * do `/login` de fato — o que mudou foi a query string —, e um `useState` só
   * lê o seu valor inicial uma vez. Guardado, o motivo nunca apareceria.
   */
  const error = attemptError ?? reason;

  /**
   * A senha foi aceita, mas o middleware recusou a conta: é de admin da
   * plataforma, ou não está ligada a nenhum negócio.
   *
   * A tela de entrada está no ar esperando um portal que não vem, e aqui ela
   * desiste. Sem isto ficaria oito segundos — o tempo da sua rede de segurança
   * — por cima justamente da explicação que a pessoa precisa ler.
   */
  useEffect(() => {
    if (reason) setPortal({ entering: false });
  }, [reason, setPortal]);

  /**
   * Entra com e-mail e senha.
   *
   * Roda no NAVEGADOR e usa o cliente público — é o suficiente: o Supabase
   * valida a credencial e devolve a sessão num cookie. Quem decide de fato se
   * esta conta pode usar o portal é o middleware, no próximo carregamento.
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: e,
      password: password,
    });

    if (error || !data.user) {
      // Não distinguimos "e-mail não existe" de "senha errada": isso contaria a
      // quem tenta adivinhar quais e-mails têm conta.
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }

    // As mesmas regras do middleware, checadas aqui para responder na hora.
    // Deixar só com ele travava o botão: o middleware devolve para o mesmo
    // `/login?erro=…`, a tela não remonta, e na segunda tentativa com a mesma
    // conta a query string nem muda — nada avisava que a espera acabou. O
    // middleware continua sendo a barreira de verdade; esta é a explicação.
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, is_platform_admin, status")
      .eq("id", data.user.id)
      .single();

    const refusal = profile?.is_platform_admin
      ? "e-admin"
      : !profile?.tenant_id
        ? "sem-negocio"
        : profile.status !== "active"
          ? "acesso-suspenso"
          : null;

    if (refusal) {
      // Sem o `signOut` a sessão recusada ficaria no cookie, e o middleware
      // recusaria de novo a cada carregamento.
      await supabase.auth.signOut();
      setErro(REASONS[refusal]);
      setCarregando(false);
      return;
    }

    // A senha foi aceita: daqui em diante quem fala com a pessoa é a tela de
    // entrada. Ela sobe ANTES da navegação porque a espera começa agora — o
    // layout ainda vai ser refeito no servidor, com o perfil, os módulos
    // contratados e o retrato do negócio. Sem ela, o formulário de login
    // ficaria parado na tela até o portal entrar por cima.
    a.set({ entering: true });

    // `refresh` antes de navegar: o layout é Server Component e precisa ser
    // refeito já com a sessão nova, ou a primeira tela viria vazia.
    router.refresh();
    router.replace("/");
  };

  return (
    <AuthShell title="Acesse sua conta" subtitle="Entre na sua conta para continuar.">
      <form
        style={css("display:flex;flex-direction:column;gap:18px")}
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!loading) void signIn();
        }}
      >
        {/* A confirmação da troca de senha. Fica ACIMA do formulário, e não
              no lugar do erro: ela não é a resposta a uma tentativa de entrar,
              é o fecho do caminho que trouxe a pessoa até aqui. */}
        {passwordChanged && (
          <AuthNotice tone="pos">Senha alterada. Entre com a nova senha para continuar.</AuthNotice>
        )}

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
            className="field"
            style={css(FIELD)}
          />
        </div>

        <div>
          <label style={css(LABEL)} htmlFor="senha">
            Senha
          </label>
          <PasswordField
            id="senha"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setSenha(ev.target.value)}
            placeholder="••••••••"
            style={css(FIELD)}
            showLabel="Mostrar senha"
            hideLabel="Ocultar senha"
          />
        </div>

        {error && (
          <div
            style={css(
              "padding:11px 13px;border-radius:10px;background:var(--danger-soft);" +
                `border:1px solid var(--danger-line);font:600 12.5px/1.45 ${SANS};color:var(--danger)`,
            )}
            role="alert"
          >
            {error}
            {/* O aviso de link vencido só serve com a saída junto: sem isto a
                  pessoa lê que o link morreu e não tem o que fazer na tela. */}
            {invalidLink && !attemptError && (
              <>
                {" "}
                <Link href="/esqueci-senha" style={css("color:inherit;text-decoration:underline")}>
                  Pedir um novo link
                </Link>
                .
              </>
            )}
          </div>
        )}

        {/* Quem espera aqui é o `onSubmit` do formulário — o Enter no field
              de senha também entra —, então o carregamento vem de fora.

              O degradê é o da entrada do app mobile, e vai do `--accent` ao
              `--accent-hi`: os dois viram com o tema, então o botão continua
              sendo o mesmo botão no claro e no escuro. */}
        <Button
          type="submit"
          loading={loading}
          loadingLabel="Entrando…"
          className="hv-glow"
          style={css(AUTH_BUTTON)}
        >
          Entrar
        </Button>

        <p style={css(`margin:0;text-align:left;font:400 12px/1.6 ${SANS};color:var(--muted)`)}>
          <Link
            href="/esqueci-senha"
            style={css(`font:600 12px ${SANS};color:var(--accent-text);text-decoration:underline`)}
          >
            Esqueci minha senha
          </Link>
          <br />
          Não consegue entrar? Fale com a nossa equipe.
        </p>
      </form>
    </AuthShell>
  );
}
