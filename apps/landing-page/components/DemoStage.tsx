import { css } from "@aguiar/ui";
import { DemoDriver } from "@/components/DemoDriver";
import { Logo } from "@/components/shared";
import { COPY } from "@/lib/dictionary";

/**
 * A DEMONSTRAÇÃO ENCENADA DA PRIMEIRA DOBRA.
 *
 * ┌─ DE ONDE CADA TELA FOI COPIADA ─────────────────────────────────────────┐
 * │ Isto é um MOCK VISUAL. Nenhuma linha daqui é o produto: é um desenho    │
 * │ das telas do portal do cliente, feito à mão, com números inventados.    │
 * │                                                                         │
 * │   "Resumo de hoje"  ←  apps/portal-client/components/views/             │
 * │                        DashboardView.tsx  (cartões de KPI com pontinho, │
 * │                        gráfico dos 7 dias, "Últimas vendas de hoje")    │
 * │   "Nova venda"      ←  .../views/PdvView.tsx  (busca, "Mais vendidos",  │
 * │                        card de produto com selo de quantidade,          │
 * │                        carrinho, forma de pagamento, botão com o valor) │
 * │   "Vendas"          ←  .../views/VendasView.tsx  (quatro KPIs, pílulas  │
 * │                        de período, cabeçalho de tabela, linha de venda) │
 * │   barra de topo     ←  .../components/Topbar.tsx ("Vendas de hoje" e o  │
 * │                        botão "Nova venda")                              │
 * │   aviso de sucesso  ←  .../components/Overlays.tsx  (`Toast`)           │
 * │                                                                         │
 * │ AQUELAS TELAS VÃO MUDAR, E ESTA NÃO MUDA JUNTO. Nada avisa. Quem mexer  │
 * │ no PDV, no dashboard ou na lista de vendas do portal precisa vir aqui   │
 * │ conferir se a vitrine ainda mostra o produto que existe — uma demo que  │
 * │ promete uma tela que não é mais aquela é pior do que nenhuma demo.      │
 * │ O mesmo aviso está em docs/architecture/arquitetura-monorepo.md.        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * COMO ELA FUNCIONA. Tudo o que a sequência mostra está NESTE HTML, o tempo
 * todo, vindo do servidor: os dois valores de cada número, o carrinho cheio e
 * o carrinho vazio, a linha de venda que ainda não existe. O que muda de um
 * passo para o outro é só qual desses estados está aceso — e quem acende é o
 * CSS, lendo os `data-*` que `DemoDriver` escreve na raiz (ver `lib/demo.ts`).
 *
 * POR ISSO O PRIMEIRO QUADRO NÃO DEPENDE DE JAVASCRIPT. Sem nenhum atributo, o
 * CSS pinta o painel do dia depois da venda — o mesmo painel, valor por valor,
 * que `DashboardPreview.tsx` desenhava aqui antes. É esse o estado que fica na
 * tela se o pacote não chegar, e é dele que o laço parte quando chega.
 *
 * O ESTILO MORA NO CSS, e não em `style` inline como no resto da página. Aqui a
 * inversão se paga: quase tudo neste arquivo muda em pelo menos um dos três
 * degraus de largura, e `style` inline vence media query na cascata. De quebra,
 * a marcação viaja mais leve — e ela viaja no HTML da primeira dobra, que é o
 * que o 4G paga antes de qualquer outra coisa.
 */

/**
 * As alturas das sete barras, em porcentagem da mais alta (segunda-feira,
 * R$ 1.310). São desenho, não conteúdo — os valores estão no dicionário.
 *
 * A DE HOJE É A ÚNICA QUE MEXE, e mexe por `scaleY` (0,974 = 1.208/1.240), que
 * o compositor resolve sem recalcular layout. Ela é a última da lista.
 */
const BARS = [41.6, 56.8, 36, 68.2, 53, 100, 94.7];

/** Qual módulo do menu fica aceso em cada tela. Ver `COPY.modules.items`. */
const RAIL_REPORTS = 2; // "Relatórios e lucro" — o painel de totais e o gráfico.
const RAIL_SALES = 0; // "Registro de vendas" — o PDV e o histórico.

/**
 * Um número que muda quando a venda entra.
 *
 * Os dois valores ficam empilhados na MESMA célula de uma grade, então a caixa
 * já nasce com a largura do mais largo e nada empurra o vizinho quando eles se
 * trocam. Sem `after`, é um texto comum — não vale gastar dois nós para um
 * valor que não muda.
 */
function Swap({ now, after }: { now: string; after: string }) {
  if (!after) return <>{now}</>;
  return (
    <span className="lp-demo-swap">
      <span className="lp-demo-swap-before">{now}</span>
      <span className="lp-demo-swap-after">{after}</span>
    </span>
  );
}

/**
 * O anel que pulsa no alvo quando a demo "toca" nele.
 *
 * Ele é FILHO DO PRÓPRIO ALVO, e não um enfeite posicionado por coordenada: no
 * celular não há ponteiro para desenhar, e um anel que nasce dentro do botão
 * acerta o botão em qualquer largura de tela, sem media query nenhuma.
 */
function Tap({ t }: { t: string }) {
  return <span className="lp-demo-tap" data-tap={t} />;
}

export function DemoStage() {
  const demo = COPY.hero.demo;
  const rows = demo.rows;

  return (
    <div style={css("position:relative")}>
      {/* O texto que substitui a sequência inteira para quem não a vê. Mesmo
          padrão de `DashboardPreview`: uma frase escrita à mão, do lado de
          fora do bloco `aria-hidden`, em vez de sessenta números soltos. */}
      <span
        style={css(
          "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap",
        )}
      >
        {demo.alt}
      </span>

      <DemoDriver>
        <div aria-hidden="true" className="lp-demo-frame">
          {/* A moldura de janela: os mesmos dois pontos e a mesma legenda à
              direita das outras ilustrações da página. A legenda é a única
              parte da moldura que muda de tela para tela. */}
          <div className="lp-demo-chrome">
            <span className="lp-demo-dot" />
            <span className="lp-demo-dot" />
            <span className="lp-demo-caption">
              <span data-c="dash">{demo.caption.dash}</span>
              <span data-c="pdv">{demo.caption.pdv}</span>
              <span data-c="sales">{demo.caption.sales}</span>
            </span>
          </div>

          {/* `lp-panel-body` e `lp-panel-rail` são as classes que o painel
              estático já usava: a demo herda os mesmos três degraus de largura
              em vez de inventar um quarto. */}
          <div className="lp-panel-body">
            <div className="lp-panel-rail lp-demo-rail">
              <div className="lp-demo-brand">
                <Logo size={26} />
                <span>{COPY.brand}</span>
              </div>
              {COPY.modules.items.map((item, i) => (
                <div
                  key={item.title}
                  className="lp-demo-rail-item"
                  data-on={i === RAIL_REPORTS ? "dash" : i === RAIL_SALES ? "sales" : undefined}
                >
                  {item.title}
                </div>
              ))}
            </div>

            {/* O palco. É ele que o ponteiro toma como referência, e é por isso
                que a barra de topo está DENTRO dele: o botão "Nova venda", que
                é o primeiro alvo, mora na barra. */}
            <div className="lp-demo-content">
              <div className="lp-demo-topbar">
                <span className="lp-demo-topbar-num">
                  <span className="lp-demo-topbar-label">{demo.topbar.label}</span>
                  <strong>
                    <Swap now={demo.dash.kpis[0].value} after={demo.dash.kpis[0].after} />
                  </strong>
                </span>
                {/* O portal esconde este botão quando já se está no PDV —
                    oferecer "Nova venda" na tela de vender seria redundante. A
                    demo faz igual, pelo CSS. */}
                <span className="lp-demo-btn-new" data-t="new">
                  {demo.topbar.newSale}
                  <Tap t="new" />
                </span>
              </div>

              <div className="lp-demo-screens">
                {/* ----------------------------------------------------------
                    TELA 1 — o resumo do dia (DashboardView.tsx)
                ---------------------------------------------------------- */}
                <div className="lp-demo-screen" data-s="dash">
                  <div className="lp-demo-head">
                    <div>
                      <div className="lp-demo-title">{demo.dash.title}</div>
                      <div className="lp-demo-sub">{demo.dash.subtitle}</div>
                    </div>
                  </div>

                  <div className="lp-demo-dash">
                    <div className="lp-demo-kpis">
                      {demo.dash.kpis.map((k, i) => (
                        <div key={k.label} className="lp-demo-kpi" data-i={i}>
                          <span className="lp-demo-kpi-top">
                            <span className="lp-demo-dash-dot" data-i={i} />
                            <span className="lp-demo-kpi-label">{k.label}</span>
                          </span>
                          <span className="lp-demo-kpi-value" data-pos={i === 2 ? "" : undefined}>
                            <Swap now={k.value} after={k.after} />
                          </span>
                          <span className="lp-demo-kpi-note">
                            <Swap now={k.note} after={k.noteAfter} />
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="lp-demo-card lp-demo-chart">
                      <div className="lp-demo-card-head">
                        <span className="lp-demo-card-title">{demo.dash.chartTitle}</span>
                        <span className="lp-demo-card-note">
                          <Swap now={demo.dash.chartNote} after={demo.dash.chartNoteAfter} />
                        </span>
                      </div>
                      <div className="lp-demo-bars">
                        {demo.dash.days.map((d, i) => {
                          const today = i === demo.dash.days.length - 1;
                          return (
                            <span key={d.label} className="lp-demo-col">
                              <span className="lp-demo-bar-value">
                                <Swap now={d.value} after={today ? demo.dash.todayAfter : ""} />
                              </span>
                              <span className="lp-demo-bar-slot">
                                <span
                                  className={today ? "lp-demo-bar lp-demo-bar-today" : "lp-demo-bar"}
                                  data-on={today ? "" : undefined}
                                  style={css(`height:${BARS[i]}%`)}
                                />
                              </span>
                              <span className="lp-demo-bar-label" data-on={today ? "" : undefined}>
                                {d.label}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lp-demo-card lp-demo-latest">
                      <div className="lp-demo-card-head">
                        <span className="lp-demo-card-title">{demo.dash.listTitle}</span>
                        <span className="lp-demo-ghost">{demo.dash.listAll}</span>
                      </div>
                      <div className="lp-demo-rows">
                        {/* A venda da demo, fora do fluxo: quando ela acende, o
                            bloco de baixo desce por `transform` em vez de a
                            caixa recalcular a lista inteira. */}
                        <div className="lp-demo-row lp-demo-row-new">
                          <span className="lp-demo-row-time">{rows[0].time}</span>
                          <span className="lp-demo-row-items">{rows[0].items}</span>
                          <span className="lp-demo-badge">{rows[0].pay}</span>
                          <span className="lp-demo-row-total">{rows[0].total}</span>
                        </div>
                        <div className="lp-demo-shift">
                          {rows.slice(1).map((r) => (
                            <div key={r.time} className="lp-demo-row">
                              <span className="lp-demo-row-time">{r.time}</span>
                              <span className="lp-demo-row-items">{r.items}</span>
                              <span className="lp-demo-badge">{r.pay}</span>
                              <span className="lp-demo-row-total">{r.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------------
                    TELA 2 — o balcão (PdvView.tsx)
                ---------------------------------------------------------- */}
                <div className="lp-demo-screen" data-s="pdv">
                  <div className="lp-demo-head">
                    <div className="lp-demo-back">
                      <span className="lp-demo-back-btn">‹</span>
                      <div>
                        <div className="lp-demo-title">{demo.pdv.title}</div>
                        <div className="lp-demo-sub">{demo.pdv.subtitle}</div>
                      </div>
                    </div>
                    <span className="lp-demo-counter">
                      <Swap now={demo.pdv.counter} after={demo.pdv.counterAfter} />
                    </span>
                  </div>

                  <div className="lp-demo-pdv">
                    <div className="lp-demo-card lp-demo-catalog">
                      <div className="lp-demo-search" data-t="search">
                        <span className="lp-demo-search-icon">⌕</span>
                        <span className="lp-demo-search-text">
                          <span className="lp-demo-ph">{demo.pdv.searchPlaceholder}</span>
                          {/* Um `<span>` por caractere: a demo acende um de
                              cada vez e o campo já nasce com a largura da
                              palavra inteira, então nada se mexe enquanto ela
                              é "digitada". */}
                          <span className="lp-demo-typed">
                            <span className="lp-demo-chars">
                              {demo.pdv.typed.split("").map((c, i) => (
                                <span key={i}>{c}</span>
                              ))}
                            </span>
                            <span className="lp-demo-caret" />
                          </span>
                        </span>
                      </div>

                      <div className="lp-demo-cat">
                        <div className="lp-demo-cat-all">
                          <div className="lp-demo-eyebrow">{demo.pdv.favorites}</div>
                          <div className="lp-demo-tiles" data-fav="">
                            {demo.pdv.products.slice(0, 3).map((p) => (
                              <span key={p.name} className="lp-demo-tile" data-fav="">
                                <span className="lp-demo-tile-name">{p.name}</span>
                                <span className="lp-demo-tile-price">{p.price}</span>
                              </span>
                            ))}
                          </div>
                          <div className="lp-demo-eyebrow">{demo.pdv.all}</div>
                          <div className="lp-demo-tiles">
                            {demo.pdv.products.slice(3).map((p) => (
                              <span key={p.name} className="lp-demo-tile">
                                <span className="lp-demo-tile-name">{p.name}</span>
                                <span className="lp-demo-tile-price">{p.price}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* O catálogo filtrado pela busca. É o mesmo card do
                            produto, agora sozinho e como alvo do toque. */}
                        <div className="lp-demo-cat-res">
                          <div className="lp-demo-eyebrow">{demo.pdv.results}</div>
                          <div className="lp-demo-tiles" data-fav="">
                            <span className="lp-demo-tile" data-fav="" data-t="card">
                              <span className="lp-demo-tile-name">
                                {demo.pdv.products[0].name}
                              </span>
                              <span className="lp-demo-tile-price">
                                {demo.pdv.products[0].price}
                              </span>
                              <span className="lp-demo-tile-badge">
                                <span data-q="1">1</span>
                                <span data-q="2">2</span>
                              </span>
                              <Tap t="card" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lp-demo-cart">
                      <div className="lp-demo-cart-head">
                        <span className="lp-demo-card-title">{demo.pdv.cartTitle}</span>
                        <span className="lp-demo-cart-count">
                          <span data-q="0">{demo.pdv.zero}</span>
                          <span data-q="1">{demo.pdv.one}</span>
                          <span data-q="2">{demo.pdv.two}</span>
                        </span>
                      </div>

                      <div className="lp-demo-cart-body">
                        <div className="lp-demo-cart-empty">{demo.pdv.cartEmpty}</div>
                        <div className="lp-demo-cart-item">
                          <span className="lp-demo-cart-name">{demo.pdv.products[0].name}</span>
                          <span className="lp-demo-cart-unit">
                            {demo.pdv.products[0].price} {demo.pdv.each}
                          </span>
                          <span className="lp-demo-stepper-row">
                            <span className="lp-demo-stepper">
                              <span className="lp-demo-step" data-t="minus">
                                −<Tap t="minus" />
                              </span>
                              <span className="lp-demo-qty">
                                <span data-q="1">1</span>
                                <span data-q="2">2</span>
                              </span>
                              <span className="lp-demo-step" data-t="plus">
                                +<Tap t="plus" />
                              </span>
                            </span>
                            <span className="lp-demo-cart-line">
                              <span data-q="1">R$ 32,00</span>
                              <span data-q="2">R$ 64,00</span>
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="lp-demo-cart-foot">
                        <span className="lp-demo-pay-label">{demo.pdv.payLabel}</span>
                        <span className="lp-demo-select" data-t="pay">
                          <span className="lp-demo-select-value">
                            <span data-v="cash">{demo.pdv.payments[0]}</span>
                            <span data-v="pix">{demo.pdv.payments[1]}</span>
                          </span>
                          <span className="lp-demo-select-arrow">▾</span>
                          <Tap t="pay" />
                          {/* A lista aberta. Ela flutua sobre o rodapé do
                              carrinho — no fluxo, empurraria o botão de
                              confirmar para fora da caixa. */}
                          <span className="lp-demo-options">
                            {demo.pdv.payments.map((f, i) => (
                              <span key={f} className="lp-demo-option" data-on={i === 1 ? "" : undefined}>
                                {f}
                              </span>
                            ))}
                          </span>
                        </span>

                        <span className="lp-demo-total">
                          <span className="lp-demo-total-label">{demo.pdv.totalLabel}</span>
                          <strong className="lp-demo-total-value">
                            <span data-q="0">R$ 0,00</span>
                            <span data-q="1">R$ 32,00</span>
                            <span data-q="2">R$ 64,00</span>
                          </strong>
                        </span>

                        <span className="lp-demo-confirm" data-t="confirm">
                          <span className="lp-demo-confirm-idle">
                            {demo.pdv.confirm}{" "}
                            <span className="lp-demo-money">
                              <span data-q="0">R$ 0,00</span>
                              <span data-q="1">R$ 32,00</span>
                              <span data-q="2">R$ 64,00</span>
                            </span>
                          </span>
                          <span className="lp-demo-confirm-saving">{demo.pdv.saving}</span>
                          <Tap t="confirm" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------------
                    TELA 3 — o histórico (VendasView.tsx)
                ---------------------------------------------------------- */}
                <div className="lp-demo-screen" data-s="sales">
                  <div className="lp-demo-head">
                    <div>
                      <div className="lp-demo-title">{demo.sales.title}</div>
                      <div className="lp-demo-sub">{demo.sales.subtitle}</div>
                    </div>
                  </div>

                  <div className="lp-demo-kpis" data-four="">
                    {demo.sales.kpis.map((k) => (
                      <div key={k.label} className="lp-demo-kpi">
                        <span className="lp-demo-kpi-top">
                          <span className="lp-demo-dash-dot" data-i="3" />
                          <span className="lp-demo-kpi-label">{k.label}</span>
                        </span>
                        <span className="lp-demo-kpi-value">
                          <Swap now={k.value} after={k.after} />
                        </span>
                        <span className="lp-demo-kpi-note">
                          <Swap now={k.note} after={k.noteAfter} />
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="lp-demo-card lp-demo-history">
                    <div className="lp-demo-card-head">
                      <span className="lp-demo-card-title">{demo.sales.panelTitle}</span>
                      <span className="lp-demo-card-note">
                        <Swap now={demo.sales.count} after={demo.sales.countAfter} />
                      </span>
                    </div>

                    <div className="lp-demo-pills">
                      {demo.sales.periods.map((p, i) => (
                        <span key={p} className="lp-demo-pill" data-on={i === 0 ? "" : undefined}>
                          {p}
                        </span>
                      ))}
                    </div>

                    <div className="lp-demo-table">
                      <div className="lp-demo-thead">
                        <span>{demo.sales.cols.when}</span>
                        <span>{demo.sales.cols.items}</span>
                        <span className="lp-demo-c">{demo.sales.cols.qty}</span>
                        <span>{demo.sales.cols.pay}</span>
                        <span className="lp-demo-r">{demo.sales.cols.total}</span>
                      </div>
                      <div className="lp-demo-rows" data-table="">
                        <div className="lp-demo-trow lp-demo-row-new">
                          <span className="lp-demo-row-time">
                            {demo.today} · {rows[0].time}
                          </span>
                          <span className="lp-demo-row-items">{rows[0].items}</span>
                          <span className="lp-demo-c lp-demo-row-qty">{rows[0].qty}</span>
                          <span>
                            <span className="lp-demo-badge">{rows[0].pay}</span>
                          </span>
                          <span className="lp-demo-r lp-demo-row-total">{rows[0].total}</span>
                        </div>
                        <div className="lp-demo-shift">
                          {rows.slice(1).map((r) => (
                            <div key={r.time} className="lp-demo-trow">
                              <span className="lp-demo-row-time">
                                {demo.today} · {r.time}
                              </span>
                              <span className="lp-demo-row-items">{r.items}</span>
                              <span className="lp-demo-c lp-demo-row-qty">{r.qty}</span>
                              <span>
                                <span className="lp-demo-badge">{r.pay}</span>
                              </span>
                              <span className="lp-demo-r lp-demo-row-total">{r.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* O PONTEIRO. Uma caixa do tamanho do palco, deslocada por
                  `transform` em porcentagem — que, num elemento com `inset:0`,
                  é porcentagem do palco. É o que permite mirar os alvos sem
                  medir pixel nenhum e sem uma media query por passo. */}
              <span className="lp-demo-cursor-box">
                <span className="lp-demo-cursor">
                  <svg viewBox="0 0 12 18" width="15" height="22" fill="none">
                    <path
                      d="M1 1.2v14.1l3.5-3.4h5.2L1 1.2Z"
                      fill="#fff"
                      stroke="#123c4a"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="lp-demo-cursor-ring" />
                </span>
              </span>

              {/* O aviso de sucesso, no mesmo canto em que o portal o põe. */}
              <div className="lp-demo-toast">
                <span className="lp-demo-toast-mark">✓</span>
                <span className="lp-demo-toast-text">{demo.toast}</span>
                <span className="lp-demo-toast-bar" />
              </div>
            </div>
          </div>
        </div>
      </DemoDriver>
    </div>
  );
}
