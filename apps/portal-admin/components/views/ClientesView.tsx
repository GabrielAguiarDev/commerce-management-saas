"use client";

import { useAdmin } from "@/components/AdminProvider";
import { Button, SearchField, css, MENU_ITEM, ActionsMenu, MONO, Select } from "@aguiar/ui";
import { BaixarIcone, ClientesNovoIcone } from "@/lib/icons";
import { BusinessCell } from "@/components/shared";
import { planByKey } from "@/lib/planos";
import { ROUTES } from "@/lib/rotas";
import { planName, planBadge, statusBadge } from "@/lib/styleKit";

const GRID =
  "display:grid;grid-template-columns:minmax(200px,2fr) minmax(130px,1.05fr) 92px 92px 100px 168px;" +
  "gap:12px;min-width:812px;";

export function ClientesView() {
  const { s, a, cs, empty, options } = useAdmin();
  const { L } = a;
  const id = s.language;

  const q = s.search.trim().toLowerCase();
  const filtered = cs.filter(
    (x) =>
      (!q || x.name.toLowerCase().includes(q) || x.segment[id].toLowerCase().includes(q)) &&
      (s.plan === "all" || x.plan === s.plan) &&
      (s.status === "all" || x.status === s.status),
  );

  const exportarCsv = () => {
    const rows = [
      [L.business, L.segment, L.plan, L.status, L.cadastro, L.monthlyFee].join(";"),
    ].concat(
      filtered.map((x) =>
        [
          x.name,
          x.segment[id],
          planName(s.plans, x.plan, id),
          x.status === "active" ? L.active : L.inativos,
          x.data,
          x.amount,
        ].join(";"),
      ),
    );
    a.baixarCsv(rows, "aguiar-one-clientes.csv");
  };

  return (
    <section
      style={css(
        "background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow-x:auto",
      )}
    >
      <div
        style={css(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 20px;" +
            "border-bottom:1px solid var(--border-soft);min-width:812px",
        )}
      >
        <SearchField
          value={s.search}
          onChange={(v) => a.set({ search: v })}
          placeholder={L.buscarCliente}
          boxCssText="flex:1;min-width:220px;max-width:330px;"
        />

        <Select
          value={s.plan}
          onChange={(e) => a.set({ plan: e.target.value })}
          aria-label={L.plan}
        >
          <option value="all">{L.todosPlanos}</option>
          {/* Opções vindas de `plans` — um plano criado na tela de Planos
              aparece aqui sozinho, sem ninguém lembrar de editar esta lista. */}
          {s.plans.map((p) => (
            <option key={p.k} value={p.k}>
              {p.name[id] || p.name.pt}
            </option>
          ))}
        </Select>

        <Select
          value={s.status}
          onChange={(e) => a.set({ status: e.target.value })}
          aria-label={L.status}
        >
          <option value="all">{L.todosStatus}</option>
          <option value="active">{L.active}</option>
          <option value="inactive">{L.inativos}</option>
        </Select>

        <div style={css("margin-left:auto;display:flex;align-items:center;gap:12px")}>
          <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>
            {filtered.length + (id === "pt" ? " de " : " of ") + cs.length}
          </span>
          <Button
            onClick={exportarCsv}
            title={L.exportarAjuda}
            className="hv-acc-borda"
            style={css(
              "display:flex;align-items:center;gap:7px;background:var(--surface);" +
                "border:1px solid var(--border);color:var(--text2);font-size:12.5px;font-weight:500;" +
                "padding:9px 13px;border-radius:9px;cursor:pointer",
            )}
          >
            <BaixarIcone />
            {L.exportarCsv}
          </Button>
          <Button
            onClick={() => a.goTo(ROUTES.novoCliente)}
            className="hv-brilho"
            style={css(
              "display:flex;align-items:center;gap:7px;background:var(--accent);" +
                "border:1px solid var(--accent);color:var(--accent-ink);font-size:13px;font-weight:500;" +
                "padding:10px 15px;border-radius:9px;cursor:pointer",
            )}
          >
            <span style={css("font-size:14px;line-height:1")}>+</span>
            {L.novoCliente}
          </Button>
        </div>
      </div>

      {s.customersError && (
        <div
          role="alert"
          style={css(
            "padding:12px 20px;border-bottom:1px solid var(--border-soft);background:var(--danger-soft);" +
              "color:var(--danger);font-size:12.5px;min-width:812px",
          )}
        >
          {s.customersError}
        </div>
      )}

      <div
        style={css(
          GRID +
            "padding:10px 20px;background:var(--surface2);border-bottom:1px solid var(--border-soft);" +
            "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600",
        )}
      >
        <span>{L.business}</span>
        <span>{L.segment}</span>
        <span>{L.plan}</span>
        <span>{L.status}</span>
        <span>{L.cadastro}</span>
        <span style={css("text-align:right")}>{L.actions}</span>
      </div>

      {(empty ? [] : filtered).map((c) => (
        <div
          key={c.id}
          className="hv-linha"
          style={css(
            GRID +
              "align-items:center;padding:13px 20px;border-bottom:1px solid var(--border-soft);" +
              (c.status === "inactive" && options.destacarInativos ? "background:var(--surface2);" : ""),
          )}
        >
          <BusinessCell
            customer={c}
            plan={planByKey(s.plans, c.plan)}
            totalMods={s.modules.length}
            id={id}
          />
          <span style={css("font-size:12.5px;color:var(--text2)")}>{c.segment[id]}</span>
          <span style={css(planBadge(planByKey(s.plans, c.plan)))}>{planName(s.plans, c.plan, id)}</span>
          <span style={css(statusBadge(c.status))}>
            {c.status === "active"
              ? id === "pt"
                ? "Ativo"
                : "Active"
              : id === "pt"
                ? "Inativo"
                : "Inactive"}
          </span>
          <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--muted)`)}>{c.data}</span>

          <div style={css("display:flex;justify-content:flex-end;gap:6px")}>
            <Button
              onClick={() => a.openCustomer(c.id)}
              className="hv-brilho-sm"
              style={css(
                "border:1px solid var(--accent-line);background:var(--accent-soft);color:var(--accent);" +
                  "font-size:12px;font-weight:500;padding:7px 12px;border-radius:7px;cursor:pointer",
              )}
            >
              {L.gerenciar}
            </Button>

            <ActionsMenu
              open={s.rowMenu === c.id}
              onOpenChange={(v) => a.set({ rowMenu: v ? c.id : null })}
              label={L.actions}
            >
              <Button
                onClick={() => a.openCustomer(c.id)}
                role="menuitem"
                className="hv-menu"
                style={css(MENU_ITEM + "color:var(--text2)")}
              >
                {L.gerenciar}
              </Button>
              <Button
                onClick={() => a.openModal(c.status === "active" ? "deactivate" : "reactivate", c.id)}
                role="menuitem"
                className="hv-menu"
                style={css(MENU_ITEM + "color:var(--text2)")}
              >
                {c.status === "active" ? L.deactivate : L.reactivate}
              </Button>
              <Button
                onClick={() => a.openModal("delete", c.id)}
                role="menuitem"
                className="hv-perigo"
                style={css(MENU_ITEM + "color:var(--danger)")}
              >
                {L.excluir}
              </Button>
            </ActionsMenu>
          </div>
        </div>
      ))}

      {!empty && filtered.length === 0 && (
        <div style={css("padding:44px 20px;text-align:center;color:var(--muted);font-size:13px")}>
          {L.semResultados}
        </div>
      )}

      {(empty || cs.length === 0) && (
        <div
          style={css(
            "display:flex;flex-direction:column;align-items:center;gap:13px;padding:62px 24px;text-align:center",
          )}
        >
          <div
            style={css(
              "width:50px;height:50px;border-radius:14px;background:var(--accent-soft);" +
                "border:1px solid var(--accent-line);color:var(--accent);display:flex;" +
                "align-items:center;justify-content:center",
            )}
          >
            <ClientesNovoIcone />
          </div>
          <span style={css("font-size:15px;font-weight:600;color:var(--text)")}>
            {L.vazioClientesTitulo}
          </span>
          <span style={css("font-size:12.5px;color:var(--text2);line-height:1.55;max-width:44ch")}>
            {L.vazioClientesTexto}
          </span>
          <Button
            onClick={() => a.goTo(ROUTES.novoCliente)}
            className="hv-brilho"
            style={css(
              "margin-top:4px;display:flex;align-items:center;gap:7px;background:var(--accent);" +
                "border:1px solid var(--accent);color:var(--accent-ink);font-size:13px;font-weight:500;" +
                "padding:10px 16px;border-radius:9px;cursor:pointer",
            )}
          >
            <span style={css("font-size:14px;line-height:1")}>+</span>
            {L.vazioClientesBotao}
          </Button>
        </div>
      )}
    </section>
  );
}
