"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { ActionBar } from "@/components/BarraAcoes";
import { ModuleGrid, ModuleCard } from "@/components/ModuloCard";
import { ROUTES } from "@/lib/rotas";
import { num } from "@/lib/money";
import { planByKey } from "@/lib/planos";
import { customerById, isDirty } from "@/lib/state";
import { planName, planBadge, statusBadge } from "@/lib/styleKit";
import { initials } from "@aguiar/ui";

// Chaves do banco (tabela `tenants`, coluna `plan`), na ordem em que o botão


export function DetalheView({ customerId }: { customerId: string }) {
  const { s, a, options } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const id = s.language;
  const c = customerById(s, customerId);
  const exists = !!c;

  // Opening the record — or arriving back on it via the browser — must find a
  // draft to edit. `garantirRascunho` keeps an existing one for this customer.
  // Depende só de referências estáveis: `garantirRascunho` é memoizado.
  const ensureDraft = a.ensureDraft;
  useEffect(() => {
    if (exists) ensureDraft(customerId);
  }, [exists, customerId, ensureDraft]);

  // A deleted customer leaves a dead URL; send it back to the list.
  useEffect(() => {
    if (!c) router.replace(ROUTES.customers);
  }, [c, router]);

  if (!c) return null;

  // The draft only applies to the customer it was opened for; otherwise the
  // saved record is what we render.
  const r =
    s.draft && s.draft.id === c.id
      ? s.draft
      : { plan: c.plan, mods: c.mods, amount: c.amount };
  const dirty = isDirty(s);
  const currentPlan = planByKey(s.plans, r.plan);
  const custom = currentPlan?.type === "custom";

  const rotuloCampo =
    "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600";

  /**
   * "Mudar plano" cicla pelo catálogo real, na ordem de `plans.sort_order`.
   *
   * Antes a lista era `["free","paid","custom"]` em código, e os valores eram
   * "R$ 89,00" e "R$ 149,00" escritos à mão — um plano criado na tela de Planos
   * nunca apareceria aqui, e mudar o preço lá não mudava o que a ficha cobrava.
   * Agora o preço sai de `plans.price`; no plano sob medida o valor é negociado,
   * então preserva-se o que o cliente já pagava.
   */
  const switchPlan = () =>
    a.editDraft((d) => {
      if (s.plans.length === 0) return d;
      const i = s.plans.findIndex((p) => p.k === d.plan);
      const nextPlan = s.plans[(i + 1) % s.plans.length];
      return {
        ...d,
        plan: nextPlan.k,
        amount:
          nextPlan.type === "custom"
            ? // Negociado por cliente: mantém o valor atual em vez de zerar.
              c.amount !== "—"
              ? c.amount
              : d.amount
            : // Plano sem cobrança mostra "—", e não "R$ 0,00": é a mesma regra
              // que `lib/clientes.ts` aplica ao ler `tenants.monthly_fee`. Sem
              // isto, o rascunho exibia "R$ 0,00" e, depois de salvar e
              // recarregar, a mesma ficha passava a exibir "—".
              nextPlan.price && num(nextPlan.price) > 0
              ? nextPlan.price
              : "—",
      };
    });

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <Button
        onClick={() => a.goTo(ROUTES.customers)}
        className="hv-acc"
        style={css(
          "align-self:flex-start;background:none;border:none;color:var(--text2);font-size:12.5px;" +
            "cursor:pointer;padding:0",
        )}
      >
        ← {L.back}
      </Button>

      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:22px 24px;" +
            "display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap",
        )}
      >
        <div
          style={css(
            "width:58px;height:58px;flex:none;border-radius:14px;display:flex;align-items:center;" +
              "justify-content:center;font-size:18px;font-weight:600;background:var(--accent-soft);color:var(--accent)",
          )}
        >
          {initials(c.name)}
        </div>

        <div style={css("flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px")}>
          <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
            <h2
              style={css(
                "margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--text)",
              )}
            >
              {c.name}
            </h2>
            <span style={css(planBadge(currentPlan))}>{planName(s.plans, r.plan, id)}</span>
            <span style={css(statusBadge(c.status))}>
              {c.status === "active"
                ? id === "pt"
                  ? "Ativo"
                  : "Active"
                : id === "pt"
                  ? "Inativo"
                  : "Inactive"}
            </span>
          </div>

          <div style={css("display:flex;gap:26px;flex-wrap:wrap")}>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.segment}</span>
              <span style={css("font-size:13px;color:var(--text)")}>{c.segment[id]}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.owner}</span>
              <span style={css("font-size:13px;color:var(--text)")}>{c.resp}</span>
            </div>
            {/* Cidade e telefone vêm de `tenants.city` / `tenants.phone`. O
                cadastro já os pedia; agora o banco guarda e a ficha mostra. */}
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.city}</span>
              <span style={css("font-size:13px;color:var(--text)")}>{c.city}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.phone}</span>
              <span style={css("font-size:13px;color:var(--text)")}>{c.phone}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.cadastro}</span>
              <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--text)`)}>
                {c.data}
              </span>
            </div>

            {options.mostrarValorMensal && (
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <span style={css(rotuloCampo)}>{L.monthlyFee}</span>
                {/* Only a custom plan has a negotiable fee; the others are fixed. */}
                {custom ? (
                  <input
                    value={r.amount}
                    onChange={(e) =>
                      a.editDraft((d) => ({ ...d, amount: e.target.value }))
                    }
                    aria-label={L.monthlyFee}
                    title={L.mensalidadeAjuda}
                    style={css(
                      `width:104px;font-family:${MONO};font-size:12.5px;color:var(--text);` +
                        "background:var(--surface2);border:1px solid var(--border);border-radius:7px;" +
                        "padding:4px 8px;outline:none",
                    )}
                  />
                ) : (
                  <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--muted)`)}>
                    {r.amount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={css("display:flex;gap:8px;align-items:center;flex-wrap:wrap")}>
          <Button
            onClick={switchPlan}
            className="hv-acc-borda"
            style={css(
              "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer",
            )}
          >
            {L.mudarPlano}
          </Button>
          <Button
            onClick={() => a.openModal(c.status === "active" ? "deactivate" : "reactivate", c.id)}
            style={css(
              "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer;" +
                (c.status === "active"
                  ? "border:1px solid var(--danger-line);background:var(--danger-soft);color:var(--danger);"
                  : "border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);"),
            )}
          >
            {c.status === "active" ? L.deactivate : L.reactivate}
          </Button>
        </div>
      </section>

      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:20px;" +
              "flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--border-soft);background:var(--surface2)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:4px")}>
            <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--text)")}>
              {L.modulosDoCliente}
            </h3>
            <p style={css("margin:0;font-size:12.5px;color:var(--text2);max-width:54ch")}>
              {L.modulosAjuda}
            </p>
          </div>

          <div style={css("display:flex;align-items:center;gap:14px;flex:none")}>
            <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:2px")}>
              <span
                style={css(
                  `font-family:${MONO};font-size:20px;font-weight:600;color:var(--accent);line-height:1`,
                )}
              >
                {r.mods.length}/{s.modules.length}
              </span>
              <span style={css("font-size:11px;color:var(--muted)")}>{L.modulosAtivos}</span>
            </div>
            <div style={css("display:flex;gap:6px")}>
              <Button
                onClick={() => a.openModal("all")}
                className="hv-acc-borda"
                style={css(
                  "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                    "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                )}
              >
                {L.ativarTodos}
              </Button>
              <Button
                onClick={() => a.openModal("clear")}
                className="hv-texto"
                style={css(
                  "border:1px solid var(--border);background:var(--surface);color:var(--muted);" +
                    "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                )}
              >
                {L.clear}
              </Button>
            </div>
          </div>
        </div>

        <ModuleGrid columns={options.colunasModulos}>
          {s.modules.map((m) => {
            const on = r.mods.includes(m.k);
            return (
              <ModuleCard
                key={m.k}
                initials={m.initials}
                name={m.name[id]}
                description={m.desc[id]}
                on={on}
                estado={on ? L.ativoPara : L.desativado}
                acesso={m.type === "acesso"}
                tagAcesso={L.tagAcesso}
                ajudaAcesso={L.acessoAjuda}
                // Desligar pede confirmação; ligar é reversível, então vai direto.
                toggle={() =>
                  on
                    ? a.openModal("moduleOff", null, null, m.k)
                    : a.editDraft((d) => ({ ...d, mods: [...d.mods, m.k] }))
                }
              />
            );
          })}
        </ModuleGrid>

        <div
          style={css(
            "padding:13px 24px;border-top:1px solid var(--border-soft);background:var(--surface2);" +
              "display:flex;align-items:center;gap:9px",
          )}
        >
          <div style={css("width:6px;height:6px;border-radius:99px;background:var(--pos)")} />
          <span style={css("font-size:12px;color:var(--text2)")}>{s.lastAction || L.semAcao}</span>
        </div>
      </section>

      <ActionBar
        estado={dirty ? L.naoSalvo : L.tudoSalvo}
        tone={dirty ? "warning" : "neutral"}
        secondary={{ label: L.discard, onClick: a.discardDraft, disabled: !dirty }}
        primary={{ label: L.save, onClick: a.saveDraft, disabled: !dirty }}
      />
    </div>
  );
}
