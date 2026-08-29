import { css } from "@aguiar/ui";
import { DemoStage } from "@/components/DemoStage";
import { COPY } from "@/lib/dictionary";
import { HOW } from "@/lib/links";
import { ctaLink, fetchWhatsapp } from "@/lib/whatsapp";
import { CTA_GHOST, ctaPrimary } from "@/lib/styleKit";

/**
 * O VÉU DE COR DA PRIMEIRA DOBRA.
 *
 * Duas manchas do azul da marca nos cantos de cima, sobre branco, que morrem
 * antes do meio da dobra — daí para baixo é branco puro, que é onde o painel
 * pousa. Um painel claro sobre um fundo tingido perde a borda; sobre branco ele
 * flutua.
 *
 * AS OPACIDADES SÃO BAIXAS DE PROPÓSITO (12% e 10% no ponto mais forte, e esse
 * ponto fica FORA DA TELA). É véu, não cor de fundo: a intenção é que se note
 * que o branco não é chapado, sem que se consiga apontar onde começa o azul.
 *
 * `at 10% -12%` põe o centro da elipse ACIMA da borda de cima. Só a saia da
 * mancha entra na tela, e é isso que evita o "olho" — um círculo de cor com
 * centro visível, que é o que denuncia um degradê radial mal colocado.
 *
 * `rgba(27,154,189,0)` e NÃO `transparent` no fim de cada parada. `transparent`
 * é preto com alfa zero, e alguns navegadores interpolam passando pelo cinza:
 * a mancha ganharia um halo sujo na borda. Terminar na mesma cor com alfa zero
 * interpola dentro do mesmo tom.
 *
 * Sem imagem, sem `filter:blur` e sem animação. Um `blur` num elemento do
 * tamanho desta dobra é uma textura em GPU a cada pintura, e o público desta
 * página está em celular popular; o degradê radial é resolvido pelo rasterizador
 * uma vez e não custa quadro nenhum.
 *
 * EM CELULAR AS DUAS MANCHAS VIRAM UMA SÓ, DE CIMA PARA BAIXO. Numa faixa de
 * 390px os dois cantos se encostam e deixam um poço branco no meio da testa da
 * página — o que era luz nos cantos vira uma faixa azul com um buraco. A troca
 * está em `globals.css`, na classe `lp-hero`; aqui fica o arranjo de tela
 * larga, que é onde as duas manchas têm espaço para existir separadas.
 */
const WASH =
  "background:" +
  /* Canto de cima à ESQUERDA. Pico em 55%. */
  "radial-gradient(60% 62% at 1% -6%," +
  "rgba(27,154,189,.55) 0%," +
  "rgba(27,154,189,.40) 20%," +
  "rgba(27,154,189,.24) 38%," +
  "rgba(27,154,189,.12) 54%," +
  "rgba(27,154,189,.05) 68%," +
  "rgba(27,154,189,.015) 80%," +
  "rgba(27,154,189,0) 90%)," +
  /* Canto de cima à DIREITA. Um degrau abaixo — duas manchas de peso idêntico
     em espelho leem como um desenho, e não como luz. */
  "radial-gradient(58% 58% at 100% -3%," +
  "rgba(27,154,189,.50) 0%," +
  "rgba(27,154,189,.36) 20%," +
  "rgba(27,154,189,.22) 38%," +
  "rgba(27,154,189,.11) 54%," +
  "rgba(27,154,189,.045) 68%," +
  "rgba(27,154,189,.013) 80%," +
  "rgba(27,154,189,0) 90%)," +
  "#fff;";

/**
 * A primeira dobra.
 *
 * CLARA, e o texto escuro em cima dela. Era um degradê petrol com texto branco.
 *
 * A DOBRA ABRE NA MANCHETE. Não há mais selo acima dela; o primeiro que a página
 * diz é a promessa inteira, em corpo grande, e não uma etiqueta miúda antes.
 * Manchete, parágrafo, as duas chamadas e a linha de confiança — nessa ordem, e
 * mais nada.
 *
 * O TEXTO E O PAINEL NÃO TÊM MAIS A MESMA LARGURA, e isso é o ponto. O texto
 * para nos 720px em que a manchete quebra em duas linhas cheias; o painel passa
 * de 1160px da faixa e vai a 1360px, mais largo do que qualquer outra coisa da
 * página. Ele é a tela do produto: sangrar para fora da coluna de leitura é o
 * que faz a diferença entre "uma figura ao lado do texto" e "o produto".
 *
 * O PAINEL PARADO VIROU UMA DEMONSTRAÇÃO. No lugar de `DashboardPreview` — que
 * continua no repositório, com uma nota no topo — entra `DemoStage`, que encena
 * uma venda sendo registrada, em laço. O PRIMEIRO QUADRO DELA É O PAINEL QUE
 * ESTAVA AQUI, valor por valor, e vem pintado do servidor: a troca não custou
 * um milissegundo de LCP, e sem JavaScript a dobra é exatamente a de antes.
 *
 * ELE COMEÇA LOGO DEPOIS DA LINHA DE CONFIANÇA. O vão era de 96px e sobrava
 * dobra para uma faixa fina do painel; agora são ~40px e mais de dois terços
 * dele cabem na tela antes de rolar. O que passa da borda continua cortado de
 * propósito — uma tela inteira visível diz "acabou", uma cortada diz "tem mais".
 *
 * NADA AQUI COMEÇA INVISÍVEL. Esta dobra não usa `<Reveal>`, e não é
 * esquecimento: a manchete e o painel são o LCP da página. Escondê-los para
 * animar depois adia a métrica pelo tempo da animação e, no 4G instável que é a
 * conexão deste público, mostra uma tela vazia enquanto o pacote não chega. O
 * movimento começa na dobra seguinte.
 */
export async function Hero() {
  // A chamada principal da página: abre o WhatsApp com a frase da primeira
  // dobra, que é a mais geral das cinco.
  const cta = ctaLink(await fetchWhatsapp(), COPY.cta.whatsapp.hero);

  return (
    <section
      className="lp-hero"
      aria-labelledby="hero-title"
      style={css(
        WASH +
          /* A EMENDA COM A DOBRA SEGUINTE. Branco contra o `#f7f9fa` do
             Audiences dá 1.06:1 — o olho não resolve essa diferença, as duas
             faixas encostam e viram uma só. Esta linha de 1px é a mesma que
             Módulos e Planos já usam para se separar das vizinhas; é o
             vocabulário que a página tinha, não um recurso novo. */
          "border-bottom:1px solid var(--rule);" +
          /* A FOLGA DE CIMA ENCOLHEU (era `clamp(48px,7vw,88px)`). Ela e o selo
             que saiu daqui somavam ~79px de nada entre o cabeçalho e a manchete,
             e eram os 79px que empurravam o painel para fora da tela em janela
             baixa — num notebook de 1440x800 real, com barra de abas e dock,
             sobra bem menos altura do que os 900px em que a gente mede. */
          "padding:clamp(32px,4.2vw,60px) 20px clamp(56px,8vw,96px)",
      )}
    >
      {/* 720px é a medida da MANCHETE, não a do parágrafo: é onde o título de
          54px quebra em duas linhas cheias em vez de três curtas. O texto
          corrido tem o limite dele, mais estreito, logo abaixo. */}
      <div style={css("max-width:720px;margin:0 auto;text-align:center")}>
        {/* O SELO SAIU DAQUI. Era a pílula "Tudo num lugar só", logo acima da
            manchete. Ela e a folga dela custavam ~51px de altura para dizer, em
            miúdo, o que a manchete já diz em 54px — e eram 51px cobrados na
            parte mais cara da página, a que decide se o painel aparece ou não
            antes de rolar.

            O TEXTO CONTINUA NO DICIONÁRIO, em `COPY.hero.badge`. Não apaguei de
            lá de propósito: assim voltar atrás é colar este bloco de novo, sem
            precisar reescrever a frase nem a tradução em inglês. */}
        <h1
          id="hero-title"
          style={css(
            "font-size:clamp(34px,5.2vw,54px);line-height:1.06;font-weight:800;" +
              "letter-spacing:-.025em;margin-bottom:20px;color:var(--petrol)",
          )}
        >
          {COPY.hero.title}
        </h1>

        {/* `54ch` e não uma largura em pixels: o limite de leitura confortável
            é medido em caracteres por linha, não em milímetros de tela.

            A COR É `--text3` E NÃO O `--text2` DE CORPO DA PÁGINA. Medido:
            sobre o ponto mais forte do véu, `--text2` dá 4.48:1 — erra o AA por
            dois centésimos. `--text3` é um degrau mais escuro e dá 5.55:1 no
            mesmo ponto. Dois centésimos não são margem de segurança nenhuma. */}
        <p
          style={css(
            "font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:var(--text3);" +
              "max-width:54ch;margin:0 auto 30px",
          )}
        >
          {COPY.hero.subtitle}
        </p>

        <div
          style={css(
            "display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;" +
              "margin-bottom:22px",
          )}
        >
          <a className="lp-cta" {...cta} style={css(ctaPrimary(16, "15px 26px"))}>
            {COPY.hero.ctaPrimary}
          </a>
          {/* `lp-link` e não `lp-on-petrol`: o hover daquela abre para o BRANCO,
              porque ela serve o rodapé e a última dobra, que continuam escuros.
              Sobre claro o link sumiria ao ser apontado. */}
          <a className="lp-link" href={HOW} style={css(CTA_GHOST)}>
            {COPY.hero.ctaSecondary}
          </a>
        </div>

        {/* As três objeções respondidas antes de serem feitas: custa?, pede
            cartão?, funciona no meu celular? */}
        <p style={css("margin:0;font-size:13.5px;color:var(--text2)")}>{COPY.hero.note}</p>
      </div>

      {/* O PAINEL, FORA DA FAIXA DE 1160px. Ele tem a própria medida — daí não
          estar dentro de um `CONTAINER` como o resto da página. Os 20px de
          `padding` da seção continuam valendo, então em telas menores que
          1400px ele encolhe junto e nunca encosta na borda. */}
      <div style={css("max-width:1360px;margin:clamp(24px,3vw,40px) auto 0")}>
        <DemoStage />
      </div>
    </section>
  );
}
