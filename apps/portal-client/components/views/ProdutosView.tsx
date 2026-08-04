"use client";

import { usePortal } from "@/components/PortalProvider";
import { MenuLinha } from "@/components/ui";
import { BotaoNovo, CABECALHO_TABELA, CabecalhoTela, css, FaixaKpis, LimparFiltros, LISTA, MONO, NUM, rotuloColuna, SANS, SelecaoSimples, Vazio } from "@aguiar/ui";
import { estoqueBaixo } from "@/lib/dados/produtos";
import { brl } from "@/lib/formato";
import { valorDoEstoque } from "@/lib/selectors";
import { campoFiltro, SELO_NEUTRO } from "@/lib/styleKit";
import type { Produto } from "@/types/types";

const TODAS_CATS = "Todas as categorias";
const TODOS_STATUS = "Todos";

/**
 * O catálogo.
 *
 * As colunas seguem os módulos do plano: sem Estoque não há coluna de saldo,
 * sem Custos não há margem. O que sobra é o que todo mundo tem — nome, preço e
 * se está à venda.
 */
export function ProdutosView() {
  const { s, a, tem, isDesktop, isMobile } = usePortal();
  const f = s.fProdutos;

  const temEstoque = tem("estoque");
  const colCategoria = isDesktop;
  const colEstoque = isDesktop && temEstoque;

  const busca = f.busca.trim().toLowerCase();
  const filtrados = s.produtos.filter((p) => {
    if (busca && !p.nome.toLowerCase().includes(busca) && !p.codigo.includes(busca)) return false;
    if (f.cat !== TODAS_CATS && p.categoria !== f.cat) return false;
    if (f.status === "À venda" && !p.ativo) return false;
    if (f.status === "Pausados" && p.ativo) return false;
    if (f.soBaixo && !estoqueBaixo(p)) return false;
    return true;
  });

  const ordenados = [...filtrados].sort(
    (x, y) => Number(y.fav) - Number(x.fav) || x.nome.localeCompare(y.nome),
  );

  const filtroAtivo =
    busca !== "" || f.cat !== TODAS_CATS || f.status !== TODOS_STATUS || f.soBaixo;

  const set = (p: Partial<typeof f>) => a.set({ fProdutos: { ...f, ...p } });
  const limpar = () => set({ busca: "", cat: TODAS_CATS, status: TODOS_STATUS, soBaixo: false });

  const ativos = s.produtos.filter((p) => p.ativo);
  const emFalta = s.produtos.filter((p) => p.ativo && estoqueBaixo(p));
  const precoMedio = ativos.length ? ativos.reduce((x, p) => x + p.preco, 0) / ativos.length : 0;

  const kpis = [
    { label: "No catálogo", valor: String(s.produtos.length), nota: `${ativos.length} à venda` },
    { label: "Mais vendidos", valor: String(s.produtos.filter((p) => p.fav).length), nota: "Aparecem primeiro no PDV" },
    { label: "Preço médio", valor: brl(precoMedio), nota: "Dos produtos à venda" },
    temEstoque
      ? {
          label: "Estoque baixo",
          valor: String(emFalta.length),
          nota: emFalta.length ? "Precisa repor" : "Nada para repor",
          cor: emFalta.length ? "var(--warn)" : "var(--pos)",
        }
      : { label: "Categorias", valor: String(s.catsProduto.length), nota: "Em uso no catálogo" },
  ];

  const cols =
    `44px minmax(0,1fr)${colCategoria ? " 150px" : ""} 110px${colEstoque ? " 100px" : ""} 110px 44px`;

  const subtitulo = temEstoque
    ? "Cadastre o que você vende: preço, categoria e quantidade em estoque."
    : "Cadastre o que você vende para agilizar o balcão.";

  return (
    <div>
      <CabecalhoTela
        titulo="Produtos"
        subtitulo={subtitulo}
        acao={<BotaoNovo texto="Novo produto" onClick={() => a.abrirProduto(null)} largo={isMobile} />}
      />

      <FaixaKpis kpis={kpis} colunas={isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"} />

      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <input
          value={f.busca}
          onChange={(e) => set({ busca: e.target.value })}
          placeholder="Buscar por nome ou código de barras"
          style={css(`flex:1;min-width:180px;${campoFiltro()}`)}
        />
        <SelecaoSimples valor={f.cat} opcoes={[TODAS_CATS, ...s.catsProduto]} onMudar={(v) => set({ cat: v })} />
        <SelecaoSimples
          valor={f.status}
          opcoes={[TODOS_STATUS, "À venda", "Pausados"]}
          onMudar={(v) => set({ status: v })}
        />
        {temEstoque && (
          <button
            onClick={() => set({ soBaixo: !f.soBaixo })}
            style={css(
              `padding:10px 13px;border:1px solid ${f.soBaixo ? "var(--warn)" : "var(--border)"};border-radius:10px;` +
                `background:${f.soBaixo ? "var(--warn-soft)" : "var(--surface)"};` +
                `color:${f.soBaixo ? "var(--warn)" : "var(--text2)"};font:600 12.5px ${SANS}`,
            )}
          >
            Só estoque baixo
          </button>
        )}
        {filtroAtivo && <LimparFiltros onClick={limpar} />}
      </div>

      {s.produtos.length === 0 ? (
        <Vazio
          titulo="Seu catálogo está vazio"
          texto="Cadastre o que você vende para agilizar o balcão: os produtos aparecem na tela de venda prontos para um toque."
          acao="Cadastrar primeiro produto"
          onAcao={() => a.abrirProduto(null)}
          destaque
        />
      ) : ordenados.length === 0 ? (
        <Vazio
          titulo="Nenhum produto com esses filtros"
          texto="Tente outro termo de busca ou limpe os filtros."
          acao="Limpar filtros"
          onAcao={limpar}
        />
      ) : (
        <>
          <div style={css(LISTA + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${CABECALHO_TABELA}`)}>
                <span />
                <span style={css(rotuloColuna())}>PRODUTO</span>
                {colCategoria && <span style={css(rotuloColuna())}>CATEGORIA</span>}
                <span style={css(rotuloColuna("right"))}>PREÇO</span>
                {colEstoque && <span style={css(rotuloColuna("right"))}>ESTOQUE</span>}
                <span style={css(rotuloColuna())}>STATUS</span>
                <span />
              </div>
            )}

            {ordenados.map((p) => (
              <LinhaProduto
                key={p.id}
                produto={p}
                cols={cols}
                colCategoria={colCategoria}
                colEstoque={colEstoque}
              />
            ))}
          </div>

          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {ordenados.length} de {s.produtos.length} produtos
            {temEstoque && ` · ${brl(valorDoEstoque(s.produtos))} parados na prateleira`}
          </p>
        </>
      )}
    </div>
  );
}

function LinhaProduto({
  produto: p,
  cols,
  colCategoria,
  colEstoque,
}: {
  produto: Produto;
  cols: string;
  colCategoria: boolean;
  colEstoque: boolean;
}) {
  const { a, tem, isDesktop } = usePortal();

  const baixo = estoqueBaixo(p);
  const corEstoque = p.estoque == null
    ? "var(--muted)"
    : p.estoque === 0
      ? "var(--danger)"
      : baixo
        ? "var(--warn)"
        : "var(--text2)";

  const statusBg = p.ativo ? "var(--pos-soft)" : "var(--surface3)";
  const statusCor = p.ativo ? "var(--pos)" : "var(--muted)";

  const acoes = [
    { texto: "Editar produto", onClick: () => a.abrirProduto(p.id) },
    { texto: p.fav ? "Tirar dos mais vendidos" : "Marcar como mais vendido", onClick: () => a.toggleFav(p.id) },
    ...(tem("estoque") && p.estoque != null
      ? [{ texto: "Registrar movimentação", onClick: () => a.abrirMov(p.id) }]
      : []),
    {
      texto: p.ativo ? "Pausar venda" : "Voltar a vender",
      cor: "var(--warn)",
      onClick: () =>
        a.confirmar({
          titulo: p.ativo ? "Pausar este produto?" : "Voltar a vender?",
          texto: p.ativo
            ? "Ele some da tela de venda, mas continua no catálogo e no histórico."
            : "Ele volta a aparecer na tela de venda.",
          resumo: p.nome,
          sub: `${brl(p.preco)} · ${p.categoria}`,
          reversao: "Dá para desfazer a qualquer momento pelo mesmo menu.",
          btn: p.ativo ? "Pausar" : "Voltar a vender",
          btnBg: "var(--warn)",
          btnFg: "#fff",
          cor: "var(--warn)",
          acao: () => a.toggleAtivo(p.id),
        }),
    },
    {
      texto: "Excluir produto",
      cor: "var(--danger)",
      onClick: () =>
        a.confirmar({
          titulo: "Excluir este produto?",
          texto:
            "Ele sai do catálogo. As vendas já registradas continuam no histórico com o nome e o preço do dia.",
          resumo: p.nome,
          sub: `${brl(p.preco)} · ${p.categoria}`,
          reversao: "Isto não pode ser desfeito. Se for temporário, prefira pausar a venda.",
          btn: "Excluir produto",
          btnBg: "var(--danger)",
          btnFg: "#fff",
          cor: "var(--danger)",
          acao: () => a.excluirProduto(p.id),
        }),
    },
  ];

  const botaoFav = (
    <button
      onClick={() => a.toggleFav(p.id)}
      title={p.fav ? "Tirar dos mais vendidos" : "Marcar como mais vendido"}
      className="hv-linha2"
      style={css(
        `width:28px;height:28px;border-radius:8px;color:${p.fav ? "var(--warn)" : "var(--border2)"};font:600 15px/1 ${SANS}`,
      )}
    >
      {p.fav ? "★" : "☆"}
    </button>
  );

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          {botaoFav}
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` +
                  `color:${p.ativo ? "var(--text)" : "var(--muted)"}`,
              )}
            >
              {p.nome}
            </span>
            <span style={css(`display:block;margin-top:3px;font:500 11px ${MONO};color:var(--muted)`)}>
              {p.codigo || "sem código"} · {p.unidade}
            </span>
          </span>
          {colCategoria && (
            <span>
              <span style={css(SELO_NEUTRO)}>{p.categoria}</span>
            </span>
          )}
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM}`)}>{brl(p.preco)}</span>
          {colEstoque && (
            <span style={css(`text-align:right;font:600 12.5px ${SANS};${NUM};color:${corEstoque}`)}>
              {p.estoque == null ? "—" : p.estoque}
            </span>
          )}
          <span>
            <span
              style={css(
                `display:inline-flex;padding:3px 9px;border-radius:999px;background:${statusBg};color:${statusCor};font:600 11px ${SANS}`,
              )}
            >
              {p.ativo ? "À venda" : "Pausado"}
            </span>
          </span>
          <MenuLinha chave={`produto:${p.id}`} acoes={acoes} largura={214} />
        </div>
      ) : (
        <div style={css("display:flex;gap:9px;padding:12px 13px")}>
          {botaoFav}
          <div style={css("flex:1;min-width:0")}>
            <div
              style={css(
                `font:600 13.5px/1.3 ${SANS};color:${p.ativo ? "var(--text)" : "var(--muted)"}`,
              )}
            >
              {p.nome}
            </div>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px")}>
              <span style={css(`font:700 13px ${SANS};${NUM}`)}>{brl(p.preco)}</span>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:var(--surface3);color:var(--text2);font:600 10.5px ${SANS}`,
                )}
              >
                {p.categoria}
              </span>
              {!p.ativo && (
                <span
                  style={css(
                    `padding:2px 8px;border-radius:999px;background:${statusBg};color:${statusCor};font:600 10.5px ${SANS}`,
                  )}
                >
                  Pausado
                </span>
              )}
            </div>
            {colEstoque === false && p.estoque != null && (
              <div style={css(`margin-top:5px;font:500 11.5px ${SANS};color:${corEstoque}`)}>
                {p.estoque === 0 ? "Sem estoque" : `${p.estoque} ${p.unidade} em estoque`}
                {p.minimo != null && ` · mín. ${p.minimo}`}
              </div>
            )}
          </div>
          <MenuLinha chave={`produto:${p.id}`} acoes={acoes} largura={214} />
        </div>
      )}
    </div>
  );
}
