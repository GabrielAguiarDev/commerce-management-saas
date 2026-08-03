"use client";

import { ModalBase, RodapeModal } from "@/components/modais/Base";
import { usePortal } from "@/components/PortalProvider";
import { Campo, CampoDinheiro, Sugestoes } from "@/components/ui";
import { css, MONO, SANS } from "@/lib/css";
import {
  esperadoCx,
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
import { NUM } from "@/lib/styleKit";
import type { CaixaFechado, FormaPagamento } from "@/types/types";

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
  const { s, a } = usePortal();
  const f = s.formCaixa;
  const estilo = MOV_CAIXA_ESTILO[tipo];
  const naGaveta = dinheiroNaGaveta(s);
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
        <Campo
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

export function CaixaFecharModal() {
  const { s, a, isMobile } = usePortal();
  const cx = s.caixaAberto;
  const f = s.formCaixa;
  if (!cx) return null;

  const esperado = esperadoDoTurno(s);

  const contadoDe = (forma: FormaPagamento) => numBR(f.contado[forma] ?? "");
  const difDe = (forma: FormaPagamento) => contadoDe(forma) - esperado[forma];

  const difTotal = FORMAS.reduce((x, forma) => x + difDe(forma), 0);
  const estiloTotal = corDif(difTotal);

  const cols = isMobile ? "1fr" : "1fr 1fr 1fr";

  return (
    <ModalBase
      titulo="Conferência do caixa"
      subtitulo={`Turno aberto às ${cx.abertura} · confira cada forma de pagamento`}
      largura={540}
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={() =>
            a.confirmar({
              titulo: "Fechar o caixa?",
              texto: "O turno é encerrado e os valores conferidos ficam guardados no histórico.",
              resumo:
                Math.abs(difTotal) < 0.005
                  ? "Os valores bateram certinho"
                  : `${difTotal > 0 ? "Sobra" : "Falta"} de ${brl(Math.abs(difTotal))}`,
              sub: `Aberto às ${cx.abertura} · ${brl(somaFormas(vendasDoTurno(s)))} vendidos`,
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
      {FORMAS.map((forma) => {
        const dif = difDe(forma);
        const estilo = corDif(dif);
        const preenchido = (f.contado[forma] ?? "").trim() !== "";

        return (
          <div
            key={forma}
            style={css("padding:13px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)")}
          >
            <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
              <span style={css(`font:700 13.5px ${SANS}`)}>{forma}</span>
              <span style={css(`font:500 11.5px ${SANS};color:var(--muted)`)}>{NOTA_FORMA[forma]}</span>
            </div>

            <div
              style={css(`display:grid;grid-template-columns:${cols};gap:9px;align-items:end;margin-top:10px`)}
            >
              <div>
                <div style={css(`font:600 10px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:var(--muted)`)}>
                  Esperado
                </div>
                <div
                  style={css(
                    `margin-top:5px;padding:11px 12px;border-radius:10px;background:var(--surface3);font:700 14.5px ${SANS};${NUM};color:var(--text2)`,
                  )}
                >
                  {brl(esperado[forma])}
                </div>
              </div>

              <div>
                <div style={css(`font:600 10px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:var(--muted)`)}>
                  {forma === "Dinheiro" ? "Contado na gaveta" : "Conferido"}
                </div>
                <div
                  style={css(
                    `display:flex;align-items:center;gap:6px;margin-top:5px;padding:0 12px;border:1.5px solid ${preenchido ? "var(--accent)" : "var(--border2)"};border-radius:10px;background:var(--surface)`,
                  )}
                >
                  <span style={css(`font:600 12.5px ${SANS};color:var(--muted)`)}>R$</span>
                  <input
                    value={f.contado[forma] ?? ""}
                    onChange={(e) =>
                      a.set({ formCaixa: { ...f, contado: { ...f.contado, [forma]: e.target.value } } })
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                    style={css(
                      `flex:1;min-width:0;padding:11px 0;border:0;background:none;font:700 14.5px ${SANS};${NUM};color:var(--text);outline:none`,
                    )}
                  />
                </div>
              </div>

              <div>
                <div style={css(`font:600 10px ${MONO};letter-spacing:.08em;text-transform:uppercase;color:var(--muted)`)}>
                  Diferença
                </div>
                <div
                  style={css(
                    `margin-top:5px;padding:11px 12px;border-radius:10px;background:${estilo.bg};font:700 14.5px ${SANS};${NUM};color:${estilo.cor}`,
                  )}
                >
                  {brlDif(dif)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={css(
          `padding:14px;border:1px solid ${estiloTotal.cor};border-radius:12px;background:${estiloTotal.bg}`,
        )}
      >
        <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px")}>
          <span style={css(`font:700 14px ${SANS};color:${estiloTotal.cor}`)}>Diferença total</span>
          <span style={css(`font:700 21px/1 ${SANS};${NUM};color:${estiloTotal.cor}`)}>
            {brlDif(difTotal)}
          </span>
        </div>
        <p style={css(`margin:6px 0 0;font:500 12px/1.45 ${SANS};color:${estiloTotal.cor}`)}>
          {Math.abs(difTotal) < 0.005
            ? "Tudo conferido. Pode fechar tranquilo."
            : difTotal > 0
              ? "Sobrou dinheiro. Costuma ser troco não lançado ou uma venda registrada a menos."
              : "Faltou dinheiro. Confira a gaveta de novo e as sangrias do turno."}
        </p>
      </div>

      <Campo
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
  const esperado = esperadoCx(caixa);
  const dif = FORMAS.reduce((x, f) => x + ((caixa.contado[f] ?? 0) - esperado[f]), 0);
  const estilo = corDif(dif);

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
      {FORMAS.map((f) => {
        const d = (caixa.contado[f] ?? 0) - esperado[f];
        const e = corDif(d);
        return (
          <div
            key={f}
            style={css(
              "display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid var(--border);border-radius:11px;background:var(--surface2)",
            )}
          >
            <span style={css("flex:1;min-width:0")}>
              <span style={css(`display:block;font:600 13px ${SANS}`)}>{f}</span>
              <span style={css(`display:block;margin-top:2px;font:500 11.5px ${SANS};color:var(--muted)`)}>
                esperado {brl(esperado[f])}
              </span>
            </span>
            <span style={css("flex:none;text-align:right")}>
              <span style={css(`display:block;font:700 13.5px ${SANS};${NUM}`)}>
                {brl(caixa.contado[f] ?? 0)}
              </span>
              <span style={css(`display:block;margin-top:2px;font:600 11px ${SANS};${NUM};color:${e.cor}`)}>
                {brlDif(d)}
              </span>
            </span>
          </div>
        );
      })}

      {caixa.movs.length > 0 && (
        <div style={css("margin-top:4px")}>
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
          <div style={css(`margin-top:7px;font:500 11.5px ${SANS};color:var(--muted)`)}>
            Saldo das movimentações: {brlDif(saldoMovs(caixa.movs))}
          </div>
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
        <span style={css(`font:700 22px/1 ${SANS};${NUM};color:${estilo.cor}`)}>{brlDif(dif)}</span>
      </div>
    </ModalBase>
  );
}
