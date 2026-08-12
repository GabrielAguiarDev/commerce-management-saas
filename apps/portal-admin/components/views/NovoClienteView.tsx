"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createCustomer } from "@/app/clientes/actions";
import { INITIAL_STATE } from "@/app/clientes/estadoFormulario";
import { useAdmin } from "@/components/AdminProvider";
import { ActionBar } from "@/components/BarraAcoes";
import { ModuleGrid, ModuleCard } from "@/components/ModuloCard";
import { NavLink } from "@/components/NavLink";
import { Button, Field, css, MONO, Select } from "@aguiar/ui";
import { isFixedPlan, planModules, planByKey } from "@/lib/planos";
import { customerHref, ROUTES } from "@/lib/rotas";

const FIELD_LABEL =
  "font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600";

/** Campos que a interface exige antes de deixar enviar. */
type RequiredField = "name" | "owner" | "email";

/**
 * Tela cheia de cadastro de cliente — mesmo padrão da ficha do cliente.
 *
 * Segurança: roda no navegador e NÃO fala com o Supabase. Só entrega o
 * FormData para a Server Action `criarCliente`, que é quem tem a service_role.
 * A validação daqui é conveniência para quem digita; a que vale é a do servidor.
 */
export function NovoClienteView() {
  const { s, a, options, isMobile } = useAdmin();
  // `set` e `toast` são memoizados no provider; o objeto `a` NÃO é (ele é
  // recriado a cada render). Efeitos abaixo dependem só destes dois.
  const { L, set, toast } = a;
  const id = s.language;
  const router = useRouter();

  const [estado, enviar, enviando] = useActionState(createCustomer, INITIAL_STATE);

  const [fields, setCampos] = useState({
    name: "",
    segment: "",
    owner: "",
    city: "",
    phone: "",
    email: "",
    monthlyFee: "",
  });
  // O plano inicial é o primeiro do catálogo lido de `plans` (ordenado por
  // `sort_order`), não a chave "free" escrita à mão. Como o catálogo chega do
  // servidor, o padrão é DERIVADO no render em vez de gravado por um efeito —
  // um efeito renderizaria uma vez com o seletor vazio antes de corrigir.
  const [planoEscolhido, setPlan] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);
  const plan = planoEscolhido || (s.plans[0]?.k ?? "");
  // Só destacamos o que falta depois da primeira tentativa de envio, para não
  // pintar a tela de vermelho enquanto a pessoa ainda está preenchendo.
  const [submitted, setTentouEnviar] = useState(false);

  // `planoAtual` fica indefinido só no primeiro render, antes do efeito que
  // escolhe o padrão; a tela lida com isso mostrando a grade vazia.
  const currentPlan = planByKey(s.plans, plan);
  const fixedPlan = isFixedPlan(currentPlan);
  const active = planModules(currentPlan, picked);

  const filled = Object.values(fields).some((v) => v.trim() !== "");
  const faltando: RequiredField[] = (["name", "owner", "email"] as const).filter(
    (k) => fields[k].trim() === "",
  );
  const missingCost = currentPlan?.type === "custom" && fields.monthlyFee.trim() === "";
  const missingModules = active.length === 0;
  const canSubmit = faltando.length === 0 && !missingCost && !missingModules;

  const edit = (k: keyof typeof fields, v: string) =>
    setCampos((current) => ({ ...current, [k]: v }));

  // Mantém o guard de saída do painel sabendo que há algo digitado aqui.
  useEffect(() => {
    set({ newCustomerDirty: filled });
  }, [filled, set]);

  // Ao sair da tela, o formulário deixa de existir — nada mais a proteger.
  useEffect(() => () => set({ newCustomerDirty: false }), [set]);

  /**
   * Ao entrar num plano customizado, a grade começa com o que o plano anterior
   * já dava — é o ponto de partida mais útil, e o admin ajusta a partir daí.
   */
  const switchPlan = (key: string) => {
    const target = planByKey(s.plans, key);
    if (target?.type === "custom" && fixedPlan) setPicked(planModules(currentPlan));
    setPlan(key);
  };

  const toggleModule = (key: string) =>
    setPicked((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );

  const clear = () => {
    setCampos({
      name: "",
      segment: "",
      owner: "",
      city: "",
      phone: "",
      email: "",
      monthlyFee: "",
    });
    // "" volta ao padrão derivado, seja ele qual for.
    setPlan("");
    setPicked([]);
    setTentouEnviar(false);
  };

  // Sucesso: avisa e vai para a ficha do cliente recém-criado.
  //
  // A lista não precisa mais ser remendada aqui: a Server Action revalida o
  // layout, que relê a tabela `tenants`, e o provider sincroniza o estado.
  useEffect(() => {
    if (estado.status !== "sucesso") return;

    toast(estado.message);
    set({ newCustomerDirty: false });
    // `refresh` antes do `push` para a ficha já abrir com o registro do banco.
    router.refresh();
    router.push(customerHref(estado.customer.id));
    // `estado` só muda quando a action responde, então isto roda uma vez por envio.
  }, [estado, set, toast, router]);

  /** Um field do card de dados, com destaque quando obrigatório e vazio. */
  const field = (
    key: keyof typeof fields,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    obrigatorio = false,
  ) => {
    const empty = obrigatorio && submitted && fields[key].trim() === "";
    return (
      <label style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
        <span style={css(FIELD_LABEL)}>
          {label}
          {obrigatorio && <span style={css("color:var(--danger);margin-left:3px")}>*</span>}
        </span>
        <Field
          name={key}
          value={fields[key]}
          onChange={(e) => edit(key, e.target.value)}
          disabled={enviando}
          aria-invalid={empty || undefined}
          {...props}
        />
      </label>
    );
  };

  const barState = enviando
    ? id === "pt"
      ? "Cadastrando cliente…"
      : "Creating customer…"
    : missingModules
      ? id === "pt"
        ? "Selecione ao menos um módulo"
        : "Select at least one module"
      : !canSubmit
        ? id === "pt"
          ? "Preencha os campos obrigatórios"
          : "Fill in the required fields"
        : id === "pt"
          ? "Tudo pronto para cadastrar"
          : "Ready to create";

  return (
    <form
      action={enviar}
      onSubmit={(e) => {
        setTentouEnviar(true);
        // A action revalida tudo de novo; isto só evita uma ida ao servidor
        // quando já dá para ver que falta coisa.
        if (!canSubmit) e.preventDefault();
      }}
      style={css("display:flex;flex-direction:column;gap:16px")}
    >
      <NavLink
        href={ROUTES.customers}
        className="hv-acc"
        style={css(
          "align-self:flex-start;background:none;border:none;color:var(--text2);font-size:12.5px;" +
            "cursor:pointer;padding:0",
        )}
      >
        ← {L.back}
      </NavLink>

      {/* ---------------------------------------------------------------
          CARD 1 — dados do negócio e acesso
      --------------------------------------------------------------- */}
      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "border-bottom:1px solid var(--border-soft);background:var(--surface2);" +
              "display:flex;flex-direction:column;gap:4px;padding:" +
              (isMobile ? "16px 14px" : "20px 24px"),
          )}
        >
          <h2
            style={css(
              "margin:0;font-weight:600;letter-spacing:-.02em;color:var(--text);" +
                (isMobile ? "font-size:18px" : "font-size:20px"),
            )}
          >
            {id === "pt" ? "Novo cliente" : "New customer"}
          </h2>
          <p style={css("margin:0;font-size:12.5px;color:var(--text2);max-width:54ch")}>
            {id === "pt"
              ? "Cadastre um novo comércio na plataforma."
              : "Register a new business on the platform."}
          </p>
        </div>

        <div
          style={css(
            "display:flex;flex-direction:column;gap:18px;padding:" +
              (isMobile ? "16px 14px" : "22px 24px"),
          )}
        >
          {/* `min()` no mínimo da coluna: sem ele, um campo de 220px numa tela
              mais estreita que isso empurraria o formulário para fora. */}
          <div
            style={css(
              "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px 20px",
            )}
          >
            {field(
              "name",
              id === "pt" ? "Nome do negócio" : "Business name",
              { autoFocus: true, placeholder: id === "pt" ? "Padaria da Esquina" : "Corner Bakery" },
              true,
            )}
            {field("segment", L.segment, {
              placeholder: id === "pt" ? "Alimentação · Padaria" : "Food · Bakery",
            })}
            {field(
              "owner",
              L.owner,
              { placeholder: id === "pt" ? "Nome do dono" : "Owner name" },
              true,
            )}
            {field("city", id === "pt" ? "Cidade / UF" : "City / State", {
              placeholder: "Salvador, BA",
            })}
            {field("phone", id === "pt" ? "Telefone / contato" : "Phone / contact", {
              type: "tel",
              placeholder: "(71) 90000-0000",
            })}
          </div>

          <div
            style={css("border-top:1px solid var(--border-soft);padding-top:18px;" + "display:grid;" +
              "grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px 20px;align-items:start")}
          >
            <div style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
              {field(
                "email",
                id === "pt" ? "E-mail de acesso" : "Access email",
                { type: "email", placeholder: "dono@negocio.com.br" },
                true,
              )}
              <span style={css("font-size:11.5px;color:var(--muted);line-height:1.5")}>
                {id === "pt"
                  ? "O dono recebe um convite por e-mail para definir a própria senha."
                  : "The owner gets an email invite to set their own password."}
              </span>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
              <span style={css(FIELD_LABEL)}>{L.plan}</span>
              <Select
                name="plan"
                value={plan}
                onChange={(e) => switchPlan(e.target.value)}
                disabled={enviando}
                boxCssText="width:100%"
              >
                {/* Opções vindas de `plans`, na ordem de `sort_order`. */}
                {s.plans.map((p) => (
                  <option key={p.k} value={p.k}>
                    {p.name[id] || p.name.pt}
                  </option>
                ))}
              </Select>
            </label>

            {/* A mensalidade só existe no plano sob medida (`plans.is_custom`);
                nos demais vale o preço gravado em `plans.price`. */}
            {currentPlan?.type === "custom" && (
              <label style={css("display:flex;flex-direction:column;gap:6px;min-width:0")}>
                <span style={css(FIELD_LABEL)}>
                  {L.monthlyFee}
                  <span style={css("color:var(--danger);margin-left:3px")}>*</span>
                </span>
                <Field
                  name="monthlyFee"
                  value={fields.monthlyFee}
                  onChange={(e) => edit("monthlyFee", e.target.value)}
                  inputMode="decimal"
                  placeholder="149,00"
                  disabled={enviando}
                  aria-invalid={(submitted && missingCost) || undefined}
                  cssText={`max-width:180px;font-family:`}
                />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          CARD 2 — módulos (mesma grade da ficha do cliente)
      --------------------------------------------------------------- */}
      <section
        style={css(
          "background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:20px;" +
              "flex-wrap:wrap;border-bottom:1px solid var(--border-soft);background:var(--surface2);" +
              "padding:" +
              (isMobile ? "16px 14px" : "20px 24px"),
          )}
        >
          <div style={css("display:flex;flex-direction:column;gap:4px")}>
            <h3 style={css("margin:0;font-size:16px;font-weight:600;color:var(--text)")}>
              {id === "pt" ? "Módulos do plano" : "Plan modules"}
            </h3>
            <p style={css("margin:0;font-size:12.5px;color:var(--text2);max-width:54ch")}>
              {fixedPlan
                ? id === "pt"
                  ? "Os módulos deste plano são fixos. Para uma combinação personalizada, use o plano Customizado."
                  : "This plan's modules are fixed. For a custom combination, use the Custom plan."
                : id === "pt"
                  ? "Plano customizado: ligue e desligue cada módulo livremente para este cliente."
                  : "Custom plan: turn each module on or off freely for this customer."}
            </p>
          </div>

          <div style={css("display:flex;align-items:center;gap:14px;flex:none")}>
            <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:2px")}>
              <span
                style={css(
                  `font-family:${MONO};font-size:20px;font-weight:600;color:var(--accent-text);line-height:1`,
                )}
              >
                {active.length}/{s.modules.length}
              </span>
              <span style={css("font-size:11px;color:var(--muted)")}>{L.modulosAtivos}</span>
            </div>

            {/* Ativar todos / limpar só fazem sentido quando há o que editar. */}
            {!fixedPlan && (
              <div style={css("display:flex;gap:6px")}>
                <Button
                  type="button"
                  onClick={() => setPicked(s.modules.map((m) => m.k))}
                  className="hv-acc-borda"
                  style={css(
                    "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                      "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                  )}
                >
                  {L.ativarTodos}
                </Button>
                <Button
                  type="button"
                  onClick={() => setPicked([])}
                  className="hv-texto"
                  style={css(
                    "border:1px solid var(--border);background:var(--surface);color:var(--muted);" +
                      "font-size:11.5px;padding:7px 11px;border-radius:7px;cursor:pointer",
                  )}
                >
                  {L.clear}
                </Button>
              </div>
            )}
          </div>
        </div>

        <ModuleGrid columns={options.colunasModulos}>
          {/* Catálogo real, vindo da tabela `modules` pelo provider. */}
          {s.modules.map((m) => {
            const on = active.includes(m.k);
            return (
              <ModuleCard
                key={m.k}
                initials={m.initials}
                name={m.name[id] || m.name.pt}
                description={m.desc[id] || m.desc.pt}
                on={on}
                // Ainda não há cliente: o texto fala do pacote, não de acesso concedido.
                estado={
                  on
                    ? id === "pt"
                      ? "Incluído no plano"
                      : "Included in the plan"
                    : id === "pt"
                      ? "Não incluído"
                      : "Not included"
                }
                acesso={m.type === "acesso"}
                tagAcesso={L.tagAcesso}
                ajudaAcesso={L.acessoAjuda}
                blocked={fixedPlan || enviando}
                toggle={() => toggleModule(m.k)}
              />
            );
          })}
        </ModuleGrid>

        {missingModules && (
          <div
            style={css(
              "border-top:1px solid var(--border-soft);background:var(--danger-soft);" +
                "display:flex;align-items:center;gap:9px;padding:" +
                (isMobile ? "12px 14px" : "13px 24px"),
            )}
          >
            <div style={css("width:6px;height:6px;border-radius:99px;background:var(--danger)")} />
            <span style={css("font-size:12px;color:var(--danger)")}>
              {id === "pt"
                ? "Selecione ao menos um módulo para este cliente."
                : "Select at least one module for this customer."}
            </span>
          </div>
        )}
      </section>

      {/* Erro vindo do servidor. */}
      {estado.status === "error" && (
        <div
          role="alert"
          style={css(
            "padding:13px 16px;border:1px solid var(--danger-line);background:var(--danger-soft);" +
              "border-radius:11px;font-size:13px;color:var(--danger);line-height:1.5",
          )}
        >
          {estado.message}
        </div>
      )}

      {/* Os módulos vão no FormData por aqui. Num plano fixo estes campos nem
          existem — a Server Action usa o pacote do plano de qualquer forma. */}
      {!fixedPlan && active.map((k) => <input key={k} type="hidden" name="modulos" value={k} />)}

      <ActionBar
        estado={barState}
        tone={enviando || !canSubmit ? "warning" : "neutral"}
        secondary={{
          label: filled ? L.discard : L.cancelar,
          onClick: () => (filled ? clear() : a.goTo(ROUTES.customers)),
          disabled: enviando,
        }}
        primary={{
          // O rótulo não troca mais para "Cadastrando…": o girador já diz isso,
          // e trocar o texto mudava a largura do botão no meio do envio.
          label: id === "pt" ? "Cadastrar cliente" : "Create customer",
          submit: true,
          loading: enviando,
        }}
      />
    </form>
  );
}
