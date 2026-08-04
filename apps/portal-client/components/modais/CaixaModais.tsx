"use client";

import { ModalBase } from "@/components/modais/Base";
import { CampoDinheiro, CampoRotulado, css, MONO, NUM, RodapeModal, SANS, Sugestoes } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import {
  MOTIVOS_REFORCO,
  MOTIVOS_SANGRIA,
  MOV_CAIXA_ESTILO,
  saldoMovs,
  somaFormas,
  TROCOS_RAPIDOS,
} from "@/lib/dados/caixa";
import { FORMAS, NOTA_FORMA } from "@/lib/dados/vendas";
import { brl, brlDif, corDif, numBR, rotuloData } from "@/lib/formato";
import { dinheiroNaGaveta, esperadoDoTurno, vendasDoTurno } from "@/lib/selectors";
import type { CaixaFechado } from "@/types/types";

/* -------------------------------------------------------------------------- */
/* Abrir o caixa                                                               */
/* -------------------------------------------------------------------------- */

export function CaixaAbrirModal() {
  const { s, a } = usePortal();
  const f = s.formCaixa;

  return (
    <ModalBase
      titulo="Abrir o caixa"
      subtitulo="Quanto tem de troco na gaveta agora? É com esse valor que o turno começa."
      largura={400}
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={a.abrirCaixa}
          textoConfirmar="Abrir caixa"
        />
      }
    >
      <div>
        <CampoDinheiro
          label="Valor inicial (troco)"
          valor={f.valor}
          onMudar={(v) => a.set({ formCaixa: { ...f, valor: v } })}
          grande
        />
        <Sugestoes
          itens={TROCOS_RAPIDOS.map((v) => brl(v))}
          onEscolher={(v) => a.set({ formCaixa: { ...f, valor: v.replace("R$ ", "") } })}
        />
      </div>
    </ModalBase>
  );
}

/* -------------------------------------------------------------------------- */
/* Sangria e reforço                                                           */
/* -------------------------------------------------------------------------- */

export function CaixaMovModal({ tipo }: { tipo: "sangria" | "reforco" }) {
  const { s, a, d } = usePortal();
  const f = s.formCaixa;
  const estilo = MOV_CAIXA_ESTILO[tipo];
  const naGaveta = dinheiroNaGaveta(d);
  const valor = numBR(f.valor);

  const sangriaAlta = tipo === "sangria" && valor > naGaveta;

  return (
    <ModalBase
      titulo={tipo === "sangria" ? "Fazer uma sangria" : "Fazer um reforço"}
      subtitulo={
        tipo === "sangria"
          ? "Dinheiro que sai da gaveta sem ser troco de venda — para o cofre, o banco ou um fornecedor."
          : "Dinheiro que entra na gaveta sem ser venda — troco extra para o turno."
      }
      largura={410}
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={a.registrarMovCaixa}
          textoConfirmar={tipo === "sangria" ? "Registrar sangria" : "Registrar reforço"}
          corConfirmar={estilo.cor}
          corTexto="#fff"
        />
      }
    >
      <CampoDinheiro
        label="Valor"
        valor={f.valor}
        onMudar={(v) => a.set({ formCaixa: { ...f, valor: v } })}
        grande
        nota={
          sangriaAlta
            ? `A gaveta tem ${brl(naGaveta)} — a retirada é maior do que isso.`
            : `Há ${brl(naGaveta)} em dinheiro na gaveta.`
        }
        notaCor={sangriaAlta ? "var(--warn)" : "var(--muted)"}
      />

      <div>
        <CampoRotulado
          label="Motivo"
          valor={f.motivo}
          onMudar={(v) => a.set({ formCaixa: { ...f, motivo: v } })}
          placeholder={tipo === "sangria" ? "Ex.: retirada para o cofre" : "Ex.: troco extra do cofre"}
        />
        <Sugestoes
          itens={tipo === "sangria" ? MOTIVOS_SANGRIA : MOTIVOS_REFORCO}
          onEscolher={(v) => a.set({ formCaixa: { ...f, motivo: v } })}
        />
      </div>

      <p style={css(`margin:0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
        A movimentação entra na conferência do fechamento — o esperado em dinheiro já sai ajustado.
      </p>
    </ModalBase>
  );
}

/* -------------------------------------------------------------------------- */
/* Conferência e fechamento                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A conferência do fechamento.
 *
 * Só o dinheiro é digitado: é o único que fica numa gaveta para ser contado.
 * Pix e cartão caem na conta e aparecem aqui como referência do que deve estar
 * no extrato — pedir para "conferir" um Pix seria pedir um número que a pessoa
 * não tem como checar no balcão.
 *
 * Quem calcula o esperado e a diferença de verdade é `close_cash_register`, no
 * banco. O número mostrado aqui é a mesma conta, adiantada, para a pessoa
 * enxergar a diferença antes de confirmar.
 */
export function CaixaFecharModal() {
  const { s, a, d } = usePortal();
  const cx = d.caixaAberto;
  const f = s.formCaixa;
  if (!cx) return null;

  const esperado = esperadoDoTurno(d);
  const vendas = vendasDoTurno(d);

  const contado = numBR(f.contadoDinheiro);
  const preenchido = f.contadoDinheiro.trim() !== "";
  const dif = preenchido ? contado - esperado.Dinheiro : 0;
  const estilo = corDif(dif);

  return (
    <ModalBase
      titulo="Conferência do caixa"
      subtitulo={`Turno aberto às ${cx.abertura} · conte o dinheiro da gaveta`}
      largura={520}
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={() =>
            a.confirmar({
              titulo: "Fechar o caixa?",
              texto: "O turno é encerrado e a conferência fica guardada no histórico.",
              resumo: !preenchido
                ? "Sem contagem informada"
                : Math.abs(dif) < 0.005
                  ? "O dinheiro bateu certinho"
                  : `${dif > 0 ? "Sobra" : "Falta"} de ${brl(Math.abs(dif))}`,
              sub: `Aberto às ${cx.abertura} · ${brl(somaFormas(vendas))} vendidos no turno`,
              reversao: "Se fechar por engano, dá para reabrir pelo histórico de turnos.",
              btn: "Fechar caixa",
              btnBg: "var(--warn)",
              btnFg: "#fff",
              cor: "var(--warn)",
              acao: a.fecharCaixa,
            })
          }
          textoCancelar="Continuar aberto"
          textoConfirmar="Fechar caixa"
          corConfirmar="var(--warn)"
          corTexto="#fff"
        />
      }
    >
      {/* O que é contado */}
      <div
        style={css(
          "padding:14px;border:1.5px solid var(--border2);border-radius:12px;background:var(--surface2)",
        )}
      >
        <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
          <span style={css(`font:700 14px ${SANS}`)}>Dinheiro na gaveta</span>
          <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>
            troco + vendas em espécie ± movimentações
          </span>
        </div>

        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:9px;align-items:end;margin-top:12px")}>
          <div>
            <div
              style={css(
                `font:600 10px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:var(--muted)`,
              )}
            >
              Esperado
            </div>
            <div
              style={css(
                `margin-top:5px;padding:12px;border-radius:10px;background:var(--surface3);font:700 16px ${SANS};${NUM};color:var(--text2)`,
              )}
            >
              {brl(esperado.Dinheiro)}
            </div>
          </div>

          <div>
            <div
              style={css(
                `font:600 10px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:var(--muted)`,
              )}
            >
              Contado por você
            </div>
            <div
              style={css(
                `display:flex;align-items:center;gap:6px;margin-top:5px;padding:0 12px;border:1.5px solid ${preenchido ? "var(--accent)" : "var(--border2)"};border-radius:10px;background:var(--surface)`,
              )}
            >
              <span style={css(`font:600 13px ${SANS};color:var(--muted)`)}>R$</span>
              <input
                value={f.contadoDinheiro}
                onChange={(e) => a.set({ formCaixa: { ...f, contadoDinheiro: e.target.value } })}
                placeholder="0,00"
                inputMode="decimal"
                autoFocus
                style={css(
                  `flex:1;min-width:0;padding:12px 0;border:0;background:none;font:700 16px ${SANS};${NUM};color:var(--text);outline:none`,
                )}
              />
            </div>
          </div>
        </div>

        <div
          style={css(
            `display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:12px;padding:11px 13px;border-radius:10px;background:${estilo.bg}`,
          )}
        >
          <span style={css(`font:700 13px ${SANS};color:${estilo.cor}`)}>Diferença</span>
          <span style={css(`font:700 19px/1 ${SANS};${NUM};color:${estilo.cor}`)}>
            {preenchido ? brlDif(dif) : "—"}
          </span>
        </div>

        <p style={css(`margin:8px 0 0;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
          {!preenchido
            ? "Conte o que está na gaveta e digite acima."
            : Math.abs(dif) < 0.005
              ? "Tudo conferido. Pode fechar tranquilo."
              : dif > 0
                ? "Sobrou dinheiro. Costuma ser troco não lançado ou uma venda registrada a menos."
                : "Faltou dinheiro. Confira a gaveta de novo e as sangrias do turno."}
        </p>
      </div>

      {/* O que não é contado aqui */}
      <div>
        <div
          style={css(
            `margin-bottom:8px;font:600 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--muted)`,
          )}
        >
          Confira no extrato
        </div>
        <div style={css("display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden")}>
          {FORMAS.filter((x) => x !== "Dinheiro").map((forma) => (
            <div
              key={forma}
              style={css(
                "display:flex;align-items:center;gap:10px;padding:11px 13px;background:var(--surface)",
              )}
            >
              <span style={css("flex:1;min-width:0")}>
                <span style={css(`display:block;font:600 12.5px ${SANS}`)}>{forma}</span>
                <span style={css(`display:block;margin-top:2px;font:500 11px ${SANS};color:var(--muted)`)}>
                  {NOTA_FORMA[forma]}
                </span>
              </span>
              <span style={css(`flex:none;font:700 13.5px ${SANS};${NUM};color:var(--text2)`)}>
                {brl(vendas[forma] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <CampoRotulado
        label="Observação (opcional)"
        valor={f.obs}
        onMudar={(v) => a.set({ formCaixa: { ...f, obs: v } })}
        placeholder="Ex.: faltou troco de R$ 5 na gaveta"
      />
    </ModalBase>
  );
}

/* -------------------------------------------------------------------------- */
/* Resumo de um turno já fechado                                               */
/* -------------------------------------------------------------------------- */

export function CaixaDetalheModal({ caixa }: { caixa: CaixaFechado }) {
  const { a } = usePortal();
  const estilo = corDif(caixa.diferenca);

  return (
    <ModalBase
      titulo="Resumo do turno"
      subtitulo={`${rotuloData(caixa.d, "")} · ${caixa.abertura} às ${caixa.fechamento} · ${caixa.operador}`}
      largura={460}
      onFechar={a.fecharModal}
      rodape={
        <div
          style={css(
            "display:flex;gap:10px;padding:14px 18px;border-top:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <button
            onClick={a.fecharModal}
            style={css(
              `flex:1;padding:13px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13.5px ${SANS}`,
            )}
          >
            Fechar
          </button>
          <button
            onClick={() =>
              a.confirmar({
                titulo: "Reabrir este caixa?",
                texto: "O turno volta a ficar aberto e aceita novas vendas e movimentações.",
                resumo: `Turno de ${rotuloData(caixa.d, "")}`,
                sub: `${caixa.abertura} às ${caixa.fechamento} · ${caixa.operador}`,
                reversao: "Você pode fechar de novo a qualquer momento.",
                btn: "Reabrir caixa",
                btnBg: "var(--warn)",
                btnFg: "#fff",
                cor: "var(--warn)",
                acao: () => a.reabrirCaixa(caixa.id),
              })
            }
            className="hv-brilho"
            style={css(
              `flex:1;padding:13px;border-radius:11px;background:var(--warn);color:#fff;font:700 13.5px ${SANS}`,
            )}
          >
            Reabrir caixa
          </button>
        </div>
      }
    >
      <div
        style={css(
          "display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden",
        )}
      >
        {[
          { nome: "Troco inicial", valor: caixa.inicial, nota: "Com o que o turno começou" },
          {
            nome: "Vendas em dinheiro",
            valor: caixa.vendas.Dinheiro ?? 0,
            nota: "Entraram na gaveta",
          },
          {
            nome: "Movimentações",
            valor: saldoMovs(caixa.movs),
            nota: `${caixa.movs.length} no turno`,
          },
        ].map((l) => (
          <div
            key={l.nome}
            style={css("display:flex;align-items:center;gap:12px;padding:12px 13px;background:var(--surface)")}
          >
            <span style={css("flex:1;min-width:0")}>
              <span style={css(`display:block;font:600 12.5px ${SANS}`)}>{l.nome}</span>
              <span style={css(`display:block;margin-top:2px;font:500 11px ${SANS};color:var(--muted)`)}>
                {l.nota}
              </span>
            </span>
            <span style={css(`flex:none;font:700 13.5px ${SANS};${NUM}`)}>{brl(l.valor)}</span>
          </div>
        ))}
      </div>

      <div
        style={css("display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden")}
      >
        {[
          { nome: "Esperado na gaveta", valor: caixa.esperadoDinheiro, forte: false },
          { nome: "Contado no fechamento", valor: caixa.contadoDinheiro, forte: true },
        ].map((l) => (
          <div
            key={l.nome}
            style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;background:var(--surface)")}
          >
            <span style={css(`font:${l.forte ? "700" : "500"} 12.5px ${SANS};color:var(--text2)`)}>
              {l.nome}
            </span>
            <span style={css(`font:${l.forte ? "700" : "600"} 13.5px ${SANS};${NUM}`)}>
              {brl(l.valor)}
            </span>
          </div>
        ))}
      </div>

      {caixa.movs.length > 0 && (
        <div>
          <div
            style={css(
              `margin-bottom:7px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
            )}
          >
            Movimentações
          </div>
          {caixa.movs.map((m) => {
            const e = MOV_CAIXA_ESTILO[m.tipo];
            return (
              <div
                key={m.id}
                style={css("display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border)")}
              >
                <span
                  style={css(
                    `flex:none;padding:3px 8px;border-radius:999px;background:${e.bg};color:${e.cor};font:600 10.5px ${SANS}`,
                  )}
                >
                  {e.rotulo}
                </span>
                <span
                  style={css(
                    `flex:1;min-width:0;font:500 12px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                  )}
                >
                  {m.motivo}
                </span>
                <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM};color:${e.cor}`)}>
                  {m.tipo === "reforco" ? "+ " : "− "}
                  {brl(m.valor)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {caixa.obs && (
        <div
          style={css(
            `padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font:500 12.5px/1.45 ${SANS}`,
          )}
        >
          {caixa.obs}
        </div>
      )}

      <div
        style={css(
          "display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-top:10px;border-top:1px solid var(--border)",
        )}
      >
        <span style={css(`font:600 13px ${SANS};color:var(--text2)`)}>Diferença do turno</span>
        <span style={css(`font:700 22px/1 ${SANS};${NUM};color:${estilo.cor}`)}>
          {brlDif(caixa.diferenca)}
        </span>
      </div>
    </ModalBase>
  );
}
