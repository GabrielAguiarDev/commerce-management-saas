"use client";

import { Button, css, SANS } from "@aguiar/ui";
import { useSyncExternalStore } from "react";
import { usePortal } from "@/components/PortalProvider";

/**
 * O portal como aplicativo instalado: o aviso de que a internet caiu e o convite
 * para instalar.
 *
 * As duas coisas moram juntas porque respondem à mesma pergunta — "isto aqui é
 * um site ou um programa do meu negócio?". O manifesto e o service worker fazem
 * o portal PODER ser instalado e abrir sem rede; estes dois avisos são o que a
 * pessoa vê disso.
 */

/* -------------------------------------------------------------------------- */
/* Aviso de conexão                                                            */
/* -------------------------------------------------------------------------- */

/**
 * `navigator.onLine` conta uma verdade parcial: ele diz que existe uma rede,
 * não que o servidor responde. Serve para o aviso, e não para decidir o que
 * gravar — quem decide isso é a resposta da ação, que falha do seu jeito.
 */
function assinarRede(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A tarja de "sem conexão".
 *
 * Fica GRUDADA logo abaixo da barra de topo, e não no fluxo da página: quem
 * está no meio de um cadastro, rolado até o rodapé, é justamente quem precisa
 * ler o aviso antes de tentar salvar.
 *
 * O texto explica a fase em que o portal está hoje: as telas continuam, as
 * gravações não. Quando a fila offline da fase 2 existir, é esta frase que
 * muda — para "guardamos aqui e enviamos quando a internet voltar".
 */
export function AvisoOffline() {
  const { isMobile } = usePortal();

  // No servidor não existe `navigator`, e assumir "offline" faria a tarja
  // piscar em toda primeira pintura. O retrato do servidor é sempre "online";
  // se estiver errado, a hidratação corrige no mesmo instante.
  const online = useSyncExternalStore(
    assinarRede,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      style={css(
        // 64px é a altura da barra de topo — a tarja encosta nela, sem cobri-la.
        "position:sticky;top:64px;z-index:35;margin-bottom:14px;" +
          `display:flex;align-items:center;gap:10px;padding:${isMobile ? "11px 13px" : "12px 15px"};` +
          "border:1px solid var(--warn-line);border-radius:12px;background:var(--warn-soft);" +
          `font:600 12.5px/1.5 ${SANS};color:var(--warn);box-shadow:var(--shadow);animation:fadein .2s ease`,
      )}
    >
      <span
        aria-hidden
        style={css("flex:none;width:8px;height:8px;border-radius:50%;background:var(--warn)")}
      />
      <span>
        Você está sem conexão. As telas continuam abrindo com o que já foi carregado, mas nada é
        salvo — registrar venda, fechar caixa ou lançar custo só funciona com internet.
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Convite para instalar                                                       */
/* -------------------------------------------------------------------------- */

/**
 * O evento que o Chrome e o Edge disparam quando o app cumpre os requisitos de
 * instalação. Não está no lib do TypeScript porque não é padrão — só existe nos
 * navegadores baseados em Chromium.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Agora não" precisa sobreviver ao F5, senão o convite volta a cada recarga e
 * vira incômodo. É a única coisa que o portal grava no navegador.
 */
const DISMISSED_KEY = "aguiar-one:instalar-dispensado";

/**
 * Se dá para instalar, e como.
 *
 * Isto vive FORA do React, num módulo, porque é estado do navegador e não da
 * tela: o `beforeinstallprompt` chega quando o Chrome quer, muitas vezes antes
 * de a primeira tela do portal montar. Um `useEffect` que só começasse a
 * escutar depois da montagem perderia o evento — e, sem ele, o botão "Instalar"
 * não teria o que abrir.
 *
 * O componente lê daqui com `useSyncExternalStore`, que é exatamente a ponte
 * para uma fonte externa: nada de `setState` dentro de efeito, nada de
 * renderização em cascata.
 */
type EstadoInstalacao = {
  /** O convite guardado do Chromium, ou `null` se ele ainda não veio. */
  prompt: BeforeInstallPromptEvent | null;
  /** Safari do iPhone/iPad: instala à mão, pelo menu Compartilhar. */
  ios: boolean;
  /** Já instalado, ou a pessoa disse "agora não". */
  dispensado: boolean;
};

/**
 * O retrato inicial — e o retrato do servidor. "Dispensado" é o padrão de
 * propósito: assim o cartão nunca aparece na primeira pintura para sumir logo
 * depois, quando o navegador contar que o app já está instalado.
 */
const NADA_A_OFERECER: EstadoInstalacao = { prompt: null, ios: false, dispensado: true };

let estado = NADA_A_OFERECER;
const ouvintes = new Set<() => void>();

function atualizar(patch: Partial<EstadoInstalacao>) {
  estado = { ...estado, ...patch };
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

/** O app já está rodando instalado — não há o que oferecer. */
function jaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // O Safari não implementa `display-mode`; ele marca a própria bandeira.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iPhone e iPad instalam pelo menu "Compartilhar", sem evento nenhum para o
 * site escutar. Como não dá para abrir o instalador por código, o que resta é
 * ensinar o caminho — daí a checagem pelo agente do navegador, que aqui é a
 * única pista disponível.
 */
function noIOS() {
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

if (typeof window !== "undefined") {
  if (!jaInstalado()) {
    atualizar({ ios: noIOS(), dispensado: localStorage.getItem(DISMISSED_KEY) === "1" });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    // Sem isto o Chrome mostra a barra dele, na hora dele. Guardamos o evento
    // para abrir o instalador quando a pessoa clicar no nosso botão — é a única
    // forma de escolher o momento do convite.
    e.preventDefault();
    atualizar({ prompt: e as BeforeInstallPromptEvent });
  });

  window.addEventListener("appinstalled", () => atualizar({ prompt: null, dispensado: true }));
}

function dispensar() {
  localStorage.setItem(DISMISSED_KEY, "1");
  atualizar({ dispensado: true });
}

async function instalar() {
  const { prompt } = estado;
  if (!prompt) return;

  await prompt.prompt();
  // O evento vale por um convite só. Aceitando ou recusando, ele não pode ser
  // usado de novo — o navegador manda outro quando fizer sentido.
  await prompt.userChoice;
  atualizar({ prompt: null });
}

export function InstalarApp() {
  const { isMobile } = usePortal();

  const { prompt, ios, dispensado } = useSyncExternalStore(
    assinar,
    () => estado,
    () => NADA_A_OFERECER,
  );

  const chromium = Boolean(prompt);
  if (dispensado || (!chromium && !ios)) return null;

  return (
    <div
      style={css(
        "position:fixed;z-index:100;width:305px;max-width:calc(100vw - 28px);" +
          // No celular a barra de "Nova venda" mora no rodapé; o cartão sobe
          // acima dela para não tapar o botão principal do portal.
          `right:${isMobile ? "14px" : "24px"};bottom:${isMobile ? "96px" : "24px"};` +
          "padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface);" +
          "box-shadow:var(--shadow-lg);animation:rise .22s ease",
      )}
    >
      <div style={css("display:flex;align-items:center;gap:10px")}>
        {/* O mesmo ícone que o sistema vai colocar na área de trabalho: o
            convite mostra o que a pessoa vai ganhar. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={36}
          height={36}
          style={css("flex:none;border-radius:10px")}
        />
        <span style={css(`font:700 13.5px/1.3 ${SANS};color:var(--text)`)}>
          Instalar o Aguiar One
        </span>
      </div>

      <p style={css(`margin:11px 0 0;font:400 12.5px/1.55 ${SANS};color:var(--text2)`)}>
        {ios && !chromium
          ? "Toque em Compartilhar, na barra do Safari, e escolha “Adicionar à Tela de Início”. O portal ganha um ícone e abre como aplicativo, mesmo sem internet."
          : "Ele ganha um ícone no seu aparelho e abre como um programa, sem a barra do navegador — e as telas continuam abrindo mesmo sem internet."}
      </p>

      <div style={css("display:flex;gap:9px;margin-top:14px")}>
        {chromium && (
          <Button
            onClick={instalar}
            className="hv-glow"
            loadingLabel="Abrindo o instalador…"
            style={css(
              "flex:1;padding:10px;border-radius:10px;background:var(--accent);" +
                `color:var(--accent-ink);font:700 12.5px ${SANS}`,
            )}
          >
            Instalar
          </Button>
        )}
        <Button
          onClick={dispensar}
          className="hv-border-text"
          style={css(
            `${chromium ? "flex:none;" : "flex:1;"}padding:10px 13px;border-radius:10px;` +
              `border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 12.5px ${SANS}`,
          )}
        >
          {chromium ? "Agora não" : "Entendi"}
        </Button>
      </div>
    </div>
  );
}
