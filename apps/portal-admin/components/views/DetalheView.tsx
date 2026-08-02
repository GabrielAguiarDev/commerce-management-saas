"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { BarraAcoes } from "@/components/BarraAcoes";
import { GradeModulos, ModuloCard } from "@/components/ModuloCard";
import { ROTAS } from "@/lib/rotas";
import { planoPorChave } from "@/lib/planos";
import { clientePorId, estaSujo } from "@/lib/state";
import { iniciais, nomePlano, planoBadge, statusBadge } from "@/lib/styleKit";

// Chaves do banco (tabela `tenants`, coluna `plan`), na ordem em que o botão


export function DetalheView({ clienteId }: { clienteId: string }) {
  const { s, a, opts } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const id = s.idioma;
  const c = clientePorId(s, clienteId);
  const existe = !!c;

  // Opening the record — or arriving back on it via the browser — must find a
  // draft to edit. `garantirRascunho` keeps an existing one for this customer.
  // Depende só de referências estáveis: `garantirRascunho` é memoizado.
  const garantirRascunho = a.garantirRascunho;
  useEffect(() => {
    if (existe) garantirRascunho(clienteId);
  }, [existe, clienteId, garantirRascunho]);

  // A deleted customer leaves a dead URL; send it back to the list.
  useEffect(() => {
    if (!c) router.replace(ROTAS.clientes);
  }, [c, router]);

  if (!c) return null;

  // The draft only applies to the customer it was opened for; otherwise the
  // saved record is what we render.
  const r =
    s.rascunho && s.rascunho.id === c.id
      ? s.rascunho
      : { plano: c.plano, mods: c.mods, valor: c.valor };
  const sujo = estaSujo(s);
  const planoAtual = planoPorChave(s.planos, r.plano);
  const custom = planoAtual?.tipo === "custom";

  const rotuloCampo =
    "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);font-weight:600";

  /**
   * "Mudar plano" cicla pelo catálogo real, na ordem de `plans.sort_order`.
   *
   * Antes a lista era `["free","paid","custom"]` em código, e os valores eram
   * "R$ 89,00" e "R$ 149,00" escritos à mão — um plano criado na tela de Planos
   * nunca apareceria aqui, e mudar o preço lá não mudava o que a ficha cobrava.
   * Agora o preço sai de `plans.price`; no plano sob medida o valor é negociado,
   * então preserva-se o que o cliente já pagava.
   */
  const trocarPlano = () =>
    a.editarRascunho((d) => {
      if (s.planos.length === 0) return d;
      const i = s.planos.findIndex((p) => p.k === d.plano);
      const novo = s.planos[(i + 1) % s.planos.length];
      return {
        ...d,
        plano: novo.k,
        valor:
          novo.tipo === "custom"
            ? // Negociado por cliente: mantém o valor atual em vez de zerar.
              c.valor !== "—"
              ? c.valor
              : d.valor
            : (novo.preco ?? "—"),
      };
    });

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <button
        onClick={() => a.ir(ROTAS.clientes)}
        className="hv-acc"
        style={css(
          "align-self:flex-start;background:none;border:none;color:var(--tx2);font-size:12.5px;" +
            "cursor:pointer;padding:0",
        )}
      >
        ← {L.voltar}
      </button>

      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px 24px;" +
            "display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap",
        )}
      >
        <div
          style={css(
            "width:58px;height:58px;flex:none;border-radius:14px;display:flex;align-items:center;" +
              "justify-content:center;font-size:18px;font-weight:600;background:var(--accSoft);color:var(--acc)",
          )}
        >
          {iniciais(c.nome)}
        </div>

        <div style={css("flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px")}>
          <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
            <h2
              style={css(
                "margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em;color:var(--tx)",
              )}
            >
              {c.nome}
            </h2>
            <span style={css(planoBadge(planoAtual))}>{nomePlano(s.planos, r.plano, id)}</span>
            <span style={css(statusBadge(c.status))}>
              {c.status === "ativo"
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
              <span style={css(rotuloCampo)}>{L.segmento}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.segmento[id]}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.responsavel}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.resp}</span>
            </div>
            {/* Cidade e telefone vêm de `tenants.city` / `tenants.phone`. O
                cadastro já os pedia; agora o banco guarda e a ficha mostra. */}
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.cidade}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.cidade}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.telefone}</span>
              <span style={css("font-size:13px;color:var(--tx)")}>{c.telefone}</span>
            </div>
            <div style={css("display:flex;flex-direction:column;gap:3px")}>
              <span style={css(rotuloCampo)}>{L.cadastro}</span>
              <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--tx)`)}>
                {c.data}
              </span>
            </div>

            {opts.mostrarValorMensal && (
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <span style={css(rotuloCampo)}>{L.mensalidade}</span>
                {/* Only a custom plan has a negotiable fee; the others are fixed. */}
                {custom ? (
                  <input
                    value={r.valor}
                    onChange={(e) =>
                      a.editarRascunho((d) => ({ ...d, valor: e.target.value }))
                    }
                    aria-label={L.mensalidade}
                    title={L.mensalidadeAjuda}
                    style={css(
                      `width:104px;font-family:${MONO};font-size:12.5px;color:var(--tx);` +
                        "background:var(--field);border:1px solid var(--line);border-radius:7px;" +
                        "padding:4px 8px;outline:none",
                    )}
                  />
                ) : (
                  <span style={css(`font-family:${MONO};font-size:12.5px;color:var(--tx3)`)}>
                    {r.valor}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={css("display:flex;gap:8px;align-items:center;flex-wrap:wrap")}>
          <button
            onClick={trocarPlano}
            className="hv-acc-line"
            style={css(
              "border:1px solid var(--line);background:var(--panel);color:var(--tx2);" +
                "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer",
            )}
          >
            {L.mudarPlano}
          </button>
          <button
            onClick={() => a.abrirModal(c.status === "ativo" ? "desativar" : "reativar", c.id)}
            style={css(
              "font-size:12.5px;font-weight:500;padding:9px 14px;border-radius:9px;cursor:pointer;" +
                (c.status === "ativo"
                  ? "border:1px solid var(--badLine);background:var(--badBg);color:var(--bad);"
                  : "border:1px solid var(--acc);background:var(--acc);color:var(--accTx);"),
            )}
          >
            {c.status === "ativo" ? L.desativar : L.reativar}
          </button>
        </div>
      </section>

      <section
        style={css(
          "background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:20px;" +
              "flex-wrap:wrap;padding:20px 24px;border-bottom:1px solid var(--lineSoft);background:var(--panel2)",
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:4px")}>
            <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--tx)")}>
              {L.modulosDoCliente}
            </h3>
            <p style={css("margin:0;font-size:12.5px;color:var(--tx2);max-width:54ch")}>
              {L.modulosAjuda}
            </p>
          </div>

          <div style={css("display:flex;align-items:center;gap:14px;flex:none")}>
            <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:2px")}>
              <span
                style={css(
                  `font-family:${MONO};font-size:20px;font-weight:600;color:var(--acc);line-height:1`,
                )}
              >
                {r.mods.length}/{s.modulos.length}
              </span>
              <span style={css("font-size:11px;color:var(--tx3)")}>{L.modulosAtivos}</span>
            </div>
            <div style={css("display:flex;gap:6px")}>
              <button
                onClick={() => a.abrirModal("todos")}
                className="hv-acc-line"
                style={css(
                  "border:1px solid var(--line);background:var(--panel);color:var(--tx2);" +
                    "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                )}
              >
                {L.ativarTodos}
              </button>
              <button
                onClick={() => a.abrirModal("limpar")}
                className="hv-tx"
                style={css(
                  "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
                    "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                )}
              >
                {L.limpar}
              </button>
            </div>
          </div>
        </div>

        <GradeModulos colunas={opts.colunasModulos}>
          {s.modulos.map((m) => {
            const on = r.mods.includes(m.k);
            return (
              <ModuloCard
                key={m.k}
                sigla={m.sigla}
                nome={m.nome[id]}
                descricao={m.desc[id]}
                ligado={on}
                estado={on ? L.ativoPara : L.desativado}
                acesso={m.tipo === "acesso"}
                tagAcesso={L.tagAcesso}
                ajudaAcesso={L.acessoAjuda}
                // Desligar pede confirmação; ligar é reversível, então vai direto.
                alternar={() =>
                  on
                    ? a.abrirModal("modOff", null, null, m.k)
                    : a.editarRascunho((d) => ({ ...d, mods: [...d.mods, m.k] }))
                }
              />
            );
          })}
        </GradeModulos>

        <div
          style={css(
            "padding:13px 24px;border-top:1px solid var(--lineSoft);background:var(--panel2);" +
              "display:flex;align-items:center;gap:9px",
          )}
        >
          <div style={css("width:6px;height:6px;border-radius:99px;background:var(--ok)")} />
          <span style={css("font-size:12px;color:var(--tx2)")}>{s.ultimaAcao || L.semAcao}</span>
        </div>
      </section>

      <BarraAcoes
        estado={sujo ? L.naoSalvo : L.tudoSalvo}
        tom={sujo ? "alerta" : "neutro"}
        secundario={{ rotulo: L.descartar, onClick: a.descartarRascunho, desabilitado: !sujo }}
        primario={{ rotulo: L.salvar, onClick: a.salvarRascunho, desabilitado: !sujo }}
      />
    </div>
  );
}
