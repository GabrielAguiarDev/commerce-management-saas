"use client";

import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { BaixarIcone, ClientesNovoIcone } from "@/lib/icons";
import { Selecao } from "@/components/campos";
import { MenuAcoes } from "@/components/MenuAcoes";
import { CampoBusca, CelulaNegocio } from "@/components/shared";
import { planoPorChave } from "@/lib/planos";
import { ROTAS } from "@/lib/rotas";
import { nomePlano, planoBadge, statusBadge } from "@/lib/styleKit";

const GRADE =
  "display:grid;grid-template-columns:minmax(200px,2fr) minmax(130px,1.05fr) 92px 92px 100px 168px;" +
  "gap:12px;min-width:812px;";

const ITEM_MENU =
  "text-align:left;background:none;border:none;font-size:12.5px;" +
  "padding:8px 10px;border-radius:6px;cursor:pointer;";

export function ClientesView() {
  const { s, a, cs, vazio, opts } = useAdmin();
  const { L } = a;
  const id = s.idioma;
  const fecharMenu = () => a.set({ menuLinha: null });

  const q = s.busca.trim().toLowerCase();
  const filtrados = cs.filter(
    (x) =>
      (!q || x.nome.toLowerCase().includes(q) || x.segmento[id].toLowerCase().includes(q)) &&
      (s.plano === "todos" || x.plano === s.plano) &&
      (s.status === "todos" || x.status === s.status),
  );

  const exportarCsv = () => {
    const linhas = [
      [L.negocio, L.segmento, L.plano, L.status, L.cadastro, L.mensalidade].join(";"),
    ].concat(
      filtrados.map((x) =>
        [
          x.nome,
          x.segmento[id],
          nomePlano(s.planos, x.plano, id),
          x.status === "ativo" ? L.ativos : L.inativos,
          x.data,
          x.valor,
        ].join(";"),
      ),
    );
    a.baixarCsv(linhas, "aguiar-one-clientes.csv");
  };

  return (
    <section
      style={css(
        "background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow-x:auto",
      )}
    >
      <div
        style={css(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 20px;" +
            "border-bottom:1px solid var(--lineSoft);min-width:812px",
        )}
      >
        <CampoBusca
          valor={s.busca}
          onChange={(v) => a.set({ busca: v })}
          placeholder={L.buscarCliente}
          estiloCaixa="flex:1;min-width:220px;max-width:330px;"
        />

        <Selecao
          value={s.plano}
          onChange={(e) => a.set({ plano: e.target.value })}
          aria-label={L.plano}
        >
          <option value="todos">{L.todosPlanos}</option>
          {/* Opções vindas de `plans` — um plano criado na tela de Planos
              aparece aqui sozinho, sem ninguém lembrar de editar esta lista. */}
          {s.planos.map((p) => (
            <option key={p.k} value={p.k}>
              {p.nome[id] || p.nome.pt}
            </option>
          ))}
        </Selecao>

        <Selecao
          value={s.status}
          onChange={(e) => a.set({ status: e.target.value })}
          aria-label={L.status}
        >
          <option value="todos">{L.todosStatus}</option>
          <option value="ativo">{L.ativos}</option>
          <option value="inativo">{L.inativos}</option>
        </Selecao>

        <div style={css("margin-left:auto;display:flex;align-items:center;gap:12px")}>
          <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--tx3)`)}>
            {filtrados.length + (id === "pt" ? " de " : " of ") + cs.length}
          </span>
          <button
            onClick={exportarCsv}
            title={L.exportarAjuda}
            className="hv-acc-line"
            style={css(
              "display:flex;align-items:center;gap:7px;background:var(--panel);" +
                "border:1px solid var(--line);color:var(--tx2);font-size:12.5px;font-weight:500;" +
                "padding:9px 13px;border-radius:9px;cursor:pointer",
            )}
          >
            <BaixarIcone />
            {L.exportarCsv}
          </button>
          <button
            onClick={() => a.ir(ROTAS.novoCliente)}
            className="hv-bright"
            style={css(
              "display:flex;align-items:center;gap:7px;background:var(--acc);" +
                "border:1px solid var(--acc);color:var(--accTx);font-size:13px;font-weight:500;" +
                "padding:10px 15px;border-radius:9px;cursor:pointer",
            )}
          >
            <span style={css("font-size:14px;line-height:1")}>+</span>
            {L.novoCliente}
          </button>
        </div>
      </div>

      {s.erroClientes && (
        <div
          role="alert"
          style={css(
            "padding:12px 20px;border-bottom:1px solid var(--lineSoft);background:var(--badBg);" +
              "color:var(--bad);font-size:12.5px;min-width:812px",
          )}
        >
          {s.erroClientes}
        </div>
      )}

      <div
        style={css(
          GRADE +
            "padding:10px 20px;background:var(--head);border-bottom:1px solid var(--lineSoft);" +
            "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:600",
        )}
      >
        <span>{L.negocio}</span>
        <span>{L.segmento}</span>
        <span>{L.plano}</span>
        <span>{L.status}</span>
        <span>{L.cadastro}</span>
        <span style={css("text-align:right")}>{L.acoes}</span>
      </div>

      {(vazio ? [] : filtrados).map((c) => (
        <div
          key={c.id}
          className="hv-row"
          style={css(
            GRADE +
              "align-items:center;padding:13px 20px;border-bottom:1px solid var(--lineSoft);" +
              (c.status === "inativo" && opts.destacarInativos ? "background:var(--panel2);" : ""),
          )}
        >
          <CelulaNegocio
            cliente={c}
            plano={planoPorChave(s.planos, c.plano)}
            totalMods={s.modulos.length}
            id={id}
          />
          <span style={css("font-size:12.5px;color:var(--tx2)")}>{c.segmento[id]}</span>
          <span style={css(planoBadge(planoPorChave(s.planos, c.plano)))}>{nomePlano(s.planos, c.plano, id)}</span>
          <span style={css(statusBadge(c.status))}>
            {c.status === "ativo"
              ? id === "pt"
                ? "Ativo"
                : "Active"
              : id === "pt"
                ? "Inativo"
                : "Inactive"}
          </span>
          <span style={css(`font-family:${MONO};font-size:11.5px;color:var(--tx3)`)}>{c.data}</span>

          <div style={css("display:flex;justify-content:flex-end;gap:6px")}>
            <button
              onClick={() => a.abrirCliente(c.id)}
              className="hv-bright-sm"
              style={css(
                "border:1px solid var(--accLine);background:var(--accSoft);color:var(--acc);" +
                  "font-size:12px;font-weight:500;padding:7px 12px;border-radius:7px;cursor:pointer",
              )}
            >
              {L.gerenciar}
            </button>

            <MenuAcoes
              aberto={s.menuLinha === c.id}
              onAlternar={() => a.set((st) => ({ menuLinha: st.menuLinha === c.id ? null : c.id }))}
              onFechar={fecharMenu}
              rotulo={L.acoes}
            >
              <button
                onClick={() => a.abrirCliente(c.id)}
                role="menuitem"
                className="hv-menu"
                style={css(ITEM_MENU + "color:var(--tx2)")}
              >
                {L.gerenciar}
              </button>
              <button
                onClick={() => a.abrirModal(c.status === "ativo" ? "desativar" : "reativar", c.id)}
                role="menuitem"
                className="hv-menu"
                style={css(ITEM_MENU + "color:var(--tx2)")}
              >
                {c.status === "ativo" ? L.desativar : L.reativar}
              </button>
              <button
                onClick={() => a.abrirModal("excluir", c.id)}
                role="menuitem"
                className="hv-bad"
                style={css(ITEM_MENU + "color:var(--bad)")}
              >
                {L.excluir}
              </button>
            </MenuAcoes>
          </div>
        </div>
      ))}

      {!vazio && filtrados.length === 0 && (
        <div style={css("padding:44px 20px;text-align:center;color:var(--tx3);font-size:13px")}>
          {L.semResultados}
        </div>
      )}

      {(vazio || cs.length === 0) && (
        <div
          style={css(
            "display:flex;flex-direction:column;align-items:center;gap:13px;padding:62px 24px;text-align:center",
          )}
        >
          <div
            style={css(
              "width:50px;height:50px;border-radius:14px;background:var(--accSoft);" +
                "border:1px solid var(--accLine);color:var(--acc);display:flex;" +
                "align-items:center;justify-content:center",
            )}
          >
            <ClientesNovoIcone />
          </div>
          <span style={css("font-size:15px;font-weight:600;color:var(--tx)")}>
            {L.vazioClientesTitulo}
          </span>
          <span style={css("font-size:12.5px;color:var(--tx2);line-height:1.55;max-width:44ch")}>
            {L.vazioClientesTexto}
          </span>
          <button
            onClick={() => a.ir(ROTAS.novoCliente)}
            className="hv-bright"
            style={css(
              "margin-top:4px;display:flex;align-items:center;gap:7px;background:var(--acc);" +
                "border:1px solid var(--acc);color:var(--accTx);font-size:13px;font-weight:500;" +
                "padding:10px 16px;border-radius:9px;cursor:pointer",
            )}
          >
            <span style={css("font-size:14px;line-height:1")}>+</span>
            {L.vazioClientesBotao}
          </button>
        </div>
      )}
    </section>
  );
}
