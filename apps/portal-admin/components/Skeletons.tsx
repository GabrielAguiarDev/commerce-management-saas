import { css, LIST, PANEL, TABLE_HEADER } from "@aguiar/ui";

/**
 * As peças dos estados de carregamento das rotas (ver os `loading.tsx`).
 *
 * POR QUE EXISTEM: até aqui, trocar de tela deixava a tela ANTERIOR congelada
 * até o servidor responder — nada indicava que algo estava a caminho, e a
 * impressão era de clique perdido. Com uma fronteira de carregamento, a
 * estrutura da tela nova entra na hora e o conteúdo a substitui quando chega.
 *
 * São Server Components de propósito: nenhum estado, nenhum evento, zero
 * JavaScript enviado ao navegador para desenhá-los. Por isso também não medem a
 * janela — o desenho responde por CSS (`auto-fit`), sem depender do
 * `larguraTela` que o `AdminProvider` só conhece no cliente.
 *
 * A altura de cada bloco copia a do conteúdo que ele substitui: é o que impede
 * a tela de saltar no instante em que os dados chegam.
 */

/** Um bloco cinza, pulsando. `w` e `h` em qualquer unidade CSS. */
export function Bar({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <div className="sk" style={{ width: w, height: h }} />;
}

/** A fileira de cartões de indicador que abre a Visão e o Financeiro. */
export function MetricsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div
      style={css(
        "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:14px",
      )}
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          style={css(
            `${PANEL};min-height:132px;padding:17px 18px;display:flex;flex-direction:column;` +
              "justify-content:space-between;gap:12px",
          )}
        >
          <Bar w="42%" h={10} />
          <Bar w="58%" h={26} />
          <Bar w="34%" h={10} />
        </div>
      ))}
    </div>
  );
}

/**
 * Um painel com lista dentro — o desenho de Clientes, Financeiro e Suporte.
 *
 * `rows` é a altura esperada da lista, não a real: o número de linhas do banco
 * ainda não se sabe. Oito é o que costuma caber na primeira dobra.
 */
export function TableSkeleton({ rows = 8, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div style={css(`${PANEL};padding:18px`)}>
      {title && (
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px")}>
          <Bar w="180px" h={15} />
          <Bar w="120px" h={32} />
        </div>
      )}
      <div style={css(LIST)}>
        <div style={css(`${TABLE_HEADER};display:flex;gap:14px`)}>
          <Bar w="30%" h={10} />
          <Bar w="18%" h={10} />
          <Bar w="14%" h={10} />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            style={css(
              "display:flex;align-items:center;gap:14px;padding:13px 14px;background:var(--surface)" +
                (i === rows - 1 ? ";border-radius:0 0 11px 11px" : ""),
            )}
          >
            {/* O avatar quadrado que abre cada linha das listas do painel. */}
            <div className="sk" style={{ width: 32, height: 32, flex: "none", borderRadius: 8 }} />
            <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;gap:6px")}>
              <Bar w="46%" h={11} />
              <Bar w="26%" h={9} />
            </div>
            <Bar w="76px" h={20} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grade de cartões de Planos e Módulos. */
export function CardsSkeleton({ cards = 6, minWidth = 300 }: { cards?: number; minWidth?: number }) {
  return (
    <div
      style={css(
        `display:grid;grid-template-columns:repeat(auto-fit,minmax(min(${minWidth}px,100%),1fr));gap:14px`,
      )}
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          style={css(`${PANEL};padding:18px;display:flex;flex-direction:column;gap:12px;min-height:190px`)}
        >
          <Bar w="52%" h={15} />
          <Bar w="34%" h={22} />
          <Bar h={10} />
          <Bar w="82%" h={10} />
          <div style={css("margin-top:auto;display:flex;gap:8px")}>
            <Bar w="72px" h={26} />
            <Bar w="72px" h={26} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Um painel de formulário — a ficha do cliente, os ajustes da plataforma. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div style={css(`${PANEL};padding:20px;display:flex;flex-direction:column;gap:18px`)}>
      <Bar w="200px" h={15} />
      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:16px",
        )}
      >
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} style={css("display:flex;flex-direction:column;gap:7px")}>
            <Bar w="38%" h={9} />
            <Bar h={38} />
          </div>
        ))}
      </div>
    </div>
  );
}
