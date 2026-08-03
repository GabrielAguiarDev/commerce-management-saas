"use client";

import { usePortal } from "@/components/PortalProvider";
import {
  BotaoNovo,
  CabecalhoTela,
  FaixaKpis,
  GrupoPilulas,
  LimparFiltros,
  MenuLinha,
  Selecao,
  Vazio,
} from "@/components/ui";
import { css, MONO, SANS } from "@/lib/css";
import { MOV_ESTILO, podeReverter } from "@/lib/dados/estoque";
import { controlaEstoque, estoqueBaixo } from "@/lib/dados/produtos";
import { brl, rotuloData } from "@/lib/formato";
import { ROTAS } from "@/lib/rotas";
import { valorDoEstoque } from "@/lib/selectors";
import {
  CABECALHO_TABELA,
  campoFiltro,
  LISTA,
  NUM,
  rotuloColuna,
  SELO_NEUTRO,
} from "@/lib/styleKit";
import type { AbaEstoque } from "@/types/estado";
import type { MovEstoque, Produto } from "@/types/types";

const TODAS_SITUACOES = "Todas as situações";
const TODAS_CATS = "Todas as categorias";
const TODOS_TIPOS = "Todos os tipos";
const TODOS_PRODUTOS = "Todos os produtos";

const ORDENS = ["Estoque mais baixo", "Nome (A–Z)", "Maior valor parado"];
const PERIODOS_MOV = ["Últimos 7 dias", "Últimos 30 dias", "Tudo"];
const DIAS_MOV: Record<string, number> = {
  "Últimos 7 dias": 7,
  "Últimos 30 dias": 30,
  Tudo: 9999,
};

/**
 * Estoque.
 *
 * Duas leituras da mesma verdade: a aba "Itens" mostra o saldo de agora, a aba
 * "Movimentações" mostra como ele chegou aí. A baixa por venda aparece nas duas
 * sem ninguém precisar lançar nada.
 */
export function EstoqueView() {
  const { s, a, isMobile } = usePortal();
  const f = s.fEstoque;

  const controlados = s.produtos.filter(controlaEstoque);
  const set = (p: Partial<typeof f>) => a.set({ fEstoque: { ...f, ...p } });

  const emFalta = controlados.filter((p) => p.ativo && estoqueBaixo(p));
  const zerados = controlados.filter((p) => p.estoque === 0);

  const kpis = [
    { label: "Itens controlados", valor: String(controlados.length), nota: "Com saldo na prateleira" },
    {
      label: "Precisa repor",
      valor: String(emFalta.length),
      nota: emFalta.length ? "Chegou no mínimo" : "Estoque em dia",
      cor: emFalta.length ? "var(--warn)" : "var(--pos)",
    },
    {
      label: "Sem estoque",
      valor: String(zerados.length),
      nota: zerados.length ? "Acabou" : "Nenhum zerado",
      cor: zerados.length ? "var(--danger)" : "var(--pos)",
    },
    { label: "Valor parado", valor: brl(valorDoEstoque(s.produtos)), nota: "A preço de custo" },
  ];

  return (
    <div>
      <CabecalhoTela
        titulo="Estoque"
        subtitulo="Veja o que precisa repor e registre entradas, perdas e contagens."
        acao={
          <BotaoNovo
            texto="Registrar movimentação"
            onClick={() => a.abrirMov()}
            largo={isMobile}
          />
        }
      />

      <FaixaKpis kpis={kpis} colunas={isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))"} />

      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <GrupoPilulas<AbaEstoque>
          opcoes={[
            { chave: "itens", nome: "Itens" },
            { chave: "movs", nome: "Movimentações" },
          ]}
          atual={f.aba}
          onEscolher={(v) => set({ aba: v })}
        />
        <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
          As vendas dão baixa no estoque automaticamente.
        </span>
      </div>

      {controlados.length === 0 ? (
        <Vazio
          titulo="Nenhum produto com estoque controlado"
          texto="Cadastre seus produtos físicos com quantidade e estoque mínimo. Depois registre a primeira entrada de mercadoria — as vendas passam a dar baixa sozinhas."
          acao="Ir para Produtos"
          onAcao={() => a.irPara(ROTAS.produtos)}
          destaque
        />
      ) : f.aba === "itens" ? (
        <AbaItens controlados={controlados} />
      ) : (
        <AbaMovimentacoes />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Itens                                                                       */
/* -------------------------------------------------------------------------- */

function AbaItens({ controlados }: { controlados: Produto[] }) {
  const { s, a, isDesktop } = usePortal();
  const f = s.fEstoque;
  const set = (p: Partial<typeof f>) => a.set({ fEstoque: { ...f, ...p } });

  const busca = f.busca.trim().toLowerCase();
  const filtrados = controlados.filter((p) => {
    if (busca && !p.nome.toLowerCase().includes(busca) && !p.codigo.includes(busca)) return false;
    if (f.cat !== TODAS_CATS && p.categoria !== f.cat) return false;
    if (f.status === "Precisa repor" && !estoqueBaixo(p)) return false;
    if (f.status === "Sem estoque" && p.estoque !== 0) return false;
    if (f.status === "Em dia" && estoqueBaixo(p)) return false;
    return true;
  });

  const ordenados = [...filtrados].sort((x, y) => {
    if (f.ordem === "Nome (A–Z)") return x.nome.localeCompare(y.nome);
    if (f.ordem === "Maior valor parado") {
      return (y.estoque ?? 0) * y.custo - (x.estoque ?? 0) * x.custo;
    }
    return (x.estoque ?? 0) - (y.estoque ?? 0);
  });

  const cols = `minmax(0,1fr)${isDesktop ? " 150px" : ""} 110px 90px 130px 44px`;

  return (
    <div>
      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <input
          value={f.busca}
          onChange={(e) => set({ busca: e.target.value })}
          placeholder="Buscar por nome ou código"
          style={css(`flex:1;min-width:170px;${campoFiltro()}`)}
        />
        <Selecao
          valor={f.status}
          opcoes={[TODAS_SITUACOES, "Precisa repor", "Sem estoque", "Em dia"]}
          onMudar={(v) => set({ status: v })}
        />
        <Selecao
          valor={f.cat}
          opcoes={[TODAS_CATS, ...s.catsProduto]}
          onMudar={(v) => set({ cat: v })}
        />
        <Selecao valor={f.ordem} opcoes={ORDENS} onMudar={(v) => set({ ordem: v })} />
      </div>

      {ordenados.length === 0 ? (
        <Vazio
          titulo="Nenhum produto com esses filtros"
          texto="Tente outro termo ou mude a situação."
          acao="Limpar filtros"
          onAcao={() => set({ busca: "", status: TODAS_SITUACOES, cat: TODAS_CATS })}
        />
      ) : (
        <>
          <div style={css(LISTA + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${CABECALHO_TABELA}`)}>
                <span style={css(rotuloColuna())}>PRODUTO</span>
                <span style={css(rotuloColuna())}>CATEGORIA</span>
                <span style={css(rotuloColuna("right"))}>EM ESTOQUE</span>
                <span style={css(rotuloColuna("right"))}>MÍNIMO</span>
                <span style={css(rotuloColuna())}>SITUAÇÃO</span>
                <span />
              </div>
            )}
            {ordenados.map((p) => (
              <LinhaItem key={p.id} produto={p} cols={cols} />
            ))}
          </div>
          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {ordenados.length} de {controlados.length} itens controlados
          </p>
        </>
      )}
    </div>
  );
}

function situacaoDe(p: Produto) {
  if (p.estoque === 0) return { texto: "Sem estoque", bg: "var(--warn-soft)", cor: "var(--danger)" };
  if (estoqueBaixo(p)) return { texto: "Precisa repor", bg: "var(--warn-soft)", cor: "var(--warn)" };
  return { texto: "Em dia", bg: "var(--pos-soft)", cor: "var(--pos)" };
}

function LinhaItem({ produto: p, cols }: { produto: Produto; cols: string }) {
  const { a, isDesktop } = usePortal();
  const sit = situacaoDe(p);

  const acoes = [
    { texto: "Registrar entrada", onClick: () => a.abrirMov(p.id, "entrada") },
    { texto: "Registrar saída ou perda", onClick: () => a.abrirMov(p.id, "saida") },
    { texto: "Ajustar pela contagem", onClick: () => a.abrirMov(p.id, "ajuste") },
    { texto: "Editar produto", onClick: () => a.abrirProduto(p.id) },
  ];

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13.5px/1.3 ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
              )}
            >
              {p.nome}
            </span>
            <span style={css(`display:block;margin-top:3px;font:500 11px ${MONO};color:var(--muted)`)}>
              {p.codigo || "sem código"} · custo {brl(p.custo)}
            </span>
          </span>
          <span>
            <span style={css(SELO_NEUTRO)}>{p.categoria}</span>
          </span>
          <span style={css(`text-align:right;font:700 15px ${SANS};${NUM};color:${sit.cor}`)}>
            {p.estoque} {p.unidade}
          </span>
          <span style={css(`text-align:right;font:500 12.5px ${SANS};${NUM};color:var(--muted)`)}>
            {p.minimo ?? 0}
          </span>
          <span>
            <span
              style={css(
                `display:inline-flex;padding:3px 9px;border-radius:999px;background:${sit.bg};color:${sit.cor};font:600 11px ${SANS}`,
              )}
            >
              {sit.texto}
            </span>
          </span>
          <MenuLinha chave={`item:${p.id}`} acoes={acoes} largura={230} />
        </div>
      ) : (
        <div style={css("display:flex;gap:10px;padding:12px 13px")}>
          <div style={css("flex:1;min-width:0")}>
            <div style={css(`font:600 13.5px/1.3 ${SANS}`)}>{p.nome}</div>
            <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px")}>
              <span
                style={css(
                  `padding:2px 8px;border-radius:999px;background:${sit.bg};color:${sit.cor};font:600 10.5px ${SANS}`,
                )}
              >
                {sit.texto}
              </span>
              <span style={css(`font:600 12.5px ${SANS};${NUM};color:${sit.cor}`)}>
                {p.estoque} {p.unidade}
              </span>
              <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>mín. {p.minimo ?? 0}</span>
            </div>
          </div>
          <MenuLinha chave={`item:${p.id}`} acoes={acoes} largura={230} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Movimentações                                                               */
/* -------------------------------------------------------------------------- */

function AbaMovimentacoes() {
  const { s, a, isDesktop } = usePortal();
  const f = s.fEstoque;
  const set = (p: Partial<typeof f>) => a.set({ fEstoque: { ...f, ...p } });

  const dias = DIAS_MOV[f.movPeriodo] ?? 30;
  const nomes = Array.from(new Set(s.movs.map((m) => m.produto))).sort();

  const filtradas = s.movs.filter((m) => {
    if (m.d >= dias) return false;
    if (f.movTipo !== TODOS_TIPOS && MOV_ESTILO[m.tipo].nome !== f.movTipo) return false;
    if (f.movProduto !== TODOS_PRODUTOS && m.produto !== f.movProduto) return false;
    return true;
  });

  const ordenadas = [...filtradas].sort((x, y) => x.d - y.d || y.hora.localeCompare(x.hora));

  const filtroAtivo =
    f.movTipo !== TODOS_TIPOS || f.movProduto !== TODOS_PRODUTOS || f.movPeriodo !== "Últimos 30 dias";

  const cols = `110px minmax(0,1fr) 140px 80px${isDesktop ? " minmax(0,1fr)" : ""} 100px`;

  return (
    <div>
      <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
        <Selecao
          valor={f.movTipo}
          opcoes={[TODOS_TIPOS, ...Object.values(MOV_ESTILO).map((e) => e.nome)]}
          onMudar={(v) => set({ movTipo: v })}
        />
        <Selecao
          valor={f.movProduto}
          opcoes={[TODOS_PRODUTOS, ...nomes]}
          onMudar={(v) => set({ movProduto: v })}
        />
        <Selecao valor={f.movPeriodo} opcoes={PERIODOS_MOV} onMudar={(v) => set({ movPeriodo: v })} />
        {filtroAtivo && (
          <LimparFiltros
            onClick={() =>
              set({ movTipo: TODOS_TIPOS, movProduto: TODOS_PRODUTOS, movPeriodo: "Últimos 30 dias" })
            }
          />
        )}
      </div>

      {ordenadas.length === 0 ? (
        <Vazio
          titulo="Nenhuma movimentação neste período"
          texto="Registre uma entrada de mercadoria ou mude o período do filtro. As baixas por venda aparecem aqui sozinhas."
          acao="Registrar movimentação"
          onAcao={() => a.abrirMov()}
        />
      ) : (
        <>
          <div style={css(LISTA + ";overflow:visible")}>
            {isDesktop && (
              <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;${CABECALHO_TABELA}`)}>
                <span style={css(rotuloColuna())}>QUANDO</span>
                <span style={css(rotuloColuna())}>PRODUTO</span>
                <span style={css(rotuloColuna())}>TIPO</span>
                <span style={css(rotuloColuna("right"))}>QTD</span>
                <span style={css(rotuloColuna())}>ORIGEM</span>
                <span />
              </div>
            )}
            {ordenadas.map((m) => (
              <LinhaMov key={m.id} mov={m} cols={cols} />
            ))}
          </div>
          <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
            {ordenadas.length} movimentaç{ordenadas.length === 1 ? "ão" : "ões"} no período
          </p>
        </>
      )}
    </div>
  );
}

function LinhaMov({ mov: m, cols }: { mov: MovEstoque; cols: string }) {
  const { a, isDesktop } = usePortal();
  const e = MOV_ESTILO[m.tipo];
  const reversivel = podeReverter(m);

  const botaoReverter = reversivel ? (
    <button
      onClick={() =>
        a.confirmar({
          titulo: "Reverter esta movimentação?",
          texto: "O saldo do produto volta ao que era antes dela.",
          resumo: `${e.nome} de ${Math.abs(m.delta)} em ${m.produto}`,
          sub: `${rotuloData(m.d, m.hora)} · ${m.motivo}`,
          reversao: "Você pode registrar de novo se precisar.",
          btn: "Reverter",
          btnBg: "var(--warn)",
          btnFg: "#fff",
          cor: "var(--warn)",
          acao: () => a.reverterMov(m.id),
        })
      }
      className="hv-warn-borda"
      style={css(
        `justify-self:end;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font:600 11.5px ${SANS}`,
      )}
    >
      Reverter
    </button>
  ) : (
    // Baixa por venda não se reverte aqui: quem desfaz é o estorno da venda.
    <span style={css(`justify-self:end;font:500 11px ${SANS};color:var(--muted)`)}>automática</span>
  );

  return (
    <div style={css("position:relative;background:var(--surface)")}>
      {isDesktop ? (
        <div style={css(`display:grid;grid-template-columns:${cols};gap:10px;align-items:center;padding:12px 14px`)}>
          <span style={css(`font:600 12px ${MONO};color:var(--text2);${NUM}`)}>
            {rotuloData(m.d, m.hora)}
          </span>
          <span
            style={css(`min-width:0;font:500 13px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}
          >
            {m.produto}
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
          <span style={css(`text-align:right;font:700 13.5px ${SANS};${NUM};color:${e.cor}`)}>
            {m.delta > 0 ? "+" : ""}
            {m.delta}
          </span>
          <span style={css("min-width:0")}>
            <span
              style={css(
                `display:block;font:500 12px/1.35 ${SANS};color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
              )}
            >
              {m.motivo}
            </span>
            <span style={css(`display:block;margin-top:2px;font:500 11px ${SANS};color:var(--muted)`)}>
              {m.quem}
            </span>
          </span>
          {botaoReverter}
        </div>
      ) : (
        <div style={css("padding:12px 13px")}>
          <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
            <span style={css(`font:600 11.5px ${MONO};color:var(--muted)`)}>
              {rotuloData(m.d, m.hora)}
            </span>
            <span
              style={css(
                `padding:2px 8px;border-radius:999px;background:${e.bg};color:${e.cor};font:600 10.5px ${SANS}`,
              )}
            >
              {e.nome}
            </span>
            <span style={css(`font:700 12.5px ${SANS};${NUM};color:${e.cor}`)}>
              {m.delta > 0 ? "+" : ""}
              {m.delta}
            </span>
          </div>
          <div style={css(`margin-top:5px;font:500 13px/1.35 ${SANS}`)}>{m.produto}</div>
          <div style={css(`margin-top:3px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
            {m.motivo} · {m.quem}
          </div>
          {reversivel && <div style={css("margin-top:8px")}>{botaoReverter}</div>}
        </div>
      )}
    </div>
  );
}
