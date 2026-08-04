"use client";

import { usePortal } from "@/components/PortalProvider";
import { css, MONO, NUM, PAINEL, SANS, TITULO_PAINEL, TITULO_TELA } from "@aguiar/ui";
import { MODULOS } from "@/lib/dados/perfis";
import { brl, brlCurto, dataPorExtenso, diaSemana, rotuloData, saudacao, totalV } from "@/lib/formato";
import { ROTA_PDV, ROTAS } from "@/lib/rotas";
import {
  custoDasVendas,
  dinheiroNaGaveta,
  faturamento,
  itensVendidos,
  produtosEmFalta,
  totalCustos,
} from "@/lib/selectors";
import type { ModuloKey } from "@/types/types";

interface CartaoKpi {
  label: string;
  valor: string;
  nota: string;
  cor: string;
  dot: string;
}

/**
 * O resumo de hoje.
 *
 * Os cartões e os atalhos são montados a partir dos módulos do plano — quem não
 * tem Estoque nem Caixa não vê esses números, em vez de vê-los zerados. É a
 * mesma regra que monta o menu lateral.
 */
export function DashboardView() {
  const { a, tem, isMobile, d } = usePortal();

  const hoje = d.vendas.filter((v) => v.d === 0);
  const faturamentoHoje = faturamento(hoje);
  const custoHoje = custoDasVendas(hoje, d.produtos);
  const custosLancadosHoje = d.custos.filter((c) => c.d === 0).reduce((x, c) => x + c.valor, 0);
  const lucroHoje = faturamentoHoje - custoHoje - custosLancadosHoje;
  const mes = faturamento(d.vendas.filter((v) => v.d < 30));
  const emFalta = produtosEmFalta(d.produtos);

  const kpis: CartaoKpi[] = [
    {
      label: "Faturamento hoje",
      valor: brl(faturamentoHoje),
      nota: `Em ${hoje.filter((v) => !v.estornada).length} vendas`,
      cor: "var(--text)",
      dot: "var(--pos)",
    },
  ];

  if (tem("custos")) {
    kpis.push({
      label: "Custos de hoje",
      valor: brl(custosLancadosHoje),
      nota: custosLancadosHoje > 0 ? "Lançados por você" : "Nada lançado ainda",
      cor: "var(--text)",
      dot: "var(--warn)",
    });
  }

  if (tem("custos") || tem("relatorios")) {
    const margem = faturamentoHoje > 0 ? (lucroHoje / faturamentoHoje) * 100 : 0;
    kpis.push({
      label: "Lucro hoje",
      valor: brl(lucroHoje),
      nota: faturamentoHoje > 0 ? `Margem de ${margem.toFixed(0)}%` : "Sem vendas ainda",
      cor: lucroHoje >= 0 ? "var(--pos)" : "var(--danger)",
      dot: "var(--accent)",
    });
  }

  kpis.push({
    label: "Itens vendidos",
    valor: String(itensVendidos(hoje)),
    nota: `Em ${hoje.filter((v) => !v.estornada).length} vendas`,
    cor: "var(--text)",
    dot: "var(--petrol)",
  });

  kpis.push({
    label: "Faturamento do mês",
    valor: brl(mes),
    nota: tem("custos")
      ? `Custos: ${brl(totalCustos(d.custos, 30))}`
      : `${d.vendas.filter((v) => v.d < 30 && !v.estornada).length} vendas no período`,
    cor: "var(--text)",
    dot: "var(--muted)",
  });

  if (tem("caixa")) {
    kpis.push({
      label: "Caixa",
      valor: d.caixaAberto ? "Aberto" : "Fechado",
      nota: d.caixaAberto
        ? `Desde ${d.caixaAberto.abertura} · ${brl(dinheiroNaGaveta(d))} na gaveta`
        : "Abra o caixa para começar o dia",
      cor: d.caixaAberto ? "var(--pos)" : "var(--muted)",
      dot: d.caixaAberto ? "var(--pos)" : "var(--border2)",
    });
  }

  if (tem("estoque")) {
    kpis.push({
      label: "Estoque baixo",
      valor: emFalta.length ? `${emFalta.length} ${emFalta.length === 1 ? "item" : "itens"}` : "Em dia",
      nota: emFalta.length
        ? emFalta
            .slice(0, 2)
            .map((p) => p.nome)
            .join(", ") + (emFalta.length > 2 ? ` e mais ${emFalta.length - 2}` : "")
        : "Nada para repor agora",
      cor: emFalta.length ? "var(--warn)" : "var(--pos)",
      dot: emFalta.length ? "var(--warn)" : "var(--pos)",
    });
  }

  // Últimos 7 dias, do mais antigo para hoje — a leitura natural de um gráfico.
  const dias = [6, 5, 4, 3, 2, 1, 0];
  const barras = dias.map((dia) => ({
    d: dia,
    dia: diaSemana(dia),
    valor: faturamento(d.vendas.filter((v) => v.d === dia)),
  }));
  const maior = Math.max(...barras.map((b) => b.valor), 1);
  const media = barras.reduce((x, b) => x + b.valor, 0) / barras.length;

  const atalhos: { sigla: string; nome: string; rota: string; modulo: ModuloKey }[] = [];
  if (tem("vendas")) atalhos.push({ sigla: "NV", nome: "Nova venda", rota: ROTA_PDV, modulo: "vendas" });
  if (tem("custos")) atalhos.push({ sigla: "CU", nome: "Registrar custo", rota: ROTAS.custos, modulo: "custos" });
  if (tem("caixa")) atalhos.push({ sigla: "CX", nome: d.caixaAberto ? "Fechar caixa" : "Abrir caixa", rota: ROTAS.caixa, modulo: "caixa" });
  if (tem("estoque")) atalhos.push({ sigla: "ET", nome: "Ajustar estoque", rota: ROTAS.estoque, modulo: "estoque" });
  if (tem("relatorios") && atalhos.length < 4) atalhos.push({ sigla: "RL", nome: "Ver relatório", rota: ROTAS.relatorios, modulo: "relatorios" });
  if (tem("config") && atalhos.length < 4) atalhos.push({ sigla: "CF", nome: "Configurações", rota: ROTAS.config, modulo: "config" });

  const ultimas = hoje.slice(0, 4);

  const kpiCols = isMobile ? "1fr 1fr" : "repeat(auto-fit,minmax(200px,1fr))";
  const painelCols = isMobile ? "1fr" : "minmax(0,1.6fr) minmax(0,1fr)";

  return (
    <div>
      <div
        style={css(
          "display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px",
        )}
      >
        <div>
          <h1 style={css(TITULO_TELA)}>Resumo de hoje</h1>
          <p style={css(`margin:5px 0 0;font:400 13.5px/1.45 ${SANS};color:var(--muted)`)}>
            {saudacao()} — {dataPorExtenso()}
          </p>
        </div>

      </div>

      <div
        style={css(`display:grid;grid-template-columns:${kpiCols};grid-auto-rows:1fr;gap:12px;align-items:stretch`)}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={css(`display:flex;flex-direction:column;height:100%;min-height:132px;padding:16px;${PAINEL}`)}
          >
            <div style={css("display:flex;align-items:center;gap:8px")}>
              <span style={css(`width:8px;height:8px;border-radius:3px;background:${k.dot}`)} />
              <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>{k.label}</span>
            </div>
            <div
              style={css(
                `margin-top:10px;font:700 clamp(19px,2.1vw,26px)/1.15 ${SANS};${NUM};letter-spacing:-.02em;white-space:nowrap;color:${k.cor}`,
              )}
            >
              {k.valor}
            </div>
            <div style={css(`margin-top:auto;padding-top:8px;font:500 11.5px/1.35 ${SANS};color:var(--muted)`)}>
              {k.nota}
            </div>
          </div>
        ))}
      </div>

      <div style={css(`display:grid;grid-template-columns:${painelCols};gap:12px;margin-top:12px`)}>
        <div style={css(`display:flex;flex-direction:column;padding:18px;${PAINEL}`)}>
          <div
            style={css("flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap")}
          >
            <h2 style={css(TITULO_PAINEL)}>Vendas dos últimos 7 dias</h2>
            <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
              Valores em R$ · média {brlCurto(media)} / dia
            </span>
          </div>

          <div
            style={css(
              `flex:1;display:flex;align-items:flex-end;gap:${isMobile ? "5px" : "10px"};min-height:190px;margin-top:18px`,
            )}
          >
            {barras.map((b) => (
              <div
                key={b.d}
                style={css("flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%")}
              >
                <span
                  style={css(
                    `flex:none;white-space:nowrap;font:600 11px ${MONO};color:var(--muted);${NUM}`,
                  )}
                >
                  {b.valor > 0 ? brlCurto(b.valor) : "—"}
                </span>
                <span style={css("flex:1;min-height:0;width:100%;display:flex;align-items:flex-end")}>
                  <span
                    style={css(
                      "flex:none;width:100%;border-radius:7px 7px 3px 3px;min-height:6px;transition:height .3s ease;" +
                        `background:${b.d === 0 ? "var(--accent)" : "var(--accent-soft)"};` +
                        `height:${Math.max((b.valor / maior) * 100, 3)}%`,
                    )}
                  />
                </span>
                <span
                  style={css(
                    `flex:none;font:600 11px ${SANS};color:${b.d === 0 ? "var(--accent)" : "var(--muted)"}`,
                  )}
                >
                  {b.dia}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:12px")}>
          <div style={css(`padding:18px;${PAINEL}`)}>
            <h2 style={css(`margin:0 0 14px;font:600 15px/1.2 ${SANS}`)}>Atalhos</h2>
            <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:8px")}>
              {atalhos.map((x) => (
                <button
                  key={x.nome}
                  onClick={() => a.irPara(x.rota)}
                  className="hv-linha"
                  style={css(
                    "display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--border);" +
                      "border-radius:11px;background:var(--surface2);text-align:left",
                  )}
                >
                  <span
                    style={css(
                      "width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;" +
                        `font:600 10px ${MONO};background:var(--accent-soft);color:var(--accent)`,
                    )}
                  >
                    {x.sigla}
                  </span>
                  <span style={css(`font:600 12.5px/1.3 ${SANS};color:var(--text)`)}>{x.nome}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            style={css(
              "padding:16px;border:1px dashed var(--border2);border-radius:14px;background:var(--surface2)",
            )}
          >
            <div style={css(`font:600 12.5px/1.3 ${SANS};color:var(--text2)`)}>
              Este cliente tem {Object.keys(MODULOS).filter((m) => tem(m as ModuloKey)).length} módulos
              ativos
            </div>
            <p style={css(`margin:6px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
              O dashboard e o menu montam-se sozinhos: quem não tem Estoque ou Caixa não vê esses cards
              nem esses itens. Troque o perfil demo acima para comparar.
            </p>
          </div>
        </div>
      </div>

      <div style={css(`margin-top:12px;padding:18px;${PAINEL}`)}>
        <div
          style={css(
            "display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px",
          )}
        >
          <div>
            <h2 style={css(`margin:0 0 4px;font:600 15px/1.2 ${SANS}`)}>Últimas vendas de hoje</h2>
            <p style={css(`margin:0;font:400 12px ${SANS};color:var(--muted)`)}>
              Registro em tempo real do balcão.
            </p>
          </div>
          <button
            onClick={() => a.irPara(ROTAS.vendas)}
            className="hv-acc-borda"
            style={css(
              `padding:8px 14px;border-radius:9px;border:1px solid var(--border);background:var(--surface2);color:var(--accent);font:600 12.5px ${SANS}`,
            )}
          >
            Ver todas
          </button>
        </div>

        {ultimas.length === 0 ? (
          <div
            style={css(
              `padding:30px 18px;border:1px dashed var(--border2);border-radius:12px;background:var(--surface2);text-align:center;font:500 13px/1.5 ${SANS};color:var(--muted)`,
            )}
          >
            Nenhuma venda registrada hoje ainda.
          </div>
        ) : (
          <div
            style={css(
              "display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden",
            )}
          >
            {ultimas.map((v) => (
              <div
                key={v.id}
                style={css("display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface)")}
              >
                <span style={css(`flex:none;font:600 11.5px ${MONO};color:var(--muted);${NUM}`)}>
                  {v.hora}
                </span>
                <span
                  style={css(
                    `flex:1;min-width:0;font:500 13px ${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` +
                      (v.estornada ? "text-decoration:line-through;color:var(--muted)" : ""),
                  )}
                >
                  {v.itens.map((i) => (i.qtd > 1 ? `${i.qtd}× ${i.nome}` : i.nome)).join(", ")}
                </span>
                {!isMobile && (
                  <span
                    style={css(
                      `flex:none;padding:3px 9px;border-radius:999px;background:var(--surface3);color:var(--text2);font:600 11px ${SANS}`,
                    )}
                  >
                    {v.pag}
                  </span>
                )}
                <span
                  style={css(
                    `flex:none;font:700 13.5px ${SANS};${NUM};` +
                      (v.estornada ? "text-decoration:line-through;color:var(--muted)" : ""),
                  )}
                >
                  {brl(totalV(v))}
                </span>
              </div>
            ))}
          </div>
        )}
        <p style={css(`margin:10px 0 0;font:500 11.5px ${SANS};color:var(--muted)`)}>
          Última movimentação: {ultimas[0] ? rotuloData(0, ultimas[0].hora) : "—"}
        </p>
      </div>
    </div>
  );
}
