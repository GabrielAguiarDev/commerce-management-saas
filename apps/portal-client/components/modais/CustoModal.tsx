"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, field, MoneyField, LabeledField, css, ChoiceCard, ChoicePill, ModalFooter, FIELD_LABEL, SANS, SimpleSelect, Suggestions, track } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { costCategories, COST_SUGGESTIONS } from "@/lib/dados/custos";
import { parseBrNumber, dateLabel } from "@/lib/formato";

/** As últimas datas que fazem sentido para um lançamento manual. */
const DAYS = [0, 1, 2, 3, 4, 5, 6, 7];

export function CustoModal() {
  const { s, a, isMobile, d } = usePortal();
  const f = s.costForm;
  const editing = f.id != null;

  const descriptionError = f.submitted && !f.description.trim();
  const amountError = f.submitted && parseBrNumber(f.amount) <= 0;

  const set = (p: Partial<typeof f>) => a.set({ costForm: { ...f, ...p } });

  const labels = DAYS.map((d) => dateLabel(d, ""));
  const cols = isMobile ? "1fr" : "1fr 1fr";

  return (
    <ModalFrame
      closeLabel="Fechar"
      title={editing ? "Editar custo" : "Registrar custo"}
      subtitle="Anote o gasto para o portal calcular seu lucro de verdade."
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.saveCost}
          confirmText={editing ? "Salvar alterações" : "Registrar custo"}
        />
      }
    >
      <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:8px")}>
        <ChoiceCard
          name="Variável"
          note="Muda todo mês: mercadoria, feira, combustível."
          active={f.type === "variable"}
          onClick={() => set({ type: "variable" })}
        />
        <ChoiceCard
          name="Fixo"
          note="Repete igual: aluguel, luz, internet, salário."
          active={f.type === "fixed"}
          onClick={() => set({ type: "fixed" })}
        />
      </div>

      <div>
        <LabeledField
          label="O que foi o gasto"
          value={f.description}
          onChange={(v) => set({ description: v })}
          placeholder="Ex.: compra de mercadoria"
          error={descriptionError}
          message="Escreva o que foi o gasto."
        />
        <Suggestions items={COST_SUGGESTIONS} onPick={(v) => set({ description: v })} />
      </div>

      <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
        <MoneyField
          label="Valor"
          value={f.amount}
          onChange={(v) => set({ amount: v })}
          error={amountError}
          message="Informe um valor maior que zero."
        />
        <div>
          <label style={css(FIELD_LABEL)}>Quando foi</label>
          <SimpleSelect
            value={dateLabel(f.d, "")}
            options={labels}
            onChange={(v) => set({ d: DAYS[labels.indexOf(v)] ?? 0 })}
            cssText={field(false, true)}
          />
        </div>
      </div>

      <div>
        <label style={css(FIELD_LABEL)}>Categoria (opcional)</label>
        <div style={css("display:flex;gap:7px;flex-wrap:wrap")}>
          {costCategories(d.costs).map((c) => (
            <ChoicePill
              key={c}
              name={c}
              active={f.category === c}
              onClick={() => set({ category: f.category === c ? "" : c })}
            />
          ))}
        </div>
      </div>

      {/* Só custo fixo repete: um saco de feijão não volta sozinho todo mês. */}
      {f.type === "fixed" && (
        <Button
          onClick={() => set({ recurring: !f.recurring })}
          style={css(
            `display:flex;align-items:center;gap:11px;padding:13px 14px;border:1px solid ${f.recurring ? "var(--accent)" : "var(--border2)"};` +
              `border-radius:11px;background:${f.recurring ? "var(--accent-soft)" : "var(--surface2)"};text-align:left`,
          )}
        >
          <span style={css(track(f.recurring, 34, 20))}>
            <span style={css("width:16px;height:16px;border-radius:50%;background:#fff")} />
          </span>
          <span style={css("flex:1;min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13px ${SANS};color:${f.recurring ? "var(--accent)" : "var(--text2)"}`,
              )}
            >
              Repete todo mês
            </span>
            <span style={css(`display:block;margin-top:2px;font:500 11px/1.4 ${SANS};color:var(--muted)`)}>
              Aluguel, luz, internet: lance uma vez e o portal repete sozinho.
            </span>
          </span>
        </Button>
      )}
    </ModalFrame>
  );
}
