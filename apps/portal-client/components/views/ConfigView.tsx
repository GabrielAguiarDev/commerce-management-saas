"use client";

import {
  primaryButton,
  Button,
  field,
  css,
  PillGroup,
  Switch,
  MONO,
  Panel,
  FIELD_LABEL,
  KPI_LABEL,
  SANS,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
} from "@aguiar/ui";
import type { ReactNode } from "react";
import { roleSummary } from "@/components/modais/EquipeModais";
import { usePortal } from "@/components/PortalProvider";
import { RowMenu } from "@/components/ui";
import { MODULES, PERMISSION_MODULES } from "@/lib/dados/perfis";
import { categoriesOf } from "@/lib/dados/produtos";
import { METHODS, METHOD_NOTE, PAYMENT_LABEL } from "@/lib/dados/vendas";
import { dataDirty } from "@/lib/estado";
import { initialsOf } from "@/lib/formato";
import { ROUTES } from "@/lib/rotas";
import type { SettingsTab } from "@/types/estado";
import type { BusinessData, ModuleKey } from "@/types/types";

const TABS: { key: SettingsTab; name: string }[] = [
  { key: "data", name: "Dados do negócio" },
  { key: "prefs", name: "Preferências" },
  { key: "team", name: "Equipe e acessos" },
  { key: "account", name: "Conta e plano" },
];

/**
 * Configurações.
 *
 * Quatro abas com públicos diferentes: o que o cliente vê no comprovante, como
 * ele prefere trabalhar, quem mais entra no portal, e o que o plano dele tem.
 * A última é só leitura de propósito — mudar plano é conversa com o suporte.
 */
export function ConfigView() {
  const { s, a } = usePortal();
  const tab = s.fConfig.tab;

  return (
    <div>
      <div style={css("margin-bottom:16px")}>
        <h1 style={css(SCREEN_TITLE)}>Configurações</h1>
        <p style={css(SCREEN_SUBTITLE)}>
          Ajuste os dados do seu negócio, como você trabalha e quem pode usar o portal.
        </p>
      </div>

      <div style={css("margin-bottom:16px")}>
        <PillGroup<SettingsTab>
          options={TABS}
          current={tab}
          onPick={(v) => a.set({ fConfig: { ...s.fConfig, tab: v } })}
        />
      </div>

      {tab === "data" && <DataTab />}
      {tab === "prefs" && <PreferencesTab />}
      {tab === "team" && <TeamTab />}
      {tab === "account" && <AccountTab />}
    </div>
  );
}

/**
 * Um aviso honesto para o que a tela mostra mas o banco ainda não guarda.
 *
 * Existe porque a alternativa é pior: um interruptor que parece salvar e não
 * salva faz a pessoa descobrir sozinha, dias depois, que o portal mentiu.
 */
function UnsavedNotice({ children }: { children: ReactNode }) {
  return (
    <div
      style={css(
        "display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px dashed var(--border2);" +
          "border-radius:12px;background:var(--surface2)",
      )}
    >
      <span
        style={css(
          `flex:none;padding:3px 9px;border-radius:999px;background:var(--warn-soft);color:var(--warn);font:600 10.5px ${SANS}`,
        )}
      >
        Em breve
      </span>
      <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}>{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dados do negócio                                                            */
/* -------------------------------------------------------------------------- */

const FIELDS: { key: keyof BusinessData; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome do negócio", placeholder: "Como o cliente conhece você" },
  { key: "type", label: "Ramo", placeholder: "Ex.: petshop, lanchonete" },
  { key: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
  { key: "city", label: "Cidade", placeholder: "Ex.: Salvador/BA" },
];

function DataTab() {
  const { s, a, isMobile, d } = usePortal();
  const r = s.draftData;
  const dirty = dataDirty(s, d.data);
  const cols = isMobile ? "1fr" : "1fr 1fr";

  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      <div style={css("padding:15px 18px;border-bottom:1px solid var(--border)")}>
        <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>Dados do negócio</h2>
        <p style={css(`margin:3px 0 0;font:400 12px ${SANS};color:var(--muted)`)}>
          É o que aparece no portal e nos comprovantes das vendas.
        </p>
      </div>

      <div style={css("padding:18px;display:flex;flex-direction:column;gap:16px")}>
        <div style={css("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
          <span
            style={css(
              "flex:none;width:62px;height:62px;border-radius:16px;background:var(--petrol);color:#fff;" +
                `display:flex;align-items:center;justify-content:center;font:700 21px ${SANS}`,
            )}
          >
            {initialsOf(r.name) || d.business.initials}
          </span>
          <div style={css("flex:1;min-width:180px")}>
            <div style={css(`font:600 13px ${SANS}`)}>Logo do negócio</div>
            <p style={css(`margin:3px 0 8px;font:400 11.5px/1.45 ${SANS};color:var(--muted)`)}>
              Enquanto você não enviar uma imagem, usamos as iniciais do nome.
            </p>
            <Button
              onClick={() => a.notify("O envio de imagem ainda não está disponível", "warn")}
              className="hv-borda"
              style={css(
                `padding:9px 14px;border-radius:9px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font:600 12px ${SANS}`,
              )}
            >
              Enviar imagem
            </Button>
          </div>
        </div>

        <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
          {FIELDS.map((c) => {
            // Nome vazio quebraria o menu e o comprovante — é o único obrigatório.
            const error = c.key === "name" && !r.name.trim();
            return (
              <div key={c.key}>
                <label style={css(FIELD_LABEL)}>{c.label}</label>
                <input
                  value={r[c.key]}
                  onChange={(e) => a.set({ draftData: { ...r, [c.key]: e.target.value } })}
                  placeholder={c.placeholder}
                  style={css(field(error))}
                />
                {error && (
                  <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>
                    O negócio precisa de um nome.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <UnsavedNotice>
          CNPJ/CPF e endereço completo ainda não têm onde ser guardados. Até lá, informe-os ao
          support para constarem na nota.
        </UnsavedNotice>
      </div>

      <div
        style={css(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;border-top:1px solid var(--border);background:var(--surface2)",
        )}
      >
        <Button
          onClick={a.saveData}
          disabled={!r.name.trim()}
          loadingLabel="Salvando…"
          className="hv-brilho"
          style={css(primaryButton())}
        >
          Salvar alterações
        </Button>
        {dirty && (
          <>
            <span
              style={css(
                `display:flex;align-items:center;gap:8px;font:600 12px ${SANS};color:var(--warn)`,
              )}
            >
              <span style={css("width:7px;height:7px;border-radius:50%;background:var(--warn)")} />
              Você tem alterações não salvas
            </span>
            <Button
              onClick={a.discardData}
              style={css(`padding:13px 16px;border-radius:11px;font:600 13px ${SANS};color:var(--text2)`)}
            >
              Descartar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preferências                                                                */
/* -------------------------------------------------------------------------- */

function PreferencesTab() {
  const { s, a, has, d } = usePortal();
  const categories = categoriesOf(d.products);

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <Panel
        title="Formas de pagamento que você aceita"
        note="Só as ligadas aparecem na hora de registrar a venda."
        flush
      >
        <div style={css("display:flex;flex-direction:column")}>
          {METHODS.map((f) => (
            <Switch
              key={f}
              on={s.acceptedMethods.includes(f)}
              onToggle={() => a.toggleMethod(f)}
              title={PAYMENT_LABEL[f]}
              note={METHOD_NOTE[f]}
              state={s.acceptedMethods.includes(f) ? "Aceito" : "Desligado"}
            />
          ))}
        </div>
        <div style={css("padding:13px 18px;border-top:1px solid var(--border);background:var(--surface2)")}>
          <UnsavedNotice>
            Esta escolha vale só nesta sessão — ainda não há onde guardá-la. No próximo login todas
            as formas voltam ligadas.
          </UnsavedNotice>
        </div>
      </Panel>

      <Panel
        title="Categorias do catálogo"
        note="Saem dos próprios produtos: uma categoria existe enquanto algum produto a usa."
        flush
      >
        <div style={css("display:flex;flex-direction:column")}>
          {categories.length === 0 ? (
            <div
              style={css(
                `padding:22px 18px;text-align:center;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
              )}
            >
              Nenhuma categoria ainda. Ela nasce quando você cadastra um produto.
            </div>
          ) : (
            categories.map((c) => {
              const usage = d.products.filter((p) => p.category === c).length;
              return (
                <div
                  key={c}
                  style={css(
                    "display:flex;align-items:center;gap:10px;padding:11px 18px;border-bottom:1px solid var(--border)",
                  )}
                >
                  <span
                    style={css(
                      `flex:1;min-width:0;font:500 13px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                    )}
                  >
                    {c}
                  </span>
                  <span style={css(`flex:none;font:500 11.5px ${MONO};color:var(--muted)`)}>
                    {usage} {usage === 1 ? "produto" : "produtos"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      <Panel title="Como você prefere usar" flush>
        <div style={css("display:flex;flex-direction:column")}>
          <div
            style={css(
              "display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap",
            )}
          >
            <span style={css("flex:1;min-width:150px")}>
              <span style={css(`display:block;font:600 13.5px ${SANS}`)}>Aparência</span>
              <span style={css(`display:block;margin-top:2px;font:500 11.5px ${SANS};color:var(--muted)`)}>
                Escolha o que cansa menos a sua vista.
              </span>
            </span>
            <PillGroup
              options={[
                { key: "light" as const, name: "Claro" },
                { key: "dark" as const, name: "Escuro" },
              ]}
              current={s.theme}
              onPick={(v) => a.set({ theme: v })}
              size="sm"
            />
          </div>

          <Switch
            on={s.imprimirComprovante}
            onToggle={() => a.set({ imprimirComprovante: !s.imprimirComprovante })}
            title="Imprimir comprovante ao finalizar a venda"
            note="Se desligar, o comprovante fica só no histórico e pode ser reimpresso depois."
          />
          <Switch
            on={s.pedirCliente}
            onToggle={() => a.set({ pedirCliente: !s.pedirCliente })}
            title="Perguntar o nome do cliente na venda"
            note="Útil para encomendas e fiado. Deixa o balcão um pouco mais lento."
          />

          {has("stock") && (
            <div
              style={css(
                `display:flex;align-items:center;gap:12px;padding:14px 18px;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
              )}
            >
              O aviso de estoque baixo está sempre ligado: ele aparece no topo do portal quando um
              produto chega no mínimo que você definiu.
            </div>
          )}
        </div>

        <div style={css("padding:13px 18px;border-top:1px solid var(--border);background:var(--surface2)")}>
          <UnsavedNotice>
            Aparência e preferências de sale ainda valem só nesta sessão.
          </UnsavedNotice>
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

function TeamTab() {
  const { a, has, isDesktop, d } = usePortal();

  const active = d.team.filter((x) => x.active).length;
  const roleCols = isDesktop ? "1fr 1fr" : "1fr";

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <Panel
        title="Funcionários"
        note={
          d.team.length <= 1
            ? "Por enquanto só você tem acesso a este portal."
            : `${d.team.length} pessoas cadastradas · ${active} com acesso liberado`
        }
        flush
      >
        {d.team.length === 0 ? (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:36px 20px",
            )}
          >
            <div style={css(`font:700 15px ${SANS}`)}>Nenhum funcionário cadastrado</div>
            <p style={css(`margin:0;max-width:340px;font:400 12.5px/1.5 ${SANS};color:var(--muted)`)}>
              Fale com a nossa equipe para liberar o acesso de mais alguém.
            </p>
          </div>
        ) : (
          <div style={css("display:flex;flex-direction:column")}>
            {d.team.map((x) => (
              <div key={x.id} style={css("position:relative;border-bottom:1px solid var(--border)")}>
                <div style={css("display:flex;align-items:center;gap:12px;padding:13px 18px")}>
                  <span
                    style={css(
                      "flex:none;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;" +
                        `font:700 12.5px ${SANS};` +
                        (x.active
                          ? "background:var(--accent-soft);color:var(--accent-text)"
                          : "background:var(--surface3);color:var(--muted)"),
                    )}
                  >
                    {initialsOf(x.name)}
                  </span>

                  <span style={css("flex:1;min-width:0")}>
                    <span style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
                      <span
                        style={css(
                          `font:600 13.5px ${SANS};color:${x.active ? "var(--text)" : "var(--muted)"}`,
                        )}
                      >
                        {x.name}
                      </span>
                      <span
                        style={css(
                          `padding:2px 8px;border-radius:999px;font:600 10.5px ${SANS};` +
                            (x.owner
                              ? "background:var(--accent-soft);color:var(--accent-text)"
                              : "background:var(--surface3);color:var(--text2)"),
                        )}
                      >
                        {x.role}
                      </span>
                      {!x.active && (
                        <span
                          style={css(
                            `padding:2px 8px;border-radius:999px;background:var(--surface3);color:var(--muted);font:600 10.5px ${SANS}`,
                          )}
                        >
                          Sem acesso
                        </span>
                      )}
                    </span>
                  </span>

                  {/* O dono não se remove nem se suspende: alguém tem de ficar
                      com a chave da casa. */}
                  {x.owner ? (
                    <span style={css(`flex:none;font:500 11px ${SANS};color:var(--muted)`)}>é você</span>
                  ) : (
                    <RowMenu
                      menuKey={`func:${x.id}`}
                      width={214}
                      actions={[
                        {
                          text: "Mudar tipo de acesso",
                          onClick: () => a.openModal({ k: "employee", id: x.id }),
                        },
                        {
                          text: x.active ? "Suspender acesso" : "Liberar acesso",
                          color: "var(--warn)",
                          onClick: () =>
                            a.confirm({
                              title: x.active ? "Suspender o acesso?" : "Liberar o acesso?",
                              text: x.active
                                ? "A pessoa deixa de conseguir entrar no portal, mas continua cadastrada."
                                : "A pessoa volta a conseguir entrar com o mesmo e-mail.",
                              summary: x.name,
                              detail: x.role,
                              reversal: "Dá para desfazer pelo mesmo menu.",
                              button: x.active ? "Suspender" : "Liberar",
                              buttonBg: "var(--warn)",
                              buttonInk: "#fff",
                              color: "var(--warn)",
                              action: () => a.toggleEmployee(x.id),
                            }),
                        },
                      ]}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={css("padding:13px 18px;border-top:1px solid var(--border);background:var(--surface2)")}>
          <UnsavedNotice>
            Cadastrar um funcionário novo cria um login, e isso ainda é feito pela nossa equipe. Aqui
            você muda o tipo de acesso e suspende quem já existe.
          </UnsavedNotice>
        </div>
      </Panel>

      <Panel
        title="Tipos de acesso"
        note="Cada tipo define o que a pessoa vê no portal. Só aparecem os módulos que o seu plano tem."
        action={
          <Button
            onClick={() => a.openRole(null)}
            className="hv-acc-borda"
            style={css(
              `padding:11px 18px;border-radius:10px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font:600 13px ${SANS}`,
            )}
          >
            + Novo tipo
          </Button>
        }
        flush
      >
        {d.roles.length === 0 ? (
          <div
            style={css(
              `padding:28px 20px;text-align:center;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
            )}
          >
            Nenhum tipo de acesso criado ainda. Crie o primeiro para dividir o que cada pessoa
            enxerga.
          </div>
        ) : (
          <div
            style={css(`display:grid;grid-template-columns:${roleCols};gap:1px;background:var(--border)`)}
          >
            {d.roles.map((p) => {
              const people = d.team.filter((x) => x.role === p.name).length;
              return (
                <div
                  key={p.id}
                  style={css("position:relative;padding:15px 18px;background:var(--surface)")}
                >
                  <div style={css("display:flex;align-items:flex-start;gap:10px")}>
                    <div style={css("flex:1;min-width:0")}>
                      <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
                        <span style={css(`font:700 14px ${SANS}`)}>{p.name}</span>
                        {p.fixed && (
                          <span
                            style={css(
                              `padding:2px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);font:600 10.5px ${SANS}`,
                            )}
                          >
                            acesso total
                          </span>
                        )}
                      </div>
                      <div style={css(`margin-top:5px;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
                        {roleSummary(p.modules, p.fixed)}
                      </div>
                      <div style={css(`margin-top:4px;font:500 11.5px ${SANS};color:var(--muted)`)}>
                        {people === 0
                          ? "Ninguém usa este tipo"
                          : `${people} ${people === 1 ? "pessoa usa" : "people usam"}`}
                      </div>
                    </div>

                    {!p.fixed && (
                      <RowMenu
                        menuKey={`papel:${p.id}`}
                        width={200}
                        actions={[
                          { text: "Editar acessos", onClick: () => a.openRole(p.id) },
                          {
                            text: "Remover tipo",
                            color: "var(--danger)",
                            onClick: () =>
                              a.confirm({
                                title: "Remover este tipo de acesso?",
                                text:
                                  people > 0
                                    ? "Há pessoas usando este tipo — mova-as para outro antes de remover."
                                    : "Ele some da lista de escolhas ao definir o acesso de alguém.",
                                summary: p.name,
                                detail: roleSummary(p.modules, p.fixed),
                                reversal: "Você pode criar de novo com os mesmos acessos.",
                                button: "Remover tipo",
                                buttonBg: "var(--danger)",
                                buttonInk: "#fff",
                                color: "var(--danger)",
                                action: () => a.removeRole(p.id),
                              }),
                          },
                        ]}
                      />
                    )}
                  </div>

                  <div style={css("display:flex;gap:5px;flex-wrap:wrap;margin-top:11px")}>
                    {(p.fixed ? PERMISSION_MODULES.filter((m) => has(m)) : p.modules).map((m) => (
                      <span
                        key={m}
                        style={css(
                          `padding:3px 9px;border-radius:999px;background:var(--surface3);color:var(--text2);font:600 10.5px ${SANS}`,
                        )}
                      >
                        {MODULES[m].name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="O que aconteceu no portal" note="Registro de quem fez o quê, para consulta.">
        <UnsavedNotice>
          O histórico de ações ainda não é gravado. Quando existir, esta lista mostrará cada sale,
          adjustment de estoque e alteração de acesso, com autor e horário.
        </UnsavedNotice>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conta e plano                                                               */
/* -------------------------------------------------------------------------- */

function AccountTab() {
  const { a, has, isDesktop } = usePortal();

  // `dashboard` e `config` não são vendidos: todo cliente os tem.
  const all = (Object.keys(MODULES) as ModuleKey[]).filter(
    (m) => m !== "dashboard" && m !== "settings",
  );
  const moduleCols = isDesktop ? "repeat(3,minmax(0,1fr))" : "1fr 1fr";
  const on = all.filter((m) => has(m)).length;

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <div
        style={css(
          "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div style={css("flex:1;min-width:200px")}>
            <div style={css(KPI_LABEL)}>Seu plano</div>
            <div style={css(`margin-top:6px;font:700 24px/1.1 ${SANS}`)}>
              {on >= all.length ? "Plano Completo" : "Plano Essencial"}
            </div>
            <div style={css(`margin-top:5px;font:500 12.5px/1.45 ${SANS};color:var(--muted)`)}>
              {on} de {all.length} módulos ligados
            </div>
          </div>
          <span
            style={css(
              `flex:none;padding:7px 14px;border-radius:999px;background:var(--pos-soft);color:var(--pos);font:600 12px ${SANS}`,
            )}
          >
            Ativo
          </span>
        </div>

        <div style={css("padding:18px")}>
          <div style={css(`margin-bottom:11px;${KPI_LABEL}`)}>Módulos do seu plano</div>
          <div style={css(`display:grid;grid-template-columns:${moduleCols};gap:8px`)}>
            {all.map((m) => {
              const on = has(m);
              return (
                <div
                  key={m}
                  style={css(
                    "display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:11px;" +
                      "border:1px solid var(--border);" +
                      `background:${on ? "var(--surface2)" : "transparent"}`,
                  )}
                >
                  <span
                    style={css(
                      "flex:none;width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;" +
                        `font:600 10px ${MONO};` +
                        (on
                          ? "background:var(--accent);color:var(--accent-ink)"
                          : "background:var(--surface3);color:var(--muted)"),
                    )}
                  >
                    {MODULES[m].initials}
                  </span>
                  <span
                    style={css(
                      `flex:1;min-width:0;font:600 12.5px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` +
                        `color:${on ? "var(--text)" : "var(--muted)"}`,
                    )}
                  >
                    {MODULES[m].name}
                  </span>
                  <span
                    style={css(
                      `flex:none;white-space:nowrap;font:600 11px ${SANS};color:${on ? "var(--accent)" : "var(--muted)"}`,
                    )}
                  >
                    {on ? "ligado" : "não incluso"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={css(
            "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 18px;border-top:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <p
            style={css(`flex:1;min-width:200px;margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}
          >
            Quer ligar um módulo novo ou mudar de plano? Quem cuida disso é a nossa equipe — fale com
            a gente e ajustamos para você.
          </p>
          <Button
            onClick={() => a.goTo(ROUTES.support)}
            className="hv-brilho"
            style={css(`flex:none;${primaryButton("sm")}`)}
          >
            Falar com o support
          </Button>
        </div>
      </div>

      <Panel title="Sua conta" note="Encerrar a sessão neste dispositivo.">
        <Button
          onClick={() => a.signOut()}
          loadingLabel="Saindo…"
          className="hv-borda"
          style={css(
            `padding:12px 18px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--danger);font:600 13px ${SANS}`,
          )}
        >
          Sair da account
        </Button>
      </Panel>
    </div>
  );
}
