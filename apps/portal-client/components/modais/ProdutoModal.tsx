"use client";

import { ModalBase } from "@/components/modais/Base";
import { campo, CampoDinheiro, CampoRotulado, css, MONO, RodapeModal, ROTULO_CAMPO, SANS, SelecaoSimples, trilha } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { UNIDADES } from "@/lib/dados/produtos";
import { numBR } from "@/lib/formato";

/**
 * Cadastro e edição de produto.
 *
 * Os campos de baixo — código de barras, custo, estoque, unidade — só aparecem
 * para quem tem o módulo correspondente. Um cliente sem Estoque não deve ver
 * "quantidade em estoque": é um campo que ele nunca vai poder usar.
 */
export function ProdutoModal() {
  const { s, a, tem, isMobile } = usePortal();
  const f = s.formProduto;
  const editando = f.id != null;

  const erroNome = f.tentouSalvar && !f.nome.trim();
  const erroPreco = f.tentouSalvar && numBR(f.preco) <= 0;

  const temCusto = tem("custos") || tem("relatorios");
  const temEstoque = tem("estoque");
  const temCodigo = tem("estoque") || tem("produtos");
  const temAvancado = temCusto || temEstoque || temCodigo;

  const cols = isMobile ? "1fr" : "1fr 1fr";

  const preco = numBR(f.preco);
  const custo = numBR(f.custo);
  const margem = preco > 0 && custo > 0 ? ((preco - custo) / preco) * 100 : null;

  const set = (p: Partial<typeof f>) => a.set({ formProduto: { ...f, ...p } });

  return (
    <ModalBase
      titulo={editando ? "Editar produto" : "Novo produto"}
      subtitulo={
        editando
          ? "O que mudar aqui vale para as próximas vendas."
          : "Cadastre o que você vende para agilizar o balcão."
      }
      largura={560}
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={a.salvarProduto}
          textoConfirmar={editando ? "Salvar alterações" : "Cadastrar produto"}
        />
      }
    >
      <CampoRotulado
        label="Nome do produto"
        valor={f.nome}
        onMudar={(v) => set({ nome: v })}
        placeholder={s.perfil === "petshop" ? "Ex.: Ração premium 15kg" : "Ex.: Acarajé completo"}
        erro={erroNome}
        mensagem="Escreva o nome do produto."
      />

      <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
        <CampoDinheiro
          label="Preço de venda"
          valor={f.preco}
          onMudar={(v) => set({ preco: v })}
          erro={erroPreco}
          mensagem="Informe um preço maior que zero."
        />

        <div>
          <label style={css(ROTULO_CAMPO)}>Categoria</label>
          {f.catNova ? (
            <div style={css("display:flex;gap:7px")}>
              <input
                value={f.categoria}
                onChange={(e) => set({ categoria: e.target.value })}
                placeholder="Nome da nova categoria"
                style={css(campo().replace("var(--border2)", "var(--accent)"))}
              />
              <button
                onClick={() => set({ catNova: false, categoria: s.catsProduto[0] ?? "" })}
                title="Escolher da lista"
                style={css(
                  `flex:none;padding:0 12px;border:1px solid var(--border2);border-radius:11px;background:var(--surface);color:var(--muted);font:600 13px ${MONO}`,
                )}
              >
                ×
              </button>
            </div>
          ) : (
            <SelecaoSimples
              valor={f.categoria}
              // "Criar categoria" é uma opção da própria lista: é onde a pessoa
              // já está olhando quando descobre que a dela não existe.
              opcoes={[...s.catsProduto, "+ Criar categoria"]}
              onMudar={(v) =>
                v === "+ Criar categoria" ? set({ catNova: true, categoria: "" }) : set({ categoria: v })
              }
              estilo={campo(false, true)}
            />
          )}
        </div>
      </div>

      {editando && (
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
        <button
          onClick={() => set({ ativo: !f.ativo })}
          style={css(
            `display:flex;align-items:center;gap:9px;padding:12px 14px;border:1px solid ${f.ativo ? "var(--accent)" : "var(--border2)"};` +
              `border-radius:11px;background:${f.ativo ? "var(--accent-soft)" : "var(--surface2)"};` +
              `color:${f.ativo ? "var(--accent)" : "var(--muted)"};font:600 13px ${SANS}`,
          )}
        >
          <span style={css(trilha(f.ativo, 34, 20))}>
            <span style={css("width:16px;height:16px;border-radius:50%;background:#fff")} />
          </span>
          {f.ativo ? "À venda" : "Pausado"}
        </button>

        <button
          onClick={() => set({ fav: !f.fav })}
          style={css(
            `display:flex;align-items:center;gap:9px;padding:12px 14px;border:1px solid ${f.fav ? "var(--warn)" : "var(--border2)"};` +
              `border-radius:11px;background:${f.fav ? "var(--warn-soft)" : "var(--surface2)"};` +
              `color:${f.fav ? "var(--warn)" : "var(--muted)"};font:600 13px ${SANS}`,
          )}
        >
          <span style={css(`font:600 15px/1 ${SANS}`)}>{f.fav ? "★" : "☆"}</span>
          {f.fav ? "Aparece primeiro no PDV" : "Marcar como mais vendido"}
        </button>
      </div>

      {temAvancado && (
        <div style={css("padding-top:12px;border-top:1px solid var(--border)")}>
          <div
            style={css(
              `margin-bottom:11px;font:600 10.5px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)`,
            )}
          >
            Detalhes do seu negócio
          </div>
          <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
            {temCodigo && (
              <CampoRotulado
                label="Código de barras"
                valor={f.codigo}
                onMudar={(v) => set({ codigo: v })}
                placeholder="Bipe ou digite o código"
                nota="Serve para bipar o produto na venda."
                mono
              />
            )}

            {temCusto && (
              <CampoDinheiro
                label="Quanto você paga (custo)"
                valor={f.custo}
                onMudar={(v) => set({ custo: v })}
                nota={
                  margem == null
                    ? "Com o custo, o portal calcula o seu lucro."
                    : `Margem de ${margem.toFixed(0)}%`
                }
                notaCor={margem == null ? "var(--muted)" : margem < 20 ? "var(--warn)" : "var(--pos)"}
              />
            )}

            {temEstoque && (
              <>
                <CampoRotulado
                  label="Quantidade em estoque"
                  valor={f.estoque}
                  onMudar={(v) => set({ estoque: v })}
                  placeholder="0"
                  inputMode="numeric"
                  nota="Deixe vazio se for um serviço."
                />
                <CampoRotulado
                  label="Avisar quando chegar em"
                  valor={f.minimo}
                  onMudar={(v) => set({ minimo: v })}
                  placeholder="0"
                  inputMode="numeric"
                  nota="Você recebe um alerta de estoque baixo."
                />
                <div>
                  <label style={css(ROTULO_CAMPO)}>Vendido por</label>
                  <SelecaoSimples
                    valor={f.unidade}
                    opcoes={UNIDADES}
                    onMudar={(v) => set({ unidade: v })}
                    estilo={campo(false, true)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ModalBase>
  );
}
