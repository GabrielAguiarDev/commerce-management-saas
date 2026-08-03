"use client";

import { usePortal } from "@/components/PortalProvider";
import { BotaoNovo, CabecalhoTela, LimparFiltros, MenuLinha, Selecao, Vazio } from "@/components/ui";
import { css, MONO, SANS } from "@/lib/css";
import { FORMAS } from "@/lib/dados/vendas";
import { brl, qtdV, resumoItens, rotuloData, totalV } from "@/lib/formato";
import { ROTA_PDV } from "@/lib/rotas";
import { faturamento, itensVendidos } from "@/lib/selectors";
import {
  CABECALHO_TABELA,
  GRUPO_PILULAS,
  LISTA,
  NUM,
  PAINEL,
  pilula,
  rotuloColuna,
  SELO_NEUTRO,
  SELO_WARN,
  TITULO_PAINEL,
} from "@/lib/styleKit";
import type { PeriodoVendas } from "@/types/estado";
import type { Venda } from "@/types/types";

const PERIODOS: { chave: PeriodoVendas; nome: string; dias: number }[] = [
  { chave: "hoje", nome: "Hoje", dias: 1 },
  { chave: "7", nome: "7 dias", dias: 7 },
  { chave: "30", nome: "30 dias", dias: 30 },
  { chave: "tudo", nome: "Tudo", dias: 9999 },
];

const TODAS_FORMAS = "Todas as formas";
const TODOS_PRODUTOS = "Todos os produtos";

/**
 * O histórico de vendas.
 *
 * Estorno não some da lista: fica riscado, com selo, fora dos totais. É o que
 * permite explicar ao contador por que o caderno e o portal divergem.
 */
export function VendasView() {
  const { s, a, tem, isMobile, isDesktop } = usePortal();
  const f = s.fVendas;

  const dias = PERIODOS.find((p) => p.chave === f.periodo)!.dias;

  const doPeriodo = s.vendas.filter((v) => v.d < dias);
  const filtradas = doPeriodo.filter((v) => {
    if (f.pag !== TODAS_FORMAS && v.pag !== f.pag) return false;
    if (f.produto !== TODOS_PRODUTOS && !v.itens.some((i) => i.nome === f.produto)) return false;
    if (f.busca.trim()) {
      const alvo = `${resumoItens(v.itens)} ${v.pag} ${v.hora}`.toLowerCase();
      if (!alvo.includes(f.busca.trim().toLowerCase())) return false;
    }
    return true;
  });

  const ordenadas = [...filtradas].sort((x, y) => x.d - y.d || y.hora.localeCompare(x.hora));

  const total = faturamento(filtradas);
  const validas = filtradas.filter((v) => !v.estornada);
  const ticket = validas.length ? total / validas.length : 0;
  const estornadas = filtradas.filter((v) => v.estornada).length;

  const filtroAtivo =
    f.pag !== TODAS_FORMAS || f.produto !== TODOS_PRODUTOS || f.busca.trim() !== "";

  const nomesProdutos = Array.from(new Set(s.vendas.flatMap((v) => v.itens.map((i) => i.nome)))).sort();

  const set = (p: Partial<typeof f>) => a.set({ fVendas: { ...f, ...p } });
  const limpar = () => set({ pag: TODAS_FORMAS, produto: TODOS_PRODUTOS, busca: "" });

  const kpis = [
    { label: "Faturamento", valor: brl(total), nota: `${validas.length} vendas no período`, cor: "var(--text)" },
    { label: "Ticket médio", valor: brl(ticket), nota: "Por venda", cor: "var(--text)" },
    { label: "Itens vendidos", valor: String(itensVendidos(filtradas)), nota: "Somando as quantidades", cor: "var(--text)" },
    {
      label: "Estornadas",
      valor: String(estornadas),
      nota: estornadas ? "Fora do faturamento" : "Nenhuma no período",
      cor: estornadas ? "var(--warn)" : "var(--muted)",
    },
  ];

  // Colunas escondidas quando não cabem: no celular a linha vira cartão.
  const colQtd = isDesktop;
  const colPag = isDesktop;
  const histCols = `92px minmax(0,1fr)${colQtd ? " 60px" : ""}${colPag ? " 110px" : ""} 110px 44px`;

  return (
    <div>
      <CabecalhoTela
        titulo="Vendas"
        subtitulo="Registre no balcão e consulte tudo o que já foi vendido."
        acao={isDesktop ? <BotaoNovo texto="Registrar venda" onClick={() => a.irPara(ROTA_PDV)} /> : undefined}
      />

      <div
        style={css(
          `display:grid;grid-template-columns:${isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"};grid-auto-rows:1fr;gap:12px;align-items:stretch`,
        )}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={css(
              `display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:0;padding:11px 13px;` +
                "border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)",
            )}
          >
            <div style={css("display:flex;align-items:center;gap:6px;min-width:0")}>
              <span style={css("flex:none;width:6px;height:6px;border-radius:2px;background:var(--accent)")} />
              <span
                style={css(
                  `min-width:0;font:500 11px/1.2 ${SANS};color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
                )}
              >
                {k.label}
              </span>
            </div>
            <div
              style={css(
                `font:700 clamp(17px,1.7vw,21px)/1.2 ${SANS};${NUM};letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${k.cor}`,
              )}
            >
              {k.valor}
            </div>
            <div
              style={css(
                `font:500 10.5px/1.3 ${SANS};color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {k.nota}
            </div>
          </div>
        ))}
      </div>

      <div style={css(`margin-top:12px;padding:18px;${PAINEL}`)}>
        <div
          style={css(
            "display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px",
          )}
        >
          <h2 style={css(TITULO_PAINEL)}>Histórico de vendas</h2>
          <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
            {filtradas.length} de {doPeriodo.length} vendas
          </span>
        </div>

        <div style={css("display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px")}>
          <div style={css(GRUPO_PILULAS)}>
            {PERIODOS.map((p) => (
              <button key={p.chave} onClick={() => set({ periodo: p.chave })} style={css(pilula(f.periodo === p.chave, "sm"))}>
                {p.nome}
              </button>
            ))}
          </div>

          <Selecao valor={f.pag} opcoes={[TODAS_FORMAS, ...FORMAS]} onMudar={(v) => set({ pag: v })} />
          <Selecao
            valor={f.produto}
            opcoes={[TODOS_PRODUTOS, ...nomesProdutos]}
            onMudar={(v) => set({ produto: v })}
          />

          <input
            value={f.busca}
            onChange={(e) => set({ busca: e.target.value })}
            placeholder="Buscar venda..."
            style={css(
              `flex:1;min-width:150px;padding:9px 13px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);font:500 12.5px ${SANS};color:var(--text);outline:none`,
            )}
          />

          {filtroAtivo && <LimparFiltros onClick={limpar} />}
        </div>

        {s.vendas.length === 0 ? (
          <Vazio
            titulo="Nenhuma venda por aqui ainda"
            texto="Assim que você registrar a primeira venda, ela aparece aqui com valor, itens e forma de pagamento."
            acao="Registrar primeira venda"
            onAcao={() => a.irPara(ROTA_PDV)}
            destaque
          />
        ) : ordenadas.length === 0 ? (
          <Vazio
            titulo="Nada encontrado com esses filtros"
            texto="Tente outro período ou limpe os filtros para ver todas as vendas."
            acao="Limpar filtros"
            onAcao={limpar}
          />
        ) : (
          <div style={css(LISTA + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${histCols};gap:10px;${CABECALHO_TABELA}`)}>
                <span style={css(rotuloColuna())}>QUANDO</span>
                <span style={css(rotuloColuna())}>ITENS</span>
                {colQtd && <span style={css(rotuloColuna("center"))}>QTD</span>}
                {colPag && <span style={css(rotuloColuna())}>PAGAMENTO</span>}
                <span style={css(rotuloColuna("right"))}>TOTAL</span>
                <span />
              </div>
            )}

            {ordenadas.map((v) => (
              <LinhaVenda key={v.id} venda={v} cols={histCols} podeEditar={tem("vendas")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaVenda({
  venda: v,
  cols,
  podeEditar,
}: {
  venda: Venda;
  cols: string;
  podeEditar: boolean;
}) {
  const { a, isDesktop } = usePortal();
  const total = totalV(v);
  const risco = v.estornada ? "text-decoration:line-through;" : "";
  const cor = v.estornada ? "var(--muted)" : "var(--text)";

  const acoes = [
    { texto: "Ver detalhes", onClick: () => a.abrirModal({ k: "detalheVenda", id: v.id }) },
    ...(podeEditar && !v.estornada
      ? [
          { texto: "Editar venda", onClick: () => a.editarVenda(v.id) },
          {
            texto: "Estornar venda",
            cor: "var(--danger)",
            onClick: () =>
              a.confirmar({
                titulo: "Estornar esta venda?",
                texto:
                  "A venda sai do faturamento e o estoque dos itens volta. Ela continua no histórico, riscada.",
                resumo: resumoItens(v.itens),
                sub: `${rotuloData(v.d, v.hora)} · ${brl(total)} · ${v.pag}`,
                reversao: "Dá para desfazer o estorno depois, pelo menu da própria venda.",
                btn: "Estornar venda",
                btnBg: "var(--danger)",
                btnFg: "#fff",
                cor: "var(--danger)",
                acao: () => a.estornarVenda(v.id),
              }),
          },
        ]
      : []),
    ...(v.estornada
      ? [
          {
            texto: "Desfazer estorno",
            cor: "var(--warn)",
            onClick: () =>
              a.confirmar({
                titulo: "Desfazer o estorno?",
                texto: "A venda volta a contar no faturamento e o estoque dos itens é baixado de novo.",
                resumo: resumoItens(v.itens),
                sub: `${rotuloData(v.d, v.hora)} · ${brl(total)}`,
                reversao: "Você pode estornar de novo quando quiser.",
                btn: "Desfazer estorno",
                btnBg: "var(--warn)",
                btnFg: "#fff",
                cor: "var(--warn)",
                acao: () => a.desfazerEstorno(v.id),
              }),
          },
        ]
      : []),
  ];

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:13px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>
            {rotuloData(v.d, v.hora)}
          </span>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:500 13px/1.35 ${SANS};color:${cor};${risco}white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {resumoItens(v.itens)}
            </span>
            {v.estornada && (
              <span style={css("display:flex;align-items:center;gap:6px;margin-top:4px")}>
                <span style={css(SELO_WARN)}>Estornada</span>
              </span>
            )}
          </span>
          <span style={css(`text-align:center;font:600 12.5px ${MONO};color:var(--text2)`)}>{qtdV(v)}</span>
          <span>
            <span style={css(SELO_NEUTRO)}>{v.pag}</span>
          </span>
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM};color:${cor};${risco}`)}>
            {brl(total)}
          </span>
          <MenuLinha chave={`venda:${v.id}`} acoes={acoes} />
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:13px 14px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
              <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>
                {rotuloData(v.d, v.hora)}
              </span>
              {v.estornada && <span style={css(SELO_WARN)}>Estornada</span>}
            </div>
            <div style={css(`margin-top:4px;font:600 13.5px/1.35 ${SANS};color:${cor};${risco}`)}>
              {resumoItens(v.itens)}
            </div>
            <div style={css("margin-top:7px;display:flex;align-items:center;gap:8px")}>
              <span style={css(SELO_NEUTRO)}>{v.pag}</span>
              <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
                {qtdV(v)} {qtdV(v) === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>
          <div
            style={css("flex:none;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:8px")}
          >
            <span style={css(`font:700 15px ${SANS};${NUM};color:${cor};${risco}`)}>{brl(total)}</span>
            <MenuLinha chave={`venda:${v.id}`} acoes={acoes} />
          </div>
        </div>
      )}
    </div>
  );
}
