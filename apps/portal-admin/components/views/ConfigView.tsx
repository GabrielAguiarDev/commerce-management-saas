"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { saveSetting } from "@/app/configuracoes/actions";
import { useAdmin } from "@/components/AdminProvider";
import { Button, Field, css, MONO, Select } from "@aguiar/ui";
import { EditarIcone } from "@/lib/icons";
import { formatWhatsapp } from "@/lib/telefone";
import { chip } from "@aguiar/ui";
import type { SettingItem } from "@/types/types";

export function ConfigView() {
  const { s, a, isMobile } = useAdmin();
  const { L } = a;
  const id = s.language;
  const router = useRouter();
  const [recarregando, iniciarRecarga] = useTransition();

  /**
   * Grava o ajuste em `platform_settings` e relê. O estado local não é tocado:
   * quem manda no que aparece é o banco, então um valor recusado nunca fica na
   * tela parecendo salvo.
   */
  const save = async (key: string, amount: string | number | string[]) => {
    // A gravação é esperada aqui — é esta promessa que trava o botão e o faz
    // girar. A transição fica só com o `refresh`, o re-render com o valor relido.
    const res = await saveSetting(key, amount);
    if (!res.ok) return a.toast(res.message, "error");
    a.set({ editingSetting: null, settingDraft: null });
    a.toast(L.toastConfig);
    iniciarRecarga(() => router.refresh());
  };

  const moduleName = (k: string) => {
    const m = s.modules.find((y) => y.k === k);
    return m ? m.name[id] || m.name.pt : k;
  };

  /**
   * Valor de partida do rascunho ao abrir o lápis.
   *
   * A lista é copiada para o toque nos chips não mexer no valor que veio do
   * banco. O telefone começa legível — os dígitos crus são o que se guarda, não
   * o que se confere — e vazio continua vazio: um "—" dentro do campo seria o
   * primeiro caractere a apagar.
   */
  const openDraft = (cfg: SettingItem): SettingItem["value"] => {
    if (Array.isArray(cfg.value)) return cfg.value.slice();
    if (cfg.type === "telefone") return cfg.value ? formatWhatsapp(String(cfg.value)) : "";
    return cfg.value;
  };

  /** Human-readable form of a setting's value, whatever its type. */
  const valueLabel = (cfg: SettingItem, v: SettingItem["value"]): string => {
    if (cfg.type === "numero") return `${v} ${L.diasSufixo}`;
    // O banco guarda "5573999935628"; ninguém confere treze dígitos colados.
    if (cfg.type === "telefone") return formatWhatsapp(String(v));
    if (cfg.type === "mods") {
      const list = Array.isArray(v) ? v : [];
      return list.length ? list.map(moduleName).join(" · ") : "—";
    }
    const o = (cfg.options || []).find((x) => x[0] === v);
    return o ? o[1][id] || o[1].pt : String(v);
  };

  return (
    <section
      style={css(
        "background:var(--surface);border:1px solid var(--border);border-radius:12px;" +
          "display:flex;flex-direction:column;gap:16px;max-width:660px;padding:" +
          (isMobile ? "16px 14px" : "24px"),
      )}
    >
      <h3 style={css("margin:0;font-size:15px;font-weight:600;color:var(--text)")}>
        {L.configTitulo}
      </h3>
      <p style={css("margin:0;font-size:12.5px;color:var(--text2);line-height:1.55")}>
        {L.configTexto}
      </p>

      <div style={css("display:flex;flex-direction:column;gap:10px")}>
        {s.settings.map((cfg) => {
          const editing = s.editingSetting === cfg.id;
          const rasc = editing && s.settingDraft !== null ? s.settingDraft : cfg.value;
          const selected = Array.isArray(rasc) ? rasc : [];

          return (
            <div
              key={cfg.id}
              style={css(
                "display:flex;align-items:center;justify-content:space-between;gap:16px;" +
                  "flex-wrap:wrap;padding:13px 15px;border:1px solid var(--border-soft);border-radius:10px",
              )}
            >
              <span style={css("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                <span style={css("font-size:13px;color:var(--text)")}>
                  {cfg.label[id] || cfg.label.pt}
                </span>
                {cfg.hint && (
                  <span style={css("font-size:11.5px;color:var(--text2);line-height:1.45")}>
                    {cfg.hint[id] || cfg.hint.pt}
                  </span>
                )}
              </span>

              {!editing ? (
                <Button
                  onClick={() => a.set({ editingSetting: cfg.id, settingDraft: openDraft(cfg) })}
                  className="hv-acc-soft-borda"
                  style={css(
                    "display:flex;align-items:center;gap:8px;border:1px solid transparent;" +
                      `background:none;font-family:${MONO};font-size:12px;color:var(--accent-text);` +
                      "border-radius:7px;padding:5px 8px;cursor:pointer",
                  )}
                >
                  {valueLabel(cfg, cfg.value)}
                  <EditarIcone size={12} />
                </Button>
              ) : (
                <div
                  // Em edição, o bloco toma a linha inteira no celular: campo,
                  // "Salvar" e "Cancelar" espremidos à direita de um rótulo
                  // sobrariam para fora do cartão.
                  style={css(
                    "display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end" +
                      (isMobile ? ";width:100%" : ""),
                  )}
                >
                  {cfg.type === "select" && (
                    <Select
                      value={String(rasc)}
                      onChange={(e) => a.set({ settingDraft: e.target.value })}
                      aria-label={cfg.label[id] || cfg.label.pt}
                    >
                      {(cfg.options || []).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label[id] || label.pt}
                        </option>
                      ))}
                    </Select>
                  )}

                  {cfg.type === "numero" && (
                    <Field
                      type="number"
                      value={String(rasc)}
                      onChange={(e) => a.set({ settingDraft: parseInt(e.target.value, 10) || 0 })}
                      aria-label={cfg.label[id] || cfg.label.pt}
                      cssText={`width:96px;font-family:`}
                    />
                  )}

                  {cfg.type === "telefone" && (
                    <Field
                      type="tel"
                      inputMode="tel"
                      value={String(rasc)}
                      // O que foi digitado entra no rascunho como está, com
                      // parêntese e traço. Formatar a cada tecla brigaria com
                      // quem apaga no meio do número; quem arruma a forma é a
                      // Server Action, na hora de gravar.
                      onChange={(e) => a.set({ settingDraft: e.target.value })}
                      placeholder="(73) 99999-5628"
                      aria-label={cfg.label[id] || cfg.label.pt}
                      cssText="width:170px"
                    />
                  )}

                  {cfg.type === "mods" && (
                    <div style={css("display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end")}>
                      {s.modules.map((m) => (
                        <Button
                          key={m.k}
                          onClick={() =>
                            a.set((st) => {
                              const current = Array.isArray(st.settingDraft) ? st.settingDraft : [];
                              return {
                                settingDraft: current.includes(m.k)
                                  ? current.filter((x) => x !== m.k)
                                  : [...current, m.k],
                              };
                            })
                          }
                          style={css(chip(selected.includes(m.k)))}
                        >
                          {m.name[id] || m.name.pt}
                        </Button>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() =>
                      save(
                        cfg.id,
                        Array.isArray(s.settingDraft)
                          ? s.settingDraft.slice()
                          : (s.settingDraft ?? cfg.value),
                      )
                    }
                    disabled={recarregando}
                    loadingLabel={L.enviando}
                    style={css(
                      "border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);" +
                        "font-size:12px;font-weight:600;padding:8px 12px;border-radius:8px",
                    )}
                  >
                    {L.salvarSimples}
                  </Button>
                  <Button
                    onClick={() => a.set({ editingSetting: null, settingDraft: null })}
                    className="hv-texto"
                    style={css(
                      "border:1px solid var(--border);background:var(--surface);color:var(--muted);" +
                        "font-size:12px;padding:8px 11px;border-radius:8px;cursor:pointer",
                    )}
                  >
                    {L.cancelar}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
