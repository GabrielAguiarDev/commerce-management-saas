"use client";

import { ModalBase } from "@/components/modais/Base";
import { campo, CampoDinheiro, CampoRotulado, css, EscolhaCartao, PilulaEscolha, RodapeModal, ROTULO_CAMPO, SANS, SelecaoSimples, Sugestoes, trilha } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { SUGESTOES_CUSTO } from "@/lib/dados/custos";
import { numBR, rotuloData } from "@/lib/formato";

/** As últimas datas que fazem sentido para um lançamento manual. */
const DIAS = [0, 1, 2, 3, 4, 5, 6, 7];

export function CustoModal() {
  const { s, a, isMobile } = usePortal();
  const f = s.formCusto;
  const editando = f.id != null;

  const erroDesc = f.tentouSalvar && !f.descricao.trim();
  const erroValor = f.tentouSalvar && numBR(f.valor) <= 0;

  const set = (p: Partial<typeof f>) => a.set({ formCusto: { ...f, ...p } });

  const rotulos = DIAS.map((d) => rotuloData(d, ""));
  const cols = isMobile ? "1fr" : "1fr 1fr";

  return (
    <ModalBase
      titulo={editando ? "Editar custo" : "Registrar custo"}
      subtitulo="Anote o gasto para o portal calcular seu lucro de verdade."
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={a.salvarCusto}
          textoConfirmar={editando ? "Salvar alterações" : "Registrar custo"}
        />
      }
    >
      <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:8px")}>
        <EscolhaCartao
          nome="Variável"
          nota="Muda todo mês: mercadoria, feira, combustível."
          ativo={f.tipo === "variavel"}
          onClick={() => set({ tipo: "variavel" })}
        />
        <EscolhaCartao
          nome="Fixo"
          nota="Repete igual: aluguel, luz, internet, salário."
          ativo={f.tipo === "fixo"}
          onClick={() => set({ tipo: "fixo" })}
        />
      </div>

      <div>
        <CampoRotulado
          label="O que foi o gasto"
          valor={f.descricao}
          onMudar={(v) => set({ descricao: v })}
          placeholder={s.perfil === "petshop" ? "Ex.: compra de ração" : "Ex.: feira da semana"}
          erro={erroDesc}
          mensagem="Escreva o que foi o gasto."
        />
        <Sugestoes itens={SUGESTOES_CUSTO[s.perfil]} onEscolher={(v) => set({ descricao: v })} />
      </div>

      <div style={css(`display:grid;grid-template-columns:${cols};gap:12px`)}>
        <CampoDinheiro
          label="Valor"
          valor={f.valor}
          onMudar={(v) => set({ valor: v })}
          erro={erroValor}
          mensagem="Informe um valor maior que zero."
        />
        <div>
          <label style={css(ROTULO_CAMPO)}>Quando foi</label>
          <SelecaoSimples
            valor={rotuloData(f.d, "")}
            opcoes={rotulos}
            onMudar={(v) => set({ d: DIAS[rotulos.indexOf(v)] ?? 0 })}
            estilo={campo(false, true)}
          />
        </div>
      </div>

      <div>
        <label style={css(ROTULO_CAMPO)}>Categoria (opcional)</label>
        <div style={css("display:flex;gap:7px;flex-wrap:wrap")}>
          {s.catsCusto.map((c) => (
            <PilulaEscolha
              key={c}
              nome={c}
              ativo={f.categoria === c}
              onClick={() => set({ categoria: f.categoria === c ? "" : c })}
            />
          ))}
        </div>
      </div>

      {/* Só custo fixo repete: um saco de feijão não volta sozinho todo mês. */}
      {f.tipo === "fixo" && (
        <button
          onClick={() => set({ recorrente: !f.recorrente })}
          style={css(
            `display:flex;align-items:center;gap:11px;padding:13px 14px;border:1px solid ${f.recorrente ? "var(--accent)" : "var(--border2)"};` +
              `border-radius:11px;background:${f.recorrente ? "var(--accent-soft)" : "var(--surface2)"};text-align:left`,
          )}
        >
          <span style={css(trilha(f.recorrente, 34, 20))}>
            <span style={css("width:16px;height:16px;border-radius:50%;background:#fff")} />
          </span>
          <span style={css("flex:1;min-width:0")}>
            <span
              style={css(
                `display:block;font:600 13px ${SANS};color:${f.recorrente ? "var(--accent)" : "var(--text2)"}`,
              )}
            >
              Repete todo mês
            </span>
            <span style={css(`display:block;margin-top:2px;font:500 11px/1.4 ${SANS};color:var(--muted)`)}>
              Aluguel, luz, internet: lance uma vez e o portal repete sozinho.
            </span>
          </span>
        </button>
      )}
    </ModalBase>
  );
}
