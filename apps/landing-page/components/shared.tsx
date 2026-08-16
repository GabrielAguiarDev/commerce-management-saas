import { css } from "@aguiar/ui";
import Image from "next/image";
import { CONTAINER, CONTAINER_NARROW, EYEBROW, H2, LEAD, SECTION_INTRO } from "@/lib/styleKit";

/**
 * A marca — o "A" do arquivo, não um desenho parecido com ele.
 *
 * É o MESMO `icon.png` que o console carrega e que o app mobile instala como
 * ícone: o "A" azul da marca sobre o petrol quase preto. Por isso não recebe
 * cor nem fundo — os dois já vêm dentro da imagem, e é justamente isso que faz
 * o site, o console e o celular mostrarem a mesma coisa.
 *
 * O arquivo de design desenhava um quadradinho com a letra "A" em Manrope. Era
 * um "A" genérico, e o console já passou por essa troca pelo mesmo motivo.
 */
export function Logo({ size = 28, radius = 8 }: { size?: number; radius?: number }) {
  return (
    <Image
      src="/images/icon.png"
      alt=""
      width={size}
      height={size}
      priority
      style={{ flex: "none", borderRadius: radius + "px", display: "block" }}
    />
  );
}

/** Marca + nome, do cabeçalho e do rodapé. */
export function Wordmark({
  brand,
  size = 28,
  radius = 8,
  fontSize = 17,
  color = "var(--petrol)",
}: {
  brand: string;
  size?: number;
  radius?: number;
  fontSize?: number;
  color?: string;
}) {
  return (
    <div style={css("display:flex;align-items:center;gap:9px")}>
      <Logo size={size} radius={radius} />
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
