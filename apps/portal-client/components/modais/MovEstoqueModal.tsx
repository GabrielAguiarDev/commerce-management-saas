"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, field, MoneyField, LabeledField, css, ModalFooter, FIELD_LABEL, SANS, SimpleSelect, Suggestions } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { MOVEMENT_STYLE, REASON_SUGGESTIONS } from "@/lib/dados/estoque";
import { parseBrNumber } from "@/lib/formato";
import type { StockMovementType } from "@/types/types";

const TYPES: { key: StockMovementType; name: string; explicacao: string }[] = [
  {
    key: "in",
    name: "Entrada",
    explicacao: "Chegou mercadoria nova. Informe quantas unidades entraram.",
  },
  {
    key: "out",
    name: "Saída ou perda",
    explicacao: "Quebrou, venceu ou saiu sem venda. Informe quantas unidades saíram.",
  },
  {
    key: "adjustment",
    name: "Ajuste",
    explicacao: "Você contou a prateleira. Informe quanto TEM agora — o portal calcula a diferença.",
  },
];

/**
 * Registrar movimentação.
 *
 * A diferença que mais confunde está aqui: entrada e saída perguntam "quanto
 * mudou", o ajuste pergunta "quanto tem". A prévia embaixo do field mostra o
 * saldo resultante para ninguém precisar fazer a conta de cabeça.
 */
export function MovEstoqueModal() {
  const { s, a, d } = usePortal();
  const f = s.movementForm;

  const tracked = d.products.filter((p) => p.stock != null);
  const product = tracked.find((p) => p.id === f.productId) ?? tracked[0];
  const type = TYPES.find((t) => t.key === f.type)!;

  const set = (p: Partial<typeof f>) => a.set({ movementForm: { ...f, ...p } });

  const qtd = Math.round(parseBrNumber(f.qtd));
  const current = product?.stock ?? 0;
  const delta = f.type === "in" ? qtd : f.type === "out" ? -qtd : qtd - current;
  const result = current + delta;

  const qtyError = f.submitted && !f.qtd.trim();

  const preview = !f.qtd.trim()
    ? `Agora há ${current} ${product?.unit ?? "un"} em estoque.`
    : f.type === "adjustment"
      ? `${current} → ${qtd} (${delta >= 0 ? "+" : ""}${delta})`
      : `${current} → ${result} (${delta >= 0 ? "+" : ""}${delta})`;

  // Estoque negativo quase sempre é erro de digitação, então o aviso é em cor
  // de atenção — mas não bloqueia: o dado da prateleira é quem manda.
  const previewColor = result < 0 ? "var(--danger)" : delta === 0 ? "var(--muted)" : "var(--pos)";

  return (
    <ModalFrame
      closeLabel="Fechar"
      title="Registrar movimentação"
      subtitle="O estoque muda por movimentação — assim fica registrado o porquê."
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.saveMovement}
          confirmText={`Registrar ${type.name.toLowerCase()}`}
          confirmColor={MOVEMENT_STYLE[f.type].color}
          confirmInk="#fff"
        />
      }
    >
      <div style={css("display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px")}>
        {TYPES.map((t) => (
          <Button
            key={t.key}
            onClick={() => set({ type: t.key, qtd: "", reason: "" })}
            style={css(
              `padding:11px 8px;border:1.5px solid ${f.type === t.key ? MOVEMENT_STYLE[t.key].color : "var(--border2)"};` +
                `border-radius:11px;background:${f.type === t.key ? MOVEMENT_STYLE[t.key].bg : "var(--surface2)"};` +
                `color:${f.type === t.key ? MOVEMENT_STYLE[t.key].color : "var(--text2)"};font:600 12.5px/1.25 ${SANS}`,
            )}
          >
            {t.name}
          </Button>
        ))}
      </div>

      <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--muted)`)}>{type.explicacao}</p>

      <div>
        <label style={css(FIELD_LABEL)}>Produto</label>
        <SimpleSelect
          value={product?.name ?? ""}
          options={tracked.map((p) => p.name)}
          onChange={(v) => set({ productId: tracked.find((p) => p.name === v)?.id ?? null })}
          cssText={field(false, true)}
        />
        <div style={css(`margin-top:5px;font:500 11.5px ${SANS};color:var(--muted)`)}>
          {product
            ? `Em estoque agora: ${current} ${product.unit} · mínimo ${product.minimum ?? 0}`
            : "Nenhum produto com estoque controlado."}
        </div>
      </div>

      <div>
        <LabeledField
          label={f.type === "adjustment" ? "Quantidade contada" : "Quantidade"}
          value={f.qtd}
          onChange={(v) => set({ qtd: v })}
          placeholder="0"
          inputMode="numeric"
          error={qtyError}
          message="Informe a quantidade."
        />
        <div style={css(`margin-top:6px;font:600 12px ${SANS};color:${previewColor}`)}>{preview}</div>
      </div>

      {/* O custo só faz sentido na entrada: é a compra que define quanto o
          produto passou a custar, e vira lançamento em Custos. */}
      {f.type === "in" && (
        <MoneyField
          label="Custo por unidade (opcional)"
          value={f.cost}
          onChange={(v) => set({ cost: v })}
          note="Atualiza o custo do produto e lança a compra em Custos."
        />
      )}

      <div>
        <LabeledField
          label={f.type === "adjustment" ? "Por que a contagem mudou" : "Motivo"}
          value={f.reason}
          onChange={(v) => set({ reason: v })}
          placeholder={
            f.type === "in"
              ? "Ex.: compra — Distribuidora Pet Sul"
              : f.type === "out"
                ? "Ex.: embalagem rasgada"
                : "Ex.: contagem física"
          }
        />
        <Suggestions items={REASON_SUGGESTIONS[f.type]} onPick={(v) => set({ reason: v })} />
      </div>
    </ModalFrame>
  );
}
