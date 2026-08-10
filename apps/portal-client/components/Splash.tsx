"use client";

import { css, SANS } from "@aguiar/ui";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { usePortal } from "@/components/PortalProvider";

/**
 * A tela de entrada no portal.
 *
 * POR QUE EXISTE: entre a senha ser aceita e o portal aparecer há uma espera
 * que não é curta. O login pede a sessão ao Supabase, manda refazer o layout
 * no servidor — que consulta o perfil, os módulos contratados e o retrato
 * inteiro do negócio — e só então navega. Sem cobertura, a pessoa fica olhando
 * o formulário de login parado, e o portal entra de supetão por cima dele.
 *
 * QUANDO APARECE: só no login. Um F5 não a levanta, de propósito — quem
 * recarrega já está trabalhando, e uma boas-vindas ali seria só atraso.
 *
 * Ela cobre os dois lados da travessia: sobe ainda na tela de login e só sai
 * depois de o portal estar montado do outro lado. Por isso vive fora do ramo
 * de `/login` em `PortalShell`.
 *
 * `ready` é o que ela espera, e ele NÃO é "a navegação terminou" — é "o
 * retrato do negócio chegou". A diferença são segundos: a URL muda na hora, o
 * layout raiz não, e no meio disso o menu lateral e a dashboard ficam
 * desenhados com o retrato vazio até a leitura do servidor voltar.
 */

/**
 * O mínimo em tela. Uma sessão rápida faria a tela piscar por um quadro só, e
 * um lampejo incomoda mais do que a espera que ele cobre.
 */
const MIN_MS = 620;

/** O desvanecer. Precisa casar com a `transition` lá embaixo. */
const FADE_MS = 280;

/**
 * Rede de segurança: se o retrato nunca chegar — a leitura do servidor falhou
 * de vez —, a tela sai sozinha. O portal aparece com o aviso de erro que ele
 * já sabe mostrar, que é melhor do que um "carregando" eterno por cima dele.
 */
const MAX_MS = 8000;

export function Splash({ ready }: { ready: boolean }) {
  const { s, a } = usePortal();
  const entering = s.entering;

  const [waited, setWaited] = useState(false);
  const [forced, setForced] = useState(false);

  // Os relógios só começam a correr quando o login levanta a tela — e são
  // rearmados a cada entrada, para que um segundo login na mesma aba (sair e
  // entrar de novo) tenha a mesma tela que o primeiro.
  useEffect(() => {
    if (!entering) return;
    const min = setTimeout(() => setWaited(true), MIN_MS);
    const guard = setTimeout(() => setForced(true), MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(guard);
    };
  }, [entering]);

  // Sai quando o portal está inteiro E o tempo mínimo passou. As duas
  // condições importam: a primeira garante que não há mais nada para mudar
  // atrás dela, a segunda que a tela não foi um susto.
  const leaving = entering && (forced || (ready && waited));

  // O estado só baixa depois do desvanecer — desmontar no mesmo quadro em que
  // a opacidade muda mataria a transição antes de ela existir.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setWaited(false);
      setForced(false);
      a.set({ entering: false });
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [leaving, a]);

  if (!entering) return null;

  return (
    <div
      // `status` e não `alert`: é uma espera, não um problema. O texto abaixo
      // do logo é o que o leitor de tela anuncia.
      role="status"
      aria-live="polite"
      style={css(
        "position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;" +
          "justify-content:center;gap:18px;background:var(--bg);" +
          `transition:opacity ${FADE_MS}ms ease;opacity:${leaving ? 0 : 1};` +
          // Já saindo, ela não pode mais interceptar o toque que a pessoa deu
          // no portal que apareceu atrás.
          `pointer-events:${leaving ? "none" : "auto"}`,
      )}
    >
      <div style={css("display:flex;align-items:center;gap:11px")}>
        {/* O ladrilho respira enquanto a espera dura — daí o `span` em volta:
            a animação e o halo de `.splash-mark` precisam de um elemento com o
            mesmo raio da imagem para pousar. A marca em si não recebe cor
            nenhuma daqui; ela traz o próprio fundo. */}
        <span
          className="splash-mark"
          aria-hidden
          style={css("flex:none;display:flex;border-radius:12px")}
        >
          <Logo size={44} radius={12} priority />
        </span>
        <span>
          <span style={css(`display:block;font:700 17px/1.2 ${SANS};color:var(--text)`)}>
            Aguiar One
          </span>
          <span style={css(`display:block;margin-top:2px;font:500 12px ${SANS};color:var(--muted)`)}>
            Portal do seu negócio
          </span>
        </span>
      </div>

      <span className="splash-track" aria-hidden />

      <span style={css(`font:500 12.5px ${SANS};color:var(--muted)`)}>
        Preparando o seu portal…
      </span>
    </div>
  );
}
