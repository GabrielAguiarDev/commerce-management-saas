"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { salvarConfiguracao } from "@/app/configuracoes/actions";
import { useAdmin } from "@/components/AdminProvider";
import { Campo, Selecao } from "@/components/campos";
import { css, MONO } from "@/lib/css";
import { EditarIcone } from "@/lib/icons";
import { chip } from "@/lib/styleKit";
import type { ConfigItem } from "@/types/types";

export function ConfigView() {
  const { s, a } = useAdmin();
  const { L } = a;
  const id = s.idioma;
  const router = useRouter();
  const [salvando, iniciarSalvar] = useTransition();

  /**
   * Grava o ajuste em `platform_settings` e relê. O estado local não é tocado:
   * quem manda no que aparece é o banco, então um valor recusado nunca fica na
   * tela parecendo salvo.
   */
  const salvar = (chave: string, valor: string | number | string[]) => {
    iniciarSalvar(async () => {
      const res = await salvarConfiguracao(chave, valor);
      if (!res.ok) return a.toast(res.mensagem, "erro");
      a.set({ cfgEditando: null, cfgRascunho: null });
      a.toast(L.toastConfig);
      router.refresh();
    });
  };

  const nomeModulo = (k: string) => {
    const m = s.modulos.find((y) => y.k === k);
    return m ? m.nome[id] || m.nome.pt : k;
  };

  /** Human-readable form of a setting's value, whatever its type. */
  const rotuloValor = (cfg: ConfigItem, v: ConfigItem["valor"]): string => {
    if (cfg.tipo === "numero") return `${v} ${L.diasSufixo}`;
    if (cfg.tipo === "mods") {
      const lista = Array.isArray(v) ? v : [];
      return lista.length ? lista.map(nomeModulo).join(" · ") : "—";
    }
    const o = (cfg.opcoes || []).find((x) => x[0] === v);
    return o ? o[1][id] || o[1].pt : String(v);
  };

  return (
    <section
      style={css(
        "background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:24px;" +
          "display:flex;flex-direction:column;gap:16px;max-width:660px",
      )}
    >
      <h3 style={css("margin:0;font-size:15px;font-weight:600;color:var(--tx)")}>
        {L.configTitulo}
      </h3>
      <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.55")}>
        {L.configTexto}
      </p>

      <div style={css("display:flex;flex-direction:column;gap:10px")}>
        {s.config.map((cfg) => {
          const editando = s.cfgEditando === cfg.id;
          const rasc = editando && s.cfgRascunho !== null ? s.cfgRascunho : cfg.valor;
          const selecionados = Array.isArray(rasc) ? rasc : [];

          return (
            <div
              key={cfg.id}
              style={css(
                "display:flex;align-items:center;justify-content:space-between;gap:16px;" +
                  "flex-wrap:wrap;padding:13px 15px;border:1px solid var(--lineSoft);border-radius:10px",
              )}
            >
              <span style={css("font-size:13px;color:var(--tx)")}>
                {cfg.rotulo[id] || cfg.rotulo.pt}
              </span>

              {!editando ? (
                <button
                  onClick={() =>
                    a.set({
                      cfgEditando: cfg.id,
                      cfgRascunho: Array.isArray(cfg.valor) ? cfg.valor.slice() : cfg.valor,
                    })
                  }
                  className="hv-acc-soft"
                  style={css(
                    "display:flex;align-items:center;gap:8px;border:1px solid transparent;" +
                      `background:none;font-family:${MONO};font-size:12px;color:var(--acc);` +
                      "border-radius:7px;padding:5px 8px;cursor:pointer",
                  )}
                >
                  {rotuloValor(cfg, cfg.valor)}
                  <EditarIcone size={12} />
                </button>
              ) : (
                <div
                  style={css(
                    "display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end",
                  )}
                >
                  {cfg.tipo === "select" && (
                    <Selecao
                      value={String(rasc)}
                      onChange={(e) => a.set({ cfgRascunho: e.target.value })}
                      aria-label={cfg.rotulo[id] || cfg.rotulo.pt}
                    >
                      {(cfg.opcoes || []).map(([v, rotulo]) => (
                        <option key={v} value={v}>
                          {rotulo[id] || rotulo.pt}
                        </option>
                      ))}
                    </Selecao>
                  )}

                  {cfg.tipo === "numero" && (
                    <Campo
                      type="number"
                      value={String(rasc)}
                      onChange={(e) => a.set({ cfgRascunho: parseInt(e.target.value, 10) || 0 })}
                      aria-label={cfg.rotulo[id] || cfg.rotulo.pt}
                      estilo={`width:96px;font-family:`}
                    />
                  )}

                  {cfg.tipo === "mods" && (
                    <div style={css("display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end")}>
                      {s.modulos.map((m) => (
                        <button
                          key={m.k}
                          onClick={() =>
                            a.set((st) => {
                              const atual = Array.isArray(st.cfgRascunho) ? st.cfgRascunho : [];
                              return {
                                cfgRascunho: atual.includes(m.k)
                                  ? atual.filter((x) => x !== m.k)
                                  : [...atual, m.k],
                              };
                            })
                          }
                          style={css(chip(selecionados.includes(m.k)))}
                        >
                          {m.nome[id] || m.nome.pt}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      salvar(
                        cfg.id,
                        Array.isArray(s.cfgRascunho)
                          ? s.cfgRascunho.slice()
                          : (s.cfgRascunho ?? cfg.valor),
                      )
                    }
                    disabled={salvando}
                    style={css(
                      "border:1px solid var(--acc);background:var(--acc);color:var(--accTx);" +
                        "font-size:12px;font-weight:600;padding:8px 12px;border-radius:8px;" +
                        (salvando ? "opacity:.6;cursor:progress" : "cursor:pointer"),
                    )}
                  >
                    {salvando ? L.enviando : L.salvarSimples}
                  </button>
                  <button
                    onClick={() => a.set({ cfgEditando: null, cfgRascunho: null })}
                    className="hv-tx"
                    style={css(
                      "border:1px solid var(--line);background:var(--panel);color:var(--tx3);" +
                        "font-size:12px;padding:8px 11px;border-radius:8px;cursor:pointer",
                    )}
                  >
                    {L.cancelar}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
