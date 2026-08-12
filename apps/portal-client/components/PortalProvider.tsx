"use client";

import { MOBILE_BREAKPOINT } from "@aguiar/ui";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  openRegister as acaoAbrirCaixa,
  closeRegister as acaoFecharCaixa,
  reopenRegister as acaoReabrirCaixa,
  recordRegisterMovement as recordRegisterMovementAction,
  undoRegisterMovement as undoRegisterMovementAction,
} from "@/app/caixa/actions";
import {
  setEmployeeActive,
  changeEmployeeRole as acaoMudarPapel,
  removeRole as acaoRemoverPapel,
  saveBusinessData,
  saveRole as acaoSalvarPapel,
} from "@/app/configuracoes/actions";
import { deleteCost as acaoExcluirCusto, saveCost as acaoSalvarCusto } from "@/app/custos/actions";
import { recordStockMovement, undoStockMovement } from "@/app/estoque/actions";
import {
  setActive,
  setFav,
  deleteProduct as acaoExcluirProduto,
  saveProduct as acaoSalvarProduto,
} from "@/app/produtos/actions";
import { signOut as acaoSair } from "@/app/sair/actions";
import {
  openTicket,
  markTicketRead,
  setTicketStatus,
  replyToTicket as acaoResponder,
} from "@/app/suporte/actions";
import {
  undoRefund as acaoDesfazerEstorno,
  editSale as acaoEditarVenda,
  refundSale as acaoEstornarVenda,
  recordSale as acaoRegistrarVenda,
} from "@/app/vendas/actions";
import {
  EMPTY_DATA,
  initialState,
  EMPTY_REGISTER_FORM,
  EMPTY_TICKET_FORM,
  EMPTY_COST_FORM,
  EMPTY_MOVEMENT_FORM,
  EMPTY_ROLE_FORM,
  EMPTY_PRODUCT_FORM,
  EMPTY_REPLY_FORM,
  TOAST_MS,
  TOAST_OUT_MS,
  toast,
} from "@/lib/estado";
import { parseBrNumber } from "@/lib/formato";
import { limparTelasGuardadas } from "@/lib/pwa";
import { POS_ROUTE, ROUTES } from "@/lib/rotas";
import type {
  Confirm,
  PortalData,
  Modal,
  Patch,
  PortalActions,
  PortalState,
  ToastTone,
  ViewProps,
} from "@/types/estado";
import type { PaymentMethod, ModuleKey, Product, StockMovementType } from "@/types/types";

const Ctx = createContext<ViewProps | null>(null);

type Result = { ok: true } | { ok: false; message: string };

/**
 * Guarda a sessão do portal acima do roteador, para que filtros, carrinho e
 * rascunhos sobrevivam à troca de tela.
 *
 * A regra que organiza tudo: **o cliente não edita dado de negócio**. Toda
 * escrita vai a uma Server Action, que valida a sessão de novo e escreve sob o
 * RLS; depois o `router.refresh()` traz o retrato novo do servidor. Não há
 * atualização otimista — numa tela de balcão, mostrar uma venda que o banco
 * recusou é pior do que meio segundo de espera.
 */
export function PortalProvider({
  children,
  data = EMPTY_DATA,
}: {
  children: ReactNode;
  data?: PortalData;
}) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const [s, setS] = useState<PortalState>(() => initialState(data.data));

  // O retrato do servidor NÃO entra no estado: ele é lido direto da prop, e o
  // `router.refresh()` do laço de escrita traz a versão nova. Duas cópias
  // significariam duas verdades, e a do cliente ficaria velha já na próxima
  // gravação.
  const d = data;

  /**
   * A única cópia que sobra: o rascunho de "Dados do negócio", que precisa ser
   * editável enquanto a pessoa digita.
   *
   * Ele é refeito quando o valor SALVO muda de conteúdo. Isso cobre dois casos
   * que não são óbvios:
   *
   * 1. O provider vive no layout raiz, que envolve o `/login` também. Ele monta
   *    lá, sem sessão, com o retrato vazio — e não remonta ao entrar no portal.
   *    Sem esta linha o formulário ficaria em branco até um F5.
   * 2. Depois de salvar, o rascunho volta a espelhar o que o banco confirmou.
   *
   * A comparação é por CONTEÚDO, não por identidade: cada render do servidor
   * cria um objeto novo, e comparar por referência apagaria o que a pessoa
   * acabou de digitar a cada `router.refresh()`.
   *
   * Ajuste durante o render (e não num efeito) é o padrão do React para
   * derivar estado de props: evita o render em cascata.
   */
  const saved = JSON.stringify(data.data);
  const [salvoAnterior, setSalvoAnterior] = useState(saved);
  if (saved !== salvoAnterior) {
    setSalvoAnterior(saved);
    setS((x) => ({ ...x, draftData: { ...data.data } }));
  }

  const set = useCallback((p: Patch) => setS((x) => ({ ...x, ...p })), []);

  /* ---------------------------------------------------------------------- */
  /* Ambiente                                                                */
  /* ---------------------------------------------------------------------- */

  // A largura real só é conhecida no navegador. Até lá o estado diz "desktop",
  // e é isso que o servidor renderiza — sem isso o primeiro pixel viria na
  // versão de celular e saltaria.
  useEffect(() => {
    const medir = () =>
      setS((x) => (x.screenWidth === window.innerWidth ? x : { ...x, screenWidth: window.innerWidth }));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // O tema vive num atributo do <body> para que uma única troca repinte tudo:
  // cada cor do portal é lida de uma variável CSS declarada ali.
  useEffect(() => {
    document.body.dataset.theme = s.theme;
  }, [s.theme]);

  /**
   * O aviso some sozinho: ele confirma o que acabou de acontecer, não pede ação.
   *
   * A saída acontece em duas etapas, e as duas moram aqui. Esgotado o tempo de
   * leitura — `TOAST_MS`, o mesmo que a barrinha do `Toast` desenha —, o aviso
   * é MARCADO como saindo em vez de apagado; é essa marca que dispara a
   * animação de saída. Só depois dela, passado `TOAST_OUT_MS`, o aviso some do
   * estado de verdade.
   *
   * Sem a primeira etapa não haveria saída nenhuma: o componente desapareceria
   * no frame em que o estado zerasse, sem tempo de animar. E ela vive no estado,
   * e não dentro do `Toast`, para que fechar no ✕ e esgotar o tempo percorram
   * exatamente o mesmo caminho.
   */
  useEffect(() => {
    const t = s.toast;
    if (!t) return;
    const timer = setTimeout(
      () =>
        setS((x) => (x.toast === t ? { ...x, toast: t.leaving ? null : { ...t, leaving: true } } : x)),
      t.leaving ? TOAST_OUT_MS : TOAST_MS[t.tone],
    );
    return () => clearTimeout(timer);
  }, [s.toast]);

  // Um clique em qualquer lugar fecha as gavetas do topo.
  //
  // O menu de linha ficou de fora: quem o fecha é o `useDismiss` do Floating UI
  // dentro de `MenuAcoes`. Ele precisa disso porque o painel vive num portal em
  // `<body>` — para este listener um clique lá dentro é "fora do menu", e a
  // ação seria descartada antes de rodar.
  useEffect(() => {
    if (!s.notificationsOpen && !s.signOutOpen) return;
    const fechar = () => setS((x) => ({ ...x, notificationsOpen: false, signOutOpen: false }));
    const t = setTimeout(() => document.addEventListener("click", fechar), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", fechar);
    };
  }, [s.notificationsOpen, s.signOutOpen]);

  const isMobile = s.screenWidth < MOBILE_BREAKPOINT;
  const isDesktop = !isMobile;

  const modules = d.business.modules;
  const has = useCallback((m: ModuleKey) => modules.includes(m), [modules]);

  /* ---------------------------------------------------------------------- */
  /* O laço de escrita                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * Roda uma Server Action e traz o retrato novo.
   *
   * `salvando` trava os botões enquanto isso: dois cliques no "Registrar venda"
   * gravariam duas vendas. O aviso de sucesso só aparece depois do refresh, e o
   * de erro traz a mensagem que o servidor devolveu — o banco recusou por um
   * motivo, e escondê-lo faria a pessoa tentar de novo sem saber o quê mudar.
   *
   * A promessa sobe até quem chamou: cada ação daqui devolve a sua, e é dela
   * que o `Button` de `@aguiar/ui` tira o girador — só o botão que foi clicado
   * espera, e ele espera exatamente o tempo da gravação.
   */
  const run = useCallback(
    async (
      action: () => Promise<Result>,
      sucesso: string,
      depois?: (ok: boolean) => void,
    ): Promise<void> => {
      setS((x) => ({ ...x, saving: true }));
      let r: Result;
      try {
        r = await action();
      } catch {
        r = { ok: false, message: "Não foi possível falar com o servidor. Tente de novo." };
      }

      setS((x) => ({
        ...x,
        saving: false,
        toast: r.ok ? toast(sucesso) : toast(r.message, "error"),
      }));
      if (r.ok) iniciarTransicao(() => router.refresh());
      depois?.(r.ok);
    },
    [router],
  );

  /* ---------------------------------------------------------------------- */
  /* Utilidades                                                              */
  /* ---------------------------------------------------------------------- */

  const notify = useCallback(
    (text: string, tone: ToastTone = "ok") => set({ toast: toast(text, tone) }),
    [set],
  );
  /**
   * O ✕ do aviso. Ele não apaga: marca a saída e deixa o mesmo temporizador de
   * sempre terminar o serviço — quem fecha na mão vê a mesma animação de quem
   * esperou o tempo passar.
   */
  const closeToast = useCallback(
    () => setS((x) => (x.toast ? { ...x, toast: { ...x.toast, leaving: true } } : x)),
    [],
  );

  const closeConfirm = useCallback(() => set({ confirmDialog: null }), [set]);
  const confirm = useCallback((c: Confirm) => set({ confirmDialog: c, rowMenu: null }), [set]);
  const closeModal = useCallback(() => set({ modal: null }), [set]);
  const openModal = useCallback((m: Modal) => set({ modal: m, rowMenu: null }), [set]);
  const openMenu = useCallback((key: string | null) => set({ rowMenu: key }), [set]);

  /**
   * O que acontece ANTES de sair da tela atual.
   *
   * `navOpen: false` porque no celular a navegação nasce dentro da gaveta:
   * deixá-la aberta cobriria a tela para onde acabamos de ir.
   *
   * Devolve se a saída pode acontecer — aqui sempre pode; o portal não tem
   * formulário longo que peça confirmação, ao contrário do painel admin. O
   * retorno existe para o `<NavLink>` ter a mesma porta que o `irPara`: ele
   * navega sozinho, e o que temos é a chance de cancelar no `onClick`.
   */
  const beforeNavigate = useCallback((): boolean => {
    setS((x) => ({ ...x, navOpen: false, rowMenu: null, notificationsOpen: false }));
    return true;
  }, []);

  /**
   * Navegação programática — a que acontece DEPOIS de uma ação, sem um link
   * para clicar. A navegação por clique passa pelo `<NavLink>`, que prefetcha a
   * rota antes do clique; ver `components/NavLink.tsx`.
   */
  const goTo = useCallback(
    (rota: string) => {
      beforeNavigate();
      router.push(rota);
    },
    [beforeNavigate, router],
  );

  const toggleTheme = useCallback(
    () => setS((x) => ({ ...x, theme: x.theme === "light" ? "dark" : "light" })),
    [],
  );

  // Sair apaga também as telas que o service worker guardou: elas continuariam
  // legíveis offline depois de a sessão acabar. Ver `lib/pwa.ts`.
  const signOut = useCallback(async () => {
    await limparTelasGuardadas();
    return acaoSair();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* PDV                                                                     */
  /* ---------------------------------------------------------------------- */

  const addToCart = useCallback((p: Product) => {
    setS((x) => {
      const found = x.cart.find((c) => c.name === p.name);
      const cart = found
        ? x.cart.map((c) => (c.name === p.name ? { ...c, qtd: c.qtd + 1 } : c))
        : [...x.cart, { productId: p.id, name: p.name, price: p.price, qtd: 1 }];
      // Buscar, tocar, buscar de novo: limpar a busca deixa o catálogo inteiro
      // de volta sem precisar apagar o field à mão.
      return { ...x, cart, productSearch: "", code: "" };
    });
  }, []);

  const changeQty = useCallback((name: string, delta: number) => {
    setS((x) => ({
      ...x,
      cart: x.cart
        .map((c) => (c.name === name ? { ...c, qtd: c.qtd + delta } : c))
        .filter((c) => c.qtd > 0),
    }));
  }, []);

  const removeItem = useCallback((name: string) => {
    setS((x) => ({ ...x, cart: x.cart.filter((c) => c.name !== name) }));
  }, []);

  const clearCart = useCallback(
    () => set({ cart: [], editingSale: null, confirmDialog: null }),
    [set],
  );

  const recordSale = useCallback(async () => {
    if (s.saving || !s.cart.length) return;

    const items = s.cart.map((c) => ({
      productId: c.productId,
      name: c.name,
      qtd: c.qtd,
      price: c.price,
    }));
    const editing = s.editingSale;

    await run(
      () =>
        editing
          ? acaoEditarVenda(editing, items, s.currentMethod)
          : acaoRegistrarVenda(items, s.currentMethod),
      editing ? "Venda atualizada" : "Venda registrada",
      (ok) => {
        if (!ok) return;
        setS((x) => ({ ...x, cart: [], editingSale: null, cartOpen: false }));
        router.push(ROUTES.sales);
      },
    );
  }, [s.saving, s.cart, s.currentMethod, s.editingSale, run, router]);

  const editSale = useCallback(
    (id: string) => {
      const v = d.sales.find((y) => y.id === id);
      if (!v) return;

      // O carrinho reabre com os nomes gravados na venda. O `produtoId` é
      // reencontrado pelo nome: o item pode ter sido excluído do catálogo
      // depois, e nesse caso a venda continua editável como item avulso.
      setS((x) => ({
        ...x,
        cart: v.items.map((i) => ({
          productId: d.products.find((p) => p.name === i.name)?.id ?? null,
          name: i.name,
          price: i.price,
          qtd: i.qtd,
        })),
        currentMethod: v.payment,
        editingSale: id,
        rowMenu: null,
      }));
      router.push(POS_ROUTE);
    },
    [d.sales, d.products, router],
  );

  // As duas saem da caixa de confirmação, e é ela que fica na tela enquanto a
  // gravação acontece — antes a caixa continuava aberta depois de confirmar,
  // porque ninguém a fechava.
  const refundSale = useCallback(
    async (id: string) => {
      await run(() => acaoEstornarVenda(id), "Venda estornada");
      set({ confirmDialog: null });
    },
    [run, set],
  );

  const undoRefund = useCallback(
    async (id: string) => {
      await run(() => acaoDesfazerEstorno(id), "Estorno desfeito");
      set({ confirmDialog: null });
    },
    [run, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Produtos                                                                */
  /* ---------------------------------------------------------------------- */

  const openProduct = useCallback(
    (id: string | null) => {
      const p = id ? d.products.find((y) => y.id === id) : null;
      set({
        modal: { k: "product", id },
        rowMenu: null,
        productForm: p
          ? {
              id: p.id,
              name: p.name,
              price: String(p.price).replace(".", ","),
              category: p.category,
              newCategory: false,
              active: p.active,
              fav: p.fav,
              service: p.service,
              code: p.code,
              cost: p.cost ? String(p.cost).replace(".", ",") : "",
              stock: p.stock == null ? "" : String(p.stock),
              minimum: p.minimum == null ? "" : String(p.minimum),
              unit: p.unit,
              submitted: false,
            }
          : { ...EMPTY_PRODUCT_FORM },
      });
    },
    [d.products, set],
  );

  const saveProduct = useCallback(async () => {
    const f = s.productForm;
    const price = parseBrNumber(f.price);
    if (!f.name.trim() || price <= 0) {
      set({ productForm: { ...f, submitted: true } });
      return;
    }

    const hasStock = f.stock.trim() !== "";
    await run(
      () =>
        acaoSalvarProduto({
          id: f.id,
          name: f.name,
          price,
          category: f.category,
          code: f.code,
          cost: parseBrNumber(f.cost),
          stock: hasStock ? Math.round(parseBrNumber(f.stock)) : null,
          minimum: hasStock ? Math.round(parseBrNumber(f.minimum)) : null,
          unit: f.unit,
          active: f.active,
          fav: f.fav,
          service: f.service,
        }),
      f.id ? "Produto atualizado" : "Produto cadastrado",
      (ok) => ok && set({ modal: null, productForm: { ...EMPTY_PRODUCT_FORM } }),
    );
  }, [s.productForm, run, set]);

  const toggleFav = useCallback(
    async (id: string) => {
      const p = d.products.find((y) => y.id === id);
      if (!p) return;
      set({ rowMenu: null });
      await run(
        () => setFav(id, !p.fav),
        p.fav ? "Saiu dos mais vendidos" : "Marcado como mais vendido",
      );
    },
    [d.products, run, set],
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const p = d.products.find((y) => y.id === id);
      if (!p) return;
      set({ rowMenu: null });
      await run(() => setActive(id, !p.active), p.active ? "Produto pausado" : "Produto reativado");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [d.products, run, set],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      set({ rowMenu: null });
      await run(() => acaoExcluirProduto(id), "Produto excluído");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [run, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Estoque                                                                 */
  /* ---------------------------------------------------------------------- */

  const openMovement = useCallback(
    (productId?: string, type?: StockMovementType) => {
      const tracked = d.products.filter((p) => p.stock != null);
      set({
        modal: { k: "stockMovement" },
        rowMenu: null,
        movementForm: {
          ...EMPTY_MOVEMENT_FORM,
          type: type ?? "in",
          productId: productId ?? tracked[0]?.id ?? null,
        },
      });
    },
    [d.products, set],
  );

  const saveMovement = useCallback(async () => {
    const f = s.movementForm;
    if (!f.productId || !f.qtd.trim()) {
      set({ movementForm: { ...f, submitted: true } });
      return;
    }

    await run(
      () =>
        recordStockMovement({
          productId: f.productId as string,
          type: f.type,
          quantidade: Math.round(parseBrNumber(f.qtd)),
          custoUnitario: parseBrNumber(f.cost),
          reason: f.reason,
        }),
      "Movimentação registrada",
      (ok) => ok && set({ modal: null, movementForm: { ...EMPTY_MOVEMENT_FORM } }),
    );
  }, [s.movementForm, run, set]);

  const undoMovement = useCallback(
    async (id: string) => {
      set({ rowMenu: null });
      await run(() => undoStockMovement(id), "Movimentação revertida");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [run, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Custos                                                                  */
  /* ---------------------------------------------------------------------- */

  const openCost = useCallback(
    (id: string | null) => {
      const c = id ? d.costs.find((y) => y.id === id) : null;
      set({
        modal: { k: "cost", id },
        rowMenu: null,
        costForm: c
          ? {
              id: c.id,
              type: c.type,
              description: c.description,
              category: c.category,
              amount: String(c.amount).replace(".", ","),
              d: c.d,
              recurring: c.recurring,
              submitted: false,
            }
          : { ...EMPTY_COST_FORM },
      });
    },
    [d.costs, set],
  );

  const saveCost = useCallback(async () => {
    const f = s.costForm;
    const amount = parseBrNumber(f.amount);
    if (!f.description.trim() || amount <= 0) {
      set({ costForm: { ...f, submitted: true } });
      return;
    }

    await run(
      () =>
        acaoSalvarCusto({
          id: f.id,
          type: f.type,
          description: f.description,
          category: f.category,
          amount,
          data: dateDaysAgo(f.d),
          recurring: f.recurring,
        }),
      f.id ? "Custo atualizado" : "Custo registrado",
      (ok) => ok && set({ modal: null, costForm: { ...EMPTY_COST_FORM } }),
    );
  }, [s.costForm, run, set]);

  const deleteCost = useCallback(
    async (id: string) => {
      set({ rowMenu: null });
      await run(() => acaoExcluirCusto(id), "Custo excluído");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [run, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Caixa                                                                   */
  /* ---------------------------------------------------------------------- */

  const openRegister = useCallback(() => {
    const amount = parseBrNumber(s.registerForm.amount);
    return run(
      () => acaoAbrirCaixa(amount),
      "Caixa aberto",
      (ok) => ok && set({ modal: null, registerForm: { ...EMPTY_REGISTER_FORM } }),
    );
  }, [s.registerForm.amount, run, set]);

  const recordRegisterMovement = useCallback(async () => {
    if (s.modal?.k !== "registerMovement" || !d.openRegister) return;
    const type = s.modal.type;

    await run(
      () =>
        recordRegisterMovementAction({
          registerId: d.openRegister!.id,
          type,
          amount: parseBrNumber(s.registerForm.amount),
          reason: s.registerForm.reason,
        }),
      type === "withdrawal" ? "Sangria registrada" : "Reforço registrado",
      (ok) => ok && set({ modal: null, confirmDialog: null, registerForm: { ...EMPTY_REGISTER_FORM } }),
    );
  }, [s.modal, s.registerForm, d.openRegister, run, set]);

  const undoRegisterMovement = useCallback(
    async (id: string) => {
      await run(() => undoRegisterMovementAction(id), "Movimentação revertida");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [run, set],
  );

  const closeRegister = useCallback(async () => {
    if (!d.openRegister) return;
    await run(
      () =>
        acaoFecharCaixa(
          d.openRegister!.id,
          parseBrNumber(s.registerForm.countedCash),
          s.registerForm.obs,
        ),
      "Caixa fechado",
      (ok) => ok && set({ modal: null, confirmDialog: null, registerForm: { ...EMPTY_REGISTER_FORM } }),
    );
  }, [d.openRegister, s.registerForm, run, set]);

  const reopenRegister = useCallback(
    async (id: string) => {
      set({ rowMenu: null });
      await run(() => acaoReabrirCaixa(id), "Caixa reaberto");
      set({ confirmDialog: null, modal: null });
    },
    [run, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Configurações                                                           */
  /* ---------------------------------------------------------------------- */

  const saveData = useCallback(() => {
    return run(() => saveBusinessData(s.draftData), "Dados do negócio salvos");
  }, [s.draftData, run]);

  const discardData = useCallback(
    () => setS((x) => ({ ...x, draftData: { ...d.data } })),
    [d.data],
  );

  const toggleMethod = useCallback((f: PaymentMethod) => {
    setS((x) => {
      const on = x.acceptedMethods.includes(f);
      // Desligar a última forma deixaria o PDV sem como cobrar.
      if (on && x.acceptedMethods.length === 1) {
        return { ...x, toast: toast("Você precisa aceitar pelo menos uma forma", "warn") };
      }
      const acceptedMethods = on
        ? x.acceptedMethods.filter((y) => y !== f)
        : [...x.acceptedMethods, f];
      return {
        ...x,
        acceptedMethods,
        currentMethod: acceptedMethods.includes(x.currentMethod) ? x.currentMethod : acceptedMethods[0],
      };
    });
  }, []);

  const openRole = useCallback(
    (id: string | null) => {
      const p = id ? d.roles.find((y) => y.id === id) : null;
      set({
        modal: { k: "role", id },
        rowMenu: null,
        roleForm: p
          ? { id: p.id, name: p.name, modules: p.modules.slice(), submitted: false }
          : { ...EMPTY_ROLE_FORM },
      });
    },
    [d.roles, set],
  );

  const saveRole = useCallback(async () => {
    const f = s.roleForm;
    if (!f.name.trim()) {
      set({ roleForm: { ...f, submitted: true } });
      return;
    }
    await run(
      () => acaoSalvarPapel({ id: f.id, name: f.name, modules: f.modules }),
      f.id ? "Tipo de acesso atualizado" : "Tipo de acesso criado",
      (ok) => ok && set({ modal: null, roleForm: { ...EMPTY_ROLE_FORM } }),
    );
  }, [s.roleForm, run, set]);

  const removeRole = useCallback(
    async (id: string) => {
      set({ rowMenu: null });
      await run(() => acaoRemoverPapel(id), "Tipo de acesso removido");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [run, set],
  );

  const toggleEmployee = useCallback(
    async (id: string) => {
      const f = d.team.find((y) => y.id === id);
      if (!f) return;
      set({ rowMenu: null });
      await run(
        () => setEmployeeActive(id, !f.active),
        f.active ? "Acesso suspenso" : "Acesso liberado",
      );
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [d.team, run, set],
  );

  const changeEmployeeRole = useCallback(
    (id: string, roleId: string) => {
      set({ rowMenu: null });
      return run(() => acaoMudarPapel(id, roleId), "Tipo de acesso alterado");
    },
    [run, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Suporte                                                                 */
  /* ---------------------------------------------------------------------- */

  const openNewTicket = useCallback(
    () => set({ modal: { k: "newTicket" }, ticketForm: { ...EMPTY_TICKET_FORM } }),
    [set],
  );

  const sendTicket = useCallback(async () => {
    const f = s.ticketForm;
    if (f.subject.trim().length < 5 || f.description.trim().length < 15) {
      set({ ticketForm: { ...f, submitted: true } });
      return;
    }
    await run(
      () =>
        openTicket({
          subject: f.subject,
          category: f.category,
          description: f.description,
          attachment: f.attachment,
        }),
      "Chamado aberto",
      (ok) => ok && set({ modal: null, ticketForm: { ...EMPTY_TICKET_FORM } }),
    );
  }, [s.ticketForm, run, set]);

  const replyToTicket = useCallback(
    async (id: string) => {
      const f = s.replyForm;
      if (!f.text.trim()) {
        set({ toast: toast("Escreva a sua resposta", "warn") });
        return;
      }
      await run(
        () => acaoResponder(id, f.text, f.attachment),
        "Resposta enviada",
        (ok) => ok && set({ replyForm: { ...EMPTY_REPLY_FORM } }),
      );
    },
    [s.replyForm, run, set],
  );

  const resolveTicket = useCallback(
    async (id: string) => {
      await run(() => setTicketStatus(id, "resolved"), "Chamado resolvido");
      // A caixa de confirmação só sai depois da resposta: é o botão dela que
      // segura a espera, travado e girando. Fechá-la antes anunciava um fim que
      // o servidor ainda podia recusar.
      set({ confirmDialog: null });
    },
    [run, set],
  );

  const reopenTicket = useCallback(
    (id: string) => run(() => setTicketStatus(id, "inProgress"), "Chamado reaberto"),
    [run],
  );

  /**
   * Abrir a conversa já conta como ler.
   *
   * Sem `executar`: é efeito colateral de navegar, não uma ação da pessoa —
   * não merece aviso na tela nem trava de botão. O refresh vem junto para o
   * selo "nova resposta" sumir do menu.
   */
  const markRead = useCallback(
    async (id: string) => {
      const c = d.tickets.find((y) => y.id === id);
      if (!c?.unread) return;
      await markTicketRead(id);
      iniciarTransicao(() => router.refresh());
    },
    [d.tickets, router],
  );

  /* ---------------------------------------------------------------------- */

  const a = useMemo<PortalActions>(
    () => ({
      set,
      toggleTheme,
      beforeNavigate,
      goTo,
      notify,
      closeToast,
      confirm,
      closeConfirm,
      closeModal,
      openModal,
      openMenu,
      signOut,
      addToCart,
      changeQty,
      removeItem,
      clearCart,
      recordSale,
      editSale,
      refundSale,
      undoRefund,
      openProduct,
      saveProduct,
      toggleFav,
      toggleActive,
      deleteProduct,
      openMovement,
      saveMovement,
      undoMovement,
      openCost,
      saveCost,
      deleteCost,
      openRegister,
      recordRegisterMovement,
      undoRegisterMovement,
      closeRegister,
      reopenRegister,
      saveData,
      discardData,
      toggleMethod,
      openRole,
      saveRole,
      removeRole,
      toggleEmployee,
      changeEmployeeRole,
      openNewTicket,
      sendTicket,
      replyToTicket,
      resolveTicket,
      reopenTicket,
      markRead,
    }),
    [
      set, toggleTheme, beforeNavigate, goTo, notify, closeToast, confirm, closeConfirm, closeModal, openModal,
      openMenu, signOut, addToCart, changeQty, removeItem, clearCart, recordSale,
      editSale, refundSale, undoRefund, openProduct, saveProduct, toggleFav,
      toggleActive, deleteProduct, openMovement, saveMovement, undoMovement, openCost, saveCost,
      deleteCost, openRegister, recordRegisterMovement, undoRegisterMovement, closeRegister, reopenRegister,
      saveData, discardData, toggleMethod, openRole, saveRole, removeRole,
      toggleEmployee, changeEmployeeRole, openNewTicket, sendTicket,
      replyToTicket, resolveTicket, reopenTicket, markRead,
    ],
  );

  return (
    <Ctx.Provider value={{ s, a, d, modules, has, isMobile, isDesktop }}>{children}</Ctx.Provider>
  );
}

export function usePortal(): ViewProps {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal precisa estar dentro de <PortalProvider>");
  return v;
}

/** 'YYYY-MM-DD' de N dias atrás — o formato de `costs.cost_date`. */
function dateDaysAgo(d: number): string {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
