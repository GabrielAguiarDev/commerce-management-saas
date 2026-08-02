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
  atualizarCliente,
  excluirCliente,
  mudarStatusCliente,
} from "@/app/clientes/actions";
import { marcarPago, reverterPago } from "@/app/financeiro/actions";
import { criarPlano, salvarModulo, salvarPlano } from "@/app/planos/actions";
import { DIC } from "@/lib/dictionary";
import { planosComCatalogo } from "@/lib/planos";
import { ROTAS } from "@/lib/rotas";
import { ESTADO_INICIAL, estaSujo } from "@/lib/state";
import { createClient } from "@/lib/supabase/client";
import type {
  AdminActions,
  AdminOpcoes,
  AdminState,
  Chamado,
  Cliente,
  ConfigItem,
  Modulo,
  Pagamento,
  Plano,
  ReceitaMes,
  Patch,
  Rascunho,
  StatusCliente,
  ToastEstado,
} from "@/types/types";
import type { ViewProps } from "@/types/viewProps";

const PADROES: AdminOpcoes = {
  mostrarEstadosVazios: false,
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
  clientesIniciais = [],
  erroClientes = null,
  chamadosIniciais = [],
  erroChamados = null,
  modulosIniciais = [],
  erroModulos = null,
  planosIniciais = [],
  erroPlanos = null,
  pagamentosIniciais = {},
  receitaInicial = [],
  erroFinanceiro = null,
  configIniciais = [],
  erroConfig = null,
  adminNome = null,
  ...overrides
}: {
  children: ReactNode;
  /** Clientes lidos do Supabase pelo layout (server component). */
  clientesIniciais?: Cliente[];
  erroClientes?: string | null;
  /** Chamados de suporte lidos do Supabase pelo layout (server component). */
  chamadosIniciais?: Chamado[];
  erroChamados?: string | null;
  /** Catálogo de módulos lido da tabela `modules` pelo layout. */
  modulosIniciais?: Modulo[];
  erroModulos?: string | null;
  /** Catálogo de planos lido da tabela `plans`. */
  planosIniciais?: Plano[];
  erroPlanos?: string | null;
  /** Financeiro lido de `platform_payments`. */
  pagamentosIniciais?: Record<string, Pagamento>;
  receitaInicial?: ReceitaMes[];
  erroFinanceiro?: string | null;
  /** Ajustes lidos de `platform_settings`. */
  configIniciais?: ConfigItem[];
  erroConfig?: string | null;
  /** Nome do admin logado, de `profiles.full_name`. */
  adminNome?: string | null;
} & Partial<AdminOpcoes>) {
  const router = useRouter();
  // As mutações de cliente passam por Server Actions. `useTransition` segura a
  // interface responsiva enquanto a gravação acontece, sem um estado de
  // "salvando" inventado à mão.
  const [, iniciarAcao] = useTransition();
  const [state, setState] = useState<AdminState>(() => ({
    ...ESTADO_INICIAL,
    clientes: clientesIniciais,
    erroClientes,
    chamados: chamadosIniciais,
    erroChamados,
    modulos: modulosIniciais,
    erroModulos,
    adminNome,
    pagamentos: pagamentosIniciais,
    receita: receitaInicial,
    erroFinanceiro,
    config: configIniciais,
    erroConfig,
    erroPlanos,
    // O plano customizado inclui "todos os módulos", e só o banco sabe quais.
    planos: planosComCatalogo(
      planosIniciais,
      modulosIniciais.map((m) => m.k),
    ),
    // Sem semente: o chamado selecionado é o primeiro que veio do banco.
    chamadoSel: chamadosIniciais[0]?.id ?? "",
  }));
  const opts: AdminOpcoes = { ...PADROES, ...overrides };

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
  // ───────────────────────────────────────────────────────────────────
  const assinatura =
    clientesIniciais
      .map((c) => `${c.id}:${c.status}:${c.plano}:${c.valor}:${c.mods.join(",")}`)
      .join("|") +
    `#${erroClientes ?? ""}` +
    "@" +
    chamadosIniciais.map((t) => `${t.id}:${t.status}:${t.msgs.length}`).join("|") +
    `#${erroChamados ?? ""}` +
    "@" +
    modulosIniciais.map((m) => m.k).join("|") +
    `#${erroModulos ?? ""}#${adminNome ?? ""}` +
    "@" +
    planosIniciais.map((p) => `${p.k}:${p.preco}:${p.mods.join(",")}`).join("|") +
    "@" +
    Object.entries(pagamentosIniciais)
      .map(([k, v]) => `${k}:${v.status}:${v.ultimo}`)
      .join("|") +
    "@" +
    configIniciais.map((c) => `${c.id}:${String(c.valor)}`).join("|");
  const [assinaturaAplicada, setAssinaturaAplicada] = useState(assinatura);

  if (assinatura !== assinaturaAplicada) {
    setAssinaturaAplicada(assinatura);
    setState((prev) => ({
      ...prev,
      clientes: clientesIniciais,
      erroClientes,
      chamados: chamadosIniciais,
      erroChamados,
      modulos: modulosIniciais,
      erroModulos,
      adminNome,
      pagamentos: pagamentosIniciais,
      receita: receitaInicial,
      erroFinanceiro,
      config: configIniciais,
      erroConfig,
      erroPlanos,
      planos: planosComCatalogo(
        planosIniciais,
        modulosIniciais.map((m) => m.k),
      ),
      // O chamado aberto pode ter deixado de existir; nesse caso volta para o
      // primeiro da lista em vez de deixar a tela sem conversa nenhuma.
      chamadoSel: chamadosIniciais.some((t) => t.id === prev.chamadoSel)
        ? prev.chamadoSel
        : (chamadosIniciais[0]?.id ?? ""),
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

  const L = DIC[state.idioma] || DIC.pt;

  const toast = useCallback(
    (msg: string, tipo: ToastEstado["tipo"] = "ok") => {
      const id = "tt" + Date.now() + Math.round(Math.random() * 999);
      set((s) => ({ toasts: [...s.toasts, { id, msg, tipo }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
    },
    [set],
  );

  const abrirModal = useCallback<AdminActions["abrirModal"]>(
    (tipo, alvo = null, destino = null, mod = null) => {
      set({
        modal: { tipo, alvo, destino, mod },
        confirmacao: "",
        menuLinha: null,
        dica: null,
        notifAberta: false,
      });
    },
    [set],
  );

  const fecharModal = useCallback(() => {
    set({ modal: null, confirmacao: "", form: null });
  }, [set]);

  const editarRascunho = useCallback(
    (fn: (r: Rascunho) => Rascunho) => {
      set((s) => ({ rascunho: s.rascunho ? fn(s.rascunho) : s.rascunho }));
    },
    [set],
  );

  const editarForm = useCallback(
    (campo: "nome" | "preco" | "desc", valor: string) => {
      set((s) => (s.form ? { form: { ...s.form, [campo]: valor } } : null));
    },
    [set],
  );

  const alternarSel = useCallback(
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

  const alternarTema = useCallback(() => {
    set((s) => ({ tema: s.tema === "escuro" ? "claro" : "escuro" }));
  }, [set]);

  const alternarIdioma = useCallback(() => {
    set((s) => ({ idioma: s.idioma === "pt" ? "en" : "pt" }));
  }, [set]);

  const baixarCsv = useCallback((linhas: string[], nome: string) => {
    // A BOM keeps accented business names readable when the file lands in Excel.
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, []);

  const novoRascunho = (id: string): Rascunho | null => {
    const x = state.clientes.find((y) => y.id === id);
    return x ? { id: x.id, plano: x.plano, mods: x.mods.slice(), valor: x.valor } : null;
  };

  /**
   * In-app navigation. A customer record with pending edits asks before it is
   * abandoned; the browser's own back button bypasses this prompt, but the
   * draft lives here rather than in the route, so it survives and is still
   * waiting when you come back.
   */
  const ir = (href: string) => {
    // Vale para os dois formulários longos do painel: a ficha do cliente e o
    // cadastro de um novo.
    if (estaSujo(state) || state.novoClienteSujo) {
      abrirModal("descartar", null, href);
      return;
    }
    set({
      menuLinha: null,
      menuPag: null,
      dica: null,
      rascunho: null,
      novoClienteSujo: false,
      notifAberta: false,
    });
    router.push(href);
  };

  const abrirCliente = (id: string) => {
    set({ menuLinha: null, dica: null, notifAberta: false, rascunho: novoRascunho(id) });
    router.push(`${ROTAS.clientes}/${id}`);
  };

  /**
   * Memoizado de propósito: a tela de detalhe chama isto de dentro de um
   * efeito, então precisa de uma referência estável — senão o efeito
   * dispararia a cada render. Lê o estado pelo próprio updater, não pelo
   * closure, o que também o mantém correto sem depender de `state`.
   */
  const garantirRascunho = useCallback(
    (id: string) => {
      set((s) => {
        if (s.rascunho?.id === id) return null;
        const x = s.clientes.find((y) => y.id === id);
        return x
          ? { rascunho: { id: x.id, plano: x.plano, mods: x.mods.slice(), valor: x.valor } }
          : null;
      });
    },
    [set],
  );

  const descartarRascunho = () => {
    if (state.rascunho) set({ rascunho: novoRascunho(state.rascunho.id) });
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
  const salvarRascunho = () => {
    const r = state.rascunho;
    if (!r || !estaSujo(state)) return;
    iniciarAcao(async () => {
      const res = await atualizarCliente(r.id, r.plano, r.valor, r.mods);
      if (!res.ok) return toast(res.mensagem, "erro");
      set({ ultimaAcao: L.salvoAgora });
      toast(L.toastSalvo);
      router.refresh();
    });
  };

  const abrirFormPlano = (k: string | null) => {
    const p = k ? state.planos.find((x) => x.k === k) : null;
    const id = state.idioma;
    set({
      notifAberta: false,
      modal: { tipo: "plano" },
      form: p
        ? {
            tipo: "plano",
            k: p.k,
            novo: false,
            nome: p.nome[id],
            preco: p.preco || "",
            desc: p.desc[id],
            sel: p.mods.slice(),
            fixo: p.tipo === "fixo",
          }
        : {
            tipo: "plano",
            k: null,
            novo: true,
            nome: "",
            preco: "R$ ",
            desc: "",
            // Chaves da tabela `modules`, não os rótulos em português.
            sel: ["sales", "products"],
            fixo: true,
          },
    });
  };

  const abrirFormModulo = (k: string) => {
    const m = state.modulos.find((x) => x.k === k);
    if (!m) return;
    const id = state.idioma;
    set({
      notifAberta: false,
      modal: { tipo: "modulo" },
      form: {
        tipo: "modulo",
        k: m.k,
        novo: false,
        nome: m.nome[id],
        preco: "",
        desc: m.desc[id],
        sel: m.planos.slice(),
        fixo: false,
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
  const salvarForm = () => {
    const f = state.form;
    if (!f || !f.nome.trim()) return;

    // Fecha o diálogo já; o resultado chega por toast.
    set({ modal: null, form: null });

    iniciarAcao(async () => {
      const res =
        f.tipo === "plano"
          ? f.novo
            ? await criarPlano(f.nome, f.preco, f.desc, f.sel)
            : await salvarPlano(f.k ?? "", f.nome, f.preco, f.desc, f.sel)
          : // Na tela de Módulos edita-se a descrição (em `modules`) e os
            // planos que incluem o módulo (em `plans.module_keys`).
            await salvarModulo(f.k ?? "", f.desc, f.sel);

      if (!res.ok) return toast(res.mensagem, "erro");
      toast(f.tipo === "plano" ? L.toastPlanoSalvo : L.toastModuloSalvo);
      router.refresh();
    });
  };

  /** Registra o pagamento do mês corrente em `platform_payments`. */
  const registrarPagamento = (clienteId: string) => {
    set({ menuPag: null });
    iniciarAcao(async () => {
      const res = await marcarPago(clienteId);
      if (!res.ok) return toast(res.mensagem, "erro");
      toast(L.toastPago);
      router.refresh();
    });
  };

  /** Desfaz o último pagamento registrado deste cliente. */
  const reverterPagamento = (clienteId: string) => {
    set({ menuPag: null });
    iniciarAcao(async () => {
      const res = await reverterPago(clienteId);
      if (!res.ok) return toast(res.mensagem, "erro");
      toast(L.toastRevertido, "alerta");
      router.refresh();
    });
  };

  const confirmarModal = () => {
    const m = state.modal;
    if (!m) return;
    const id = state.idioma;

    switch (m.tipo) {
      case "sair":
        set({ modal: null, rascunho: null });
        // Encerra a sessão de verdade: sem isto o middleware veria o cookie
        // ainda válido e devolveria o usuário ao painel.
        void createClient()
          .auth.signOut()
          .then(() => {
            router.push(ROTAS.login);
            router.refresh();
          });
        return;
      case "descartar":
        set({
          modal: null,
          rascunho: null,
          novoClienteSujo: false,
          menuLinha: null,
          notifAberta: false,
        });
        router.push(m.destino || ROTAS.clientes);
        return;
      case "modOff":
        editarRascunho((d) => ({ ...d, mods: d.mods.filter((k) => k !== m.mod) }));
        set({ modal: null });
        return;
      case "limpar":
        editarRascunho((d) => ({ ...d, mods: [] }));
        set({ modal: null });
        return;
      case "todos":
        editarRascunho((d) => ({ ...d, mods: state.modulos.map((x) => x.k) }));
        set({ modal: null });
        return;
      case "pagar":
        if (m.alvo != null) registrarPagamento(m.alvo);
        set({ modal: null });
        return;
      case "reverter":
        if (m.alvo != null) reverterPagamento(m.alvo);
        set({ modal: null });
        return;
      case "historico":
        set({ modal: null });
        return;
      case "plano":
      case "modulo":
        // O toast agora sai de dentro de `salvarForm`, junto do resultado da
        // gravação — antes ele anunciava sucesso antes de haver gravação.
        salvarForm();
        return;
    }

    const alvo = state.clientes.find((x) => x.id === m.alvo);
    if (!alvo) {
      set({ modal: null });
      return;
    }

    const alvoId = alvo.id;

    if (m.tipo === "excluir") {
      // Guarded by the typed-name confirmation; ignore a premature click.
      if (state.confirmacao.trim() !== alvo.nome) return;
      const noDetalhe = state.rascunho?.id === alvoId;
      // Fecha o diálogo já: a exclusão pode demorar (são treze tabelas mais o
      // Auth), e deixar o modal aberto convidaria a um segundo clique.
      set({ modal: null, confirmacao: "" });
      iniciarAcao(async () => {
        const res = await excluirCliente(alvoId, alvo.nome);
        if (!res.ok) return toast(res.mensagem, "erro");
        set({
          rascunho: noDetalhe ? null : state.rascunho,
          ultimaAcao: (id === "pt" ? "Cliente excluído: " : "Customer deleted: ") + alvo.nome,
        });
        toast(L.toastExcluido, "erro");
        // O registro que estávamos vendo sumiu; a lista é onde aterrissar.
        if (noDetalhe) router.push(ROTAS.clientes);
        router.refresh();
      });
      return;
    }

    const novo: StatusCliente = m.tipo === "desativar" ? "inativo" : "ativo";
    set({ modal: null });
    iniciarAcao(async () => {
      const res = await mudarStatusCliente(alvoId, novo === "ativo");
      if (!res.ok) return toast(res.mensagem, "erro");
      set({
        ultimaAcao:
          alvo.nome +
          (novo === "inativo"
            ? id === "pt"
              ? " foi desativado."
              : " was deactivated."
            : id === "pt"
              ? " foi reativado."
              : " was reactivated."),
      });
      toast(
        novo === "inativo" ? L.toastDesativado : L.toastReativado,
        novo === "inativo" ? "alerta" : "ok",
      );
      router.refresh();
    });
  };

  const mostrarDica = (e: SyntheticEvent<HTMLElement>) => {
    // Tooltips exist to name the icons once the sidebar has collapsed.
    if (!state.colapsada) return;
    const r = e.currentTarget.getBoundingClientRect();
    set({
      dica: {
        texto: e.currentTarget.getAttribute("aria-label") || "",
        top: r.top + r.height / 2,
        left: r.right + 10,
      },
    });
  };

  const ocultarDica = () => {
    if (state.dica) set({ dica: null });
  };

  // Theme lives on <body> so the CSS variables cascade to overlays too.
  useEffect(() => {
    document.body.dataset.tema = state.tema === "escuro" ? "escuro" : "claro";
  }, [state.tema]);

  // The payments table swaps to a stacked card layout below 1000px.
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      set((s) =>
        (w < 1000) !== (s.larguraTela < 1000) || Math.abs(w - s.larguraTela) > 40
          ? { larguraTela: w }
          : null,
      );
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [set]);

  // Reloading or closing the tab is outside the router's reach; the browser's
  // own prompt is the only thing that can guard unsaved edits there.
  const sujo = estaSujo(state) || state.novoClienteSujo;
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  const vazio = opts.mostrarEstadosVazios;
  const valor: ViewProps = {
    s: state,
    // The empty-state preview hides the seeded customers everywhere at once.
    cs: vazio ? [] : state.clientes,
    vazio,
    opts,
    a: {
      set,
      L,
      toast,
      abrirModal,
      fecharModal,
      confirmarModal,
      ir,
      abrirCliente,
      garantirRascunho,
      editarRascunho,
      descartarRascunho,
      salvarRascunho,
      abrirFormPlano,
      abrirFormModulo,
      editarForm,
      alternarSel,
      baixarCsv,
      alternarTema,
      alternarIdioma,
      mostrarDica,
      ocultarDica,
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** State, actions and the derived customer set, for any view under the shell. */
export function useAdmin(): ViewProps {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin precisa estar dentro de <AdminProvider>");
  return v;
}
