"use client";

import { QUEBRA_MOBILE } from "@aguiar/ui";
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
  abrirCaixa as acaoAbrirCaixa,
  fecharCaixa as acaoFecharCaixa,
  reabrirCaixa as acaoReabrirCaixa,
  registrarMovimentacaoCaixa,
  reverterMovimentacaoCaixa,
} from "@/app/caixa/actions";
import {
  alternarFuncionario,
  mudarPapelDoFuncionario as acaoMudarPapel,
  removerPapel as acaoRemoverPapel,
  salvarDadosNegocio,
  salvarPapel as acaoSalvarPapel,
} from "@/app/configuracoes/actions";
import { excluirCusto as acaoExcluirCusto, salvarCusto as acaoSalvarCusto } from "@/app/custos/actions";
import { registrarMovimentacao, reverterMovimentacao } from "@/app/estoque/actions";
import {
  alternarAtivo,
  alternarFavorito,
  excluirProduto as acaoExcluirProduto,
  salvarProduto as acaoSalvarProduto,
} from "@/app/produtos/actions";
import { sair as acaoSair } from "@/app/sair/actions";
import {
  abrirChamado,
  marcarChamadoLido,
  mudarStatusChamado,
  responderChamado as acaoResponder,
} from "@/app/suporte/actions";
import {
  desfazerEstorno as acaoDesfazerEstorno,
  editarVenda as acaoEditarVenda,
  estornarVenda as acaoEstornarVenda,
  registrarVenda as acaoRegistrarVenda,
} from "@/app/vendas/actions";
import {
  DADOS_VAZIOS,
  estadoInicial,
  FORM_CAIXA_VAZIO,
  FORM_CHAMADO_VAZIO,
  FORM_CUSTO_VAZIO,
  FORM_MOV_VAZIO,
  FORM_PAPEL_VAZIO,
  FORM_PRODUTO_VAZIO,
  FORM_RESPOSTA_VAZIA,
} from "@/lib/estado";
import { numBR } from "@/lib/formato";
import { ROTA_PDV, ROTAS } from "@/lib/rotas";
import type {
  Confirmacao,
  DadosPortal,
  Modal,
  Patch,
  PortalActions,
  PortalState,
  ViewProps,
} from "@/types/estado";
import type { FormaPagamento, ModuloKey, Produto, TipoMovEstoque } from "@/types/types";

const Ctx = createContext<ViewProps | null>(null);

type Resultado = { ok: true } | { ok: false; mensagem: string };

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
  dados = DADOS_VAZIOS,
}: {
  children: ReactNode;
  dados?: DadosPortal;
}) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const [s, setS] = useState<PortalState>(() => estadoInicial(dados.dados));

  // O retrato do servidor NÃO entra no estado: ele é lido direto da prop, e o
  // `router.refresh()` do laço de escrita traz a versão nova. Duas cópias
  // significariam duas verdades, e a do cliente ficaria velha já na próxima
  // gravação.
  const d = dados;

  const set = useCallback((p: Patch) => setS((x) => ({ ...x, ...p })), []);

  /* ---------------------------------------------------------------------- */
  /* Ambiente                                                                */
  /* ---------------------------------------------------------------------- */

  // A largura real só é conhecida no navegador. Até lá o estado diz "desktop",
  // e é isso que o servidor renderiza — sem isso o primeiro pixel viria na
  // versão de celular e saltaria.
  useEffect(() => {
    const medir = () =>
      setS((x) => (x.larguraTela === window.innerWidth ? x : { ...x, larguraTela: window.innerWidth }));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // O tema vive num atributo do <body> para que uma única troca repinte tudo:
  // cada cor do portal é lida de uma variável CSS declarada ali.
  useEffect(() => {
    document.body.dataset.tema = s.tema;
  }, [s.tema]);

  // O aviso some sozinho: ele confirma o que acabou de acontecer, não pede ação.
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => setS((x) => (x.toast === s.toast ? { ...x, toast: "" } : x)), 2600);
    return () => clearTimeout(t);
  }, [s.toast]);

  // Um clique em qualquer lugar fecha as gavetas do topo.
  //
  // O menu de linha ficou de fora: quem o fecha é o `useDismiss` do Floating UI
  // dentro de `MenuAcoes`. Ele precisa disso porque o painel vive num portal em
  // `<body>` — para este listener um clique lá dentro é "fora do menu", e a
  // ação seria descartada antes de rodar.
  useEffect(() => {
    if (!s.notifAberto && !s.logoutAberto) return;
    const fechar = () => setS((x) => ({ ...x, notifAberto: false, logoutAberto: false }));
    const t = setTimeout(() => document.addEventListener("click", fechar), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", fechar);
    };
  }, [s.notifAberto, s.logoutAberto]);

  const isMobile = s.larguraTela < QUEBRA_MOBILE;
  const isDesktop = !isMobile;

  const modulos = d.negocio.modulos;
  const tem = useCallback((m: ModuloKey) => modulos.includes(m), [modulos]);

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
   */
  const executar = useCallback(
    async (
      acao: () => Promise<Resultado>,
      sucesso: string,
      depois?: (ok: boolean) => void,
    ): Promise<boolean> => {
      setS((x) => ({ ...x, salvando: true }));
      let r: Resultado;
      try {
        r = await acao();
      } catch {
        r = { ok: false, mensagem: "Não foi possível falar com o servidor. Tente de novo." };
      }

      setS((x) => ({ ...x, salvando: false, toast: r.ok ? sucesso : r.mensagem }));
      if (r.ok) iniciarTransicao(() => router.refresh());
      depois?.(r.ok);
      return r.ok;
    },
    [router],
  );

  /* ---------------------------------------------------------------------- */
  /* Utilidades                                                              */
  /* ---------------------------------------------------------------------- */

  const avisar = useCallback((texto: string) => set({ toast: texto }), [set]);
  const fecharConf = useCallback(() => set({ conf: null }), [set]);
  const confirmar = useCallback((c: Confirmacao) => set({ conf: c, menuLinha: null }), [set]);
  const fecharModal = useCallback(() => set({ modal: null }), [set]);
  const abrirModal = useCallback((m: Modal) => set({ modal: m, menuLinha: null }), [set]);
  const abrirMenu = useCallback((chave: string | null) => set({ menuLinha: chave }), [set]);

  const irPara = useCallback(
    (rota: string) => {
      router.push(rota);
      setS((x) => ({ ...x, navAberto: false, menuLinha: null, notifAberto: false }));
    },
    [router],
  );

  const toggleTema = useCallback(
    () => setS((x) => ({ ...x, tema: x.tema === "claro" ? "escuro" : "claro" })),
    [],
  );

  const sair = useCallback(() => void acaoSair(), []);

  /* ---------------------------------------------------------------------- */
  /* PDV                                                                     */
  /* ---------------------------------------------------------------------- */

  const addCarrinho = useCallback((p: Produto) => {
    setS((x) => {
      const achou = x.carrinho.find((c) => c.nome === p.nome);
      const carrinho = achou
        ? x.carrinho.map((c) => (c.nome === p.nome ? { ...c, qtd: c.qtd + 1 } : c))
        : [...x.carrinho, { produtoId: p.id, nome: p.nome, preco: p.preco, qtd: 1 }];
      // Buscar, tocar, buscar de novo: limpar a busca deixa o catálogo inteiro
      // de volta sem precisar apagar o campo à mão.
      return { ...x, carrinho, buscaProd: "", codigo: "" };
    });
  }, []);

  const mudarQtd = useCallback((nome: string, delta: number) => {
    setS((x) => ({
      ...x,
      carrinho: x.carrinho
        .map((c) => (c.nome === nome ? { ...c, qtd: c.qtd + delta } : c))
        .filter((c) => c.qtd > 0),
    }));
  }, []);

  const removerItem = useCallback((nome: string) => {
    setS((x) => ({ ...x, carrinho: x.carrinho.filter((c) => c.nome !== nome) }));
  }, []);

  const limparCarrinho = useCallback(
    () => set({ carrinho: [], editandoVenda: null, conf: null }),
    [set],
  );

  const registrarVenda = useCallback(() => {
    if (s.salvando || !s.carrinho.length) return;

    const itens = s.carrinho.map((c) => ({
      produtoId: c.produtoId,
      nome: c.nome,
      qtd: c.qtd,
      preco: c.preco,
    }));
    const editando = s.editandoVenda;

    void executar(
      () =>
        editando
          ? acaoEditarVenda(editando, itens, s.pagAtual)
          : acaoRegistrarVenda(itens, s.pagAtual),
      editando ? "Venda atualizada" : "Venda registrada",
      (ok) => {
        if (!ok) return;
        setS((x) => ({ ...x, carrinho: [], editandoVenda: null, carrinhoAberto: false }));
        router.push(ROTAS.vendas);
      },
    );
  }, [s.salvando, s.carrinho, s.pagAtual, s.editandoVenda, executar, router]);

  const editarVenda = useCallback(
    (id: string) => {
      const v = d.vendas.find((y) => y.id === id);
      if (!v) return;

      // O carrinho reabre com os nomes gravados na venda. O `produtoId` é
      // reencontrado pelo nome: o item pode ter sido excluído do catálogo
      // depois, e nesse caso a venda continua editável como item avulso.
      setS((x) => ({
        ...x,
        carrinho: v.itens.map((i) => ({
          produtoId: d.produtos.find((p) => p.nome === i.nome)?.id ?? null,
          nome: i.nome,
          preco: i.preco,
          qtd: i.qtd,
        })),
        pagAtual: v.pag,
        editandoVenda: id,
        menuLinha: null,
      }));
      router.push(ROTA_PDV);
    },
    [d.vendas, d.produtos, router],
  );

  const estornarVenda = useCallback(
    (id: string) => void executar(() => acaoEstornarVenda(id), "Venda estornada"),
    [executar],
  );

  const desfazerEstorno = useCallback(
    (id: string) => void executar(() => acaoDesfazerEstorno(id), "Estorno desfeito"),
    [executar],
  );

  /* ---------------------------------------------------------------------- */
  /* Produtos                                                                */
  /* ---------------------------------------------------------------------- */

  const abrirProduto = useCallback(
    (id: string | null) => {
      const p = id ? d.produtos.find((y) => y.id === id) : null;
      set({
        modal: { k: "produto", id },
        menuLinha: null,
        formProduto: p
          ? {
              id: p.id,
              nome: p.nome,
              preco: String(p.preco).replace(".", ","),
              categoria: p.categoria,
              catNova: false,
              ativo: p.ativo,
              fav: p.fav,
              servico: p.servico,
              codigo: p.codigo,
              custo: p.custo ? String(p.custo).replace(".", ",") : "",
              estoque: p.estoque == null ? "" : String(p.estoque),
              minimo: p.minimo == null ? "" : String(p.minimo),
              unidade: p.unidade,
              tentouSalvar: false,
            }
          : { ...FORM_PRODUTO_VAZIO },
      });
    },
    [d.produtos, set],
  );

  const salvarProduto = useCallback(() => {
    const f = s.formProduto;
    const preco = numBR(f.preco);
    if (!f.nome.trim() || preco <= 0) {
      set({ formProduto: { ...f, tentouSalvar: true } });
      return;
    }

    const temEstoque = f.estoque.trim() !== "";
    void executar(
      () =>
        acaoSalvarProduto({
          id: f.id,
          nome: f.nome,
          preco,
          categoria: f.categoria,
          codigo: f.codigo,
          custo: numBR(f.custo),
          estoque: temEstoque ? Math.round(numBR(f.estoque)) : null,
          minimo: temEstoque ? Math.round(numBR(f.minimo)) : null,
          unidade: f.unidade,
          ativo: f.ativo,
          fav: f.fav,
          servico: f.servico,
        }),
      f.id ? "Produto atualizado" : "Produto cadastrado",
      (ok) => ok && set({ modal: null, formProduto: { ...FORM_PRODUTO_VAZIO } }),
    );
  }, [s.formProduto, executar, set]);

  const toggleFav = useCallback(
    (id: string) => {
      const p = d.produtos.find((y) => y.id === id);
      if (!p) return;
      set({ menuLinha: null });
      void executar(
        () => alternarFavorito(id, !p.fav),
        p.fav ? "Saiu dos mais vendidos" : "Marcado como mais vendido",
      );
    },
    [d.produtos, executar, set],
  );

  const toggleAtivo = useCallback(
    (id: string) => {
      const p = d.produtos.find((y) => y.id === id);
      if (!p) return;
      set({ conf: null, menuLinha: null });
      void executar(() => alternarAtivo(id, !p.ativo), p.ativo ? "Produto pausado" : "Produto reativado");
    },
    [d.produtos, executar, set],
  );

  const excluirProduto = useCallback(
    (id: string) => {
      set({ conf: null, menuLinha: null });
      void executar(() => acaoExcluirProduto(id), "Produto excluído");
    },
    [executar, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Estoque                                                                 */
  /* ---------------------------------------------------------------------- */

  const abrirMov = useCallback(
    (produtoId?: string, tipo?: TipoMovEstoque) => {
      const controlados = d.produtos.filter((p) => p.estoque != null);
      set({
        modal: { k: "movEstoque" },
        menuLinha: null,
        formMov: {
          ...FORM_MOV_VAZIO,
          tipo: tipo ?? "entrada",
          produtoId: produtoId ?? controlados[0]?.id ?? null,
        },
      });
    },
    [d.produtos, set],
  );

  const salvarMov = useCallback(() => {
    const f = s.formMov;
    if (!f.produtoId || !f.qtd.trim()) {
      set({ formMov: { ...f, tentouSalvar: true } });
      return;
    }

    void executar(
      () =>
        registrarMovimentacao({
          produtoId: f.produtoId as string,
          tipo: f.tipo,
          quantidade: Math.round(numBR(f.qtd)),
          custoUnitario: numBR(f.custo),
          motivo: f.motivo,
        }),
      "Movimentação registrada",
      (ok) => ok && set({ modal: null, formMov: { ...FORM_MOV_VAZIO } }),
    );
  }, [s.formMov, executar, set]);

  const reverterMov = useCallback(
    (id: string) => {
      set({ conf: null, menuLinha: null });
      void executar(() => reverterMovimentacao(id), "Movimentação revertida");
    },
    [executar, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Custos                                                                  */
  /* ---------------------------------------------------------------------- */

  const abrirCusto = useCallback(
    (id: string | null) => {
      const c = id ? d.custos.find((y) => y.id === id) : null;
      set({
        modal: { k: "custo", id },
        menuLinha: null,
        formCusto: c
          ? {
              id: c.id,
              tipo: c.tipo,
              descricao: c.descricao,
              categoria: c.categoria,
              valor: String(c.valor).replace(".", ","),
              d: c.d,
              recorrente: c.recorrente,
              tentouSalvar: false,
            }
          : { ...FORM_CUSTO_VAZIO },
      });
    },
    [d.custos, set],
  );

  const salvarCusto = useCallback(() => {
    const f = s.formCusto;
    const valor = numBR(f.valor);
    if (!f.descricao.trim() || valor <= 0) {
      set({ formCusto: { ...f, tentouSalvar: true } });
      return;
    }

    void executar(
      () =>
        acaoSalvarCusto({
          id: f.id,
          tipo: f.tipo,
          descricao: f.descricao,
          categoria: f.categoria,
          valor,
          data: dataDeDiasAtras(f.d),
          recorrente: f.recorrente,
        }),
      f.id ? "Custo atualizado" : "Custo registrado",
      (ok) => ok && set({ modal: null, formCusto: { ...FORM_CUSTO_VAZIO } }),
    );
  }, [s.formCusto, executar, set]);

  const excluirCusto = useCallback(
    (id: string) => {
      set({ conf: null, menuLinha: null });
      void executar(() => acaoExcluirCusto(id), "Custo excluído");
    },
    [executar, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Caixa                                                                   */
  /* ---------------------------------------------------------------------- */

  const abrirCaixa = useCallback(() => {
    const valor = numBR(s.formCaixa.valor);
    void executar(
      () => acaoAbrirCaixa(valor),
      "Caixa aberto",
      (ok) => ok && set({ modal: null, formCaixa: { ...FORM_CAIXA_VAZIO } }),
    );
  }, [s.formCaixa.valor, executar, set]);

  const registrarMovCaixa = useCallback(() => {
    if (s.modal?.k !== "caixaMov" || !d.caixaAberto) return;
    const tipo = s.modal.tipo;

    void executar(
      () =>
        registrarMovimentacaoCaixa({
          caixaId: d.caixaAberto!.id,
          tipo,
          valor: numBR(s.formCaixa.valor),
          motivo: s.formCaixa.motivo,
        }),
      tipo === "sangria" ? "Sangria registrada" : "Reforço registrado",
      (ok) => ok && set({ modal: null, conf: null, formCaixa: { ...FORM_CAIXA_VAZIO } }),
    );
  }, [s.modal, s.formCaixa, d.caixaAberto, executar, set]);

  const reverterMovCaixa = useCallback(
    (id: string) => {
      set({ conf: null });
      void executar(() => reverterMovimentacaoCaixa(id), "Movimentação revertida");
    },
    [executar, set],
  );

  const fecharCaixa = useCallback(() => {
    if (!d.caixaAberto) return;
    void executar(
      () =>
        acaoFecharCaixa(
          d.caixaAberto!.id,
          numBR(s.formCaixa.contadoDinheiro),
          s.formCaixa.obs,
        ),
      "Caixa fechado",
      (ok) => ok && set({ modal: null, conf: null, formCaixa: { ...FORM_CAIXA_VAZIO } }),
    );
  }, [d.caixaAberto, s.formCaixa, executar, set]);

  const reabrirCaixa = useCallback(
    (id: string) => {
      set({ conf: null, modal: null, menuLinha: null });
      void executar(() => acaoReabrirCaixa(id), "Caixa reaberto");
    },
    [executar, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Configurações                                                           */
  /* ---------------------------------------------------------------------- */

  const salvarDados = useCallback(() => {
    void executar(() => salvarDadosNegocio(s.dadosRascunho), "Dados do negócio salvos");
  }, [s.dadosRascunho, executar]);

  const descartarDados = useCallback(
    () => setS((x) => ({ ...x, dadosRascunho: { ...d.dados } })),
    [d.dados],
  );

  const toggleForma = useCallback((f: FormaPagamento) => {
    setS((x) => {
      const ligada = x.formasAceitas.includes(f);
      // Desligar a última forma deixaria o PDV sem como cobrar.
      if (ligada && x.formasAceitas.length === 1) {
        return { ...x, toast: "Você precisa aceitar pelo menos uma forma" };
      }
      const formasAceitas = ligada
        ? x.formasAceitas.filter((y) => y !== f)
        : [...x.formasAceitas, f];
      return {
        ...x,
        formasAceitas,
        pagAtual: formasAceitas.includes(x.pagAtual) ? x.pagAtual : formasAceitas[0],
      };
    });
  }, []);

  const abrirPapel = useCallback(
    (id: string | null) => {
      const p = id ? d.papeis.find((y) => y.id === id) : null;
      set({
        modal: { k: "papel", id },
        menuLinha: null,
        formPapel: p
          ? { id: p.id, nome: p.nome, modulos: p.modulos.slice(), tentouSalvar: false }
          : { ...FORM_PAPEL_VAZIO },
      });
    },
    [d.papeis, set],
  );

  const salvarPapel = useCallback(() => {
    const f = s.formPapel;
    if (!f.nome.trim()) {
      set({ formPapel: { ...f, tentouSalvar: true } });
      return;
    }
    void executar(
      () => acaoSalvarPapel({ id: f.id, nome: f.nome, modulos: f.modulos }),
      f.id ? "Tipo de acesso atualizado" : "Tipo de acesso criado",
      (ok) => ok && set({ modal: null, formPapel: { ...FORM_PAPEL_VAZIO } }),
    );
  }, [s.formPapel, executar, set]);

  const removerPapel = useCallback(
    (id: string) => {
      set({ conf: null, menuLinha: null });
      void executar(() => acaoRemoverPapel(id), "Tipo de acesso removido");
    },
    [executar, set],
  );

  const toggleFuncionario = useCallback(
    (id: string) => {
      const f = d.equipe.find((y) => y.id === id);
      if (!f) return;
      set({ conf: null, menuLinha: null });
      void executar(
        () => alternarFuncionario(id, !f.ativo),
        f.ativo ? "Acesso suspenso" : "Acesso liberado",
      );
    },
    [d.equipe, executar, set],
  );

  const mudarPapelDoFuncionario = useCallback(
    (id: string, papelId: string) => {
      set({ menuLinha: null });
      void executar(() => acaoMudarPapel(id, papelId), "Tipo de acesso alterado");
    },
    [executar, set],
  );

  /* ---------------------------------------------------------------------- */
  /* Suporte                                                                 */
  /* ---------------------------------------------------------------------- */

  const abrirNovoChamado = useCallback(
    () => set({ modal: { k: "novoChamado" }, formChamado: { ...FORM_CHAMADO_VAZIO } }),
    [set],
  );

  const enviarChamado = useCallback(() => {
    const f = s.formChamado;
    if (f.assunto.trim().length < 5 || f.descricao.trim().length < 15) {
      set({ formChamado: { ...f, tentouEnviar: true } });
      return;
    }
    void executar(
      () =>
        abrirChamado({
          assunto: f.assunto,
          categoria: f.categoria,
          descricao: f.descricao,
          anexo: f.anexo,
        }),
      "Chamado aberto",
      (ok) => ok && set({ modal: null, formChamado: { ...FORM_CHAMADO_VAZIO } }),
    );
  }, [s.formChamado, executar, set]);

  const responderChamado = useCallback(
    (id: string) => {
      const f = s.formResposta;
      if (!f.texto.trim()) {
        set({ toast: "Escreva a sua resposta" });
        return;
      }
      void executar(
        () => acaoResponder(id, f.texto, f.anexo),
        "Resposta enviada",
        (ok) => ok && set({ formResposta: { ...FORM_RESPOSTA_VAZIA } }),
      );
    },
    [s.formResposta, executar, set],
  );

  const resolverChamado = useCallback(
    (id: string) => {
      set({ conf: null });
      void executar(() => mudarStatusChamado(id, "resolvido"), "Chamado resolvido");
    },
    [executar, set],
  );

  const reabrirChamado = useCallback(
    (id: string) => void executar(() => mudarStatusChamado(id, "andamento"), "Chamado reaberto"),
    [executar],
  );

  /**
   * Abrir a conversa já conta como ler.
   *
   * Sem `executar`: é efeito colateral de navegar, não uma ação da pessoa —
   * não merece aviso na tela nem trava de botão. O refresh vem junto para o
   * selo "nova resposta" sumir do menu.
   */
  const marcarLido = useCallback(
    (id: string) => {
      const c = d.chamados.find((y) => y.id === id);
      if (!c?.naoLido) return;
      void marcarChamadoLido(id).then(() => iniciarTransicao(() => router.refresh()));
    },
    [d.chamados, router],
  );

  /* ---------------------------------------------------------------------- */

  const a = useMemo<PortalActions>(
    () => ({
      set,
      toggleTema,
      irPara,
      avisar,
      confirmar,
      fecharConf,
      fecharModal,
      abrirModal,
      abrirMenu,
      sair,
      addCarrinho,
      mudarQtd,
      removerItem,
      limparCarrinho,
      registrarVenda,
      editarVenda,
      estornarVenda,
      desfazerEstorno,
      abrirProduto,
      salvarProduto,
      toggleFav,
      toggleAtivo,
      excluirProduto,
      abrirMov,
      salvarMov,
      reverterMov,
      abrirCusto,
      salvarCusto,
      excluirCusto,
      abrirCaixa,
      registrarMovCaixa,
      reverterMovCaixa,
      fecharCaixa,
      reabrirCaixa,
      salvarDados,
      descartarDados,
      toggleForma,
      abrirPapel,
      salvarPapel,
      removerPapel,
      toggleFuncionario,
      mudarPapelDoFuncionario,
      abrirNovoChamado,
      enviarChamado,
      responderChamado,
      resolverChamado,
      reabrirChamado,
      marcarLido,
    }),
    [
      set, toggleTema, irPara, avisar, confirmar, fecharConf, fecharModal, abrirModal,
      abrirMenu, sair, addCarrinho, mudarQtd, removerItem, limparCarrinho, registrarVenda,
      editarVenda, estornarVenda, desfazerEstorno, abrirProduto, salvarProduto, toggleFav,
      toggleAtivo, excluirProduto, abrirMov, salvarMov, reverterMov, abrirCusto, salvarCusto,
      excluirCusto, abrirCaixa, registrarMovCaixa, reverterMovCaixa, fecharCaixa, reabrirCaixa,
      salvarDados, descartarDados, toggleForma, abrirPapel, salvarPapel, removerPapel,
      toggleFuncionario, mudarPapelDoFuncionario, abrirNovoChamado, enviarChamado,
      responderChamado, resolverChamado, reabrirChamado, marcarLido,
    ],
  );

  return (
    <Ctx.Provider value={{ s, a, d, modulos, tem, isMobile, isDesktop }}>{children}</Ctx.Provider>
  );
}

export function usePortal(): ViewProps {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal precisa estar dentro de <PortalProvider>");
  return v;
}

/** 'YYYY-MM-DD' de N dias atrás — o formato de `costs.cost_date`. */
function dataDeDiasAtras(d: number): string {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
