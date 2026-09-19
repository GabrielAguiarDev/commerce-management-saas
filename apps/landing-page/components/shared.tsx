import { css } from "@aguiar/ui";
import Link from "next/link";
import Image from "next/image";
import { CONTAINER, CONTAINER_NARROW, EYEBROW, H2, LEAD, SECTION_INTRO } from "@/lib/styleKit";

/**
 * A marca — o "AO" do arquivo, não um desenho parecido com ele.
 *
 * É o `public/images/logo-ao.png` dos dois portais, byte a byte: o "AO" azul
 * da marca (`#387a9f`) SOBRE FUNDO TRANSPARENTE, recortado rente ao desenho.
 * Ele pousa direto no fundo de quem o hospeda — a barra clara do topo, o
 * petrol do rodapé e o petrol da barra lateral do painel ilustrado —, e é por
 * isso que não recebe cor, fundo nem canto arredondado.
 *
 * `size` é a ALTURA; a largura sai da proporção do desenho (≈1,7 : 1).
 *
 * O nome do arquivo é novo de propósito: `logo.png` era o "A", e trocar só o
 * conteúdo deixaria toda cópia já baixada — navegador, otimizador de imagem —
 * servindo a marca velha de uma URL que agora promete outra.
 *
 * O favicon é `app/icon.png`: o ladrilho branco do ícone do app, opaco porque
 * uma marca transparente numa aba escura desaparece.
 */
const PROPORCAO = 927 / 545;

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <Image
      src="/images/logo-ao.png"
      alt=""
      width={Math.round(size * PROPORCAO)}
      height={size}
      priority
      style={{ flex: "none", display: "block" }}
    />
  );
}

/** Marca + nome, do cabeçalho e do rodapé. */
export function Wordmark({
  brand,
  size = 22,
  fontSize = 17,
  color = "var(--petrol)",
}: {
  brand: string;
  size?: number;
  fontSize?: number;
  color?: string;
}) {
  return (
    <div style={css("display:flex;align-items:center;gap:9px")}>
      <Logo size={size} />
      <span
        style={css(
          `font-family:var(--display-stack);font-weight:700;font-size:${fontSize}px;` +
            `letter-spacing:-.01em;color:${color}`,
        )}
      >
        {brand}
      </span>
    </div>
  );
}

/** A faixa de largura fixa que centraliza o conteúdo de uma dobra. */
export function Container({
  narrow = false,
  children,
}: {
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return <div style={css(narrow ? CONTAINER_NARROW : CONTAINER)}>{children}</div>;
}

/**
 * A abertura de uma dobra: olho-mágico, manchete e, quando há, o parágrafo.
 *
 * O `id` vai no `<h2>` e não na `<section>` — é ele que a seção aponta com
 * `aria-labelledby`, e é assim que a dobra ganha nome na lista de regiões de um
 * leitor de tela.
 *
 * `center` é a exceção, não o padrão: só a dobra dos números pede, porque as
 * quatro colunas dela são simétricas em torno do eixo do meio. Toda outra dobra
 * abre à esquerda, que é onde a leitura começa. Note que centralizar é
 * `margin:0 auto` E `text-align:center` — a caixa tem 620px e sem o `auto` ela
 * ficaria encostada à esquerda com o texto centralizado dentro.
 */
export function SectionIntro({
  id,
  eyebrow,
  title,
  lead,
  center = false,
  marginBottom = 36,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  marginBottom?: number;
}) {
  return (
    <div
      style={css(
        SECTION_INTRO +
          `margin-bottom:${marginBottom}px` +
          (center ? ";margin-left:auto;margin-right:auto;text-align:center" : ""),
      )}
    >
      <div style={css(EYEBROW)}>{eyebrow}</div>
      <h2 id={id} style={css(H2 + (lead ? "margin-bottom:14px" : ""))}>
        {title}
      </h2>
      {lead ? <p style={css(LEAD)}>{lead}</p> : null}
    </div>
  );
}

/**
 * Um item incluído no plano.
 *
 * O "✓" é decoração: quem ouve a página recebe "Controle de custos", e não
 * "marca de seleção Controle de custos" quatro vezes seguidas.
 */
export function Check({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <div
      style={css(
        "display:flex;gap:10px;align-items:flex-start;font-size:15px;color:" +
          (dark ? "var(--on-petrol)" : "#3c5460"),
      )}
    >
      <span
        aria-hidden="true"
        style={css("font-weight:700;color:" + (dark ? "var(--pos-on-petrol)" : "var(--pos)"))}
      >
        ✓
      </span>
      {children}
    </div>
  );
}

/**
 * A abertura das páginas do rodapé (`/sobre`, `/contato`, `/termos`).
 *
 * É PARENTE DE `SectionIntro`, NÃO É ELA. As duas escrevem olho-mágico,
 * manchete e parágrafo, mas esta abre uma PÁGINA e não uma dobra: o título é
 * `h1`, vem em corpo de manchete de primeira dobra e carrega, acima de tudo, o
 * caminho de volta — quem entra aqui vindo do rodapé precisa de uma porta para
 * a vitrine, e o cabeçalho fixo sozinho não diz isso.
 *
 * A faixa é a de LEITURA (720px), a mesma da manchete da primeira dobra. Estas
 * páginas são texto corrido, e texto corrido em 1160px não se lê.
 */
export function PageIntro({
  eyebrow,
  title,
  lead,
  back,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  back: string;
}) {
  return (
    <div style={css("max-width:720px;margin:0 auto")}>
      {/* `next/link` e não `<a>`: é navegação entre páginas do próprio site,
          e o Link busca a home antes do clique — de `/termos` para a vitrine a
          volta é instantânea. Fora isso, é o mesmo elemento. */}
      <Link
        className="lp-link"
        href="/"
        style={{
          display: "inline-block",
          fontSize: "14.5px",
          fontWeight: 600,
          color: "var(--accent-text)",
          marginBottom: "22px",
        }}
      >
        {back}
      </Link>
      <div style={css(EYEBROW)}>{eyebrow}</div>
      <h1
        style={css(
          "font-size:clamp(30px,4.4vw,44px);line-height:1.08;font-weight:800;" +
            "letter-spacing:-.025em;color:var(--petrol);margin:0 0 16px",
        )}
      >
        {title}
      </h1>
      {lead ? (
        <p style={css("font-size:clamp(16px,1.6vw,18.5px);line-height:1.6;color:var(--text3);margin:0;max-width:60ch")}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
