"use client";

import { ModalBase } from "@/components/modais/Base";
import { campo, CampoDinheiro, CampoRotulado, css, RodapeModal, ROTULO_CAMPO, SANS, SelecaoSimples, Sugestoes } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { MOV_ESTILO, SUGESTOES_MOTIVO } from "@/lib/dados/estoque";
import { numBR } from "@/lib/formato";
import type { TipoMovEstoque } from "@/types/types";

const TIPOS: { chave: TipoMovEstoque; nome: string; explicacao: string }[] = [
  {
    chave: "entrada",
    nome: "Entrada",
    explicacao: "Chegou mercadoria nova. Informe quantas unidades entraram.",
  },
  {
    chave: "saida",
    nome: "Saída ou perda",
    explicacao: "Quebrou, venceu ou saiu sem venda. Informe quantas unidades saíram.",
  },
  {
    chave: "ajuste",
    nome: "Ajuste",
    explicacao: "Você contou a prateleira. Informe quanto TEM agora — o portal calcula a diferença.",
  },
];

/**
 * Registrar movimentação.
 *
 * A diferença que mais confunde está aqui: entrada e saída perguntam "quanto
 * mudou", o ajuste pergunta "quanto tem". A prévia embaixo do campo mostra o
 * saldo resultante para ninguém precisar fazer a conta de cabeça.
 */
export function MovEstoqueModal() {
  const { s, a, d } = usePortal();
  const f = s.formMov;

  const controlados = d.produtos.filter((p) => p.estoque != null);
  const produto = controlados.find((p) => p.id === f.produtoId) ?? controlados[0];
  const tipo = TIPOS.find((t) => t.chave === f.tipo)!;

  const set = (p: Partial<typeof f>) => a.set({ formMov: { ...f, ...p } });

  const qtd = Math.round(numBR(f.qtd));
  const atual = produto?.estoque ?? 0;
  const delta = f.tipo === "entrada" ? qtd : f.tipo === "saida" ? -qtd : qtd - atual;
  const resultado = atual + delta;

  const erroQtd = f.tentouSalvar && !f.qtd.trim();

  const previa = !f.qtd.trim()
    ? `Agora há ${atual} ${produto?.unidade ?? "un"} em estoque.`
    : f.tipo === "ajuste"
      ? `${atual} → ${qtd} (${delta >= 0 ? "+" : ""}${delta})`
      : `${atual} → ${resultado} (${delta >= 0 ? "+" : ""}${delta})`;

  // Estoque negativo quase sempre é erro de digitação, então o aviso é em cor
  // de atenção — mas não bloqueia: o dado da prateleira é quem manda.
  const previaCor = resultado < 0 ? "var(--danger)" : delta === 0 ? "var(--muted)" : "var(--pos)";

  return (
    <ModalBase
      titulo="Registrar movimentação"
      subtitulo="O estoque muda por movimentação — assim fica registrado o porquê."
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={a.salvarMov}
          textoConfirmar={`Registrar ${tipo.nome.toLowerCase()}`}
          corConfirmar={MOV_ESTILO[f.tipo].cor}
          corTexto="#fff"
        />
      }
    >
      <div style={css("display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px")}>
        {TIPOS.map((t) => (
          <button
            key={t.chave}
            onClick={() => set({ tipo: t.chave, qtd: "", motivo: "" })}
            style={css(
              `padding:11px 8px;border:1.5px solid ${f.tipo === t.chave ? MOV_ESTILO[t.chave].cor : "var(--border2)"};` +
                `border-radius:11px;background:${f.tipo === t.chave ? MOV_ESTILO[t.chave].bg : "var(--surface2)"};` +
                `color:${f.tipo === t.chave ? MOV_ESTILO[t.chave].cor : "var(--text2)"};font:600 12.5px/1.25 ${SANS}`,
            )}
          >
            {t.nome}
          </button>
        ))}
      </div>

      <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--muted)`)}>{tipo.explicacao}</p>

      <div>
        <label style={css(ROTULO_CAMPO)}>Produto</label>
        <SelecaoSimples
          valor={produto?.nome ?? ""}
          opcoes={controlados.map((p) => p.nome)}
          onMudar={(v) => set({ produtoId: controlados.find((p) => p.nome === v)?.id ?? null })}
          estilo={campo(false, true)}
        />
        <div style={css(`margin-top:5px;font:500 11.5px ${SANS};color:var(--muted)`)}>
          {produto
            ? `Em estoque agora: ${atual} ${produto.unidade} · mínimo ${produto.minimo ?? 0}`
            : "Nenhum produto com estoque controlado."}
        </div>
      </div>

      <div>
        <CampoRotulado
          label={f.tipo === "ajuste" ? "Quantidade contada" : "Quantidade"}
          valor={f.qtd}
          onMudar={(v) => set({ qtd: v })}
          placeholder="0"
          inputMode="numeric"
          erro={erroQtd}
          mensagem="Informe a quantidade."
        />
        <div style={css(`margin-top:6px;font:600 12px ${SANS};color:${previaCor}`)}>{previa}</div>
      </div>

      {/* O custo só faz sentido na entrada: é a compra que define quanto o
          produto passou a custar, e vira lançamento em Custos. */}
      {f.tipo === "entrada" && (
        <CampoDinheiro
          label="Custo por unidade (opcional)"
          valor={f.custo}
          onMudar={(v) => set({ custo: v })}
          nota="Atualiza o custo do produto e lança a compra em Custos."
        />
      )}

      <div>
        <CampoRotulado
          label={f.tipo === "ajuste" ? "Por que a contagem mudou" : "Motivo"}
          valor={f.motivo}
          onMudar={(v) => set({ motivo: v })}
          placeholder={
            f.tipo === "entrada"
              ? "Ex.: compra — Distribuidora Pet Sul"
              : f.tipo === "saida"
                ? "Ex.: embalagem rasgada"
                : "Ex.: contagem física"
          }
        />
        <Sugestoes itens={SUGESTOES_MOTIVO[f.tipo]} onEscolher={(v) => set({ motivo: v })} />
      </div>
    </ModalBase>
  );
}
