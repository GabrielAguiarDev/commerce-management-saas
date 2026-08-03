"use client";

import { usePortal } from "@/components/PortalProvider";
import { CabecalhoTela, Vazio } from "@/components/ui";
import { css, MONO, SANS } from "@/lib/css";
import { FORMAS } from "@/lib/dados/vendas";
import { brl, brlCurto, ddmm, diaSemana, qtdV, totalV } from "@/lib/formato";
import {
  custoDasVendas,
  DIAS_PERIODO,
  faturamento,
  NOME_PERIODO,
  nomePeriodoAnterior,
  produtosEmFalta,
  textoVariacao,
  totalCustos,
  valida,
  valorDoEstoque,
  variacao,
} from "@/lib/selectors";
import { GRUPO_PILULAS, NUM, pilula, ROTULO_KPI } from "@/lib/styleKit";
import type { PeriodoRel } from "@/types/estado";
import type { Venda } from "@/types/types";

const PERIODOS: PeriodoRel[] = ["hoje", "7", "30", "90"];

const COR_PAGAMENTO: Record<string, string> = {
  Dinheiro: "var(--pos)",
  Pix: "var(--accent)",
  Débito: "var(--petrol)",
  Crédito: "var(--warn)",
};

/**
 * Relatórios.
 *
 * Cada bloco só aparece se o cliente tiver o módulo que o alimenta: sem Custos
 * não há "resultado", sem Estoque não há giro. O comparativo com o período
 * anterior é opcional porque nem todo negócio tem histórico suficiente para
 * ele significar alguma coisa.
 */
export function RelatoriosView() {
  const { s, a, tem, isDesktop, isMobile } = usePortal();
  const f = s.fRel;
  const dias = DIAS_PERIODO[f.periodo];

  const doPeriodo = s.vendas.filter((v) => v.d < dias);
  const anterior = s.vendas.filter((v) => v.d >= dias && v.d < dias * 2);

  const receita = faturamento(doPeriodo);
  const receitaAnt = faturamento(anterior);

  const temCustos = tem("custos");
  const custos = temCustos ? totalCustos(s.custos, dias) : custoDasVendas(doPeriodo, s.produtos);
  const custosAnt = temCustos
    ? totalCustos(
        s.custos.filter((c) => c.d >= dias).map((c) => ({ ...c, d: c.d - dias })),
        dias,
      )
    : custoDasVendas(anterior, s.produtos);

  const lucro = receita - custos;
  const lucroAnt = receitaAnt - custosAnt;

  const validas = doPeriodo.filter(valida);
  const ticket = validas.length ? receita / validas.length : 0;
  const ticketAnt = anterior.filter(valida).length
    ? receitaAnt / anterior.filter(valida).length
    : 0;

  const semDados = validas.length === 0 && (!temCustos || s.custos.filter((c) => c.d < dias).length === 0);

  const set = (p: Partial<typeof f>) => a.set({ fRel: { ...f, ...p } });

  const resumo = [
    {
      label: "Vendas",
      valor: brl(receita),
      nota: `${validas.length} vendas no período`,
      cor: "var(--text)",
      tamanho: "24px",
      variacao: variacao(receita, receitaAnt),
    },
    {
      label: temCustos ? "Custos" : "Custo da mercadoria",
      valor: brl(custos),
      nota: temCustos ? "Variáveis + fixos rateados" : "Do que foi vendido",
      cor: "var(--warn)",
      tamanho: "24px",
      variacao: variacao(custos, custosAnt),
    },
    {
      label: "Sobrou",
      valor: brl(lucro),
      nota: receita > 0 ? `Margem de ${((lucro / receita) * 100).toFixed(0)}%` : "Sem vendas",
      cor: lucro >= 0 ? "var(--pos)" : "var(--danger)",
      tamanho: "26px",
      variacao: variacao(lucro, lucroAnt),
    },
    {
      label: "Ticket médio",
      valor: brl(ticket),
      nota: "Por venda",
      cor: "var(--text)",
      tamanho: "24px",
      variacao: variacao(ticket, ticketAnt),
    },
  ];

  const resumoCols = isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))";
  const tresCols = isDesktop ? "repeat(3,minmax(0,1fr))" : "1fr";
  const doisCols = isDesktop ? "repeat(2,minmax(0,1fr))" : "1fr";

  return (
    <div>
      <CabecalhoTela
        titulo="Relatórios"
        subtitulo="Como foi o seu negócio no período — tudo que vendas, custos e estoque já registraram."
        acao={
          <div style={css("display:flex;gap:8px")}>
            <button
              onClick={() => a.avisar("O PDF do período foi preparado para download")}
              className="hv-acc-borda"
              style={css(
                `padding:11px 16px;border-radius:10px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13px ${SANS}`,
              )}
            >
              Salvar em PDF
            </button>
            <button
              onClick={() => a.avisar("A planilha do período foi preparada para download")}
              className="hv-acc-borda"
              style={css(
                `padding:11px 16px;border-radius:10px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13px ${SANS}`,
              )}
            >
              Baixar planilha
            </button>
          </div>
        }
      />

      <div
        style={css(
          "display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin-bottom:16px;" +
            "border:1px solid var(--border);border-radius:13px;background:var(--surface)",
        )}
      >
        <span
          style={css(
            `font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`,
          )}
        >
          Período
        </span>
        <div style={css(GRUPO_PILULAS)}>
          {PERIODOS.map((p) => (
            <button key={p} onClick={() => set({ periodo: p })} style={css(pilula(f.periodo === p))}>
              {NOME_PERIODO[p]}
            </button>
          ))}
        </div>

        <button
          onClick={() => set({ comparar: !f.comparar })}
          style={css(
            `display:flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid ${f.comparar ? "var(--accent)" : "var(--border2)"};` +
              `border-radius:10px;background:${f.comparar ? "var(--accent-soft)" : "var(--surface2)"};` +
              `color:${f.comparar ? "var(--accent)" : "var(--text2)"};font:600 12.5px ${SANS}`,
          )}
        >
          <span
            style={css(
              `width:30px;height:18px;border-radius:999px;background:${f.comparar ? "var(--accent)" : "var(--border2)"};` +
                `display:flex;align-items:center;padding:2px;justify-content:${f.comparar ? "flex-end" : "flex-start"}`,
            )}
          >
            <span style={css("width:14px;height:14px;border-radius:50%;background:#fff")} />
          </span>
          <span>Comparar com {nomePeriodoAnterior(f.periodo)}</span>
        </button>

        <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
          {dias === 1 ? "Hoje" : `${ddmm(dias - 1)} até hoje`}
        </span>
      </div>

      {semDados ? (
        <Vazio
          titulo="Sem movimento neste período"
          texto="Nenhuma venda ou custo foi registrado aqui. Escolha um período maior para ver os números do seu negócio."
          acao="Ver este mês"
          onAcao={() => set({ periodo: "30" })}
          destaque
        />
      ) : (
        <div style={css("display:flex;flex-direction:column;gap:14px")}>
          {/* Resumo financeiro */}
          <Bloco titulo="Resumo financeiro" nota="O que entrou, o que saiu e o que sobrou no período.">
            <div style={css(`display:grid;grid-template-columns:${resumoCols};gap:1px;background:var(--border)`)}>
              {resumo.map((k) => {
                const v = k.variacao;
                const bom = k.label === "Custos" ? (v ?? 0) <= 0 : (v ?? 0) >= 0;
                return (
                  <div key={k.label} style={css("padding:15px 18px;background:var(--surface)")}>
                    <div style={css(ROTULO_KPI)}>{k.label}</div>
                    <div
                      style={css(`margin-top:7px;font:700 ${k.tamanho}/1.05 ${SANS};${NUM};color:${k.cor}`)}
                    >
                      {k.valor}
                    </div>
                    <div style={css(`margin-top:6px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
                      {k.nota}
                    </div>
                    {f.comparar && (
                      <div
                        style={css(
                          "display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:3px 9px;border-radius:999px;" +
                            `background:${bom ? "var(--pos-soft)" : "var(--warn-soft)"};` +
                            `color:${bom ? "var(--pos)" : "var(--warn)"};font:600 11.5px ${SANS};${NUM}`,
                        )}
                      >
                        {textoVariacao(v)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Bloco>

          {validas.length > 0 && (
            <BlocoVendas vendas={doPeriodo} dias={dias} tresCols={tresCols} ticket={ticket} />
          )}

          {temCustos && s.custos.filter((c) => c.d < dias).length > 0 && (
            <BlocoCustos dias={dias} doisCols={doisCols} />
          )}

          {tem("estoque") && <BlocoEstoque dias={dias} tresCols={tresCols} />}

          <BlocoResultado dias={dias} tresCols={tresCols} receita={receita} custos={custos} />
        </div>
      )}
    </div>
  );
}

function Bloco({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      <div style={css("padding:15px 18px;border-bottom:1px solid var(--border)")}>
        <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>{titulo}</h2>
        <p style={css(`margin:3px 0 0;font:400 12px ${SANS};color:var(--muted)`)}>{nota}</p>
      </div>
      {children}
    </div>
  );
}

function Titulo({ texto }: { texto: string }) {
  return (
    <div
      style={css(
        `margin-bottom:11px;font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`,
      )}
    >
      {texto}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BlocoVendas({
  vendas,
  dias,
  tresCols,
  ticket,
}: {
  vendas: Venda[];
  dias: number;
  tresCols: string;
  ticket: number;
}) {
  const { isMobile } = usePortal();

  // Até 14 dias mostra dia a dia; acima disso agrupa por semana, ou o gráfico
  // vira uma cerca ilegível.
  const passo = dias <= 14 ? 1 : 7;
  const grupos = Math.min(Math.ceil(dias / passo), 13);

  const serie = Array.from({ length: grupos }, (_, i) => {
    const de = (grupos - 1 - i) * passo;
    const ate = de + passo;
    const doGrupo = vendas.filter((v) => v.d >= de && v.d < ate);
    return {
      chave: de,
      valor: faturamento(doGrupo),
      rotulo: passo === 1 ? diaSemana(de) : de === 0 ? "Esta sem." : ddmm(de),
    };
  });
  const maior = Math.max(...serie.map((b) => b.valor), 1);

  const validas = vendas.filter(valida);

  const porProduto = new Map<string, { valor: number; qtd: number }>();
  for (const v of validas) {
    for (const i of v.itens) {
      const cur = porProduto.get(i.nome) ?? { valor: 0, qtd: 0 };
      porProduto.set(i.nome, { valor: cur.valor + i.qtd * i.preco, qtd: cur.qtd + i.qtd });
    }
  }
  const ranking = [...porProduto.entries()]
    .sort((x, y) => y[1].valor - x[1].valor)
    .slice(0, 5)
    .map(([nome, d]) => ({ nome, ...d }));
  const maiorRanking = ranking[0]?.valor ?? 1;

  const total = faturamento(vendas);
  const pagamentos = FORMAS.map((forma) => {
    const valor = validas.filter((v) => v.pag === forma).reduce((x, v) => x + totalV(v), 0);
    return { nome: forma, valor, pct: total > 0 ? (valor / total) * 100 : 0, cor: COR_PAGAMENTO[forma] };
  }).filter((p) => p.valor > 0);

  return (
    <Bloco titulo="Vendas" nota={`${validas.length} vendas · ${validas.reduce((x, v) => x + qtdV(v), 0)} itens no período`}>
      <div style={css("padding:16px 18px")}>
        <div style={css(`display:flex;align-items:flex-end;gap:${isMobile ? "4px" : "8px"};height:190px`)}>
          {serie.map((b) => (
            <div
              key={b.chave}
              style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%")}
            >
              <span
                style={css(`flex:none;white-space:nowrap;font:600 10.5px ${MONO};color:var(--muted);${NUM}`)}
              >
                {b.valor > 0 ? brlCurto(b.valor) : "—"}
              </span>
              <span style={css("flex:1;min-height:0;width:100%;display:flex;align-items:flex-end")}>
                <span
                  style={css(
                    "flex:none;width:100%;border-radius:7px 7px 3px 3px;min-height:4px;transition:height .3s ease;" +
                      `background:${b.chave === 0 ? "var(--accent)" : "var(--accent-soft)"};` +
                      `height:${Math.max((b.valor / maior) * 100, 2)}%`,
                  )}
                />
              </span>
              <span
                style={css(`flex:none;white-space:nowrap;font:600 10.5px ${SANS};color:var(--muted)`)}
              >
                {b.rotulo}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={css(
          `display:grid;grid-template-columns:${tresCols};gap:1px;background:var(--border);border-top:1px solid var(--border)`,
        )}
      >
        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Mais vendidos" />
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {ranking.map((r) => (
              <div key={r.nome}>
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                  <span
                    style={css(
                      `min-width:0;font:600 12.5px/1.3 ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {r.nome}
                  </span>
                  <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM}`)}>{brl(r.valor)}</span>
                </div>
                <div style={css("display:flex;align-items:center;gap:8px;margin-top:5px")}>
                  <span
                    style={css("flex:1;height:6px;border-radius:999px;background:var(--surface3);overflow:hidden")}
                  >
                    <span
                      style={css(
                        `display:block;height:100%;border-radius:999px;background:var(--accent);width:${(r.valor / maiorRanking) * 100}%`,
                      )}
                    />
                  </span>
                  <span style={css(`flex:none;font:500 11px ${MONO};color:var(--muted)`)}>{r.qtd}×</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Como o cliente pagou" />
          <div style={css("display:flex;height:9px;border-radius:999px;overflow:hidden;background:var(--surface3)")}>
            {pagamentos.map((p) => (
              <span key={p.nome} style={css(`height:100%;background:${p.cor};width:${p.pct}%`)} />
            ))}
          </div>
          <div style={css("display:flex;flex-direction:column;gap:9px;margin-top:13px")}>
            {pagamentos.map((p) => (
              <div key={p.nome} style={css("display:flex;align-items:center;gap:9px")}>
                <span style={css(`flex:none;width:8px;height:8px;border-radius:50%;background:${p.cor}`)} />
                <span style={css(`flex:1;min-width:0;font:600 12.5px ${SANS}`)}>{p.nome}</span>
                <span style={css(`flex:none;font:500 11.5px ${MONO};color:var(--muted)`)}>
                  {p.pct.toFixed(0)}%
                </span>
                <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM}`)}>{brl(p.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Ticket médio" />
          <div style={css(`font:700 26px/1 ${SANS};${NUM}`)}>{brl(ticket)}</div>
          <div style={css(`margin-top:7px;font:500 12px/1.45 ${SANS};color:var(--muted)`)}>
            Quanto cada cliente gasta, em média, por passagem no balcão.
          </div>
          <div style={css("margin-top:14px;padding-top:12px;border-top:1px solid var(--border)")}>
            <Titulo texto="Vendas no período" />
            <div style={css(`margin-top:-6px;font:700 19px ${SANS};${NUM}`)}>{validas.length}</div>
          </div>
        </div>
      </div>
    </Bloco>
  );
}

/* -------------------------------------------------------------------------- */

function BlocoCustos({ dias, doisCols }: { dias: number; doisCols: string }) {
  const { s } = usePortal();
  const doPeriodo = s.custos.filter((c) => c.d < dias);
  const total = doPeriodo.reduce((x, c) => x + c.valor, 0) || 1;

  const porCategoria = new Map<string, number>();
  for (const c of doPeriodo) porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + c.valor);
  const categorias = [...porCategoria.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([nome, valor], i) => ({
      nome,
      valor,
      pct: (valor / total) * 100,
      cor: ["var(--warn)", "var(--petrol)", "var(--accent)", "var(--muted)"][i % 4],
    }));

  const fixo = doPeriodo.filter((c) => c.tipo === "fixo").reduce((x, c) => x + c.valor, 0);
  const variavel = doPeriodo.filter((c) => c.tipo === "variavel").reduce((x, c) => x + c.valor, 0);

  return (
    <Bloco titulo="Custos" nota="Para onde foi o dinheiro no período.">
      <div style={css(`display:grid;grid-template-columns:${doisCols};gap:1px;background:var(--border)`)}>
        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Por categoria" />
          <div style={css("display:flex;flex-direction:column;gap:11px")}>
            {categorias.map((c) => (
              <div key={c.nome}>
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                  <span
                    style={css(
                      `min-width:0;font:600 12.5px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {c.nome}
                  </span>
                  <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM}`)}>{brl(c.valor)}</span>
                </div>
                <div style={css("display:flex;align-items:center;gap:8px;margin-top:5px")}>
                  <span
                    style={css("flex:1;height:6px;border-radius:999px;background:var(--surface3);overflow:hidden")}
                  >
                    <span
                      style={css(
                        `display:block;height:100%;border-radius:999px;background:${c.cor};width:${c.pct}%`,
                      )}
                    />
                  </span>
                  <span style={css(`flex:none;font:500 11px ${MONO};color:var(--muted)`)}>
                    {c.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Fixo e variável" />
          <div style={css("display:flex;flex-direction:column;gap:11px")}>
            {[
              {
                nome: "Custos fixos",
                valor: fixo,
                cor: "var(--petrol)",
                nota: "Aluguel, luz, salário — saem todo mês, venda ou não.",
              },
              {
                nome: "Custos variáveis",
                valor: variavel,
                cor: "var(--warn)",
                nota: "Mercadoria e insumos — acompanham o movimento.",
              },
            ].map((t) => (
              <div
                key={t.nome}
                style={css(
                  "padding:12px 13px;border:1px solid var(--border);border-radius:11px;background:var(--surface2)",
                )}
              >
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
                  <span style={css(`font:600 12.5px ${SANS};color:${t.cor}`)}>{t.nome}</span>
                  <span style={css(`font:700 15px ${SANS};${NUM}`)}>{brl(t.valor)}</span>
                </div>
                <div style={css(`margin-top:4px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
                  {t.nota}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Bloco>
  );
}

/* -------------------------------------------------------------------------- */

function BlocoEstoque({ dias, tresCols }: { dias: number; tresCols: string }) {
  const { s } = usePortal();

  const saidas = new Map<string, number>();
  for (const v of s.vendas.filter((x) => x.d < dias && valida(x))) {
    for (const i of v.itens) saidas.set(i.nome, (saidas.get(i.nome) ?? 0) + i.qtd);
  }

  const controlados = s.produtos.filter((p) => p.estoque != null);
  const giro = [...saidas.entries()]
    .filter(([nome]) => controlados.some((p) => p.nome === nome))
    .sort((x, y) => y[1] - x[1])
    .slice(0, 4);

  const parados = controlados.filter((p) => !saidas.has(p.nome)).slice(0, 4);
  const alertas = produtosEmFalta(s.produtos).slice(0, 3);

  return (
    <Bloco
      titulo="Estoque"
      nota={`O que gira, o que está parado e o que precisa repor. Valor imobilizado: ${brl(valorDoEstoque(s.produtos))}.`}
    >
      <div style={css(`display:grid;grid-template-columns:${tresCols};gap:1px;background:var(--border)`)}>
        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Mais saíram" />
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {giro.length === 0 ? (
              <div style={css(`font:500 12px/1.5 ${SANS};color:var(--muted)`)}>
                Nenhuma saída de produto no período.
              </div>
            ) : (
              giro.map(([nome, qtd]) => (
                <div key={nome} style={css("display:flex;align-items:center;gap:10px")}>
                  <span
                    style={css(
                      `flex:1;min-width:0;font:600 12.5px/1.3 ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {nome}
                  </span>
                  <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM};color:var(--text2)`)}>
                    {qtd}×
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Parados no período" />
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            {parados.length === 0 ? (
              <div style={css(`font:500 12px/1.5 ${SANS};color:var(--muted)`)}>
                Tudo girou no período — nenhum produto parado.
              </div>
            ) : (
              parados.map((p) => (
                <div key={p.id} style={css("display:flex;align-items:center;gap:10px")}>
                  <span
                    style={css(
                      `flex:1;min-width:0;font:500 12.5px/1.3 ${SANS};color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {p.nome}
                  </span>
                  <span style={css(`flex:none;font:500 11.5px ${MONO};color:var(--muted)`)}>
                    {p.estoque} {p.unidade}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={css("padding:15px 18px;background:var(--surface)")}>
          <Titulo texto="Precisa repor" />
          <div style={css("display:flex;flex-direction:column;gap:9px")}>
            {alertas.length === 0 ? (
              <div
                style={css(
                  `padding:11px 12px;border-radius:10px;background:var(--pos-soft);font:600 12.5px ${SANS};color:var(--pos)`,
                )}
              >
                Estoque em dia, nada para repor.
              </div>
            ) : (
              alertas.map((p) => {
                const zerado = p.estoque === 0;
                return (
                  <div
                    key={p.id}
                    style={css(
                      `display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:10px;background:var(--warn-soft)`,
                    )}
                  >
                    <span
                      style={css(
                        `flex:1;min-width:0;font:600 12.5px/1.3 ${SANS};color:${zerado ? "var(--danger)" : "var(--warn)"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                      )}
                    >
                      {p.nome}
                    </span>
                    <span
                      style={css(
                        `flex:none;font:600 11.5px ${SANS};color:${zerado ? "var(--danger)" : "var(--warn)"}`,
                      )}
                    >
                      {zerado ? "acabou" : `restam ${p.estoque}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Bloco>
  );
}

/* -------------------------------------------------------------------------- */

function BlocoResultado({
  dias,
  tresCols,
  receita,
  custos,
}: {
  dias: number;
  tresCols: string;
  receita: number;
  custos: number;
}) {
  const { s, tem, isMobile } = usePortal();
  const temCustos = tem("custos");

  const passo = dias <= 14 ? 1 : 7;
  const grupos = Math.min(Math.ceil(dias / passo), 13);

  const serie = Array.from({ length: grupos }, (_, i) => {
    const de = (grupos - 1 - i) * passo;
    const ate = de + passo;
    const vendasG = faturamento(s.vendas.filter((v) => v.d >= de && v.d < ate));
    // Por barra entram só os custos variáveis: o fixo é mensal e ratear o
    // aluguel dia a dia faria toda barra nascer no vermelho.
    const custosG = temCustos
      ? s.custos
          .filter((c) => c.d >= de && c.d < ate && c.tipo === "variavel")
          .reduce((x, c) => x + c.valor, 0)
      : custoDasVendas(
          s.vendas.filter((v) => v.d >= de && v.d < ate),
          s.produtos,
        );
    return {
      chave: de,
      vendas: vendasG,
      custos: custosG,
      lucro: vendasG - custosG,
      rotulo: passo === 1 ? diaSemana(de) : de === 0 ? "Esta sem." : ddmm(de),
    };
  });

  const maior = Math.max(...serie.flatMap((b) => [b.vendas, b.custos, Math.abs(b.lucro)]), 1);

  const lucro = receita - custos;
  const melhor = [...serie].sort((x, y) => y.lucro - x.lucro)[0];

  const cartoes = [
    {
      label: "Sobrou no período",
      valor: brl(lucro),
      nota: receita > 0 ? `${((lucro / receita) * 100).toFixed(0)}% do que entrou` : "Sem vendas",
      cor: lucro >= 0 ? "var(--pos)" : "var(--danger)",
    },
    {
      label: "Média por dia",
      valor: brl(lucro / Math.max(dias, 1)),
      nota: `Ao longo de ${dias} ${dias === 1 ? "dia" : "dias"}`,
      cor: "var(--text)",
    },
    {
      label: "Melhor período",
      valor: melhor ? brl(melhor.lucro) : "—",
      nota: melhor ? melhor.rotulo : "Sem dados",
      cor: "var(--text)",
    },
  ];

  return (
    <Bloco titulo="Resultado" nota="Quanto sobrou depois de pagar tudo, ao longo do período.">
      <div style={css("padding:16px 18px")}>
        <div style={css("display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px")}>
          {[
            ["Vendas", "var(--pos)"],
            ["Custos", "var(--warn)"],
            ["Sobrou", "var(--accent)"],
          ].map(([nome, cor]) => (
            <span
              key={nome}
              style={css(`display:flex;align-items:center;gap:7px;font:600 11.5px ${SANS};color:var(--text2)`)}
            >
              <span style={css(`width:9px;height:9px;border-radius:3px;background:${cor}`)} />
              {nome}
            </span>
          ))}
        </div>

        <div style={css(`display:flex;align-items:flex-end;gap:${isMobile ? "4px" : "8px"};height:200px`)}>
          {serie.map((b) => (
            <div
              key={b.chave}
              style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%")}
            >
              <span
                style={css(
                  `flex:none;white-space:nowrap;font:600 10.5px ${MONO};${NUM};color:${b.lucro >= 0 ? "var(--pos)" : "var(--danger)"}`,
                )}
              >
                {brlCurto(b.lucro)}
              </span>
              <span style={css("flex:1;min-height:0;width:100%;display:flex;align-items:flex-end;gap:3px")}>
                {[
                  [b.vendas, "var(--pos)"],
                  [b.custos, "var(--warn)"],
                  [Math.abs(b.lucro), b.lucro >= 0 ? "var(--accent)" : "var(--danger)"],
                ].map(([valor, cor], i) => (
                  <span
                    key={i}
                    style={css(
                      `flex:1;border-radius:6px 6px 2px 2px;background:${cor};min-height:3px;transition:height .3s ease;` +
                        `height:${Math.max(((valor as number) / maior) * 100, 1.5)}%`,
                    )}
                  />
                ))}
              </span>
              <span
                style={css(`flex:none;white-space:nowrap;font:600 10.5px ${SANS};color:var(--muted)`)}
              >
                {b.rotulo}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={css(
          `display:grid;grid-template-columns:${tresCols};gap:1px;background:var(--border);border-top:1px solid var(--border)`,
        )}
      >
        {cartoes.map((k) => (
          <div key={k.label} style={css("padding:15px 18px;background:var(--surface)")}>
            <div style={css(ROTULO_KPI)}>{k.label}</div>
            <div style={css(`margin-top:6px;font:700 20px/1.05 ${SANS};${NUM};color:${k.cor}`)}>
              {k.valor}
            </div>
            <div style={css(`margin-top:5px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>{k.nota}</div>
          </div>
        ))}
      </div>
    </Bloco>
  );
}
