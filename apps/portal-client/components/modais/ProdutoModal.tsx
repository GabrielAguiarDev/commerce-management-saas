"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, field, MoneyField, LabeledField, css, MONO, ModalFooter, FIELD_LABEL, SANS, SimpleSelect, track } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import {
  CFOP_COMMON,
  CSOSN,
  gtinAccepted,
  ICMS_CST,
  isValidCest,
  isValidNcm,
  NO_GTIN,
  ORIGINS,
  TAX_UNITS,
  usesCsosn,
} from "@/lib/dados/fiscal";
import { categoriesOf, UNITS } from "@/lib/dados/produtos";
import { parseBrNumber } from "@/lib/formato";
import type { ProductFiscal } from "@/types/types";

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
  const setFiscal = (p: Partial<ProductFiscal>) => set({ fiscal: { ...f.fiscal, ...p } });

  // O padrão do negócio entra como PLACEHOLDER, nunca como valor. Preencher o
  // campo congelaria uma cópia: mudar o padrão depois deixaria de valer para
  // este produto, e ninguém entenderia por quê.
  const fiscalDefaults = d.fiscal;
  const inherited = (own: string, fallback: string) => (own ? "" : fallback);

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

      {/* -------------------------------------------------------------- */}
      {/* Fiscal                                                          */}
      {/* -------------------------------------------------------------- */}
      {has("fiscal") && !f.service && (
        <div style={css("padding-top:12px;border-top:1px solid var(--border)")}>
          <div
            style={css(
              `margin-bottom:4px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
            )}
          >
            Nota fiscal
          </div>
          <p style={css(`margin:0 0 11px;font:400 11.5px/1.5 ${SANS};color:var(--muted)`)}>
            Deixe vazio para usar o padrão do seu negócio (Configurações › Dados fiscais). Só
            preencha o que foge da regra.
          </p>

          <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
            <LabeledField
              label="NCM"
              value={f.fiscal.ncm}
              onChange={(v) => setFiscal({ ncm: v })}
              placeholder={inherited(f.fiscal.ncm, fiscalDefaults.defaultNcm) || "00000000"}
              inputMode="numeric"
              mono
              error={f.submitted && !!f.fiscal.ncm && !isValidNcm(f.fiscal.ncm)}
              message="O NCM tem 8 dígitos."
              note={
                f.fiscal.ncm
                  ? "Este produto tem NCM próprio."
                  : fiscalDefaults.defaultNcm
                    ? `Herdando ${fiscalDefaults.defaultNcm} do negócio.`
                    : "Sem NCM aqui nem padrão do negócio — a nota deste item seria rejeitada."
              }
              noteColor={
                !f.fiscal.ncm && !fiscalDefaults.defaultNcm ? "var(--warn)" : "var(--muted)"
              }
            />

            <LabeledField
              label="Código de barras (GTIN)"
              value={f.fiscal.gtin}
              onChange={(v) => setFiscal({ gtin: v })}
              placeholder={NO_GTIN}
              mono
              error={f.submitted && !gtinAccepted(f.fiscal.gtin)}
              message="Este número não é um GTIN válido — confira os dígitos."
              // O erro mais caro do cadastro: o código interno da balança passa
              // no campo do PDV acima e reprova a nota inteira aqui.
              note={`Não é o mesmo campo do PDV: aqui a SEFAZ confere o dígito. Sem código de barras, escreva ${NO_GTIN}.`}
            />

            <FiscalCode
              label={usesCsosn(fiscalDefaults.regime) ? "CSOSN" : "CST de ICMS"}
              value={f.fiscal.icmsCode}
              options={usesCsosn(fiscalDefaults.regime) ? CSOSN : ICMS_CST}
              fallback={fiscalDefaults.defaultIcmsCode}
              onChange={(v) => setFiscal({ icmsCode: v })}
            />

            <FiscalCode
              label="CFOP"
              value={f.fiscal.cfop}
              options={CFOP_COMMON}
              fallback={fiscalDefaults.defaultCfop}
              onChange={(v) => setFiscal({ cfop: v })}
            />

            <LabeledField
              label="CEST"
              value={f.fiscal.cest}
              onChange={(v) => setFiscal({ cest: v })}
              placeholder="Só com substituição tributária"
              inputMode="numeric"
              mono
              error={f.submitted && !!f.fiscal.cest && !isValidCest(f.fiscal.cest)}
              message="O CEST tem 7 dígitos."
            />

            <div>
              <label style={css(FIELD_LABEL)}>Unidade tributável</label>
              <SimpleSelect
                value={f.fiscal.taxUnit}
                options={["", ...TAX_UNITS]}
                onChange={(v) => setFiscal({ taxUnit: v })}
                cssText={field(false, true)}
              />
              <div style={css(`margin-top:5px;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
                {f.fiscal.taxUnit
                  ? "Diferente da unidade de venda."
                  : `Vazio usa a de venda (${f.unit.toUpperCase()}).`}
              </div>
            </div>

            <div>
              <label style={css(FIELD_LABEL)}>Origem</label>
              <SimpleSelect
                value={f.fiscal.origin}
                options={["", ...ORIGINS.map((o) => o.code)]}
                onChange={(v) => setFiscal({ origin: v })}
                cssText={field(false, true)}
              />
              <div style={css(`margin-top:5px;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
                {f.fiscal.origin
                  ? (ORIGINS.find((o) => o.code === f.fiscal.origin)?.label ?? "")
                  : `Vazio usa o padrão do negócio (${fiscalDefaults.defaultOrigin}).`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/*
        SERVIÇO NÃO ENTRA EM NFC-e. Banho, consulta e afins vão em NFS-e, que é
        municipal, tem layout próprio de cada prefeitura e ainda não existe
        aqui. Mostrar campos de NCM para um serviço seria pedir um dado que a
        nota dele não usa — e sugerir que ela sairia.
      */}
      {has("fiscal") && f.service && (
        <div
          style={css(
            `padding:11px 13px;border-radius:11px;background:var(--surface2);border:1px solid var(--border);font:500 12px/1.5 ${SANS};color:var(--text2)`,
          )}
        >
          Serviços saem em nota de serviço (NFS-e), que é da prefeitura e ainda não é emitida pelo
          portal. Os campos fiscais acima valem para mercadoria.
        </div>
      )}
    </ModalFrame>
  );
}

/**
 * Um código fiscal do produto, com o padrão do negócio como placeholder.
 *
 * Separado do `CodeField` da tela de configurações de propósito: lá o campo é
 * o valor definitivo e a lista é auxiliar; aqui o normal é ficar VAZIO, e o
 * componente existe para deixar isso óbvio — "herdando 102 do negócio" em vez
 * de um campo em branco que parece esquecimento.
 */
function FiscalCode({
  label,
  value,
  options,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  options: { code: string; label: string }[];
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={css(FIELD_LABEL)}>{label}</label>
      <SimpleSelect
        value={value}
        options={["", ...options.map((o) => o.code)]}
        onChange={onChange}
        cssText={field(false, true)}
      />
      <div style={css(`margin-top:5px;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
        {value
          ? (options.find((o) => o.code === value)?.label ?? "Código próprio deste produto.")
          : fallback
            ? `Herdando ${fallback} do negócio.`
            : "Sem padrão do negócio definido."}
      </div>
    </div>
  );
}
