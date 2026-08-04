"use client";

import { usePortal } from "@/components/PortalProvider";
import { MenuLinha } from "@/components/ui";
import { BotaoNovo, CABECALHO_TABELA, CabecalhoTela, css, FaixaKpis, LimparFiltros, LISTA, MONO, NUM, rotuloColuna, SANS, SelecaoSimples, Vazio } from "@aguiar/ui";
import { categoriasDeCusto, rateioFixo, TIPO_CUSTO_ESTILO } from "@/lib/dados/custos";
import { brl, rotuloData } from "@/lib/formato";
import { ROTAS } from "@/lib/rotas";
import { faturamento } from "@/lib/selectors";
import type { Custo } from "@/types/types";

const TODOS_TIPOS = "Todos";
const TODAS_CATS = "Todas as categorias";
const PERIODOS = ["Este mês", "Últimos 7 dias", "Tudo"];
const DIAS: Record<string, number> = { "Este mês": 30, "Últimos 7 dias": 7, Tudo: 9999 };

/**
 * Custos.
 *
 * O número que importa não é quanto entrou, é quanto sobrou — e para isso o
 * portal precisa saber o que saiu. As compras lançadas no Estoque chegam aqui
 * sozinhas, marcadas, para ninguém lançar a mesma nota duas vezes.
 */
export function CustosView() {
  const { s, a, tem, isDesktop, isMobile, d } = usePortal();
  const f = s.fCustos;
  const set = (p: Partial<typeof f>) => a.set({ fCustos: { ...f, ...p } });

  const dias = DIAS[f.periodo] ?? 30;

  const doPeriodo = d.custos.filter((c) => c.d < dias);
  const filtrados = doPeriodo.filter((c) => {
    if (f.tipo === "Fixos" && c.tipo !== "fixo") return false;
    if (f.tipo === "Variáveis" && c.tipo !== "variavel") return false;
    if (f.cat !== TODAS_CATS && c.categoria !== f.cat) return false;
    return true;
  });

  const ordenados = [...filtrados].sort((x, y) => x.d - y.d);

  const fixos = doPeriodo.filter((c) => c.tipo === "fixo").reduce((x, c) => x + c.valor, 0);
  const variaveis = doPeriodo.filter((c) => c.tipo === "variavel").reduce((x, c) => x + c.valor, 0);
  const totalReal = variaveis + rateioFixo(d.custos, dias);
  const receita = faturamento(d.vendas.filter((v) => v.d < dias));
  const peso = receita > 0 ? (totalReal / receita) * 100 : 0;

  const filtroAtivo = f.tipo !== TODOS_TIPOS || f.cat !== TODAS_CATS || f.periodo !== "Este mês";

  const kpis = [
    { label: "Total do período", valor: brl(totalReal), nota: "Fixos rateados pelos dias" },
    { label: "Variáveis", valor: brl(variaveis), nota: "Mercadoria, feira, materiais" },
    { label: "Fixos", valor: brl(fixos), nota: "Lançados no período" },
    {
      label: "Peso na receita",
      valor: receita > 0 ? `${peso.toFixed(0)}%` : "—",
      nota: receita > 0 ? `De ${brl(receita)} vendidos` : "Sem vendas no período",
      cor: peso > 70 ? "var(--warn)" : "var(--text)",
    },
  ];

  const colCat = isDesktop;
  const cols = `100px minmax(0,1fr) 110px${colCat ? " 140px" : ""} 110px 44px`;

  return (
    <div>
      <CabecalhoTela
        titulo="Custos"
        subtitulo="Anote o que você gasta e o portal mostra o lucro de verdade do seu mês."
        acao={<BotaoNovo texto="Registrar custo" onClick={() => a.abrirCusto(null)} largo={isMobile} />}
      />

      <FaixaKpis kpis={kpis} colunas={isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"} />

      {tem("estoque") && (
        <div
          style={css(
            "display:flex;align-items:flex-start;gap:10px;padding:12px 14px;margin-bottom:14px;" +
              "border:1px solid var(--border);border-radius:12px;background:var(--surface2)",
          )}
        >
          <span
            style={css(
              `flex:none;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font:600 10.5px ${SANS}`,
            )}
          >
            Estoque
          </span>
          <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}>
            As compras de mercadoria que você lança no Estoque entram aqui sozinhas como custo
            variável. Para corrigir uma delas, ajuste a entrada no Estoque — assim o valor não é
            lançado duas vezes.
          </p>
        </div>
      )}

      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <SelecaoSimples
          valor={f.tipo}
          opcoes={[TODOS_TIPOS, "Fixos", "Variáveis"]}
          onMudar={(v) => set({ tipo: v })}
        />
        <SelecaoSimples valor={f.cat} opcoes={[TODAS_CATS, ...categoriasDeCusto(d.custos)]} onMudar={(v) => set({ cat: v })} />
        <SelecaoSimples valor={f.periodo} opcoes={PERIODOS} onMudar={(v) => set({ periodo: v })} />
        {filtroAtivo && (
          <LimparFiltros onClick={() => set({ tipo: TODOS_TIPOS, cat: TODAS_CATS, periodo: "Este mês" })} />
        )}
      </div>

      {d.custos.length === 0 ? (
        <Vazio
          titulo="Nenhum custo lançado ainda"
          texto="Anote o que você gasta — ingredientes, mercadoria, aluguel, luz — e o portal mostra o lucro de verdade do seu mês."
          acao="Registrar primeiro custo"
          onAcao={() => a.abrirCusto(null)}
          destaque
        />
      ) : ordenados.length === 0 ? (
        <Vazio
          titulo="Nenhum custo com esses filtros"
          texto="Tente outro período ou limpe os filtros."
          acao="Limpar filtros"
          onAcao={() => set({ tipo: TODOS_TIPOS, cat: TODAS_CATS, periodo: "Este mês" })}
        />
      ) : (
        <>
          <div style={css(LISTA + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${CABECALHO_TABELA}`)}>
                <span style={css(rotuloColuna())}>QUANDO</span>
                <span style={css(rotuloColuna())}>DESCRIÇÃO</span>
                <span style={css(rotuloColuna())}>TIPO</span>
                {colCat && <span style={css(rotuloColuna())}>CATEGORIA</span>}
                <span style={css(rotuloColuna("right"))}>VALOR</span>
                <span />
              </div>
            )}
            {ordenados.map((c) => (
              <LinhaCusto key={c.id} custo={c} cols={cols} colCat={colCat} />
            ))}
          </div>
          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {ordenados.length} lançamento{ordenados.length === 1 ? "" : "s"} ·{" "}
            {brl(ordenados.reduce((x, c) => x + c.valor, 0))} no filtro
          </p>
        </>
      )}
    </div>
  );
}

function LinhaCusto({ custo: c, cols, colCat }: { custo: Custo; cols: string; colCat: boolean }) {
  const { a, isDesktop } = usePortal();
  const e = TIPO_CUSTO_ESTILO[c.tipo];

  const acoes = [
    { texto: "Editar custo", onClick: () => a.abrirCusto(c.id) },
    {
      texto: "Excluir custo",
      cor: "var(--danger)",
      onClick: () =>
        a.confirmar({
          titulo: "Excluir este custo?",
          texto: "Ele sai do total do período e do cálculo do lucro.",
          resumo: c.descricao,
          sub: `${brl(c.valor)} · ${rotuloData(c.d, "")} · ${c.categoria}`,
          reversao: "Isto não pode ser desfeito — você teria de lançar de novo.",
          btn: "Excluir custo",
          btnBg: "var(--danger)",
          btnFg: "#fff",
          cor: "var(--danger)",
          acao: () => a.excluirCusto(c.id),
        }),
    },
  ];

  const selos = (
    <>
      {c.doEstoque && (
        <span
          style={css(
            `padding:2px 7px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font:600 10px ${SANS}`,
          )}
        >
          veio do estoque
        </span>
      )}
      {c.recorrente && (
        <span
          style={css(
            `padding:2px 7px;border-radius:999px;background:var(--surface3);color:var(--muted);font:600 10px ${SANS}`,
          )}
        >
          repete todo mês
        </span>
      )}
    </>
  );

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>{rotuloData(c.d, "")}</span>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {c.descricao}
            </span>
            <span style={css("display:flex;align-items:center;gap:6px;margin-top:4px")}>{selos}</span>
          </span>
          <span>
            <span
              style={css(
                `display:inline-flex;padding:3px 9px;border-radius:999px;background:${e.bg};color:${e.cor};font:600 11px ${SANS}`,
              )}
            >
              {e.nome}
            </span>
          </span>
          {colCat && (
            <span
              style={css(
                `min-width:0;font:500 12.5px ${SANS};color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
              )}
            >
              {c.categoria}
            </span>
          )}
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM}`)}>{brl(c.valor)}</span>
          {/* Custo que veio do Estoque se corrige lá, na entrada que o gerou. */}
          {c.doEstoque ? (
            <button
              onClick={() => a.irPara(ROTAS.estoque)}
              title="Ajustar no Estoque"
              className="hv-acc-borda"
              style={css(
                `justify-self:end;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 11.5px ${SANS}`,
              )}
            >
              No Estoque
            </button>
          ) : (
            <MenuLinha chave={`custo:${c.id}`} acoes={acoes} largura={200} />
          )}
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:12px 13px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
              <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>{rotuloData(c.d, "")}</span>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:${e.bg};color:${e.cor};font:600 10.5px ${SANS}`,
                )}
              >
                {e.nome}
              </span>
              {selos}
            </div>
            <div style={css(`margin-top:5px;font:600 13.5px/1.3 ${SANS}`)}>{c.descricao}</div>
            <div style={css(`margin-top:3px;font:500 11.5px ${SANS};color:var(--muted)`)}>{c.categoria}</div>
          </div>
          <div style={css("flex:none;text-align:right")}>
            <div style={css(`font:700 14px ${SANS};${NUM}`)}>{brl(c.valor)}</div>
            {!c.doEstoque && (
              <div style={css("margin-top:4px;display:flex;justify-content:flex-end")}>
                <MenuLinha chave={`custo:${c.id}`} acoes={acoes} largura={200} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
