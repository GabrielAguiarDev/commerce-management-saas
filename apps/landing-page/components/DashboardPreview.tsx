/**
 * ┌─ FORA DE USO DESDE A DEMONSTRAÇÃO ENCENADA ─────────────────────────────┐
 * │ Este é o painel PARADO que abria a primeira dobra. Quem abre hoje é     │
 * │ `DemoStage.tsx`, que encena o registro de uma venda em laço.            │
 * │                                                                         │
 * │ ELE FICA AQUI DE PROPÓSITO, e não por esquecimento: o primeiro quadro   │
 * │ da demo é este painel, valor por valor (R$ 1.240 / R$ 480 / R$ 760).    │
 * │ Se a demo não convencer, voltar é trocar uma linha em `Hero.tsx` —      │
 * │ `<DemoStage />` por `<DashboardPreview />` — e nada mais. O texto dele  │
 * │ continua em `COPY.hero.panel`, intocado.                                │
 * │                                                                         │
 * │ Enquanto estiver fora de uso, ele não recebe manutenção. Se voltar,     │
 * │ confira antes se os números ainda batem com os do resto da página.      │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { css } from "@aguiar/ui";
import { Logo } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { DISPLAY } from "@/lib/styleKit";

const TILE = "background:var(--surface);border:1px solid var(--border);border-radius:12px;";
const TILE_LABEL = "font-size:11.5px;color:var(--muted);margin-bottom:6px;";
const tileValue = (color: string) =>
  `font-family:${DISPLAY};font-weight:800;line-height:1.1;color:${color};`;
const CHIP =
  "background:var(--surface);border:1px solid var(--border);border-radius:999px;" +
  "padding:7px 12px;font-size:11.5px;color:var(--text3);font-weight:500;";

/**
 * Um item do menu lateral, aceso ou apagado.
 *
 * OS 17px DE FOLGA VERTICAL SÃO MEDIDA, não gosto. Com a folga apertada que um
 * item de lista costuma ter, os cinco módulos ocupavam pouco mais da metade da
 * barra e sobrava um palmo de petrol vazio embaixo do "Caixa" — o defeito que
 * esta dobra inteira existe para não ter. Em 17px a linha fica com ~51px de
 * altura, que é a de uma linha de barra lateral de verdade, e os cinco itens
 * mais a marca preenchem a coluna até ~25px do fim.
 *
 * Se o miolo do painel mudar de altura, é este número que reencontra o pé.
 */
const RAIL_ITEM =
  "font-size:13px;font-weight:500;padding:17px 12px;border-radius:8px;" +
  "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
const RAIL_ON = "background:rgba(255,255,255,.13);color:#fff;font-weight:600;";
const RAIL_OFF = "color:var(--on-petrol-muted);";

/**
 * QUAL MÓDULO ESTÁ ACESO NO MENU, e por que este.
 *
 * O índice aponta para `COPY.modules.items` — hoje, "Relatórios e lucro". Não é
 * escolha estética: é o módulo que o painel ao lado ESTÁ mostrando. A descrição
 * dele no dicionário ("veja quanto entrou, quanto saiu e quanto sobrou por dia,
 * semana ou mês") é, palavra por palavra, o que está desenhado aqui — vendas,
 * custos, lucro e os últimos sete dias.
 *
 * "Registro de vendas" seria o item errado: aquele módulo é a LISTA de vendas
 * uma a uma, com hora e forma de pagamento, e essa tela existe — é o primeiro
 * painel da vitrine dos módulos, em `ModulePanels.tsx`. Aqui não há nenhuma
 * venda avulsa, só totais.
 *
 * Se algum dia o miolo deste painel mudar, este número muda junto. Menu com
 * destaque que não corresponde ao conteúdo é a primeira coisa que denuncia que
 * a tela é decorativa.
 */
const ACTIVE_MODULE = 2;

/**
 * As sete barras da semana, em porcentagem da altura da caixa.
 *
 * São números inventados, escolhidos para desenhar uma semana que sobe sem
 * subir em linha reta — uma sequência crescente perfeita não parece um negócio
 * de verdade. As duas últimas ganham cor porque são o "hoje" e a véspera: é o
 * que faz o "+18%" ao lado ter a que se referir.
 */
const WEEK = [44, 60, 38, 72, 56, 86, 100];

/**
 * O painel que abre a primeira dobra.
 *
 * É ILUSTRAÇÃO, não um preview ao vivo: os números vêm do dicionário e não de
 * lugar nenhum. Por isso a coisa inteira é `aria-hidden` e carrega um `alt`
 * escrito à mão logo ao lado — quem ouve a página recebe uma frase, e não
 * quatorze números soltos fora de contexto.
 *
 * ELE NÃO É MAIS UM CARTÃO AO LADO DO TEXTO, é a tela inteira embaixo dele, na
 * largura da faixa. Em tela larga ganha a barra lateral com os módulos e o
 * miolo se reparte em duas colunas; no celular volta a ser a pilha de sempre.
 * As duas montagens e o porquê de cada medida estão em `globals.css`, no bloco
 * do painel — aqui ficam só as classes que ligam uma coisa na outra.
 *
 * NENHUM TEXTO NOVO FOI ESCRITO PARA ISTO. O menu lateral lista
 * `COPY.modules.items`, que é a mesma lista que a dobra dos módulos usa mais
 * abaixo, e a marca é `COPY.brand`. Uma ilustração de produto não pode ter
 * vocabulário próprio: se o menu daqui mostrasse módulos que a página não
 * vende, seria uma promessa a mais para ninguém cumprir.
 */
export function DashboardPreview() {
  const panel = COPY.hero.panel;

  return (
    <div style={css("position:relative")}>
      {/* O texto que substitui a ilustração para quem não a vê. */}
      <span
        style={css(
          "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap",
        )}
      >
        {panel.alt}
      </span>

      <div
        aria-hidden="true"
        style={css(
          "background:var(--surface3);border:1px solid var(--border);border-radius:18px;padding:14px;" +
            /* SUSPENSO SOBRE O BRANCO, e por isso a sombra mudou de natureza.
               Sobre o petrol de antes ela era um borrão preto a 32% que fazia
               peso; sobre branco, preto vira um halo cinza sujo. Agora são duas
               sombras em petrol translúcido — uma larga e afastada, que é a
               altura, e uma curta e justa, que é a aresta. A borda de 1px é o
               que dá o contorno, porque `--surface3` sobre branco quase não se
               distingue sozinho. */
            "box-shadow:0 28px 56px -16px rgba(18,60,74,.20),0 6px 16px -6px rgba(18,60,74,.10)",
        )}
      >
        {/* A moldura de janela: dois pontos e a legenda. Ela atravessa o painel
            inteiro, por cima da barra lateral — é a janela que contém o
            programa, e não uma barra do programa. */}
        <div style={css("display:flex;align-items:center;gap:7px;padding:2px 4px 12px")}>
          <div style={css("width:9px;height:9px;border-radius:50%;background:var(--chrome)")} />
          <div style={css("width:9px;height:9px;border-radius:50%;background:var(--chrome)")} />
          <div
            style={css(
              `margin-left:auto;font-size:11px;color:var(--muted2);font-family:${DISPLAY};font-weight:600`,
            )}
          >
            {panel.caption}
          </div>
        </div>

        <div className="lp-panel-body">
          {/* A BARRA LATERAL. É ela que faz a largura toda valer a pena: sem
              menu, um painel de 1160px é um cartão gigante; com menu, é uma
              tela. O petrol é o mesmo fundo escuro que o console usa na coluna
              dele — a ilustração mostra o produto que a pessoa vai abrir. */}
          <div
            className="lp-panel-rail"
            style={css("background:var(--petrol);border-radius:12px;padding:16px 12px")}
          >
            {/* O MESMO `icon.png`, no MESMO tamanho que o cabeçalho pede. Igual
                em pixel significa a mesma URL otimizada, que o navegador já
                baixou lá em cima — a ilustração não custa uma requisição.

                A marca é transparente, então aqui ela pousa no petrol da barra
                — que é exatamente como o console a mostra na coluna dele. */}
            <div style={css("display:flex;align-items:center;gap:9px;padding:0 6px 14px")}>
              <Logo size={28} />
              <span
                style={css(
                  `font-family:${DISPLAY};font-weight:700;font-size:14px;` +
                    "letter-spacing:-.01em;color:#fff",
                )}
              >
                {COPY.brand}
              </span>
            </div>

            {COPY.modules.items.map((item, i) => (
              <div
                key={item.title}
                style={css(RAIL_ITEM + (i === ACTIVE_MODULE ? RAIL_ON : RAIL_OFF))}
              >
                {item.title}
              </div>
            ))}
          </div>

          <div className="lp-panel-content">
            {/* Vendas, custos e lucro. O lucro é o único em verde: é o número
                que a página inteira promete mostrar. */}
            <div className="lp-panel-tiles">
              <div className="lp-panel-tile" style={css(TILE)}>
                <div style={css(TILE_LABEL)}>{panel.sales}</div>
                <div className="lp-panel-value" style={css(tileValue("var(--ink)"))}>
                  {panel.salesValue}
                </div>
              </div>
              <div className="lp-panel-tile" style={css(TILE)}>
                <div style={css(TILE_LABEL)}>{panel.costs}</div>
                <div className="lp-panel-value" style={css(tileValue("var(--ink)"))}>
                  {panel.costsValue}
                </div>
              </div>
              <div className="lp-panel-tile" style={css(TILE)}>
                <div style={css(TILE_LABEL)}>{panel.profit}</div>
                <div className="lp-panel-value" style={css(tileValue("var(--pos)"))}>
                  {panel.profitValue}
                </div>
              </div>
            </div>

            <div
              className="lp-panel-chart"
              style={css(
                "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px",
              )}
            >
              <div
                style={css(
                  "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px",
                )}
              >
                <div
                  style={css(
                    `font-family:${DISPLAY};font-weight:700;font-size:13.5px;color:var(--ink)`,
                  )}
                >
                  {panel.chartTitle}
                </div>
                <div style={css("font-size:11.5px;color:var(--pos);font-weight:600")}>
                  {panel.chartDelta}
                </div>
              </div>
              <div className="lp-panel-bars" style={css("display:flex;align-items:flex-end")}>
                {WEEK.map((height, i) => (
                  <div
                    key={i}
                    className="lp-panel-bar"
                    style={css(
                      `flex:1;height:${height}%;border-radius:5px 5px 3px 3px;background:` +
                        (i === WEEK.length - 1
                          ? "var(--petrol)"
                          : i === WEEK.length - 2
                            ? "var(--accent)"
                            : "var(--bar)"),
                    )}
                  />
                ))}
              </div>
            </div>

            {/* As pílulas: dois módulos ligados e um por ligar. É a promessa de
                "monte do seu jeito" dita em miniatura, antes da dobra que
                explica. Elas dizem o ESTADO dos módulos; o menu ao lado diz
                onde eles ficam. */}
            <div
              className="lp-panel-chips"
              style={css("display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start")}
            >
              <div style={css(CHIP)}>{panel.tagSales}</div>
              <div style={css(CHIP)}>{panel.tagCosts}</div>
              <div
                style={css(
                  "border:1px dashed var(--dashed);border-radius:999px;padding:7px 12px;" +
                    "font-size:11.5px;color:var(--muted2)",
                )}
              >
                {panel.tagStock}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
