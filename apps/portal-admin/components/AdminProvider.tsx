"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import {
  updateCustomer,
  deleteCustomer,
  setCustomerStatus,
} from "@/app/clientes/actions";
import { markPaid, undoPaid } from "@/app/financeiro/actions";
import { createPlan, deletePlan, saveModule, savePlan } from "@/app/planos/actions";
import { MOBILE_BREAKPOINT } from "@aguiar/ui";
import { COMPACT_BREAKPOINT, LARGURAS } from "@/lib/telas";
import { DIC } from "@/lib/dictionary";
import { plansWithCatalog } from "@/lib/planos";
import { ROUTES } from "@/lib/rotas";
import { INITIAL_STATE, isDirty } from "@/lib/state";
import { createClient } from "@/lib/supabase/client";
import type {
  AdminActions,
  AdminOptions,
  AdminState,
  Ticket,
  Customer,
  SettingItem,
  Module,
  Payment,
  Plan,
  MonthlyRevenue,
  Patch,
  Draft,
  CustomerStatus,
  ToastState,
} from "@/types/types";
import type { ViewProps } from "@/types/viewProps";

const DEFAULTS: AdminOptions = {
  showEmptyStates: false,
  mostrarPainelAtividade: true,
  colunasModulos: 3,
  mostrarValorMensal: true,
  destacarInativos: true,
};

const Ctx = createContext<ViewProps | null>(null);

/**
 * Owns the console session above the router, so filters, drafts, theme and
 * language survive moving between routes.
 *
 * Actions that only patch state are memoised; those that need to read the
 * current state are plain closures over this render's `state`, which is always
 * the value the user is looking at.
 */
export function AdminProvider({
  children,
  initialCustomers = [],
  customersError = null,
  initialTickets = [],
  ticketsError = null,
  initialModules = [],
  modulesError = null,
  initialPlans = [],
  plansError = null,
  initialPayments = {},
  initialRevenue = [],
  billingError = null,
  initialSettings = [],
  settingsError = null,
  adminName = null,
  ...overrides
}: {
  children: ReactNode;
  /** Clientes lidos do Supabase pelo layout (server component). */
  initialCustomers?: Customer[];
  customersError?: string | null;
  /** Chamados de suporte lidos do Supabase pelo layout (server component). */
  initialTickets?: Ticket[];
  ticketsError?: string | null;
  /** Catálogo de módulos lido da tabela `modules` pelo layout. */
  initialModules?: Module[];
  modulesError?: string | null;
  /** Catálogo de planos lido da tabela `plans`. */
  initialPlans?: Plan[];
  plansError?: string | null;
  /** Financeiro lido de `platform_payments`. */
  initialPayments?: Record<string, Payment>;
  initialRevenue?: MonthlyRevenue[];
  billingError?: string | null;
  /** Ajustes lidos de `platform_settings`. */
  initialSettings?: SettingItem[];
  settingsError?: string | null;
  /** Nome do admin logado, de `profiles.full_name`. */
  adminName?: string | null;
} & Partial<AdminOptions>) {
  const router = useRouter();
  // As mutações de cliente passam por Server Actions. `useTransition` segura a
  // interface responsiva enquanto a gravação acontece, sem um estado de
  // "salvando" inventado à mão.
  const [, startAction] = useTransition();
  const [state, setState] = useState<AdminState>(() => ({
    ...INITIAL_STATE,
    customers: initialCustomers,
    customersError,
    tickets: initialTickets,
    ticketsError,
    modules: initialModules,
    modulesError,
    adminName,
    payments: initialPayments,
    revenue: initialRevenue,
    billingError,
    settings: initialSettings,
    settingsError,
    plansError,
    // O plano customizado inclui "todos os módulos", e só o banco sabe quais.
    plans: plansWithCatalog(
      initialPlans,
      initialModules.map((m) => m.k),
    ),
    // Sem semente: o chamado selecionado é o primeiro que veio do banco.
    chamadoSel: initialTickets[0]?.id ?? "",
  }));
  const options: AdminOptions = { ...DEFAULTS, ...overrides };

  // ───────────────────────────────────────────────────────────────────
  // O servidor é a fonte da verdade dos clientes e dos chamados. Depois de um
  // cadastro, de uma resposta no suporte, de um `router.refresh()` ou de um
  // `revalidatePath`, o layout relê as tabelas e manda as listas novas para cá
  // — o estado local acompanha em vez de seguir mostrando o que estava em
  // memória.
  //
  // O ajuste acontece DURANTE o render, não num efeito: é o padrão do React
  // para estado derivado de props (react.dev/learn/you-might-not-need-an-effect).
  // Um efeito renderizaria uma vez com a lista velha antes de corrigir.
  //
  // A comparação é por assinatura, e não pela identidade do array: as listas
  // chegam como arrays novos a cada render, e só os campos abaixo mudam por
  // fora. Sem isso, todo render reescreveria o estado.
  //
  // ┌─ A REGRA DA ASSINATURA ────────────────────────────────────────────┐
  // │ TODO CAMPO QUE UMA SERVER ACTION CONSEGUE GRAVAR PRECISA ESTAR     │
  // │ AQUI. Um campo de fora é um campo que o servidor salva, relê e     │
  // │ manda de volta — e que a tela ignora, porque a assinatura não      │
  // │ mudou. O sintoma é o pior possível: "salvou" na tela, o valor      │
  // │ antigo continuando na frente do usuário, e o banco certo.          │
  // │                                                                     │
  // │ Foi exatamente o que acontecia com os CATÁLOGOS: `plans` entrava   │
  // │ por `k:price:mods` (renomear um plano ou trocar a descrição não    │
  // │ mexia em nenhum dos três) e `modules` entrava só pela chave —      │
  // │ enquanto `salvarModulo` grava a DESCRIÇÃO, que nunca era vista.    │
  // └─────────────────────────────────────────────────────────────────────┘
  //
  // Por isso os três catálogos vão SERIALIZADOS INTEIROS, e não por um punhado
  // de campos escolhidos à mão. São listas curtas — planos, módulos e ajustes
  // contam-se em dezenas — e o custo de as serializar por render não se compara
  // ao de manter a lista de campos em dia a cada coluna nova. Clientes,
  // chamados e pagamentos seguem por campos porque crescem sem teto, e nesses
  // três a lista abaixo cobre tudo que as Actions gravam.
  // ───────────────────────────────────────────────────────────────────
  const signature =
    initialCustomers
      .map((c) => `${c.id}:${c.status}:${c.plan}:${c.amount}:${c.mods.join(",")}`)
      .join("|") +
    `#${customersError ?? ""}` +
    "@" +
    initialTickets.map((t) => `${t.id}:${t.status}:${t.messages.length}`).join("|") +
    `#${ticketsError ?? ""}` +
    "@" +
    JSON.stringify(initialModules) +
    `#${modulesError ?? ""}#${adminName ?? ""}` +
    "@" +
    JSON.stringify(initialPlans) +
    `#${plansError ?? ""}` +
    "@" +
    Object.entries(initialPayments)
      .map(([k, v]) => `${k}:${v.status}:${v.latest}`)
      .join("|") +
    `#${billingError ?? ""}` +
    "@" +
    JSON.stringify(initialSettings) +
    `#${settingsError ?? ""}`;
  const [appliedSignature, setAssinaturaAplicada] = useState(signature);

  if (signature !== appliedSignature) {
    setAssinaturaAplicada(signature);
    setState((prev) => ({
      ...prev,
      customers: initialCustomers,
      customersError,
      tickets: initialTickets,
      ticketsError,
      modules: initialModules,
      modulesError,
      adminName,
      payments: initialPayments,
      revenue: initialRevenue,
      billingError,
      settings: initialSettings,
      settingsError,
      plansError,
      plans: plansWithCatalog(
        initialPlans,
        initialModules.map((m) => m.k),
      ),
      // O chamado aberto pode ter deixado de existir; nesse caso volta para o
      // primeiro da lista em vez de deixar a tela sem conversa nenhuma.
      chamadoSel: initialTickets.some((t) => t.id === prev.chamadoSel)
        ? prev.chamadoSel
        : (initialTickets[0]?.id ?? ""),
    }));
  }

  const set = useCallback((patch: Patch) => {
    setState((prev) => {
      const p = typeof patch === "function" ? patch(prev) : patch;
      if (!p) return prev;

      // Sai fora quando o patch não muda nada de fato. Sem isto, gravar um
      // valor igual ao que já estava ainda assim devolveria um objeto novo,
      // o React re-renderizaria, e um efeito que escreve o estado a cada
      // render entraria em loop — que foi exatamente o que aconteceu com o
      // sinalizador de formulário sujo da tela de cadastro.
      const mudou = (Object.keys(p) as (keyof AdminState)[]).some((k) => prev[k] !== p[k]);
      return mudou ? { ...prev, ...p } : prev;
    });
  }, []);

  const L = DIC[state.language] || DIC.pt;

  const toast = useCallback(
    (msg: string, type: ToastState["type"] = "ok") => {
      const id = "tt" + Date.now() + Math.round(Math.random() * 999);
      set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
    },
    [set],
  );

  const openModal = useCallback<AdminActions["openModal"]>(
    (type, target = null, destination = null, mod = null) => {
      set({
        modal: { type, target, destination, mod },
        confirmation: "",
        rowMenu: null,
        hint: null,
        notificationsOpen: false,
      });
    },
    [set],
  );

  const closeModal = useCallback(() => {
    set({ modal: null, confirmation: "", form: null });
  }, [set]);

  /**
   * Sair.
   *
   * O balão continua aberto durante a espera — fechá-lo aqui desmontaria o
   * botão antes de o girador aparecer. Quem o fecha é a própria navegação para
   * o login, que troca a barra lateral inteira. O rascunho vai junto: a ficha
   * que estava em edição não sobrevive à sessão.
   */
  const signOut = useCallback(async () => {
    set({ draft: null });
    // Encerra a sessão de verdade: sem isto o middleware veria o cookie
    // ainda válido e devolveria o usuário ao painel.
    await createClient().auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }, [set, router]);

  const editDraft = useCallback(
    (fn: (r: Draft) => Draft) => {
      set((s) => ({ draft: s.draft ? fn(s.draft) : s.draft }));
    },
    [set],
  );

  const editForm = useCallback(
    (field: "name" | "preco" | "desc", amount: string) => {
      set((s) => (s.form ? { form: { ...s.form, [field]: amount } } : null));
    },
    [set],
  );

  const toggleSelected = useCallback(
    (v: string) => {
      set((s) =>
        s.form
          ? {
              form: {
                ...s.form,
                sel: s.form.sel.includes(v)
                  ? s.form.sel.filter((x) => x !== v)
                  : [...s.form.sel, v],
              },
            }
          : null,
      );
    },
    [set],
  );

  const toggleTheme = useCallback(() => {
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" }));
  }, [set]);

  const toggleLanguage = useCallback(() => {
    set((s) => ({ language: s.language === "pt" ? "en" : "pt" }));
  }, [set]);

  const baixarCsv = useCallback((rows: string[], name: string) => {
    // A BOM keeps accented business names readable when the file lands in Excel.
    const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, []);

  const newDraft = (id: string): Draft | null => {
    const x = state.customers.find((y) => y.id === id);
    return x ? { id: x.id, plan: x.plan, mods: x.mods.slice(), amount: x.amount } : null;
  };

  /**
   * O que acontece ANTES de sair da tela atual, e se a saída pode acontecer.
   *
   * Devolve `false` quando a navegação foi recusada — uma ficha com edição
   * pendente pergunta primeiro, e é o diálogo que guarda o destino e continua a
   * viagem se a pessoa confirmar. O botão "voltar" do navegador passa por cima
   * dessa pergunta, mas o rascunho vive aqui e não na rota: ele sobrevive e
   * continua esperando na volta.
   *
   * Existe separado de `irPara` porque o `<Link>` do Next não navega por nós —
   * ele navega sozinho, e o que temos é a chance de cancelar no `onClick`. As
   * duas portas de saída passam por aqui, então as duas se comportam igual.
   */
  const beforeNavigate = (href: string): boolean => {
    // Vale para os dois formulários longos do painel: a ficha do cliente e o
    // cadastro de um novo.
    if (isDirty(state) || state.newCustomerDirty) {
      openModal("discard", null, href);
      return false;
    }
    // `navOpen: false` porque no celular a navegação nasce dentro da gaveta:
    // deixá-la aberta cobriria a tela para onde acabamos de ir.
    set({
      rowMenu: null,
      paymentMenu: null,
      hint: null,
      draft: null,
      newCustomerDirty: false,
      notificationsOpen: false,
      navOpen: false,
    });
    return true;
  };

  /**
   * Navegação programática — a que acontece DEPOIS de uma ação, sem um link
   * para clicar. A navegação por clique passa pelo `<NavLink>`, que prefetcha a
   * rota antes do clique; ver `components/NavLink.tsx`.
   */
  const goTo = (href: string) => {
    if (beforeNavigate(href)) router.push(href);
  };

  const openCustomer = (id: string) => {
    set({
      rowMenu: null,
      hint: null,
      notificationsOpen: false,
      navOpen: false,
      draft: newDraft(id),
    });
    router.push(`${ROUTES.customers}/${id}`);
  };

  /**
   * Memoizado de propósito: a tela de detalhe chama isto de dentro de um
   * efeito, então precisa de uma referência estável — senão o efeito
   * dispararia a cada render. Lê o estado pelo próprio updater, não pelo
   * closure, o que também o mantém correto sem depender de `state`.
   */
  const ensureDraft = useCallback(
    (id: string) => {
      set((s) => {
        if (s.draft?.id === id) return null;
        const x = s.customers.find((y) => y.id === id);
        return x
          ? { draft: { id: x.id, plan: x.plan, mods: x.mods.slice(), amount: x.amount } }
          : null;
      });
    },
    [set],
  );

  const discardDraft = () => {
    if (state.draft) set({ draft: newDraft(state.draft.id) });
  };

  /**
   * Grava plano, mensalidade e módulos no banco.
   *
   * Não mexe mais em `state.clientes`: quem manda é o servidor. Depois do
   * `revalidatePath` na action, o `router.refresh()` traz a lista relida, e o
   * bloco de sincronização lá em cima aplica. Como o rascunho passa a bater com
   * o cliente salvo, `estaSujo` volta a ser falso sozinho — sem "limpar" o
   * formulário na mão e correr o risco de ele parecer salvo sem ter sido.
   */
  const saveDraft = async () => {
    const r = state.draft;
    if (!r || !isDirty(state)) return;

    // A gravação é esperada aqui, e não dentro da transição: é esta promessa
    // que o `Button` da barra de ações usa para se travar e girar enquanto o
    // servidor responde. A transição fica só com o `refresh`, que é o que ela
    // sempre esteve segurando — o re-render com os dados relidos.
    const res = await updateCustomer(r.id, r.plan, r.amount, r.mods);
    if (!res.ok) return toast(res.message, "error");
    set({ lastAction: L.salvoAgora });
    toast(L.toastSalvo);
    startAction(() => router.refresh());
  };

  /**
   * Move um cliente para outro plano, a partir do diálogo de excluir plano.
   *
   * Reaproveita `atualizarCliente` de propósito: é a mesma Server Action que a
   * ficha do cliente usa, então os módulos e a mensalidade são recalculados
   * pelo plano de destino (lendo `plans` no servidor) em vez de simplesmente
   * trocar o rótulo e deixar o cliente com a composição do plano antigo.
   */
  const moveCustomerToPlan = async (customerId: string, novoPlano: string) => {
    const x = state.customers.find((y) => y.id === customerId);
    if (!x) return;
    // O valor só é usado quando o destino é sob medida; nos demais o preço
    // vem de `plans.price`. Mandamos o atual para não perder o negociado.
    const res = await updateCustomer(customerId, novoPlano, x.amount, x.mods);
    if (!res.ok) return toast(res.message, "error");
    toast(L.toastSalvo);
    startAction(() => router.refresh());
  };

  const openPlanForm = (k: string | null) => {
    const p = k ? state.plans.find((x) => x.k === k) : null;
    const id = state.language;
    set({
      notificationsOpen: false,
      modal: { type: "plan" },
      form: p
        ? {
            type: "plan",
            k: p.k,
            new: false,
            name: p.name[id],
            price: p.price || "",
            desc: p.desc[id],
            sel: p.mods.slice(),
            fixed: p.type === "fixed",
          }
        : {
            type: "plan",
            k: null,
            new: true,
            name: "",
            price: "R$ ",
            desc: "",
            // Chaves da tabela `modules`, não os rótulos em português.
            sel: ["sales", "products"],
            fixed: true,
          },
    });
  };

  const openModuleForm = (k: string) => {
    const m = state.modules.find((x) => x.k === k);
    if (!m) return;
    const id = state.language;
    set({
      notificationsOpen: false,
      modal: { type: "module" },
      form: {
        type: "module",
        k: m.k,
        new: false,
        name: m.name[id],
        price: "",
        desc: m.desc[id],
        // Vazio de propósito: a ficha do módulo não edita mais a relação com
        // os planos — ela é definida só na tela de Planos.
        sel: [],
        fixed: false,
      },
    });
  };

  /**
   * Grava a edição de plano ou de módulo.
   *
   * Nada mais mexe no estado local: a Server Action revalida o layout, o
   * `router.refresh()` traz o catálogo relido e o bloco de sincronização
   * aplica. Assim a tela nunca mostra uma composição que o banco recusou.
   */
  const saveForm = async () => {
    const f = state.form;
    if (!f || !f.name.trim()) return;

    // O diálogo fica aberto durante a gravação, com o botão travado e girando:
    // é ele que diz que algo está acontecendo. Fechá-lo antes da resposta,
    // como se fazia aqui, anunciava um sucesso que o banco ainda podia recusar.
    const res =
      f.type === "plan"
        ? f.new
          ? await createPlan(f.name, f.price, f.desc, f.sel)
          : await savePlan(f.k ?? "", f.name, f.price, f.desc, f.sel)
        : // Na tela de Módulos edita-se só a descrição, em `modules`. A
          // relação com os planos mora em `plans.module_keys` e é editada
          // apenas do lado do plano.
          await saveModule(f.k ?? "", f.desc);

    if (!res.ok) return toast(res.message, "error");
    set({ modal: null, form: null });
    toast(f.type === "plan" ? L.toastPlanoSalvo : L.toastModuloSalvo);
    startAction(() => router.refresh());
  };

  /** Registra o pagamento do mês corrente em `platform_payments`. */
  const recordPayment = async (customerId: string) => {
    set({ paymentMenu: null });
    const res = await markPaid(customerId);
    if (!res.ok) return toast(res.message, "error");
    toast(L.toastPago);
    startAction(() => router.refresh());
  };

  /** Desfaz o último pagamento registrado deste cliente. */
  const undoPayment = async (customerId: string) => {
    set({ paymentMenu: null });
    const res = await undoPaid(customerId);
    if (!res.ok) return toast(res.message, "error");
    toast(L.toastRevertido, "warning");
    startAction(() => router.refresh());
  };

  /**
   * O verbo do diálogo aberto.
   *
   * Devolve a promessa do que for gravar, e é dela que o botão de confirmação
   * tira o girador — o diálogo continua na tela, travado, até o servidor
   * responder.
   */
  const confirmModal = async () => {
    const m = state.modal;
    if (!m) return;
    const id = state.language;

    switch (m.type) {
      case "discard":
        set({
          modal: null,
          draft: null,
          newCustomerDirty: false,
          rowMenu: null,
          notificationsOpen: false,
        });
        router.push(m.destination || ROUTES.customers);
        return;
      case "moduleOff":
        editDraft((d) => ({ ...d, mods: d.mods.filter((k) => k !== m.mod) }));
        set({ modal: null });
        return;
      case "clear":
        editDraft((d) => ({ ...d, mods: [] }));
        set({ modal: null });
        return;
      case "all":
        editDraft((d) => ({ ...d, mods: state.modules.map((x) => x.k) }));
        set({ modal: null });
        return;
      case "pay":
        set({ modal: null });
        if (m.target != null) await recordPayment(m.target);
        return;
      case "undo":
        set({ modal: null });
        if (m.target != null) await undoPayment(m.target);
        return;
      case "history":
        set({ modal: null });
        return;
      case "deletePlan":
        if (m.target) {
          const res = await deletePlan(m.target);
          if (!res.ok) return toast(res.message, "error");
          set({ modal: null });
          toast(L.toastPlanoExcluido, "error");
          startAction(() => router.refresh());
        }
        return;
      case "plan":
      case "module":
        // O toast agora sai de dentro de `salvarForm`, junto do resultado da
        // gravação — antes ele anunciava sucesso antes de haver gravação.
        await saveForm();
        return;
    }

    const target = state.customers.find((x) => x.id === m.target);
    if (!target) {
      set({ modal: null });
      return;
    }

    const targetId = target.id;

    if (m.type === "delete") {
      // Guarded by the typed-name confirmation; ignore a premature click.
      if (state.confirmation.trim() !== target.name) return;
      const noDetalhe = state.draft?.id === targetId;

      // A exclusão demora (são treze tabelas mais o Auth) e o diálogo fica na
      // tela até ela terminar. O segundo clique que isso convidava não existe
      // mais: o botão se trava sozinho enquanto espera.
      const res = await deleteCustomer(targetId, target.name);
      if (!res.ok) return toast(res.message, "error");
      set({
        modal: null,
        confirmation: "",
        draft: noDetalhe ? null : state.draft,
        lastAction: (id === "pt" ? "Cliente excluído: " : "Customer deleted: ") + target.name,
      });
      toast(L.toastExcluido, "error");
      // O registro que estávamos vendo sumiu; a lista é onde aterrissar.
      if (noDetalhe) router.push(ROUTES.customers);
      startAction(() => router.refresh());
      return;
    }

    const nextStatus: CustomerStatus = m.type === "deactivate" ? "inactive" : "active";
    const res = await setCustomerStatus(targetId, nextStatus === "active");
    if (!res.ok) return toast(res.message, "error");
    set({
      modal: null,
      lastAction:
        target.name +
        (nextStatus === "inactive"
          ? id === "pt"
            ? " foi desativado."
            : " was deactivated."
          : id === "pt"
            ? " foi reativado."
            : " was reactivated."),
    });
    toast(
      nextStatus === "inactive" ? L.toastDesativado : L.toastReativado,
      nextStatus === "inactive" ? "warning" : "ok",
    );
    startAction(() => router.refresh());
  };

  const showHint = (e: SyntheticEvent<HTMLElement>) => {
    // Tooltips exist to name the icons once the sidebar has collapsed. Na
    // gaveta do celular não há ícone sem rótulo — e não há ponteiro para
    // pairar sobre ele.
    if (!state.collapsed || state.screenWidth < MOBILE_BREAKPOINT) return;
    const r = e.currentTarget.getBoundingClientRect();
    set({
      hint: {
        text: e.currentTarget.getAttribute("aria-label") || "",
        top: r.top + r.height / 2,
        left: r.right + 12,
      },
    });
  };

  const hideHint = () => {
    if (state.hint) set({ hint: null });
  };

  /**
   * Um clique em qualquer lugar fecha o balão do "sair".
   *
   * O listener entra num `setTimeout(0)` porque o próprio clique que abre o
   * balão ainda está subindo até o `document` — sem o adiamento ele fecharia no
   * mesmo gesto que o abriu. Os cliques de dentro do balão param a propagação
   * antes de chegar aqui (ver `Sidebar`).
   */
  useEffect(() => {
    if (!state.signOutOpen) return;
    const fechar = () => set({ signOutOpen: false });
    const t = setTimeout(() => document.addEventListener("click", fechar), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", fechar);
    };
  }, [state.signOutOpen, set]);

  // Theme lives on <body> so the CSS variables cascade to overlays too.
  useEffect(() => {
    document.body.dataset.theme = state.theme === "dark" ? "dark" : "light";
  }, [state.theme]);

  /**
   * A largura da janela, que é como o painel decide entre celular, faixa
   * intermediária e desktop (ver `LARGURAS`).
   *
   * Só é conhecida no navegador: até a primeira medição o estado diz 1440, e é
   * essa a versão que o servidor renderiza — sem isso o primeiro quadro viria
   * na forma de celular e saltaria.
   *
   * A gravação é contida de propósito. Redimensionar dispara o evento a cada
   * pixel, e re-renderizar o painel inteiro nessa cadência não paga: o estado
   * só muda quando a janela CRUZA uma das larguras que mudam o desenho, ou
   * quando ela anda o suficiente (40px) para um `minmax` reflowar.
   */
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      set((s) => {
        const mudou =
          LARGURAS.some((limite) => w < limite !== s.screenWidth < limite) ||
          Math.abs(w - s.screenWidth) > 40;
        if (!mudou) return null;
        // A gaveta é um estado de celular. Alargar a janela devolve a barra
        // fixa, e uma gaveta esquecida aberta reapareceria como um painel
        // sobreposto sem nada que o feche — então ela se fecha na travessia.
        return w >= MOBILE_BREAKPOINT && s.navOpen
          ? { screenWidth: w, navOpen: false }
          : { screenWidth: w };
      });
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [set]);

  const isMobile = state.screenWidth < MOBILE_BREAKPOINT;
  const isDesktop = !isMobile;
  const compact = state.screenWidth < COMPACT_BREAKPOINT;

  // A gaveta cobre a página inteira; deixar o que está atrás rolar junto faria
  // o menu deslizar sobre um conteúdo em movimento.
  useEffect(() => {
    if (!isMobile || !state.navOpen) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [isMobile, state.navOpen]);

  // Reloading or closing the tab is outside the router's reach; the browser's
  // own prompt is the only thing that can guard unsaved edits there.
  const dirty = isDirty(state) || state.newCustomerDirty;
  useEffect(() => {
    if (!dirty) return;
    const notice = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", notice);
    return () => window.removeEventListener("beforeunload", notice);
  }, [dirty]);

  const empty = options.showEmptyStates;
  const amount: ViewProps = {
    s: state,
    // The empty-state preview hides the seeded customers everywhere at once.
    cs: empty ? [] : state.customers,
    empty,
    options,
    isMobile,
    isDesktop,
    compact,
    a: {
      set,
      L,
      toast,
      openModal,
      closeModal,
      confirmModal,
      signOut,
      beforeNavigate,
      goTo,
      openCustomer,
      ensureDraft,
      editDraft,
      discardDraft,
      saveDraft,
      openPlanForm,
      openModuleForm,
      moveCustomerToPlan,
      editForm,
      toggleSelected,
      baixarCsv,
      toggleTheme,
      toggleLanguage,
      showHint,
      hideHint,
    },
  };

  return <Ctx.Provider value={amount}>{children}</Ctx.Provider>;
}

/** State, actions and the derived customer set, for any view under the shell. */
export function useAdmin(): ViewProps {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin precisa estar dentro de <AdminProvider>");
  return v;
}
