"use client";

import { ModalBase } from "@/components/modais/Base";
import { CampoRotulado, css, MONO, RodapeModal, ROTULO_CAMPO, SANS } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { MODULOS, MODULOS_PERM } from "@/lib/dados/perfis";
import { useState } from "react";
import type { ModuloKey } from "@/types/types";

/* -------------------------------------------------------------------------- */
/* Funcionário                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Troca o tipo de acesso de quem já está na equipe.
 *
 * Não dá para CADASTRAR alguém por aqui: criar um funcionário significa criar
 * um usuário no Auth, e isso exige a `service_role` — que este projeto não tem,
 * por decisão de segurança. Enquanto não houver um convite feito pelo admin (ou
 * uma Edge Function), o portal administra apenas quem já existe.
 */
export function FuncionarioModal({ id }: { id: string }) {
  const { a, d } = usePortal();
  const funcionario = d.equipe.find((x) => x.id === id);
  const [papelId, setPapelId] = useState(
    () => d.papeis.find((p) => p.nome === funcionario?.papel)?.id ?? "",
  );

  if (!funcionario) return null;

  return (
    <ModalBase
      titulo={funcionario.nome}
      subtitulo="Escolha o que esta pessoa enxerga no portal."
      largura={450}
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={() => {
            a.mudarPapelDoFuncionario(id, papelId);
            a.fecharModal();
          }}
          textoConfirmar="Salvar tipo de acesso"
        />
      }
    >
      <div>
        <label style={css(ROTULO_CAMPO)}>Tipo de acesso</label>
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          {d.papeis.map((p) => {
            const ativo = papelId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPapelId(p.id)}
                style={css(
                  `display:flex;align-items:flex-start;gap:10px;padding:12px 13px;border:1.5px solid ${ativo ? "var(--accent)" : "var(--border2)"};` +
                    `border-radius:11px;background:${ativo ? "var(--accent-soft)" : "var(--surface2)"};text-align:left`,
                )}
              >
                <span
                  style={css(
                    `flex:none;width:17px;height:17px;margin-top:1px;border-radius:50%;border:2px solid ${ativo ? "var(--accent)" : "var(--border2)"};` +
                      "display:flex;align-items:center;justify-content:center",
                  )}
                >
                  <span
                    style={css(
                      `width:7px;height:7px;border-radius:50%;background:${ativo ? "var(--accent)" : "transparent"}`,
                    )}
                  />
                </span>
                <span style={css("flex:1;min-width:0")}>
                  <span
                    style={css(
                      `display:block;font:600 13px ${SANS};color:${ativo ? "var(--accent)" : "var(--text)"}`,
                    )}
                  >
                    {p.nome}
                  </span>
                  <span
                    style={css(`display:block;margin-top:2px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}
                  >
                    {resumoPapel(p.modulos, p.fixo)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalBase>
  );
}

/* -------------------------------------------------------------------------- */
/* Tipo de acesso                                                              */
/* -------------------------------------------------------------------------- */

export function PapelModal() {
  const { s, a, tem } = usePortal();
  const f = s.formPapel;
  const editando = f.id != null;

  // Só se libera o que o plano tem: mostrar "Estoque" a quem não contratou o
  // módulo prometeria um acesso que não existe.
  const disponiveis = MODULOS_PERM.filter((m) => tem(m));
  const todos = disponiveis.every((m) => f.modulos.includes(m));

  const set = (p: Partial<typeof f>) => a.set({ formPapel: { ...f, ...p } });

  const alternar = (m: ModuloKey) =>
    set({ modulos: f.modulos.includes(m) ? f.modulos.filter((x) => x !== m) : [...f.modulos, m] });

  return (
    <ModalBase
      titulo={editando ? "Editar tipo de acesso" : "Novo tipo de acesso"}
      subtitulo="Marque o que este tipo de acesso pode abrir no portal."
      onFechar={a.fecharModal}
      rodape={
        <RodapeModal
          onCancelar={a.fecharModal}
          onConfirmar={a.salvarPapel}
          textoConfirmar={editando ? "Salvar alterações" : "Criar tipo"}
        />
      }
    >
      <CampoRotulado
        label="Nome do tipo de acesso"
        valor={f.nome}
        onMudar={(v) => set({ nome: v })}
        placeholder="Ex.: Vendedor"
        erro={f.tentouSalvar && !f.nome.trim()}
        mensagem="Dê um nome ao tipo de acesso."
      />

      <div>
        <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px")}>
          <span style={css(`font:600 11px ${SANS};color:var(--text2)`)}>O que pode acessar</span>
          <button
            onClick={() => set({ modulos: todos ? [] : disponiveis.slice() })}
            style={css(`font:600 11.5px ${SANS};color:var(--accent)`)}
          >
            {todos ? "Desmarcar todos" : "Marcar todos"}
          </button>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:6px")}>
          {disponiveis.map((m) => {
            const marcado = f.modulos.includes(m);
            return (
              <button
                key={m}
                onClick={() => alternar(m)}
                style={css(
                  `display:flex;align-items:center;gap:11px;padding:11px 13px;border:1px solid ${marcado ? "var(--accent)" : "var(--border)"};` +
                    `border-radius:11px;background:${marcado ? "var(--accent-soft)" : "var(--surface2)"};text-align:left`,
                )}
              >
                <span
                  style={css(
                    `flex:none;width:20px;height:20px;border-radius:6px;border:1.5px solid ${marcado ? "var(--accent)" : "var(--border2)"};` +
                      `background:${marcado ? "var(--accent)" : "transparent"};color:#fff;display:flex;align-items:center;justify-content:center;font:700 11px ${MONO}`,
                  )}
                >
                  {marcado ? "✓" : ""}
                </span>
                <span
                  style={css(
                    `flex:1;min-width:0;font:600 13px ${SANS};color:${marcado ? "var(--accent)" : "var(--text)"}`,
                  )}
                >
                  {MODULOS[m].nome}
                </span>
              </button>
            );
          })}
        </div>

        <p style={css(`margin:10px 0 0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
          Só aparecem os módulos que o seu plano tem. Para liberar outros, fale com o suporte na aba
          Conta.
        </p>
      </div>
    </ModalBase>
  );
}

/** "Vê Vendas, Produtos e mais 2" — o resumo curto de um tipo de acesso. */
export function resumoPapel(modulos: ModuloKey[], fixo: boolean): string {
  if (fixo) return "Vê tudo e pode mexer em tudo";
  if (!modulos.length) return "Não vê nenhum módulo ainda";
  const nomes = modulos.map((m) => MODULOS[m].nome);
  if (nomes.length <= 2) return `Vê ${nomes.join(" e ")}`;
  return `Vê ${nomes.slice(0, 2).join(", ")} e mais ${nomes.length - 2}`;
}
