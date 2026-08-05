"use client";

import { ModalFrame } from "@/components/modais/Base";
import { Button, LabeledField, css, MONO, ModalFooter, FIELD_LABEL, SANS } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { MODULES, PERMISSION_MODULES } from "@/lib/dados/perfis";
import { useState } from "react";
import type { ModuleKey } from "@/types/types";

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
export function EmployeeModal({ id }: { id: string }) {
  const { a, d } = usePortal();
  const employee = d.team.find((x) => x.id === id);
  const [roleId, setPapelId] = useState(
    () => d.roles.find((p) => p.name === employee?.role)?.id ?? "",
  );

  if (!employee) return null;

  return (
    <ModalFrame
      closeLabel="Fechar"
      title={employee.name}
      subtitle="Escolha o que esta pessoa enxerga no portal."
      width={450}
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          // O modal fica na tela até a gravação responder — é o botão dele que
          // segura a espera, travado e girando.
          onConfirm={async () => {
            await a.changeEmployeeRole(id, roleId);
            a.closeModal();
          }}
          confirmText="Salvar tipo de acesso"
        />
      }
    >
      <div>
        <label style={css(FIELD_LABEL)}>Tipo de acesso</label>
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          {d.roles.map((p) => {
            const active = roleId === p.id;
            return (
              <Button
                key={p.id}
                onClick={() => setPapelId(p.id)}
                style={css(
                  `display:flex;align-items:flex-start;gap:10px;padding:12px 13px;border:1.5px solid ${active ? "var(--accent)" : "var(--border2)"};` +
                    `border-radius:11px;background:${active ? "var(--accent-soft)" : "var(--surface2)"};text-align:left`,
                )}
              >
                <span
                  style={css(
                    `flex:none;width:17px;height:17px;margin-top:1px;border-radius:50%;border:2px solid ${active ? "var(--accent)" : "var(--border2)"};` +
                      "display:flex;align-items:center;justify-content:center",
                  )}
                >
                  <span
                    style={css(
                      `width:7px;height:7px;border-radius:50%;background:${active ? "var(--accent)" : "transparent"}`,
                    )}
                  />
                </span>
                <span style={css("flex:1;min-width:0")}>
                  <span
                    style={css(
                      `display:block;font:600 13px ${SANS};color:${active ? "var(--accent)" : "var(--text)"}`,
                    )}
                  >
                    {p.name}
                  </span>
                  <span
                    style={css(`display:block;margin-top:2px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}
                  >
                    {roleSummary(p.modules, p.fixed)}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </ModalFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Tipo de acesso                                                              */
/* -------------------------------------------------------------------------- */

export function RoleModal() {
  const { s, a, has } = usePortal();
  const f = s.roleForm;
  const editing = f.id != null;

  // Só se libera o que o plano tem: mostrar "Estoque" a quem não contratou o
  // módulo prometeria um acesso que não existe.
  const available = PERMISSION_MODULES.filter((m) => has(m));
  const all = available.every((m) => f.modules.includes(m));

  const set = (p: Partial<typeof f>) => a.set({ roleForm: { ...f, ...p } });

  const toggle = (m: ModuleKey) =>
    set({ modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m] });

  return (
    <ModalFrame
      closeLabel="Fechar"
      title={editing ? "Editar tipo de acesso" : "Novo tipo de acesso"}
      subtitle="Marque o que este tipo de acesso pode abrir no portal."
      onClose={a.closeModal}
      footer={
        <ModalFooter
          cancelText="Cancelar"
          onCancel={a.closeModal}
          onConfirm={a.saveRole}
          confirmText={editing ? "Salvar alterações" : "Criar tipo"}
        />
      }
    >
      <LabeledField
        label="Nome do tipo de acesso"
        value={f.name}
        onChange={(v) => set({ name: v })}
        placeholder="Ex.: Vendedor"
        error={f.submitted && !f.name.trim()}
        message="Dê um nome ao tipo de acesso."
      />

      <div>
        <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px")}>
          <span style={css(`font:600 11px ${SANS};color:var(--text2)`)}>O que pode acessar</span>
          <Button
            onClick={() => set({ modules: all ? [] : available.slice() })}
            style={css(`font:600 11.5px ${SANS};color:var(--accent)`)}
          >
            {all ? "Desmarcar todos" : "Marcar todos"}
          </Button>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:6px")}>
          {available.map((m) => {
            const marcado = f.modules.includes(m);
            return (
              <Button
                key={m}
                onClick={() => toggle(m)}
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
                  {MODULES[m].name}
                </span>
              </Button>
            );
          })}
        </div>

        <p style={css(`margin:10px 0 0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
          Só aparecem os módulos que o seu plano tem. Para liberar outros, fale com o support na aba
          Conta.
        </p>
      </div>
    </ModalFrame>
  );
}

/** "Vê Vendas, Produtos e mais 2" — o resumo curto de um tipo de acesso. */
export function roleSummary(modules: ModuleKey[], fixed: boolean): string {
  if (fixed) return "Vê tudo e pode mexer em tudo";
  if (!modules.length) return "Não vê nenhum módulo ainda";
  const names = modules.map((m) => MODULES[m].name);
  if (names.length <= 2) return `Vê ${names.join(" e ")}`;
  return `Vê ${names.slice(0, 2).join(", ")} e mais ${names.length - 2}`;
}
