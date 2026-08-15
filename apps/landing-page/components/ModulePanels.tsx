import { css } from "@aguiar/ui";
import { COPY } from "@/lib/dictionary";
import { DISPLAY } from "@/lib/styleKit";

/**
 * As cinco ilustrações da dobra de módulos.
 *
 * SÃO IRMÃS DO PAINEL DA PRIMEIRA DOBRA, e de propósito: mesma moldura de
 * janela com dois pontos e legenda, mesmo ladrilho branco de valor, mesma
 * pílula. Quem chega aqui já viu esse vocabulário lá em cima, e é ele que faz
 * as cinco telas parecerem cinco telas DO MESMO SISTEMA em vez de cinco
 * desenhos avulsos.
 *
 * O vocabulário está repetido aqui em vez de extraído para `styleKit.ts`. É
 * escolha: mover `TILE` e `CHIP` para lá obrigaria a mexer em
 * `DashboardPreview.tsx`, que é a primeira dobra, e nenhuma linha desta tarefa
 * é sobre a primeira dobra. Quando aparecer uma terceira dobra com painel, o
 * vocabulário sobe para o `styleKit` e as três passam a ler de lá.
 *
 * A única diferença é a SOMBRA: a da primeira dobra pousa sobre o petrol
 * escuro e é preta e funda; estas pousam sobre a dobra clara e precisam ser
 * uma insinuação, não um buraco.
 *
 * NENHUM NÚMERO AQUI É REAL. São telas inventadas, como a primeira; o texto
 * todo vem de `COPY.modules.panels` e o que fica no componente são só as
 * medidas — altura de barra, nível de prateleira —, que são desenho e não
 * conteúdo. Mesma divisão que `DashboardPreview` faz com `WEEK`.
 */

const FRAME =
  "background:var(--surface3);border:1px solid var(--border);border-radius:18px;padding:14px;" +
  "box-shadow:0 18px 44px rgba(18,60,74,.10);";

const TILE =
  "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px;";
const TILE_LABEL = "font-size:11.5px;color:var(--muted);margin-bottom:6px;";
const tileValue = (color: string) =>
  `font-family:${DISPLAY};font-weight:800;font-size:19px;color:${color};`;

const CHIP =
  "background:var(--surface);border:1px solid var(--border);border-radius:999px;" +
  "padding:5px 10px;font-size:11px;color:var(--text3);font-weight:500;white-space:nowrap;";

/** A caixa branca que segura uma lista de linhas. */
const LIST =
  "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:2px 14px;";

/** Uma linha da lista. A última da caixa não leva risco embaixo. */
const row = (last: boolean) =>
  "display:flex;align-items:center;gap:10px;padding:11px 0;font-size:13px;" +
  (last ? "" : "border-bottom:1px solid var(--rule);");

const ROW_MAIN = "color:var(--ink);margin-right:auto;";
const ROW_VALUE = `font-family:${DISPLAY};font-weight:700;font-size:13.5px;color:var(--ink);`;
const ROW_MUTED = "font-size:11.5px;color:var(--muted2);font-variant-numeric:tabular-nums;";

/**
 * A moldura comum: janela, legenda e o texto que substitui o desenho inteiro
 * para quem não o vê.
 */
function Frame({ caption, alt, children }: { caption: string; alt: string; children: React.ReactNode }) {
  return (
    <div style={css("position:relative")}>
      <span
        style={css(
          "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap",
        )}
      >
        {alt}
      </span>

      <div aria-hidden="true" style={css(FRAME)}>
        <div style={css("display:flex;align-items:center;gap:7px;padding:2px 4px 12px")}>
          <div style={css("width:9px;height:9px;border-radius:50%;background:var(--chrome)")} />
          <div style={css("width:9px;height:9px;border-radius:50%;background:var(--chrome)")} />
          <div
            style={css(
              `margin-left:auto;font-size:11px;color:var(--muted2);font-family:${DISPLAY};font-weight:600`,
            )}
          >
            {caption}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** O ladrilho de somatório que fecha os painéis de venda e de custo. */
function Total({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={css(TILE + "display:flex;align-items:center;justify-content:space-between;margin-top:10px")}>
      <div style={css("font-size:11.5px;color:var(--muted)")}>{label}</div>
      <div style={css(tileValue(color))}>{value}</div>
    </div>
  );
}

/**
 * Registro de vendas: as últimas vendas do dia, uma por linha, com a forma de
 * pagamento como pílula. É a tela que o módulo mais mostra na vida real — o
 * balconista abre nela e fecha nela.
 */
function SalesPanel() {
  const p = COPY.modules.panels.sales;

  return (
    <Frame caption={p.caption} alt={p.alt}>
      <div style={css(LIST)}>
        {p.rows.map((r, i) => (
          <div key={r.time} style={css(row(i === p.rows.length - 1))}>
            <span style={css(ROW_MUTED)}>{r.time}</span>
            <span style={css(ROW_MAIN)}>{r.item}</span>
            <span style={css(CHIP)}>{r.pay}</span>
            <span style={css(ROW_VALUE)}>{r.value}</span>
          </div>
        ))}
      </div>
      <Total label={p.totalLabel} value={p.totalValue} color="var(--ink)" />
    </Frame>
  );
}

/**
 * Controle de custos: os lançamentos do dia com uma barra de proporção. A
 * barra é o que diferencia esta tela da de vendas — em custo o que interessa
 * não é a linha, é qual delas está comendo o dia.
 */
const COST_SHARE = [50, 31, 19];

function CostsPanel() {
  const p = COPY.modules.panels.costs;

  return (
    <Frame caption={p.caption} alt={p.alt}>
      <div style={css(LIST)}>
        {p.rows.map((r, i) => (
          <div key={r.item} style={css(row(i === p.rows.length - 1))}>
            <span style={css(ROW_MAIN)}>{r.item}</span>
            <span
              style={css(
                `width:64px;height:5px;border-radius:3px;flex:none;background:var(--neutral-soft)`,
              )}
            >
              <span
                style={css(
                  `display:block;height:5px;border-radius:3px;background:var(--petrol);` +
                    `width:${COST_SHARE[i] ?? 20}%`,
                )}
              />
            </span>
            <span style={css(ROW_VALUE)}>{r.value}</span>
          </div>
        ))}
      </div>
      <Total label={p.totalLabel} value={p.totalValue} color="var(--ink)" />
    </Frame>
  );
}

/**
 * Relatórios e lucro: entrou, saiu, sobrou — e o seletor de período, que é o
 * que o módulo faz de diferente. "Sobrou" é o único em verde, pela mesma regra
 * do resto do site: verde é lucro.
 *
 * As barras são o lucro de cada dia da semana, não a venda. Sobem sem subir em
 * linha reta pelo mesmo motivo que as da primeira dobra.
 */
const PROFIT_WEEK = [52, 41, 68, 55, 79, 62, 94];
const ACTIVE_PERIOD = 1;

function ReportsPanel() {
  const p = COPY.modules.panels.reports;

  return (
    <Frame caption={p.caption} alt={p.alt}>
      <div style={css("display:flex;gap:6px;margin-bottom:10px")}>
        {p.periods.map((period, i) => (
          <span
            key={period}
            style={css(
              "border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:600;" +
                (i === ACTIVE_PERIOD
                  ? "background:var(--petrol);color:#fff;"
                  : "background:var(--surface);border:1px solid var(--border);color:var(--text3);"),
            )}
          >
            {period}
          </span>
        ))}
      </div>

      <div
        style={css(
          "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px",
        )}
      >
        <div style={css(TILE)}>
          <div style={css(TILE_LABEL)}>{p.inLabel}</div>
          <div style={css(tileValue("var(--ink)"))}>{p.inValue}</div>
        </div>
        <div style={css(TILE)}>
          <div style={css(TILE_LABEL)}>{p.outLabel}</div>
          <div style={css(tileValue("var(--ink)"))}>{p.outValue}</div>
        </div>
        <div style={css(TILE)}>
          <div style={css(TILE_LABEL)}>{p.leftLabel}</div>
          <div style={css(tileValue("var(--pos)"))}>{p.leftValue}</div>
        </div>
      </div>

      <div style={css(TILE + "padding:14px")}>
        <div
          style={css(
            `font-family:${DISPLAY};font-weight:700;font-size:13px;color:var(--ink);margin-bottom:14px`,
          )}
        >
          {p.chartTitle}
        </div>
        <div style={css("display:flex;align-items:flex-end;gap:8px;height:84px")}>
          {PROFIT_WEEK.map((height, i) => (
            <div
              key={i}
              style={css(
                `flex:1;height:${height}%;border-radius:5px 5px 3px 3px;background:` +
                  (i === PROFIT_WEEK.length - 1 ? "var(--pos)" : "var(--bar)"),
              )}
            />
          ))}
        </div>
      </div>
    </Frame>
  );
}

/**
 * Controle de estoque: o que tem na prateleira, com o nível desenhado. O
 * terceiro produto está no fim — barra curta e o selo "Acabando" —, porque a
 * promessa do módulo não é listar, é AVISAR ANTES DE FALTAR, e o rodapé diz
 * isso em uma linha.
 *
 * O selo usa o cinza lavado dos módulos pagos, e não um âmbar: a paleta desta
 * página tem verde para o que é positivo e neutro para o resto. Inventar uma
 * cor de alerta aqui abriria um token novo para um pixel de ilustração.
 */
const STOCK_LEVEL = [80, 92, 12];

function StockPanel() {
  const p = COPY.modules.panels.stock;
  const lowest = p.rows.length - 1;

  return (
    <Frame caption={p.caption} alt={p.alt}>
      <div style={css(LIST)}>
        {p.rows.map((r, i) => (
          <div key={r.item} style={css(row(i === lowest))}>
            <span style={css(ROW_MAIN)}>{r.item}</span>
            {i === lowest ? (
              <span
                style={css(
                  "font-size:11px;font-weight:600;border-radius:999px;padding:4px 9px;" +
                    "color:var(--text3);background:var(--neutral-soft);white-space:nowrap",
                )}
              >
                {p.lowTag}
              </span>
            ) : null}
            <span
              style={css("width:56px;height:5px;border-radius:3px;flex:none;background:var(--neutral-soft)")}
            >
              <span
                style={css(
                  "display:block;height:5px;border-radius:3px;background:var(--petrol);" +
                    `width:${STOCK_LEVEL[i] ?? 50}%`,
                )}
              />
            </span>
            <span style={css(ROW_VALUE + "min-width:52px;text-align:right")}>{r.qty}</span>
          </div>
        ))}
      </div>

      <div
        style={css(
          "display:flex;align-items:center;gap:9px;margin-top:10px;padding:11px 14px;" +
            "border:1px dashed var(--dashed);border-radius:12px;font-size:12px;color:var(--text3)",
        )}
      >
        <span style={css("width:7px;height:7px;border-radius:50%;flex:none;background:var(--accent)")} />
        {p.alertLabel}
      </div>
    </Frame>
  );
}

/**
 * Caixa: a conta do fechamento, de cima para baixo — o que abriu, o que entrou
 * em dinheiro, o que era para ter na gaveta e o que foi contado. O verde do
 * "Confere" é a mesma regra do resto: verde só para o que deu certo.
 */
function CashPanel() {
  const p = COPY.modules.panels.cash;

  return (
    <Frame caption={p.caption} alt={p.alt}>
      <div style={css(LIST)}>
        {p.rows.map((r, i) => (
          <div key={r.item} style={css(row(i === p.rows.length - 1))}>
            <span style={css(ROW_MAIN)}>{r.item}</span>
            <span style={css(ROW_VALUE)}>{r.value}</span>
          </div>
        ))}
      </div>

      <div style={css(TILE + "display:flex;align-items:center;justify-content:space-between;margin-top:10px")}>
        <div style={css("font-size:11.5px;color:var(--muted)")}>{p.expectedLabel}</div>
        <div style={css(tileValue("var(--ink)"))}>{p.expectedValue}</div>
      </div>

      <div
        style={css(
          TILE + "display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:8px",
        )}
      >
        <div style={css("font-size:11.5px;color:var(--muted)")}>{p.countedLabel}</div>
        <div style={css("display:flex;align-items:center;gap:10px")}>
          <span
            style={css(
              "font-size:11px;font-weight:600;border-radius:999px;padding:4px 10px;" +
                "color:var(--pos);background:var(--pos-soft)",
            )}
          >
            {p.okTag}
          </span>
          <span style={css(tileValue("var(--pos)"))}>{p.countedValue}</span>
        </div>
      </div>
    </Frame>
  );
}

/**
 * Um painel por módulo, NA MESMA ORDEM de `COPY.modules.items`.
 *
 * A ligação é por posição e não por chave. Dar um `id` a cada módulo no
 * dicionário seria mais firme, mas significaria mexer no conteúdo da dobra, que
 * é justamente o que esta tarefa não faz. O aviso está nos dois lados: aqui e
 * em cima da lista `items`.
 */
export const MODULE_PANELS = [SalesPanel, CostsPanel, ReportsPanel, StockPanel, CashPanel];
