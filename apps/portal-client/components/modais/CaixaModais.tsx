"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, MoneyField, LabeledField, css, MONO, NUM, ModalFooter, SANS, Suggestions } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import {
  DEPOSIT_REASONS,
  WITHDRAWAL_REASONS,
  REGISTER_MOVEMENT_STYLE,
  movementsBalance,
  sumByMethod,
  QUICK_CHANGE,
} from "@/lib/dados/caixa";
import { METHODS, METHOD_NOTE } from "@/lib/dados/vendas";
import { brl, brlDelta, deltaColor, parseBrNumber, dateLabel } from "@/lib/formato";
import { cashInDrawer, expectedInShift, salesInShift } from "@/lib/selectors";
import type { ClosedRegister } from "@/types/types";

/* -------------------------------------------------------------------------- */
/* Abrir o caixa                                                               */
/* -------------------------------------------------------------------------- */

export function CaixaAbrirModal() {
  const { s, a } = usePortal();
  const f = s.registerForm;

  return (
    <ModalFrame
      closeLabel="Fechar"
      title="Abrir o caixa"
      subtitle="Quanto tem de troco na gaveta agora? É com esse valor que o turno começa."
      width={400}
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.openRegister}
          confirmText="Abrir caixa"
        />
      }
    >
      <div>
        <MoneyField
          label="Valor inicial (troco)"
          value={f.amount}
          onChange={(v) => a.set({ registerForm: { ...f, amount: v } })}
          large
        />
        <Suggestions
          items={QUICK_CHANGE.map((v) => brl(v))}
          onPick={(v) => a.set({ registerForm: { ...f, amount: v.replace("R$ ", "") } })}
        />
      </div>
    </ModalFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Sangria e reforço                                                           */
/* -------------------------------------------------------------------------- */

export function CaixaMovModal({ type }: { type: "withdrawal" | "deposit" }) {
  const { s, a, d } = usePortal();
  const f = s.registerForm;
  const cssText = REGISTER_MOVEMENT_STYLE[type];
  const inDrawer = cashInDrawer(d);
  const amount = parseBrNumber(f.amount);

  const largeWithdrawal = type === "withdrawal" && amount > inDrawer;

  return (
    <ModalFrame
      closeLabel="Fechar"
      title={type === "withdrawal" ? "Fazer uma sangria" : "Fazer um reforço"}
      subtitle={
        type === "withdrawal"
          ? "Dinheiro que sai da gaveta sem ser troco de venda — para o cofre, o banco ou um fornecedor."
          : "Dinheiro que entra na gaveta sem ser venda — troco extra para o turno."
      }
      width={410}
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.recordRegisterMovement}
          confirmText={type === "withdrawal" ? "Registrar sangria" : "Registrar reforço"}
          confirmColor={cssText.color}
          confirmInk="#fff"
        />
      }
    >
      <MoneyField
        label="Valor"
        value={f.amount}
        onChange={(v) => a.set({ registerForm: { ...f, amount: v } })}
        large
        note={
          largeWithdrawal
            ? `A gaveta tem ${brl(inDrawer)} — a retirada é maior do que isso.`
            : `Há ${brl(inDrawer)} em dinheiro na gaveta.`
        }
        noteColor={largeWithdrawal ? "var(--warn)" : "var(--muted)"}
      />

      <div>
        <LabeledField
          label="Motivo"
          value={f.reason}
          onChange={(v) => a.set({ registerForm: { ...f, reason: v } })}
          placeholder={type === "withdrawal" ? "Ex.: retirada para o cofre" : "Ex.: troco extra do cofre"}
        />
        <Suggestions
          items={type === "withdrawal" ? WITHDRAWAL_REASONS : DEPOSIT_REASONS}
          onPick={(v) => a.set({ registerForm: { ...f, reason: v } })}
        />
      </div>

      <p style={css(`margin:0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
        A movimentação entra na conferência do fechamento — o esperado em dinheiro já sai ajustado.
      </p>
    </ModalFrame>
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
  const cx = d.openRegister;
  const f = s.registerForm;
  if (!cx) return null;

  const expected = expectedInShift(d);
  const sales = salesInShift(d);

  const counted = parseBrNumber(f.countedCash);
  const filled = f.countedCash.trim() !== "";
  const delta = filled ? counted - expected.cash : 0;
  const cssText = deltaColor(delta);

  return (
    <ModalFrame
      closeLabel="Fechar"
      title="Conferência do caixa"
      subtitle={`Turno aberto às ${cx.openedAt} · conte o dinheiro da gaveta`}
      width={520}
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={() =>
            a.confirm({
              title: "Fechar o caixa?",
              text: "O turno é encerrado e a conferência fica guardada no histórico.",
              summary: !filled
                ? "Sem contagem informada"
                : Math.abs(delta) < 0.005
                  ? "O dinheiro bateu certinho"
                  : `${delta > 0 ? "Sobra" : "Falta"} de ${brl(Math.abs(delta))}`,
              detail: `Aberto às ${cx.openedAt} · ${brl(sumByMethod(sales))} vendidos no turno`,
              reversal: "Se fechar por engano, dá para reabrir pelo histórico de turnos.",
              button: "Fechar caixa",
              buttonBg: "var(--warn)",
              buttonInk: "#fff",
              color: "var(--warn)",
              action: a.closeRegister,
            })
          }
          confirmText="Fechar caixa"
          confirmColor="var(--warn)"
          confirmInk="#fff"
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
          <span style={css(`font:700 14px ${SANS}`)}>cash na gaveta</span>
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
              {brl(expected.cash)}
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
                `display:flex;align-items:center;gap:6px;margin-top:5px;padding:0 12px;border:1.5px solid ${filled ? "var(--accent)" : "var(--border2)"};border-radius:10px;background:var(--surface)`,
              )}
            >
              <span style={css(`font:600 13px ${SANS};color:var(--muted)`)}>R$</span>
              <input
                value={f.countedCash}
                onChange={(e) => a.set({ registerForm: { ...f, countedCash: e.target.value } })}
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
            `display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:12px;padding:11px 13px;border-radius:10px;background:${cssText.bg}`,
          )}
        >
          <span style={css(`font:700 13px ${SANS};color:${cssText.color}`)}>Diferença</span>
          <span style={css(`font:700 19px/1 ${SANS};${NUM};color:${cssText.color}`)}>
            {filled ? brlDelta(delta) : "—"}
          </span>
        </div>

        <p style={css(`margin:8px 0 0;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
          {!filled
            ? "Conte o que está na gaveta e digite acima."
            : Math.abs(delta) < 0.005
              ? "Tudo conferido. Pode fechar tranquilo."
              : delta > 0
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
          {METHODS.filter((x) => x !== "cash").map((forma) => (
            <div
              key={forma}
              style={css(
                "display:flex;align-items:center;gap:10px;padding:11px 13px;background:var(--surface)",
              )}
            >
              <span style={css("flex:1;min-width:0")}>
                <span style={css(`display:block;font:600 12.5px ${SANS}`)}>{forma}</span>
                <span style={css(`display:block;margin-top:2px;font:500 11px ${SANS};color:var(--muted)`)}>
                  {METHOD_NOTE[forma]}
                </span>
              </span>
              <span style={css(`flex:none;font:700 13.5px ${SANS};${NUM};color:var(--text2)`)}>
                {brl(sales[forma] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <LabeledField
        label="Observação (opcional)"
        value={f.obs}
        onChange={(v) => a.set({ registerForm: { ...f, obs: v } })}
        placeholder="Ex.: faltou troco de R$ 5 na gaveta"
      />
    </ModalFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Resumo de um turno já fechado                                               */
/* -------------------------------------------------------------------------- */

export function CaixaDetalheModal({ register }: { register: ClosedRegister }) {
  const { a } = usePortal();
  const cssText = deltaColor(register.difference);

  return (
    <ModalFrame
      closeLabel="Fechar"
      title="Resumo do turno"
      subtitle={`${dateLabel(register.d, "")} · ${register.openedAt} às ${register.closedAt} · ${register.operator}`}
      width={460}
      onClose={a.closeModal}
      footer={
        <div
          style={css(
            "display:flex;gap:10px;padding:14px 18px;border-top:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <Button
            onClick={a.closeModal}
            style={css(
              `flex:1;padding:13px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13.5px ${SANS}`,
            )}
          >
            Fechar
          </Button>
          <Button
            onClick={() =>
              a.confirm({
                title: "Reabrir este caixa?",
                text: "O turno volta a ficar aberto e aceita novas vendas e movimentações.",
                summary: `Turno de ${dateLabel(register.d, "")}`,
                detail: `${register.openedAt} às ${register.closedAt} · ${register.operator}`,
                reversal: "Você pode fechar de novo a qualquer momento.",
                button: "Reabrir caixa",
                buttonBg: "var(--warn)",
                buttonInk: "#fff",
                color: "var(--warn)",
                action: () => a.reopenRegister(register.id),
              })
            }
            className="hv-brilho"
            style={css(
              `flex:1;padding:13px;border-radius:11px;background:var(--warn);color:#fff;font:700 13.5px ${SANS}`,
            )}
          >
            Reabrir caixa
          </Button>
        </div>
      }
    >
      <div
        style={css(
          "display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden",
        )}
      >
        {[
          { name: "Troco inicial", amount: register.opening, note: "Com o que o turno começou" },
          {
            name: "Vendas em dinheiro",
            amount: register.sales.cash ?? 0,
            note: "Entraram na gaveta",
          },
          {
            name: "Movimentações",
            amount: movementsBalance(register.movements),
            note: `${register.movements.length} no turno`,
          },
        ].map((l) => (
          <div
            key={l.name}
            style={css("display:flex;align-items:center;gap:12px;padding:12px 13px;background:var(--surface)")}
          >
            <span style={css("flex:1;min-width:0")}>
              <span style={css(`display:block;font:600 12.5px ${SANS}`)}>{l.name}</span>
              <span style={css(`display:block;margin-top:2px;font:500 11px ${SANS};color:var(--muted)`)}>
                {l.note}
              </span>
            </span>
            <span style={css(`flex:none;font:700 13.5px ${SANS};${NUM}`)}>{brl(l.amount)}</span>
          </div>
        ))}
      </div>

      <div
        style={css("display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:11px;overflow:hidden")}
      >
        {[
          { name: "Esperado na gaveta", amount: register.expectedCash, forte: false },
          { name: "Contado no fechamento", amount: register.countedCash, forte: true },
        ].map((l) => (
          <div
            key={l.name}
            style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;background:var(--surface)")}
          >
            <span style={css(`font:${l.forte ? "700" : "500"} 12.5px ${SANS};color:var(--text2)`)}>
              {l.name}
            </span>
            <span style={css(`font:${l.forte ? "700" : "600"} 13.5px ${SANS};${NUM}`)}>
              {brl(l.amount)}
            </span>
          </div>
        ))}
      </div>

      {register.movements.length > 0 && (
        <div>
          <div
            style={css(
              `margin-bottom:7px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
            )}
          >
            Movimentações
          </div>
          {register.movements.map((m) => {
            const e = REGISTER_MOVEMENT_STYLE[m.type];
            return (
              <div
                key={m.id}
                style={css("display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border)")}
              >
                <span
                  style={css(
                    `flex:none;padding:3px 8px;border-radius:999px;background:${e.bg};color:${e.color};font:600 10.5px ${SANS}`,
                  )}
                >
                  {e.label}
                </span>
                <span
                  style={css(
                    `flex:1;min-width:0;font:500 12px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                  )}
                >
                  {m.reason}
                </span>
                <span style={css(`flex:none;font:700 12.5px ${SANS};${NUM};color:${e.color}`)}>
                  {m.type === "deposit" ? "+ " : "− "}
                  {brl(m.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {register.obs && (
        <div
          style={css(
            `padding:11px 13px;border-radius:11px;background:var(--warn-soft);color:var(--warn);font:500 12.5px/1.45 ${SANS}`,
          )}
        >
          {register.obs}
        </div>
      )}

      <div
        style={css(
          "display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-top:10px;border-top:1px solid var(--border)",
        )}
      >
        <span style={css(`font:600 13px ${SANS};color:var(--text2)`)}>Diferença do turno</span>
        <span style={css(`font:700 22px/1 ${SANS};${NUM};color:${cssText.color}`)}>
          {brlDelta(register.difference)}
        </span>
      </div>
    </ModalFrame>
  );
}
