"use client";

import { usePortal } from "@/components/PortalProvider";
import { Button, field, css, MONO, NUM, PANEL, SANS, Select } from "@aguiar/ui";
import { brl } from "@/lib/formato";
import { PAYMENT_LABEL } from "@/lib/dados/vendas";
import { ROUTES } from "@/lib/rotas";
import type { Product } from "@/types/types";

/**
 * O balcão.
 *
 * É a tela mais usada do portal e a que mais precisa aguentar pressa: busca por
 * nome, leitor de código de barras e os mais vendidos a um toque. No celular o
 * carrinho vira uma folha que sobe, para o catálogo ficar com a tela inteira.
 */
export function PdvView() {
  const { s, a, has, isMobile, isDesktop, d } = usePortal();

  const editing = s.editingSale != null;

  const available = d.products.filter((p) => p.active);
  const search = s.productSearch.trim().toLowerCase();

  const catalogo = available.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search)) return false;
    if (s.code.trim() && !p.code.includes(s.code.trim())) return false;
    return true;
  });

  const favorites = available.filter((p) => p.fav);
  const showFavorites = favorites.length > 0 && !search && !s.code.trim();

  const total = s.cart.reduce((x, c) => x + c.qtd * c.price, 0);
  const items = s.cart.reduce((x, c) => x + c.qtd, 0);

  // No celular o carrinho é uma folha sobre o catálogo; no desktop, a coluna
  // da direita que fica sempre à vista.
  const cartStacked = isMobile;
  const showCart = isDesktop || s.cartOpen;

  const posCols = isDesktop ? "minmax(0,1.55fr) minmax(340px,1fr)" : "1fr";

  /** Bipar o código: Enter procura o produto e joga direto no carrinho. */
  const onScan = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const found = available.find((p) => p.code === s.code.trim());
    if (found) a.addToCart(found);
    else a.notify("Nenhum produto com esse código", "warn");
  };

  return (
    <div>
      <div
        style={css(
          "display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:12px;min-width:0")}>
          <Button
            onClick={() => {
              a.clearCart();
              a.goTo(ROUTES.sales);
            }}
            title="Voltar"
            className="hv-borda"
            style={css(
              "flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--border);" +
                `background:var(--surface);color:var(--text2);font:600 15px/1 ${MONO}`,
            )}
          >
            ‹
          </Button>
          <div style={css("min-width:0")}>
            <h1 style={css(`margin:0;font:700 21px/1.2 ${SANS};letter-spacing:-.015em`)}>
              {editing ? "Editar venda" : "Nova venda"}
            </h1>
            <p style={css(`margin:4px 0 0;font:400 13px/1.4 ${SANS};color:var(--muted)`)}>
              {editing
                ? "Ajuste os itens e salve — o estoque é corrigido junto."
                : "Toque nos produtos ou bipe o código de barras."}
            </p>
          </div>
        </div>
        <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
          {catalogo.length} de {available.length} produtos
        </span>
      </div>

      <div style={css(`display:grid;grid-template-columns:${posCols};gap:12px;align-items:start`)}>
        {/* Catálogo */}
        <div
          style={css(
            `display:flex;flex-direction:column;min-width:0;${PANEL};` +
              `max-height:${isDesktop ? "calc(100vh - 190px)" : "none"};overflow:hidden`,
          )}
        >
          <div
            style={css(
              `flex:none;padding:14px;border-bottom:1px solid var(--border);display:grid;` +
                `grid-template-columns:${isMobile || !has("stock") ? "1fr" : "minmax(0,1.4fr) minmax(0,1fr)"};gap:8px`,
            )}
          >
            <div
              style={css(
                "display:flex;align-items:center;gap:8px;padding:0 12px;border:1.5px solid var(--border2);border-radius:11px;background:var(--surface2)",
              )}
            >
              <span style={css(`flex:none;color:var(--muted);font:600 13px ${MONO}`)}>⌕</span>
              <input
                value={s.productSearch}
                onChange={(e) => a.set({ productSearch: e.target.value })}
                placeholder="Buscar produto pelo nome"
                style={css(
                  `flex:1;min-width:0;padding:13px 0;border:0;background:none;font:500 13.5px ${SANS};outline:none`,
                )}
              />
              {s.productSearch && (
                <Button
                  onClick={() => a.set({ productSearch: "" })}
                  title="Limpar busca"
                  style={css(`flex:none;width:24px;height:24px;border-radius:7px;color:var(--muted);font:600 13px/1 ${MONO}`)}
                >
                  ×
                </Button>
              )}
            </div>

            {!isMobile && has("stock") && (
              <div
                style={css(
                  "display:flex;align-items:center;gap:8px;padding:0 12px;border:1.5px solid var(--border);border-radius:11px;background:var(--surface2)",
                )}
              >
                <span style={css(`flex:none;color:var(--muted);font:600 13px ${MONO}`)}>|||</span>
                <input
                  value={s.code}
                  onChange={(e) => a.set({ code: e.target.value })}
                  onKeyDown={onScan}
                  inputMode="numeric"
                  placeholder="Código de barras"
                  style={css(
                    `flex:1;min-width:0;padding:13px 0;border:0;background:none;font:500 12.5px ${SANS};outline:none`,
                  )}
                />
              </div>
            )}
          </div>

          <div
            style={css(
              "flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px",
            )}
          >
            {showFavorites && (
              <div style={css("margin-bottom:16px")}>
                <div
                  style={css(
                    `margin-bottom:8px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
                  )}
                >
                  Mais vendidos
                </div>
                <div
                  style={css(
                    `display:grid;grid-template-columns:repeat(auto-fill,minmax(${isMobile ? "140px" : "160px"},1fr));gap:8px`,
                  )}
                >
                  {favorites.map((p) => (
                    <BotaoProduto key={p.id} product={p} standout />
                  ))}
                </div>
              </div>
            )}

            <div
              style={css(
                `margin-bottom:8px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
              )}
            >
              {search || s.code.trim() ? "Resultados" : "Todos os produtos"}
            </div>

            {catalogo.length === 0 ? (
              <div
                style={css(
                  `padding:34px 20px;border:1px dashed var(--border2);border-radius:12px;background:var(--surface2);text-align:center;font:500 13px/1.5 ${SANS};color:var(--muted)`,
                )}
              >
                Nenhum produto com esse nome ou código.
              </div>
            ) : (
              <div
                style={css(
                  `display:grid;grid-template-columns:repeat(auto-fill,minmax(${isMobile ? "140px" : "150px"},1fr));gap:8px`,
                )}
              >
                {catalogo.map((p) => (
                  <BotaoProduto key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carrinho */}
        {showCart && (
          <div
            style={css(
              "display:flex;flex-direction:column;min-width:0;border:1px solid var(--border);background:var(--surface);overflow:hidden;" +
                (cartStacked
                  ? "position:fixed;left:0;right:0;bottom:0;top:auto;z-index:70;max-height:82vh;border-radius:16px 16px 0 0;box-shadow:var(--shadow-lg)"
                  : "position:sticky;top:88px;max-height:calc(100vh - 190px);border-radius:14px;box-shadow:var(--shadow)"),
            )}
          >
            <div
              style={css(
                "flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;border-bottom:1px solid var(--border)",
              )}
            >
              <h2 style={css(`margin:0;font:600 15px/1.2 ${SANS}`)}>Itens desta venda</h2>
              <span style={css("display:flex;align-items:center;gap:10px")}>
                <span style={css(`font:600 11.5px ${SANS};color:var(--muted)`)}>
                  {items} {items === 1 ? "item" : "itens"}
                </span>
                {cartStacked && (
                  <Button
                    onClick={() => a.set({ cartOpen: false })}
                    title="Fechar carrinho"
                    style={css(
                      "width:30px;height:30px;border-radius:8px;border:1px solid var(--border);" +
                        `background:var(--surface2);color:var(--muted);font:600 13px/1 ${MONO}`,
                    )}
                  >
                    ×
                  </Button>
                )}
              </span>
            </div>

            <div
              style={css(
                "flex:1;min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:12px;display:flex;flex-direction:column;gap:8px",
              )}
            >
              {s.cart.length === 0 ? (
                <div
                  style={css(
                    `padding:30px 18px;border:1px dashed var(--border2);border-radius:12px;background:var(--surface2);text-align:center;font:500 13px/1.55 ${SANS};color:var(--muted)`,
                  )}
                >
                  Nenhum item ainda. Busque ou toque em um produto.
                </div>
              ) : (
                s.cart.map((c) => (
                  <div
                    key={c.name}
                    style={css(
                      "display:flex;flex-direction:column;gap:9px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)",
                    )}
                  >
                    <div style={css("display:flex;align-items:flex-start;gap:8px")}>
                      <span style={css("flex:1;min-width:0")}>
                        <span style={css(`display:block;font:600 13px/1.3 ${SANS}`)}>{c.name}</span>
                        <span
                          style={css(`display:block;margin-top:2px;font:500 11.5px ${MONO};color:var(--muted)`)}
                        >
                          {brl(c.price)} cada
                        </span>
                      </span>
                      <Button
                        onClick={() => a.removeItem(c.name)}
                        title="Remover item"
                        className="hv-remover"
                        style={css(`flex:none;width:26px;height:26px;border-radius:8px;color:var(--muted);font:600 14px/1 ${MONO}`)}
                      >
                        ×
                      </Button>
                    </div>

                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
                      <span
                        style={css(
                          "display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--border2);border-radius:9px;background:var(--surface)",
                        )}
                      >
                        <Button
                          onClick={() => a.changeQty(c.name, -1)}
                          title="Menos"
                          className="hv-linha"
                          style={css(`width:34px;height:34px;border-radius:7px;font:700 16px/1 ${SANS};color:var(--text2)`)}
                        >
                          −
                        </Button>
                        <span style={css(`min-width:28px;text-align:center;font:700 14px ${MONO};${NUM}`)}>
                          {c.qtd}
                        </span>
                        <Button
                          onClick={() => a.changeQty(c.name, 1)}
                          title="Mais"
                          className="hv-linha"
                          style={css(`width:34px;height:34px;border-radius:7px;font:700 16px/1 ${SANS};color:var(--text2)`)}
                        >
                          +
                        </Button>
                      </span>
                      <span style={css(`font:700 14px ${SANS};${NUM}`)}>{brl(c.qtd * c.price)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={css("flex:none;padding:13px 14px;border-top:1px solid var(--border);background:var(--surface2)")}>
              <label style={css(`display:block;margin-bottom:7px;font:600 11px ${SANS};color:var(--text2)`)}>
                Forma de pagamento
              </label>
              <Select
                value={s.currentMethod}
                onChange={(e) => a.set({ currentMethod: e.target.value as typeof s.currentMethod })}
                cssText={field(false, true).replace("padding:13px 14px", "padding:12px 12px")}
              >
                {s.acceptedMethods.map((f) => (
                  <option key={f} value={f}>
                    {PAYMENT_LABEL[f]}
                  </option>
                ))}
              </Select>

              <div
                style={css(
                  "display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:13px;padding-top:12px;border-top:1px solid var(--border)",
                )}
              >
                <span style={css(`font:600 13px ${SANS};color:var(--text2)`)}>Total</span>
                <span
                  style={css(
                    `font:700 27px/1 ${SANS};${NUM};white-space:nowrap;color:${total > 0 ? "var(--accent)" : "var(--muted)"}`,
                  )}
                >
                  {brl(total)}
                </span>
              </div>

              <Button
                onClick={a.recordSale}
                disabled={!s.cart.length}
                className={s.cart.length ? "hv-brilho" : undefined}
                style={css(
                  `width:100%;margin-top:11px;padding:15px;border-radius:12px;font:700 14.5px ${SANS};` +
                    (s.cart.length
                      ? "background:var(--accent);color:var(--accent-ink)"
                      : "background:var(--surface3);color:var(--muted);cursor:not-allowed"),
                )}
              >
                {editing ? "Salvar alterações" : `Registrar venda de ${brl(total)}`}
              </Button>

              <Button
                onClick={() =>
                  s.cart.length
                    ? a.confirm({
                        title: editing ? "Descartar as alterações?" : "Limpar o carrinho?",
                        text: editing
                          ? "A venda volta a ser o que era antes de você começar a editar."
                          : "Os itens escolhidos até agora são removidos.",
                        summary: `${items} ${items === 1 ? "item" : "itens"} · ${brl(total)}`,
                        detail: "Nada é registrado no histórico.",
                        reversal: "Você pode montar a venda de novo do zero.",
                        button: editing ? "Descartar" : "Limpar carrinho",
                        buttonBg: "var(--danger)",
                        buttonInk: "#fff",
                        color: "var(--danger)",
                        action: () => {
                          a.clearCart();
                          if (editing) a.goTo(ROUTES.sales);
                        },
                      })
                    : a.goTo(ROUTES.sales)
                }
                style={css(
                  `width:100%;margin-top:7px;padding:11px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13px ${SANS}`,
                )}
              >
                {s.cart.length ? (editing ? "Descartar alterações" : "Limpar carrinho") : "Cancelar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BotaoProduto({ product: p, standout }: { product: Product; standout?: boolean }) {
  const { s, a } = usePortal();
  const inCart = s.cart.find((c) => c.name === p.name);
  const noStock = p.stock != null && p.stock <= 0;

  return (
    <Button
      onClick={() => a.addToCart(p)}
      className="hv-borda-acc"
      style={css(
        "position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:6px;text-align:left;" +
          `min-height:${standout ? "76px" : "68px"};padding:${standout ? "13px" : "11px 12px"};` +
          `border-radius:${standout ? "12px" : "11px"};border:${standout ? "1.5px" : "1px"} solid ` +
          `${inCart ? "var(--accent)" : "var(--border)"};` +
          `background:${inCart ? "var(--accent-soft)" : "var(--surface2)"}`,
      )}
    >
      <span
        style={css(
          `font:600 ${standout ? "13.5px" : "12.5px"}/1.3 ${SANS};color:${inCart ? "var(--accent)" : "var(--text)"}`,
        )}
      >
        {p.name}
      </span>
      <span style={css(`font:600 ${standout ? "12.5px" : "11.5px"} ${MONO};color:var(--muted);${NUM}`)}>
        {brl(p.price)}
        {/* Estoque zerado não impede a venda — a prateleira pode estar
            desatualizada — mas o aviso fica visível na hora de tocar. */}
        {noStock && <span style={css(";color:var(--warn)")}> · sem estoque</span>}
      </span>
      {inCart && (
        <span
          style={css(
            "position:absolute;top:8px;right:8px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;" +
              `background:var(--accent);color:var(--accent-ink);font:700 11px/20px ${MONO};text-align:center`,
          )}
        >
          {inCart.qtd}
        </span>
      )}
    </Button>
  );
}
