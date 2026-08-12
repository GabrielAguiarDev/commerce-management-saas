import { css, LIST, PANEL, TABLE_HEADER } from "@aguiar/ui";

/**
 * As peças dos estados de carregamento das rotas (ver os `loading.tsx`).
 *
 * POR QUE EXISTEM: até aqui, trocar de tela deixava a tela ANTERIOR congelada
 * até o servidor responder — nada indicava que algo estava a caminho, e num
 * balcão isso vira um segundo toque no mesmo item do menu. Com uma fronteira de
 * carregamento, a estrutura da tela nova entra na hora e o conteúdo a substitui
 * quando chega.
 *
 * São Server Components de propósito: nenhum estado, nenhum evento, zero
 * JavaScript enviado ao navegador para desenhá-los. Por isso também não medem a
 * janela — o desenho responde por CSS (`auto-fit`), sem depender do
 * `larguraTela` que o `PortalProvider` só conhece no cliente.
 *
 * A altura de cada bloco copia a do conteúdo que ele substitui: é o que impede
 * a tela de saltar no instante em que os dados chegam.
 */

/** Um bloco cinza, pulsando. `w` e `h` em qualquer unidade CSS. */
export function Bar({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <div className="sk" style={{ width: w, height: h }} />;
}

/** O título e o subtítulo que abrem toda tela — o lugar do `ScreenHeader`. */
export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div
      style={css(
        "display:flex;align-items:flex-end;justify-content:space-between;gap:16px;" +
          "flex-wrap:wrap;margin-bottom:18px",
      )}
    >
      <div style={css("display:flex;flex-direction:column;gap:8px")}>
        {/* 26px é a altura de linha do `SCREEN_TITLE` (22px × 1.2): o conteúdo
            não desce quando o título verdadeiro toma o lugar. */}
        <Bar w="190px" h={26} />
        <Bar w="260px" h={12} />
      </div>
      {action && <Bar w="150px" h={38} />}
    </div>
  );
}

/** A faixa de indicadores logo abaixo do título. */
export function KpiSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div
      style={css(
        `display:grid;grid-template-columns:repeat(auto-fit,minmax(min(160px,45%),1fr));` +
          "grid-auto-rows:1fr;gap:12px;align-items:stretch",
      )}
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          style={css(
            `${PANEL};min-height:96px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:10px`,
          )}
        >
          <Bar w="56%" h={9} />
          <Bar w="70%" h={22} />
        </div>
      ))}
    </div>
  );
}

/**
 * Um painel com lista dentro — o desenho de Vendas, Produtos, Estoque e Custos.
 *
 * `rows` é a altura esperada da lista, não a real: quantos itens o banco tem
 * ainda não se sabe. Oito é o que costuma caber na primeira dobra.
 */
export function TableSkeleton({ rows = 8, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div style={css(`margin-top:12px;padding:18px;${PANEL}`)}>
      {title && (
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px")}>
          <Bar w="170px" h={15} />
          <Bar w="110px" h={30} />
        </div>
      )}
      <div style={css(LIST)}>
        <div style={css(`${TABLE_HEADER};display:flex;gap:14px`)}>
          <Bar w="26%" h={10} />
          <Bar w="20%" h={10} />
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
            <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;gap:6px")}>
              <Bar w="52%" h={11} />
              <Bar w="30%" h={9} />
            </div>
            <Bar w="84px" h={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Um painel de formulário — as configurações, os dados do negócio. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div style={css(`margin-top:12px;padding:18px;${PANEL};display:flex;flex-direction:column;gap:18px`)}>
      <Bar w="190px" h={15} />
      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:16px",
        )}
      >
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} style={css("display:flex;flex-direction:column;gap:7px")}>
            <Bar w="40%" h={9} />
            <Bar h={40} />
          </div>
        ))}
      </div>
    </div>
  );
}
