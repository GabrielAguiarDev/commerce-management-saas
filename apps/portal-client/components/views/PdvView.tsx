"use client";

import { usePortal } from "@/components/PortalProvider";
import { campo, css, MONO, NUM, PAINEL, SANS, SelecaoSimples } from "@aguiar/ui";
import { brl } from "@/lib/formato";
import { ROTAS } from "@/lib/rotas";
import type { Produto } from "@/types/types";

/**
 * O balcão.
 *
 * É a tela mais usada do portal e a que mais precisa aguentar pressa: busca por
 * nome, leitor de código de barras e os mais vendidos a um toque. No celular o
 * carrinho vira uma folha que sobe, para o catálogo ficar com a tela inteira.
 */
export function PdvView() {
  const { s, a, tem, isMobile, isDesktop } = usePortal();

  const editando = s.editandoVenda != null;

  const disponiveis = s.produtos.filter((p) => p.ativo);
  const busca = s.buscaProd.trim().toLowerCase();

  const catalogo = disponiveis.filter((p) => {
    if (busca && !p.nome.toLowerCase().includes(busca)) return false;
    if (s.codigo.trim() && !p.codigo.includes(s.codigo.trim())) return false;
    return true;
  });

  const favoritos = disponiveis.filter((p) => p.fav);
  const mostrarFavoritos = favoritos.length > 0 && !busca && !s.codigo.trim();

  const total = s.carrinho.reduce((x, c) => x + c.qtd * c.preco, 0);
  const itens = s.carrinho.reduce((x, c) => x + c.qtd, 0);

  // No celular o carrinho é uma folha sobre o catálogo; no desktop, a coluna
  // da direita que fica sempre à vista.
  const carrinhoEmpilhado = isMobile;
  const mostrarCarrinho = isDesktop || s.carrinhoAberto;

  const pdvCols = isDesktop ? "minmax(0,1.55fr) minmax(340px,1fr)" : "1fr";

  /** Bipar o código: Enter procura o produto e joga direto no carrinho. */
  const aoBipar = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const achado = disponiveis.find((p) => p.codigo === s.codigo.trim());
    if (achado) a.addCarrinho(achado);
    else a.avisar("Nenhum produto com esse código");
  };

  return (
    <div>
      <div
        style={css(
          "display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:12px;min-width:0")}>
          <button
            onClick={() => {
              a.limparCarrinho();
              a.irPara(ROTAS.vendas);
            }}
            title="Voltar"
            className="hv-borda"
            style={css(
              "flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--border);" +
                `background:var(--surface);color:var(--text2);font:600 15px/1 ${MONO}`,
            )}
          >
            ‹
          </button>
          <div style={css("min-width:0")}>
            <h1 style={css(`margin:0;font:700 21px/1.2 ${SANS};letter-spacing:-.015em`)}>
              {editando ? "Editar venda" : "Nova venda"}
            </h1>
            <p style={css(`margin:4px 0 0;font:400 13px/1.4 ${SANS};color:var(--muted)`)}>
              {editando
                ? "Ajuste os itens e salve — o estoque é corrigido junto."
                : "Toque nos produtos ou bipe o código de barras."}
            </p>
          </div>
        </div>
        <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
          {catalogo.length} de {disponiveis.length} produtos
        </span>
      </div>

      <div style={css(`display:grid;grid-template-columns:${pdvCols};gap:12px;align-items:start`)}>
        {/* Catálogo */}
        <div
          style={css(
            `display:flex;flex-direction:column;min-width:0;${PAINEL};` +
              `max-height:${isDesktop ? "calc(100vh - 190px)" : "none"};overflow:hidden`,
          )}
        >
          <div
            style={css(
              `flex:none;padding:14px;border-bottom:1px solid var(--border);display:grid;` +
                `grid-template-columns:${isMobile || !tem("estoque") ? "1fr" : "minmax(0,1.4fr) minmax(0,1fr)"};gap:8px`,
            )}
          >
            <div
              style={css(
                "display:flex;align-items:center;gap:8px;padding:0 12px;border:1.5px solid var(--border2);border-radius:11px;background:var(--surface2)",
              )}
            >
              <span style={css(`flex:none;color:var(--muted);font:600 13px ${MONO}`)}>⌕</span>
              <input
                value={s.buscaProd}
                onChange={(e) => a.set({ buscaProd: e.target.value })}
                placeholder="Buscar produto pelo nome"
                style={css(
                  `flex:1;min-width:0;padding:13px 0;border:0;background:none;font:500 13.5px ${SANS};outline:none`,
                )}
              />
              {s.buscaProd && (
                <button
                  onClick={() => a.set({ buscaProd: "" })}
                  title="Limpar busca"
                  style={css(`flex:none;width:24px;height:24px;border-radius:7px;color:var(--muted);font:600 13px/1 ${MONO}`)}
                >
                  ×
                </button>
              )}
            </div>

            {!isMobile && tem("estoque") && (
              <div
                style={css(
                  "display:flex;align-items:center;gap:8px;padding:0 12px;border:1.5px solid var(--border);border-radius:11px;background:var(--surface2)",
                )}
              >
                <span style={css(`flex:none;color:var(--muted);font:600 13px ${MONO}`)}>|||</span>
                <input
                  value={s.codigo}
                  onChange={(e) => a.set({ codigo: e.target.value })}
                  onKeyDown={aoBipar}
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
            {mostrarFavoritos && (
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
                  {favoritos.map((p) => (
                    <BotaoProduto key={p.id} produto={p} destaque />
                  ))}
                </div>
              </div>
            )}

            <div
              style={css(
                `margin-bottom:8px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
              )}
            >
              {busca || s.codigo.trim() ? "Resultados" : "Todos os produtos"}
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
                  <BotaoProduto key={p.id} produto={p} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carrinho */}
        {mostrarCarrinho && (
          <div
            style={css(
              "display:flex;flex-direction:column;min-width:0;border:1px solid var(--border);background:var(--surface);overflow:hidden;" +
                (carrinhoEmpilhado
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
                  {itens} {itens === 1 ? "item" : "itens"}
                </span>
                {carrinhoEmpilhado && (
                  <button
                    onClick={() => a.set({ carrinhoAberto: false })}
                    title="Fechar carrinho"
                    style={css(
                      "width:30px;height:30px;border-radius:8px;border:1px solid var(--border);" +
                        `background:var(--surface2);color:var(--muted);font:600 13px/1 ${MONO}`,
                    )}
                  >
                    ×
                  </button>
                )}
              </span>
            </div>

            <div
              style={css(
                "flex:1;min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:12px;display:flex;flex-direction:column;gap:8px",
              )}
            >
              {s.carrinho.length === 0 ? (
                <div
                  style={css(
                    `padding:30px 18px;border:1px dashed var(--border2);border-radius:12px;background:var(--surface2);text-align:center;font:500 13px/1.55 ${SANS};color:var(--muted)`,
                  )}
                >
                  Nenhum item ainda. Busque ou toque em um produto.
                </div>
              ) : (
                s.carrinho.map((c) => (
                  <div
                    key={c.nome}
                    style={css(
                      "display:flex;flex-direction:column;gap:9px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)",
                    )}
                  >
                    <div style={css("display:flex;align-items:flex-start;gap:8px")}>
                      <span style={css("flex:1;min-width:0")}>
                        <span style={css(`display:block;font:600 13px/1.3 ${SANS}`)}>{c.nome}</span>
                        <span
                          style={css(`display:block;margin-top:2px;font:500 11.5px ${MONO};color:var(--muted)`)}
                        >
                          {brl(c.preco)} cada
                        </span>
                      </span>
                      <button
                        onClick={() => a.removerItem(c.nome)}
                        title="Remover item"
                        className="hv-remover"
                        style={css(`flex:none;width:26px;height:26px;border-radius:8px;color:var(--muted);font:600 14px/1 ${MONO}`)}
                      >
                        ×
                      </button>
                    </div>

                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:10px")}>
                      <span
                        style={css(
                          "display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--border2);border-radius:9px;background:var(--surface)",
                        )}
                      >
                        <button
                          onClick={() => a.mudarQtd(c.nome, -1)}
                          title="Menos"
                          className="hv-linha"
                          style={css(`width:34px;height:34px;border-radius:7px;font:700 16px/1 ${SANS};color:var(--text2)`)}
                        >
                          −
                        </button>
                        <span style={css(`min-width:28px;text-align:center;font:700 14px ${MONO};${NUM}`)}>
                          {c.qtd}
                        </span>
                        <button
                          onClick={() => a.mudarQtd(c.nome, 1)}
                          title="Mais"
                          className="hv-linha"
                          style={css(`width:34px;height:34px;border-radius:7px;font:700 16px/1 ${SANS};color:var(--text2)`)}
                        >
                          +
                        </button>
                      </span>
                      <span style={css(`font:700 14px ${SANS};${NUM}`)}>{brl(c.qtd * c.preco)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={css("flex:none;padding:13px 14px;border-top:1px solid var(--border);background:var(--surface2)")}>
              <label style={css(`display:block;margin-bottom:7px;font:600 11px ${SANS};color:var(--text2)`)}>
                Forma de pagamento
              </label>
              <SelecaoSimples
                valor={s.pagAtual}
                opcoes={s.formasAceitas}
                onMudar={(v) => a.set({ pagAtual: v as typeof s.pagAtual })}
                estilo={campo(false, true).replace("padding:13px 14px", "padding:12px 12px")}
              />

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

              <button
                onClick={a.registrarVenda}
                disabled={!s.carrinho.length}
                className={s.carrinho.length ? "hv-brilho" : undefined}
                style={css(
                  `width:100%;margin-top:11px;padding:15px;border-radius:12px;font:700 14.5px ${SANS};` +
                    (s.carrinho.length
                      ? "background:var(--accent);color:var(--accent-ink)"
                      : "background:var(--surface3);color:var(--muted);cursor:not-allowed"),
                )}
              >
                {editando ? "Salvar alterações" : `Registrar venda de ${brl(total)}`}
              </button>

              <button
                onClick={() =>
                  s.carrinho.length
                    ? a.confirmar({
                        titulo: editando ? "Descartar as alterações?" : "Limpar o carrinho?",
                        texto: editando
                          ? "A venda volta a ser o que era antes de você começar a editar."
                          : "Os itens escolhidos até agora são removidos.",
                        resumo: `${itens} ${itens === 1 ? "item" : "itens"} · ${brl(total)}`,
                        sub: "Nada é registrado no histórico.",
                        reversao: "Você pode montar a venda de novo do zero.",
                        btn: editando ? "Descartar" : "Limpar carrinho",
                        btnBg: "var(--danger)",
                        btnFg: "#fff",
                        cor: "var(--danger)",
                        acao: () => {
                          a.limparCarrinho();
                          if (editando) a.irPara(ROTAS.vendas);
                        },
                      })
                    : a.irPara(ROTAS.vendas)
                }
                style={css(
                  `width:100%;margin-top:7px;padding:11px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13px ${SANS}`,
                )}
              >
                {s.carrinho.length ? (editando ? "Descartar alterações" : "Limpar carrinho") : "Cancelar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BotaoProduto({ produto: p, destaque }: { produto: Produto; destaque?: boolean }) {
  const { s, a } = usePortal();
  const noCarrinho = s.carrinho.find((c) => c.nome === p.nome);
  const semEstoque = p.estoque != null && p.estoque <= 0;

  return (
    <button
      onClick={() => a.addCarrinho(p)}
      className="hv-borda-acc"
      style={css(
        "position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:6px;text-align:left;" +
          `min-height:${destaque ? "76px" : "68px"};padding:${destaque ? "13px" : "11px 12px"};` +
          `border-radius:${destaque ? "12px" : "11px"};border:${destaque ? "1.5px" : "1px"} solid ` +
          `${noCarrinho ? "var(--accent)" : "var(--border)"};` +
          `background:${noCarrinho ? "var(--accent-soft)" : "var(--surface2)"}`,
      )}
    >
      <span
        style={css(
          `font:600 ${destaque ? "13.5px" : "12.5px"}/1.3 ${SANS};color:${noCarrinho ? "var(--accent)" : "var(--text)"}`,
        )}
      >
        {p.nome}
      </span>
      <span style={css(`font:600 ${destaque ? "12.5px" : "11.5px"} ${MONO};color:var(--muted);${NUM}`)}>
        {brl(p.preco)}
        {/* Estoque zerado não impede a venda — a prateleira pode estar
            desatualizada — mas o aviso fica visível na hora de tocar. */}
        {semEstoque && <span style={css(";color:var(--warn)")}> · sem estoque</span>}
      </span>
      {noCarrinho && (
        <span
          style={css(
            "position:absolute;top:8px;right:8px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;" +
              `background:var(--accent);color:var(--accent-ink);font:700 11px/20px ${MONO};text-align:center`,
          )}
        >
          {noCarrinho.qtd}
        </span>
      )}
    </button>
  );
}
