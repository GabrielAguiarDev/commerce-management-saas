"use client";

import { BRAND, Button, css, SANS } from "@aguiar/ui";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNotice } from "@/components/AuthShell";
import { Logo } from "@/components/Logo";
import { usePortal } from "@/components/PortalProvider";
import { createClient } from "@/lib/supabase/client";

/**
 * O campo. A moldura, o hover e o anel de foco vêm da classe `.field` dos
 * tokens — por isso a borda NÃO é redeclarada aqui: em `style` ela venceria a
 * regra de `:focus-visible` e o campo perderia o foco visível. O que fica no
 * inline é só o que esta tela tem de próprio: um campo mais alto e mais macio
 * que o do resto do portal, porque aqui ele é o assunto da página.
 */
const FIELD = "padding:13px 14px;border-radius:11px;font-size:14px";

const LABEL = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/**
 * O fundo do painel do banner.
 *
 * É o mesmo petrol quase preto do canto superior esquerdo da imagem, e existe
 * para o instante ANTES dela carregar — sem isso o primeiro quadro da tela é
 * metade branca, e a página pisca ao ser preenchida.
 */
const BANNER_INK = BRAND.ink;

/**
 * O motivo pelo qual a pessoa foi devolvida para cá.
 *
 * Os dois primeiros são do middleware. `link_invalido` vem de outro lugar — da
 * rota que abre o link do e-mail de senha (`app/auth/confirmar/route.ts`) —,
 * mas chega no mesmo `?erro=` e é lido do mesmo jeito.
 */
const REASONS: Record<string, string> = {
  "e-admin":
    "Esta conta é de administrador da plataforma. Use o painel admin, não o portal do cliente.",
  "sem-negocio":
    "Esta conta ainda não está ligada a um negócio. Fale com o suporte para liberar o seu acesso.",
  link_invalido:
    "Este link de redefinição não vale mais: ele expira depois de um tempo e só pode ser usado uma vez.",
};

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const { a, isMobile } = usePortal();

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
    if (reason) a.set({ entering: false });
  }, [reason, a]);

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
    <div style={css("min-height:100vh;display:flex;background:var(--surface)")}>
      {/*
        A metade da marca. Só no desktop: abaixo de 900px ela viraria uma tarja
        de imagem espremida por cima do formulário, e o que a pessoa veio fazer
        aqui é entrar. No lugar dela, o formulário ganha o ladrilho do "A".

        Toda a mensagem — logo, título, subtítulo e os três módulos — está
        DENTRO do arquivo: é a arte da marca, não um texto que esta tela
        remonta com `<h1>` e `<p>` por cima de um fundo. Por isso o `alt` é
        vazio e o painel é `aria-hidden`: para quem usa leitor de tela isto é
        decoração, e o nome do produto já vem no `<title>` da página.
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
             * para a direita — o texto da arte mora na metade esquerda, e é
             * ele que não pode encostar na borda; o que cede é o gráfico.
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
              "position:absolute;left:44px;right:44px;bottom:34px;margin:0;" +
                `font:400 12px/1.5 ${SANS};color:rgba(234,244,245,.6)`,
            )}
          >
            Copyright © {new Date().getFullYear()} Aguiar One. Todos os direitos reservados.
          </p>
        </div>
      )}

      {/* A metade do formulário. */}
      <div
        style={css(
          "flex:1 1 50%;min-width:0;display:flex;align-items:center;justify-content:center;" +
            `padding:${isMobile ? "32px 22px" : "40px 48px"};background:var(--surface)`,
        )}
      >
        <form
          style={css("width:100%;max-width:360px;display:flex;flex-direction:column;gap:18px")}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!loading) void signIn();
          }}
        >
          {/* No celular o banner não entra, e sem ele o formulário chegaria sem
              nenhuma marca. É o "A" azul em PNG transparente, o mesmo da
              espera de entrada: pousa direto na superfície do formulário e não
              recebe cor nem fundo daqui. */}
          {isMobile && (
            <div style={css("align-self:center")}>
              <Logo size={52} priority />
            </div>
          )}

          <div style={css("text-align:center")}>
            <h1 style={css(`margin:0;font:700 26px/1.2 ${SANS};color:var(--text)`)}>
              Bem-vindo de volta!
            </h1>
            <p style={css(`margin:8px 0 0;font:400 13.5px/1.5 ${SANS};color:var(--muted)`)}>
              Entre na sua conta para continuar
            </p>
          </div>

          {/* A confirmação da troca de senha. Fica ACIMA do formulário, e não
              no lugar do erro: ela não é a resposta a uma tentativa de entrar,
              é o fecho do caminho que trouxe a pessoa até aqui. */}
          {passwordChanged && (
            <AuthNotice tone="pos">
              Senha alterada. Entre com a nova senha para continuar.
            </AuthNotice>
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
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setSenha(ev.target.value)}
              placeholder="••••••••"
              className="field"
              style={css(FIELD)}
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
                  <Link
                    href="/esqueci-senha"
                    style={css("color:inherit;text-decoration:underline")}
                  >
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
            style={css(
              `padding:14px;border-radius:11px;font:700 14px ${SANS};color:var(--accent-ink);` +
                "background:linear-gradient(90deg, var(--accent), var(--accent-hi))",
            )}
          >
            Entrar
          </Button>

          <p style={css(`margin:0;text-align:center;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
            <Link
              href="/esqueci-senha"
              style={css(`font:600 12px ${SANS};color:var(--accent-text);text-decoration:underline`)}
            >
              Esqueci minha senha
            </Link>
            <br />
            Não consegue entrar? Fale com a nossa equipe.
          </p>

          {/* No desktop o copyright fica sobre o banner; sem ele, é aqui. */}
          {isMobile && (
            <p
              style={css(
                `margin:6px 0 0;text-align:center;font:400 11px/1.5 ${SANS};color:var(--muted)`,
              )}
            >
              Copyright © {new Date().getFullYear()} Aguiar One. Todos os direitos reservados.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
