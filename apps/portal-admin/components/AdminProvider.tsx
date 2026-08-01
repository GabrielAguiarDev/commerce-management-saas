"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { DIC } from "@/lib/dictionary";
import { HOJE } from "@/lib/mock/data";
import { ROTAS } from "@/lib/rotas";
import { ESTADO_INICIAL, estaSujo } from "@/lib/state";
import type {
  AdminActions,
  AdminOpcoes,
  AdminState,
  Pagamento,
  Patch,
  Rascunho,
  StatusCliente,
  StatusPagamento,
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
  ...overrides
}: { children: ReactNode } & Partial<AdminOpcoes>) {
  const router = useRouter();
  const [state, setState] = useState<AdminState>(ESTADO_INICIAL);
  const opts: AdminOpcoes = { ...PADROES, ...overrides };

  const set = useCallback((patch: Patch) => {
    setState((prev) => {
      const p = typeof patch === "function" ? patch(prev) : patch;
      return p ? { ...prev, ...p } : prev;
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

  const novoRascunho = (id: number): Rascunho | null => {
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
    if (estaSujo(state)) {
      abrirModal("descartar", null, href);
      return;
    }
    set({ menuLinha: null, menuPag: null, dica: null, rascunho: null, notifAberta: false });
    router.push(href);
  };

  const abrirCliente = (id: number) => {
    set({ menuLinha: null, dica: null, notifAberta: false, rascunho: novoRascunho(id) });
    router.push(`${ROTAS.clientes}/${id}`);
  };

  const garantirRascunho = (id: number) => {
    if (state.rascunho?.id === id) return;
    set({ rascunho: novoRascunho(id) });
  };

  const descartarRascunho = () => {
    if (state.rascunho) set({ rascunho: novoRascunho(state.rascunho.id) });
  };

  const salvarRascunho = () => {
    const r = state.rascunho;
    if (!r || !estaSujo(state)) return;
    set((st) => ({
      clientes: st.clientes.map((x) =>
        x.id === r.id ? { ...x, plano: r.plano, mods: r.mods.slice(), valor: r.valor } : x,
      ),
      ultimaAcao: L.salvoAgora,
    }));
    toast(L.toastSalvo);
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
            sel: ["vendas", "produtos"],
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

  const salvarForm = () => {
    const f = state.form;
    if (!f || !f.nome.trim()) return;
    const nome = { pt: f.nome.trim(), en: f.nome.trim() };
    const desc = { pt: f.desc.trim(), en: f.desc.trim() };

    if (f.tipo === "plano") {
      set((s) =>
        f.novo
          ? {
              modal: null,
              form: null,
              planos: [
                ...s.planos,
                {
                  k: f.nome.trim(),
                  nome,
                  tipo: "fixo",
                  preco: f.preco.trim() || "R$ 0",
                  desc,
                  mods: f.sel.slice(),
                },
              ],
            }
          : {
              modal: null,
              form: null,
              planos: s.planos.map((p) =>
                p.k === f.k
                  ? {
                      ...p,
                      nome,
                      desc,
                      mods: f.sel.slice(),
                      preco: p.tipo === "fixo" ? f.preco.trim() || p.preco : null,
                    }
                  : p,
              ),
            },
      );
      return;
    }

    set((s) =>
      f.novo
        ? {
            modal: null,
            form: null,
            modulos: [
              ...s.modulos,
              {
                k: f.nome
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-"),
                nome,
                sigla: f.nome.trim().slice(0, 2).toUpperCase(),
                desc,
                planos: f.sel.slice(),
              },
            ],
          }
        : {
            modal: null,
            form: null,
            modulos: s.modulos.map((m) =>
              m.k === f.k ? { ...m, nome, desc, planos: f.sel.slice() } : m,
            ),
          },
    );
  };

  const registrarPagamento = (clienteId: number) => {
    const x = state.clientes.find((y) => y.id === clienteId);
    if (!x) return;
    const p: Pick<Pagamento, "vencimento" | "hist"> = state.pagamentos[clienteId] ?? {
      vencimento: "—",
      hist: [],
    };
    // Manual tracking: the next due date is simply the current one a month on.
    const venc =
      p.vencimento && p.vencimento !== "—"
        ? p.vencimento.replace(
            /^(\d{2})\/(\d{2})/,
            (_m, d: string, mes: string) =>
              d + "/" + String(Math.min(12, parseInt(mes, 10) + 1)).padStart(2, "0"),
          )
        : "24/08/2026";
    set((st) => ({
      menuPag: null,
      pagamentos: {
        ...st.pagamentos,
        [clienteId]: {
          status: "emdia" as StatusPagamento,
          ultimo: HOJE,
          vencimento: venc,
          hist: ([[HOJE, x.valor]] as [string, string][]).concat(p.hist || []),
        },
      },
    }));
    toast(L.toastPago);
  };

  const reverterPagamento = (clienteId: number) => {
    const p = state.pagamentos[clienteId];
    if (!p) return;
    const hist = (p.hist || []).slice(1);
    set((st) => ({
      menuPag: null,
      pagamentos: {
        ...st.pagamentos,
        [clienteId]: {
          status: "pendente" as StatusPagamento,
          ultimo: hist[0] ? hist[0][0] : "—",
          vencimento: p.vencimento,
          hist,
        },
      },
    }));
    toast(L.toastRevertido, "alerta");
  };

  const confirmarModal = () => {
    const m = state.modal;
    if (!m) return;
    const id = state.idioma;

    switch (m.tipo) {
      case "sair":
        set({ modal: null, rascunho: null });
        router.push(ROTAS.login);
        return;
      case "descartar":
        set({ modal: null, rascunho: null, menuLinha: null, notifAberta: false });
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
        salvarForm();
        toast(m.tipo === "plano" ? L.toastPlanoSalvo : L.toastModuloSalvo);
        return;
    }

    const alvo = state.clientes.find((x) => x.id === m.alvo);
    if (!alvo) {
      set({ modal: null });
      return;
    }

    if (m.tipo === "excluir") {
      // Guarded by the typed-name confirmation; ignore a premature click.
      if (state.confirmacao.trim() !== alvo.nome) return;
      const noDetalhe = state.rascunho?.id === m.alvo;
      set((st) => ({
        modal: null,
        confirmacao: "",
        clientes: st.clientes.filter((y) => y.id !== m.alvo),
        rascunho: noDetalhe ? null : st.rascunho,
        ultimaAcao: (id === "pt" ? "Cliente excluído: " : "Customer deleted: ") + alvo.nome,
      }));
      toast(L.toastExcluido, "erro");
      // The record we were looking at is gone, so the list is where to land.
      if (noDetalhe) router.push(ROTAS.clientes);
      return;
    }

    const novo: StatusCliente = m.tipo === "desativar" ? "inativo" : "ativo";
    set((st) => ({
      modal: null,
      clientes: st.clientes.map((y) => (y.id === m.alvo ? { ...y, status: novo } : y)),
      ultimaAcao:
        alvo.nome +
        (novo === "inativo"
          ? id === "pt"
            ? " foi desativado."
            : " was deactivated."
          : id === "pt"
            ? " foi reativado."
            : " was reactivated."),
    }));
    toast(
      novo === "inativo" ? L.toastDesativado : L.toastReativado,
      novo === "inativo" ? "alerta" : "ok",
    );
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
  const sujo = estaSujo(state);
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
