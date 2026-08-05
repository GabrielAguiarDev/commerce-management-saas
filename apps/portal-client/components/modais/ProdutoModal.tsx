"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, field, MoneyField, LabeledField, css, MONO, ModalFooter, FIELD_LABEL, SANS, SimpleSelect, track } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { categoriesOf, UNITS } from "@/lib/dados/produtos";
import { parseBrNumber } from "@/lib/formato";

/**
 * Cadastro e edição de produto.
 *
 * Os campos de baixo — código de barras, custo, estoque, unidade — só aparecem
 * para quem tem o módulo correspondente. Um cliente sem Estoque não deve ver
 * "quantidade em estoque": é um field que ele nunca vai poder usar.
 */
export function ProdutoModal() {
  const { s, a, has, isMobile, d } = usePortal();
  const f = s.productForm;
  const editing = f.id != null;

  const nameError = f.submitted && !f.name.trim();
  const priceError = f.submitted && parseBrNumber(f.price) <= 0;

  const hasCost = has("costs") || has("reports");
  const hasStock = has("stock");
  const hasCode = has("stock") || has("products");
  const hasAdvanced = hasCost || hasStock || hasCode;

  const cols = isMobile ? "1fr" : "1fr 1fr";

  const price = parseBrNumber(f.price);
  const cost = parseBrNumber(f.cost);
  const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;

  const set = (p: Partial<typeof f>) => a.set({ productForm: { ...f, ...p } });

  return (
    <ModalFrame
      closeLabel="Fechar"
      title={editing ? "Editar produto" : "Novo produto"}
      subtitle={
        editing
          ? "O que mudar aqui vale para as próximas vendas."
          : "Cadastre o que você vende para agilizar o balcão."
      }
      width={560}
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.saveProduct}
          confirmText={editing ? "Salvar alterações" : "Cadastrar produto"}
        />
      }
    >
      <LabeledField
        label="Nome do produto"
        value={f.name}
        onChange={(v) => set({ name: v })}
        placeholder="Ex.: o que você vende"
        error={nameError}
        message="Escreva o nome do produto."
      />

      <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
        <MoneyField
          label="Preço de venda"
          value={f.price}
          onChange={(v) => set({ price: v })}
          error={priceError}
          message="Informe um preço maior que zero."
        />

        <div>
          <label style={css(FIELD_LABEL)}>Categoria</label>
          {f.newCategory ? (
            <div style={css("display:flex;gap:7px")}>
              <input
                value={f.category}
                onChange={(e) => set({ category: e.target.value })}
                placeholder="Nome da nova categoria"
                style={css(field().replace("var(--border2)", "var(--accent)"))}
              />
              <Button
                onClick={() => set({ newCategory: false, category: categoriesOf(d.products)[0] ?? "" })}
                title="Escolher da lista"
                style={css(
                  `flex:none;padding:0 12px;border:1px solid var(--border2);border-radius:11px;background:var(--surface);color:var(--muted);font:600 13px ${MONO}`,
                )}
              >
                ×
              </Button>
            </div>
          ) : (
            <SimpleSelect
              value={f.category}
              // "Criar categoria" é uma opção da própria lista: é onde a pessoa
              // já está olhando quando descobre que a dela não existe.
              options={[...categoriesOf(d.products), "+ Criar categoria"]}
              onChange={(v) =>
                v === "+ Criar categoria" ? set({ newCategory: true, category: "" }) : set({ category: v })
              }
              cssText={field(false, true)}
            />
          )}
        </div>
      </div>

      {editing && (
        <div
          style={css(
            `padding:11px 13px;border-radius:11px;background:var(--surface2);border:1px solid var(--border);font:500 12px/1.5 ${SANS};color:var(--text2)`,
          )}
        >
          O preço novo vale para as próximas vendas. As vendas já registradas continuam com o preço
          praticado no dia.
        </div>
      )}

      <div style={css("display:flex;gap:9px;flex-wrap:wrap")}>
        <Button
          onClick={() => set({ active: !f.active })}
          style={css(
            `display:flex;align-items:center;gap:9px;padding:12px 14px;border:1px solid ${f.active ? "var(--accent)" : "var(--border2)"};` +
              `border-radius:11px;background:${f.active ? "var(--accent-soft)" : "var(--surface2)"};` +
              `color:${f.active ? "var(--accent)" : "var(--muted)"};font:600 13px ${SANS}`,
          )}
        >
          <span style={css(track(f.active, 34, 20))}>
            <span style={css("width:16px;height:16px;border-radius:50%;background:#fff")} />
          </span>
          {f.active ? "À venda" : "Pausado"}
        </Button>

        <Button
          onClick={() => set({ fav: !f.fav })}
          style={css(
            `display:flex;align-items:center;gap:9px;padding:12px 14px;border:1px solid ${f.fav ? "var(--warn)" : "var(--border2)"};` +
              `border-radius:11px;background:${f.fav ? "var(--warn-soft)" : "var(--surface2)"};` +
              `color:${f.fav ? "var(--warn)" : "var(--muted)"};font:600 13px ${SANS}`,
          )}
        >
          <span style={css(`font:600 15px/1 ${SANS}`)}>{f.fav ? "★" : "☆"}</span>
          {f.fav ? "Aparece primeiro no PDV" : "Marcar como mais vendido"}
        </Button>
      </div>

      {hasAdvanced && (
        <div style={css("padding-top:12px;border-top:1px solid var(--border)")}>
          <div
            style={css(
              `margin-bottom:11px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
            )}
          >
            Detalhes do seu negócio
          </div>
          <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
            {hasCode && (
              <LabeledField
                label="Código de barras"
                value={f.code}
                onChange={(v) => set({ code: v })}
                placeholder="Bipe ou digite o código"
                note="Serve para bipar o produto na venda."
                mono
              />
            )}

            {hasCost && (
              <MoneyField
                label="Quanto você paga (custo)"
                value={f.cost}
                onChange={(v) => set({ cost: v })}
                note={
                  margin == null
                    ? "Com o custo, o portal calcula o seu lucro."
                    : `Margem de ${margin.toFixed(0)}%`
                }
                noteColor={margin == null ? "var(--muted)" : margin < 20 ? "var(--warn)" : "var(--pos)"}
              />
            )}

            {hasStock && (
              <>
                <LabeledField
                  label="Quantidade em estoque"
                  value={f.stock}
                  onChange={(v) => set({ stock: v })}
                  placeholder="0"
                  inputMode="numeric"
                  note="Deixe vazio se for um serviço."
                />
                <LabeledField
                  label="Avisar quando chegar em"
                  value={f.minimum}
                  onChange={(v) => set({ minimum: v })}
                  placeholder="0"
                  inputMode="numeric"
                  note="Você recebe um alerta de estoque baixo."
                />
                <div>
                  <label style={css(FIELD_LABEL)}>Vendido por</label>
                  <SimpleSelect
                    value={f.unit}
                    options={UNITS}
                    onChange={(v) => set({ unit: v })}
                    cssText={field(false, true)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
