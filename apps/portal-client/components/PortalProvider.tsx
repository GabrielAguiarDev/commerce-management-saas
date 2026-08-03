"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOV_CAIXA_ESTILO } from "@/lib/dados/caixa";
import { proximoProtocolo } from "@/lib/dados/chamados";
import { MOV_ESTILO } from "@/lib/dados/estoque";
import { PERFIS } from "@/lib/dados/perfis";
import { proximoId } from "@/lib/dados/uid";
import { estadoDoPerfil, FORM_CAIXA_VAZIO, FORM_CHAMADO_VAZIO, FORM_CUSTO_VAZIO, FORM_FUNC_VAZIO, FORM_MOV_VAZIO, FORM_PAPEL_VAZIO, FORM_PRODUTO_VAZIO, FORM_RESPOSTA_VAZIA, QUEBRA_MOBILE } from "@/lib/estado";
import { agoraHora, brl, numBR, resumoItens, siglaDe, totalV } from "@/lib/formato";
import { ROTA_PDV, ROTAS } from "@/lib/rotas";
import { vendasDoTurno } from "@/lib/selectors";
import type { Confirmacao, Modal, Patch, PortalActions, PortalState, ViewProps } from "@/types/estado";
import type {
  Custo,
  FormaPagamento,
  ModuloKey,
  MovEstoque,
  PerfilKey,
  Preferencias,
  Produto,
  TagLog,
  TipoMovEstoque,
  Venda,
} from "@/types/types";

const Ctx = createContext<ViewProps | null>(null);

/**
 * Guarda a sessão do portal acima do roteador, para que filtros, carrinho,
 * rascunhos e aparência sobrevivam à troca de tela.
 *
 * As ações que só aplicam um patch são memoizadas; as que precisam ler o estado
 * atual são closures sobre o `s` deste render — que é sempre o valor que a
 * pessoa está vendo.
 */
export function PortalProvider({
  children,
  perfilInicial = "petshop",
}: {
  children: ReactNode;
  perfilInicial?: PerfilKey;
}) {
  const router = useRouter();
  const [s, setS] = useState<PortalState>(() => estadoDoPerfil(perfilInicial));

  const set = useCallback((p: Patch) => setS((x) => ({ ...x, ...p })), []);

  /* ---------------------------------------------------------------------- */
  /* Ambiente                                                                */
  /* ---------------------------------------------------------------------- */

  // A largura real só é conhecida no navegador. Até lá o estado diz "desktop",
  // e é isso que o servidor renderiza — sem isso o primeiro pixel viria na
  // versão de celular e saltaria.
  useEffect(() => {
    const medir = () => setS((x) => (x.larguraTela === window.innerWidth ? x : { ...x, larguraTela: window.innerWidth }));
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

  // Um clique em qualquer lugar fecha o menu de linha aberto e as gavetas do
  // topo. Sem isto seria preciso acertar de novo o mesmo botão minúsculo.
  useEffect(() => {
    if (!s.menuLinha && !s.notifAberto && !s.logoutAberto) return;
    const fechar = () =>
      setS((x) => ({ ...x, menuLinha: null, notifAberto: false, logoutAberto: false }));
    // `capture: false` e um tick de atraso: o clique que ABRE o menu não pode
    // ser o mesmo que o fecha.
    const t = setTimeout(() => document.addEventListener("click", fechar), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", fechar);
    };
  }, [s.menuLinha, s.notifAberto, s.logoutAberto]);

  const isMobile = s.larguraTela < QUEBRA_MOBILE;
  const isDesktop = !isMobile;

  const modulos = PERFIS[s.perfil].modulos;
  const tem = useCallback((m: ModuloKey) => modulos.includes(m), [modulos]);

  /* ---------------------------------------------------------------------- */
  /* Utilidades internas                                                     */
  /* ---------------------------------------------------------------------- */

  const avisar = useCallback((texto: string) => set({ toast: texto }), [set]);

  /** Toda ação que muda dado deixa rastro em "O que aconteceu no portal". */
  const registrar = (x: PortalState, tag: TagLog, texto: string, detalhe: string): PortalState => ({
    ...x,
    log: [
      {
        id: proximoId(),
        d: 0,
        hora: agoraHora(),
        quem: PERFIS[x.perfil].user.nome,
        tag,
        texto,
        detalhe,
      },
      ...x.log,
    ],
  });

  const fecharConf = useCallback(() => set({ conf: null }), [set]);
  const confirmar = useCallback((c: Confirmacao) => set({ conf: c, menuLinha: null }), [set]);
  const fecharModal = useCallback(() => set({ modal: null }), [set]);
  const abrirModal = useCallback((m: Modal) => set({ modal: m, menuLinha: null }), [set]);

  const toggleMenu = useCallback(
    (chave: string) => setS((x) => ({ ...x, menuLinha: x.menuLinha === chave ? null : chave })),
    [],
  );

  const irPara = useCallback(
    (rota: string) => {
      router.push(rota);
      setS((x) => ({ ...x, navAberto: false, menuLinha: null, notifAberto: false }));
    },
    [router],
  );

  const trocarPerfil = useCallback(
    (p: PerfilKey) => {
      setS((x) =>
        estadoDoPerfil(p, { tema: x.tema, larguraTela: x.larguraTela, colapsada: x.colapsada }),
      );
      router.push(ROTAS.dashboard);
    },
    [router],
  );

  const toggleTema = useCallback(
    () => setS((x) => ({ ...x, tema: x.tema === "claro" ? "escuro" : "claro" })),
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Estoque — o motor que vendas e movimentações compartilham                */
  /* ---------------------------------------------------------------------- */

  /**
   * Aplica um delta ao saldo de um produto. Serviço não tem prateleira, então
   * passa direto: é o que deixa o petshop vender banho sem "estoque negativo".
   */
  function aplicarDelta(produtos: Produto[], nome: string, delta: number): Produto[] {
    return produtos.map((p) =>
      p.nome === nome && p.estoque != null ? { ...p, estoque: p.estoque + delta } : p,
    );
  }

  function movDeVenda(x: PortalState, v: Venda): MovEstoque[] {
    return v.itens
      .filter((i) => x.produtos.some((p) => p.nome === i.nome && p.estoque != null))
      .map((i) => ({
        id: proximoId(),
        d: v.d,
        hora: v.hora,
        produto: i.nome,
        tipo: "venda" as TipoMovEstoque,
        delta: -i.qtd,
        motivo: `Venda das ${v.hora}`,
        quem: PERFIS[x.perfil].user.nome,
      }));
  }

  /* ---------------------------------------------------------------------- */
  /* Vendas e PDV                                                            */
  /* ---------------------------------------------------------------------- */

  const addCarrinho = useCallback((p: Produto) => {
    setS((x) => {
      const achou = x.carrinho.find((c) => c.nome === p.nome);
      const carrinho = achou
        ? x.carrinho.map((c) => (c.nome === p.nome ? { ...c, qtd: c.qtd + 1 } : c))
        : [...x.carrinho, { nome: p.nome, preco: p.preco, qtd: 1 }];
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
    // Carrinho vazio não vira venda — e, por isso, também não navega.
    let registrou = false;

    setS((x) => {
      if (!x.carrinho.length) return x;
      registrou = true;

      const itens = x.carrinho.map((c) => ({ nome: c.nome, qtd: c.qtd, preco: c.preco }));
      const hora = agoraHora();

      // Editar é substituir: a venda antiga devolve o estoque antes de a nova
      // dar baixa, ou uma correção de quantidade contaria duas vezes.
      let produtos = x.produtos;
      let movs = x.movs;
      let vendas = x.vendas;

      const antiga = x.editandoVenda != null ? x.vendas.find((v) => v.id === x.editandoVenda) : null;
      if (antiga) {
        for (const i of antiga.itens) produtos = aplicarDelta(produtos, i.nome, i.qtd);
        movs = movs.filter((m) => !(m.tipo === "venda" && m.motivo === `Venda das ${antiga.hora}`));
        vendas = vendas.filter((v) => v.id !== antiga.id);
      }

      const venda: Venda = {
        id: antiga?.id ?? proximoId(),
        d: 0,
        hora,
        pag: x.pagAtual,
        estornada: false,
        itens,
      };

      for (const i of itens) produtos = aplicarDelta(produtos, i.nome, -i.qtd);

      const base: PortalState = {
        ...x,
        produtos,
        vendas: [venda, ...vendas],
        movs: [...movDeVenda({ ...x, produtos }, venda), ...movs],
        carrinho: [],
        editandoVenda: null,
        carrinhoAberto: false,
        toast: antiga ? "Venda atualizada" : `Venda de ${brl(totalV(venda))} registrada`,
      };

      return registrar(
        base,
        "venda",
        `${antiga ? "editou" : "registrou"} uma venda de ${brl(totalV(venda))}`,
        resumoItens(itens),
      );
    });

    if (registrou) router.push(ROTAS.vendas);
  }, [router]);

  const editarVenda = useCallback(
    (id: number) => {
      setS((x) => {
        const v = x.vendas.find((y) => y.id === id);
        if (!v) return x;
        return {
          ...x,
          carrinho: v.itens.map((i) => ({ nome: i.nome, preco: i.preco, qtd: i.qtd })),
          pagAtual: v.pag,
          editandoVenda: id,
          menuLinha: null,
        };
      });
      router.push(ROTA_PDV);
    },
    [router],
  );

  /**
   * Estornar não apaga: a venda continua no histórico, riscada, fora do
   * faturamento. O estoque volta, porque o produto voltou para a prateleira.
   */
  const estornarVenda = useCallback((id: number) => {
    setS((x) => {
      const v = x.vendas.find((y) => y.id === id);
      if (!v || v.estornada) return x;

      let produtos = x.produtos;
      for (const i of v.itens) produtos = aplicarDelta(produtos, i.nome, i.qtd);

      return registrar(
        {
          ...x,
          produtos,
          vendas: x.vendas.map((y) => (y.id === id ? { ...y, estornada: true } : y)),
          movs: x.movs.filter((m) => !(m.tipo === "venda" && m.motivo === `Venda das ${v.hora}`)),
          conf: null,
          menuLinha: null,
          toast: "Venda estornada",
        },
        "venda",
        `estornou uma venda de ${brl(totalV(v))}`,
        `Venda das ${v.hora}`,
      );
    });
  }, []);

  const desfazerEstorno = useCallback((id: number) => {
    setS((x) => {
      const v = x.vendas.find((y) => y.id === id);
      if (!v || !v.estornada) return x;

      let produtos = x.produtos;
      for (const i of v.itens) produtos = aplicarDelta(produtos, i.nome, -i.qtd);

      const reposta = { ...v, estornada: false };
      return registrar(
        {
          ...x,
          produtos,
          vendas: x.vendas.map((y) => (y.id === id ? reposta : y)),
          movs: [...movDeVenda({ ...x, produtos }, reposta), ...x.movs],
          conf: null,
          menuLinha: null,
          toast: "Estorno desfeito",
        },
        "venda",
        `desfez o estorno de uma venda de ${brl(totalV(v))}`,
        `Venda das ${v.hora}`,
      );
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Produtos                                                                */
  /* ---------------------------------------------------------------------- */

  const abrirProduto = useCallback((id: number | null) => {
    setS((x) => {
      const p = id != null ? x.produtos.find((y) => y.id === id) : null;
      return {
        ...x,
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
              codigo: p.codigo,
              custo: p.custo ? String(p.custo).replace(".", ",") : "",
              estoque: p.estoque == null ? "" : String(p.estoque),
              minimo: p.minimo == null ? "" : String(p.minimo),
              unidade: p.unidade,
              tentouSalvar: false,
            }
          : { ...FORM_PRODUTO_VAZIO, categoria: x.catsProduto[0] ?? "" },
      };
    });
  }, []);

  const salvarProduto = useCallback(() => {
    setS((x) => {
      const f = x.formProduto;
      const preco = numBR(f.preco);
      if (!f.nome.trim() || preco <= 0) return { ...x, formProduto: { ...f, tentouSalvar: true } };

      const temEstoque = f.estoque.trim() !== "";
      const campos = {
        nome: f.nome.trim(),
        preco,
        categoria: f.categoria.trim() || "Outros",
        ativo: f.ativo,
        fav: f.fav,
        codigo: f.codigo.trim(),
        custo: numBR(f.custo),
        estoque: temEstoque ? Math.round(numBR(f.estoque)) : null,
        minimo: temEstoque ? Math.round(numBR(f.minimo)) : null,
        unidade: f.unidade,
      };

      const editando = f.id != null;
      const produtos = editando
        ? x.produtos.map((p) => (p.id === f.id ? { ...p, ...campos } : p))
        : [...x.produtos, { id: proximoId(), ...campos }];

      // Categoria digitada à mão passa a existir para os próximos cadastros.
      const catsProduto = x.catsProduto.includes(campos.categoria)
        ? x.catsProduto
        : [...x.catsProduto, campos.categoria].sort();

      return {
        ...x,
        produtos,
        catsProduto,
        modal: null,
        formProduto: { ...FORM_PRODUTO_VAZIO },
        toast: editando ? "Produto atualizado" : "Produto cadastrado",
      };
    });
  }, []);

  const toggleFav = useCallback((id: number) => {
    setS((x) => ({
      ...x,
      produtos: x.produtos.map((p) => (p.id === id ? { ...p, fav: !p.fav } : p)),
      menuLinha: null,
    }));
  }, []);

  const toggleAtivo = useCallback((id: number) => {
    setS((x) => {
      const p = x.produtos.find((y) => y.id === id);
      if (!p) return x;
      return {
        ...x,
        produtos: x.produtos.map((y) => (y.id === id ? { ...y, ativo: !y.ativo } : y)),
        conf: null,
        menuLinha: null,
        toast: p.ativo ? "Produto pausado" : "Produto reativado",
      };
    });
  }, []);

  const excluirProduto = useCallback((id: number) => {
    setS((x) => ({
      ...x,
      produtos: x.produtos.filter((p) => p.id !== id),
      conf: null,
      menuLinha: null,
      toast: "Produto excluído",
    }));
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Estoque                                                                 */
  /* ---------------------------------------------------------------------- */

  const abrirMov = useCallback((produtoId?: number, tipo?: TipoMovEstoque) => {
    setS((x) => {
      const controlados = x.produtos.filter((p) => p.estoque != null);
      return {
        ...x,
        modal: { k: "movEstoque" },
        menuLinha: null,
        formMov: {
          ...FORM_MOV_VAZIO,
          tipo: tipo ?? "entrada",
          produtoId: produtoId ?? controlados[0]?.id ?? null,
        },
      };
    });
  }, []);

  const salvarMov = useCallback(() => {
    setS((x) => {
      const f = x.formMov;
      const p = x.produtos.find((y) => y.id === f.produtoId);
      const qtd = Math.round(numBR(f.qtd));
      if (!p || p.estoque == null || !f.qtd.trim() || qtd < 0) {
        return { ...x, formMov: { ...f, tentouSalvar: true } };
      }

      // Entrada e saída falam em "quanto mudou"; o ajuste fala em "quanto tem",
      // porque quem conta a prateleira lê o total, não a diferença.
      const delta = f.tipo === "entrada" ? qtd : f.tipo === "saida" ? -qtd : qtd - p.estoque;
      if (delta === 0) return { ...x, modal: null, toast: "Nada mudou no estoque" };

      const custoUnit = numBR(f.custo);
      const mov: MovEstoque = {
        id: proximoId(),
        d: 0,
        hora: agoraHora(),
        produto: p.nome,
        tipo: f.tipo,
        delta,
        motivo: f.motivo.trim() || MOV_ESTILO[f.tipo].nome,
        quem: PERFIS[x.perfil].user.nome,
        custo: custoUnit || undefined,
      };

      // Compra de mercadoria é dinheiro que saiu: vira custo variável sozinho,
      // marcado como "veio do estoque" para ninguém lançar de novo à mão.
      const custos: Custo[] =
        f.tipo === "entrada" && custoUnit > 0
          ? [
              {
                id: proximoId(),
                tipo: "variavel",
                descricao: `Compra — ${p.nome}`,
                categoria: "Materiais",
                valor: Math.round(custoUnit * qtd * 100) / 100,
                d: 0,
                recorrente: false,
                doEstoque: true,
              },
              ...x.custos,
            ]
          : x.custos;

      const produtos = x.produtos.map((y) =>
        y.id === p.id
          ? {
              ...y,
              estoque: (y.estoque ?? 0) + delta,
              custo: f.tipo === "entrada" && custoUnit > 0 ? custoUnit : y.custo,
            }
          : y,
      );

      return registrar(
        {
          ...x,
          produtos,
          custos,
          movs: [mov, ...x.movs],
          modal: null,
          conf: null,
          formMov: { ...FORM_MOV_VAZIO },
          toast: `${MOV_ESTILO[f.tipo].nome} registrada`,
        },
        "estoque",
        f.tipo === "ajuste"
          ? `ajustou o estoque de ${p.nome}`
          : `registrou ${delta > 0 ? "entrada" : "saída"} de ${Math.abs(delta)} ${p.unidade}`,
        mov.motivo,
      );
    });
  }, []);

  const reverterMov = useCallback((id: number) => {
    setS((x) => {
      const m = x.movs.find((y) => y.id === id);
      if (!m) return x;

      return {
        ...x,
        produtos: aplicarDelta(x.produtos, m.produto, -m.delta),
        movs: x.movs.filter((y) => y.id !== id),
        // O custo lançado pela entrada some junto: senão sobraria uma despesa
        // sem mercadoria correspondente.
        custos: x.custos.filter((c) => !(c.doEstoque && c.descricao === `Compra — ${m.produto}` && c.d === m.d)),
        conf: null,
        menuLinha: null,
        toast: "Movimentação revertida",
      };
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Custos                                                                  */
  /* ---------------------------------------------------------------------- */

  const abrirCusto = useCallback((id: number | null) => {
    setS((x) => {
      const c = id != null ? x.custos.find((y) => y.id === id) : null;
      return {
        ...x,
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
      };
    });
  }, []);

  const salvarCusto = useCallback(() => {
    setS((x) => {
      const f = x.formCusto;
      const valor = numBR(f.valor);
      if (!f.descricao.trim() || valor <= 0) {
        return { ...x, formCusto: { ...f, tentouSalvar: true } };
      }

      const campos = {
        tipo: f.tipo,
        descricao: f.descricao.trim(),
        categoria: f.categoria || "Outros",
        valor,
        d: f.d,
        // Só custo fixo repete: um saco de feijão não volta sozinho todo mês.
        recorrente: f.tipo === "fixo" ? f.recorrente : false,
      };

      const editando = f.id != null;
      const custos = editando
        ? x.custos.map((c) => (c.id === f.id ? { ...c, ...campos } : c))
        : [{ id: proximoId(), ...campos }, ...x.custos];

      return registrar(
        {
          ...x,
          custos,
          modal: null,
          formCusto: { ...FORM_CUSTO_VAZIO },
          toast: editando ? "Custo atualizado" : "Custo registrado",
        },
        "custos",
        `${editando ? "editou" : "lançou"} ${campos.descricao.toLowerCase()} de ${brl(valor)}`,
        `Custo ${campos.tipo === "fixo" ? "fixo" : "variável"} · ${campos.categoria}`,
      );
    });
  }, []);

  const excluirCusto = useCallback((id: number) => {
    setS((x) => ({
      ...x,
      custos: x.custos.filter((c) => c.id !== id),
      conf: null,
      menuLinha: null,
      toast: "Custo excluído",
    }));
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Caixa                                                                   */
  /* ---------------------------------------------------------------------- */

  const abrirCaixa = useCallback(() => {
    setS((x) => {
      const inicial = numBR(x.formCaixa.valor);
      return registrar(
        {
          ...x,
          caixaAberto: {
            id: proximoId(),
            abertura: agoraHora(),
            inicial,
            operador: PERFIS[x.perfil].user.nome,
            movs: [],
          },
          modal: null,
          formCaixa: { ...FORM_CAIXA_VAZIO },
          toast: `Caixa aberto com ${brl(inicial)}`,
        },
        "caixa",
        `abriu o caixa com ${brl(inicial)} de troco`,
        `Turno iniciado às ${agoraHora()}`,
      );
    });
  }, []);

  const registrarMovCaixa = useCallback(() => {
    setS((x) => {
      if (!x.caixaAberto || x.modal?.k !== "caixaMov") return x;
      const tipo = x.modal.tipo;
      const valor = numBR(x.formCaixa.valor);
      if (valor <= 0) return x;

      const mov = {
        id: proximoId(),
        hora: agoraHora(),
        tipo,
        valor,
        motivo: x.formCaixa.motivo.trim() || MOV_CAIXA_ESTILO[tipo].rotulo,
      };

      return registrar(
        {
          ...x,
          caixaAberto: { ...x.caixaAberto, movs: [mov, ...x.caixaAberto.movs] },
          modal: null,
          conf: null,
          formCaixa: { ...FORM_CAIXA_VAZIO },
          toast: `${MOV_CAIXA_ESTILO[tipo].rotulo} de ${brl(valor)}`,
        },
        "caixa",
        `fez ${tipo === "sangria" ? "uma sangria" : "um reforço"} de ${brl(valor)}`,
        mov.motivo,
      );
    });
  }, []);

  const reverterMovCaixa = useCallback((id: number) => {
    setS((x) =>
      x.caixaAberto
        ? {
            ...x,
            caixaAberto: { ...x.caixaAberto, movs: x.caixaAberto.movs.filter((m) => m.id !== id) },
            conf: null,
            toast: "Movimentação revertida",
          }
        : x,
    );
  }, []);

  const fecharCaixa = useCallback(() => {
    setS((x) => {
      const cx = x.caixaAberto;
      if (!cx) return x;

      const vendas = vendasDoTurno(x);
      const contado: Partial<Record<FormaPagamento, number>> = {};
      for (const [f, v] of Object.entries(x.formCaixa.contado)) {
        contado[f as FormaPagamento] = numBR(v);
      }

      const esperadoTotal =
        cx.inicial +
        Object.values(vendas).reduce((a, v) => a + v, 0) +
        cx.movs.reduce((a, m) => a + (m.tipo === "reforco" ? m.valor : -m.valor), 0);
      const contadoTotal = Object.values(contado).reduce((a, v) => a + (v ?? 0), 0);
      const dif = contadoTotal - esperadoTotal;

      return registrar(
        {
          ...x,
          caixaAberto: null,
          caixasFechados: [
            {
              id: cx.id,
              d: 0,
              abertura: cx.abertura,
              fechamento: agoraHora(),
              inicial: cx.inicial,
              operador: cx.operador,
              vendas,
              contado,
              movs: cx.movs,
              obs: x.formCaixa.obs.trim(),
            },
            ...x.caixasFechados,
          ],
          modal: null,
          conf: null,
          formCaixa: { ...FORM_CAIXA_VAZIO },
          toast: Math.abs(dif) < 0.005 ? "Caixa fechado — bateu certinho" : "Caixa fechado",
        },
        "caixa",
        `fechou o caixa com ${Math.abs(dif) < 0.005 ? "os valores certos" : `${dif > 0 ? "sobra" : "falta"} de ${brl(Math.abs(dif))}`}`,
        `Turno de ${cx.abertura} às ${agoraHora()}`,
      );
    });
  }, []);

  /** Fechou por engano: o turno volta a ser o aberto, com as movimentações. */
  const reabrirCaixa = useCallback((id: number) => {
    setS((x) => {
      const c = x.caixasFechados.find((y) => y.id === id);
      if (!c || x.caixaAberto) return { ...x, conf: null };
      return {
        ...x,
        caixaAberto: {
          id: c.id,
          abertura: c.abertura,
          inicial: c.inicial,
          operador: c.operador,
          movs: c.movs,
        },
        caixasFechados: x.caixasFechados.filter((y) => y.id !== id),
        conf: null,
        modal: null,
        menuLinha: null,
        toast: "Caixa reaberto",
      };
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Configurações                                                           */
  /* ---------------------------------------------------------------------- */

  const salvarDados = useCallback(() => {
    setS((x) =>
      registrar(
        { ...x, dados: { ...x.dadosRascunho }, toast: "Dados do negócio salvos" },
        "config",
        "alterou os dados do negócio",
        x.dadosRascunho.nome,
      ),
    );
  }, []);

  const descartarDados = useCallback(
    () => setS((x) => ({ ...x, dadosRascunho: { ...x.dados } })),
    [],
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

  const togglePref = useCallback((k: keyof Preferencias) => {
    setS((x) => ({ ...x, prefs: { ...x.prefs, [k]: !x.prefs[k] } }));
  }, []);

  const criarCategoria = useCallback((grupo: "produto" | "custo") => {
    setS((x) => {
      const nome = (grupo === "produto" ? x.novaCatProduto : x.novaCatCusto).trim();
      if (!nome) return x;
      const lista = grupo === "produto" ? x.catsProduto : x.catsCusto;
      if (lista.some((c) => c.toLowerCase() === nome.toLowerCase())) {
        return { ...x, toast: "Essa categoria já existe" };
      }
      return grupo === "produto"
        ? { ...x, catsProduto: [...lista, nome].sort(), novaCatProduto: "", toast: "Categoria criada" }
        : { ...x, catsCusto: [...lista, nome].sort(), novaCatCusto: "", toast: "Categoria criada" };
    });
  }, []);

  const removerCategoria = useCallback((grupo: "produto" | "custo", nome: string) => {
    setS((x) =>
      grupo === "produto"
        ? {
            ...x,
            catsProduto: x.catsProduto.filter((c) => c !== nome),
            // Os produtos que usavam a categoria não somem — caem em "Outros".
            produtos: x.produtos.map((p) => (p.categoria === nome ? { ...p, categoria: "Outros" } : p)),
            conf: null,
            toast: "Categoria removida",
          }
        : {
            ...x,
            catsCusto: x.catsCusto.filter((c) => c !== nome),
            custos: x.custos.map((c) => (c.categoria === nome ? { ...c, categoria: "Outros" } : c)),
            conf: null,
            toast: "Categoria removida",
          },
    );
  }, []);

  const abrirFuncionario = useCallback((id: number | null) => {
    setS((x) => {
      const f = id != null ? x.equipe.find((y) => y.id === id) : null;
      return {
        ...x,
        modal: { k: "funcionario", id },
        menuLinha: null,
        formFunc: f
          ? { id: f.id, nome: f.nome, email: f.email, papel: f.papel, tentouSalvar: false }
          : {
              ...FORM_FUNC_VAZIO,
              papel: x.papeis.find((p) => !p.fixo)?.nome ?? x.papeis[0]?.nome ?? "",
            },
      };
    });
  }, []);

  const salvarFuncionario = useCallback(() => {
    setS((x) => {
      const f = x.formFunc;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
      if (!f.nome.trim() || !emailOk) return { ...x, formFunc: { ...f, tentouSalvar: true } };

      const campos = { nome: f.nome.trim(), email: f.email.trim(), papel: f.papel };
      const editando = f.id != null;
      const equipe = editando
        ? x.equipe.map((y) => (y.id === f.id ? { ...y, ...campos } : y))
        : [
            ...x.equipe,
            { id: proximoId(), ...campos, ativo: true, acesso: "nunca entrou", dono: false },
          ];

      return registrar(
        { ...x, equipe, modal: null, formFunc: { ...FORM_FUNC_VAZIO }, toast: editando ? "Funcionário atualizado" : "Funcionário cadastrado" },
        "config",
        `${editando ? "editou" : "cadastrou"} o funcionário ${campos.nome}`,
        `Tipo de acesso: ${campos.papel}`,
      );
    });
  }, []);

  const toggleFuncionario = useCallback((id: number) => {
    setS((x) => {
      const f = x.equipe.find((y) => y.id === id);
      if (!f) return x;
      return {
        ...x,
        equipe: x.equipe.map((y) => (y.id === id ? { ...y, ativo: !y.ativo } : y)),
        conf: null,
        menuLinha: null,
        toast: f.ativo ? "Acesso suspenso" : "Acesso liberado",
      };
    });
  }, []);

  const removerFuncionario = useCallback((id: number) => {
    setS((x) => ({
      ...x,
      equipe: x.equipe.filter((y) => y.id !== id),
      conf: null,
      menuLinha: null,
      toast: "Funcionário removido",
    }));
  }, []);

  const abrirPapel = useCallback((id: number | null) => {
    setS((x) => {
      const p = id != null ? x.papeis.find((y) => y.id === id) : null;
      return {
        ...x,
        modal: { k: "papel", id },
        menuLinha: null,
        formPapel: p
          ? { id: p.id, nome: p.nome, modulos: p.modulos.slice(), tentouSalvar: false }
          : { ...FORM_PAPEL_VAZIO },
      };
    });
  }, []);

  const salvarPapel = useCallback(() => {
    setS((x) => {
      const f = x.formPapel;
      if (!f.nome.trim()) return { ...x, formPapel: { ...f, tentouSalvar: true } };

      const editando = f.id != null;
      const papeis = editando
        ? x.papeis.map((p) => (p.id === f.id ? { ...p, nome: f.nome.trim(), modulos: f.modulos } : p))
        : [...x.papeis, { id: proximoId(), nome: f.nome.trim(), modulos: f.modulos, fixo: false }];

      // Renomear o tipo tem de arrastar quem o usa, ou o funcionário fica órfão.
      const antigo = editando ? x.papeis.find((p) => p.id === f.id)?.nome : null;
      const equipe =
        antigo && antigo !== f.nome.trim()
          ? x.equipe.map((y) => (y.papel === antigo ? { ...y, papel: f.nome.trim() } : y))
          : x.equipe;

      return registrar(
        { ...x, papeis, equipe, modal: null, formPapel: { ...FORM_PAPEL_VAZIO }, toast: editando ? "Tipo de acesso atualizado" : "Tipo de acesso criado" },
        "config",
        `${editando ? "editou" : "criou"} o tipo de acesso ${f.nome.trim()}`,
        `${f.modulos.length} módulo${f.modulos.length === 1 ? "" : "s"} liberado${f.modulos.length === 1 ? "" : "s"}`,
      );
    });
  }, []);

  const removerPapel = useCallback((id: number) => {
    setS((x) => {
      const p = x.papeis.find((y) => y.id === id);
      if (!p || p.fixo) return { ...x, conf: null };
      if (x.equipe.some((f) => f.papel === p.nome)) {
        return { ...x, conf: null, toast: "Há funcionários usando este tipo de acesso" };
      }
      return {
        ...x,
        papeis: x.papeis.filter((y) => y.id !== id),
        conf: null,
        menuLinha: null,
        toast: "Tipo de acesso removido",
      };
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Suporte                                                                 */
  /* ---------------------------------------------------------------------- */

  const abrirNovoChamado = useCallback(
    () => set({ modal: { k: "novoChamado" }, formChamado: { ...FORM_CHAMADO_VAZIO } }),
    [set],
  );

  const enviarChamado = useCallback(() => {
    let protocolo = "";
    setS((x) => {
      const f = x.formChamado;
      if (f.assunto.trim().length < 5 || f.descricao.trim().length < 15) {
        return { ...x, formChamado: { ...f, tentouEnviar: true } };
      }
      protocolo = proximoProtocolo(x.chamados);
      return {
        ...x,
        chamados: [
          {
            id: protocolo,
            assunto: f.assunto.trim(),
            categoria: f.categoria,
            status: "aberto",
            naoLido: false,
            msgs: [
              {
                autor: "cliente",
                d: 0,
                hora: agoraHora(),
                texto: f.descricao.trim(),
                anexo: f.anexo,
              },
            ],
          },
          ...x.chamados,
        ],
        modal: null,
        formChamado: { ...FORM_CHAMADO_VAZIO },
        toast: `Chamado ${protocolo} aberto`,
      };
    });
  }, []);

  const responderChamado = useCallback((id: string) => {
    setS((x) => {
      const texto = x.formResposta.texto.trim();
      if (!texto) return x;
      return {
        ...x,
        chamados: x.chamados.map((c) =>
          c.id === id
            ? {
                ...c,
                // Responder devolve a bola: sai de "aguardando você".
                status: c.status === "aguardando" ? "andamento" : c.status,
                naoLido: false,
                msgs: [
                  ...c.msgs,
                  { autor: "cliente" as const, d: 0, hora: agoraHora(), texto, anexo: x.formResposta.anexo },
                ],
              }
            : c,
        ),
        formResposta: { ...FORM_RESPOSTA_VAZIA },
        toast: "Resposta enviada",
      };
    });
  }, []);

  const resolverChamado = useCallback((id: string) => {
    setS((x) => ({
      ...x,
      chamados: x.chamados.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "resolvido" as const,
              naoLido: false,
              msgs: [
                ...c.msgs,
                {
                  autor: "sistema" as const,
                  d: 0,
                  hora: agoraHora(),
                  texto: "Chamado marcado como resolvido por você.",
                  anexo: "",
                },
              ],
            }
          : c,
      ),
      conf: null,
      toast: "Chamado resolvido",
    }));
  }, []);

  const reabrirChamado = useCallback((id: string) => {
    setS((x) => ({
      ...x,
      chamados: x.chamados.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "andamento" as const,
              msgs: [
                ...c.msgs,
                {
                  autor: "sistema" as const,
                  d: 0,
                  hora: agoraHora(),
                  texto: "Chamado reaberto por você.",
                  anexo: "",
                },
              ],
            }
          : c,
      ),
      toast: "Chamado reaberto",
    }));
  }, []);

  /** Abrir a conversa já conta como ler: o selo "nova resposta" some. */
  const marcarLido = useCallback((id: string) => {
    setS((x) =>
      x.chamados.some((c) => c.id === id && c.naoLido)
        ? { ...x, chamados: x.chamados.map((c) => (c.id === id ? { ...c, naoLido: false } : c)) }
        : x,
    );
  }, []);

  /* ---------------------------------------------------------------------- */

  const a = useMemo<PortalActions>(
    () => ({
      set,
      trocarPerfil,
      toggleTema,
      irPara,
      avisar,
      confirmar,
      fecharConf,
      fecharModal,
      abrirModal,
      toggleMenu,
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
      togglePref,
      criarCategoria,
      removerCategoria,
      abrirFuncionario,
      salvarFuncionario,
      toggleFuncionario,
      removerFuncionario,
      abrirPapel,
      salvarPapel,
      removerPapel,
      abrirNovoChamado,
      enviarChamado,
      responderChamado,
      resolverChamado,
      reabrirChamado,
      marcarLido,
    }),
    [
      set, trocarPerfil, toggleTema, irPara, avisar, confirmar, fecharConf, fecharModal,
      abrirModal, toggleMenu, addCarrinho, mudarQtd, removerItem, limparCarrinho,
      registrarVenda, editarVenda, estornarVenda, desfazerEstorno, abrirProduto,
      salvarProduto, toggleFav, toggleAtivo, excluirProduto, abrirMov, salvarMov,
      reverterMov, abrirCusto, salvarCusto, excluirCusto, abrirCaixa, registrarMovCaixa,
      reverterMovCaixa, fecharCaixa, reabrirCaixa, salvarDados, descartarDados,
      toggleForma, togglePref, criarCategoria, removerCategoria, abrirFuncionario,
      salvarFuncionario, toggleFuncionario, removerFuncionario, abrirPapel, salvarPapel,
      removerPapel, abrirNovoChamado, enviarChamado, responderChamado, resolverChamado,
      reabrirChamado, marcarLido,
    ],
  );

  return <Ctx.Provider value={{ s, a, modulos, tem, isMobile, isDesktop }}>{children}</Ctx.Provider>;
}

export function usePortal(): ViewProps {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal precisa estar dentro de <PortalProvider>");
  return v;
}

export { siglaDe };
