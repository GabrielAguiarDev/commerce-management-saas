"use client";

import { CaixaAbrirModal, CaixaDetalheModal, CaixaFecharModal, CaixaMovModal } from "@/components/modais/CaixaModais";
import { CustoModal } from "@/components/modais/CustoModal";
import { FuncionarioModal, PapelModal } from "@/components/modais/EquipeModais";
import { MovEstoqueModal } from "@/components/modais/MovEstoqueModal";
import { ProdutoModal } from "@/components/modais/ProdutoModal";
import { NovoChamadoModal } from "@/components/modais/SuporteModal";
import { VendaDetalheModal } from "@/components/modais/VendaDetalhe";
import { usePortal } from "@/components/PortalProvider";

/**
 * Um modal de cada vez. O estado guarda qual, e este componente escolhe o
 * corpo — assim nenhuma tela precisa carregar formulário que não é dela.
 */
export function Modais() {
  const { s } = usePortal();
  const m = s.modal;
  if (!m) return null;

  switch (m.k) {
    case "detalheVenda": {
      const venda = s.vendas.find((v) => v.id === m.id);
      return venda ? <VendaDetalheModal venda={venda} /> : null;
    }
    case "produto":
      return <ProdutoModal />;
    case "movEstoque":
      return <MovEstoqueModal />;
    case "custo":
      return <CustoModal />;
    case "caixaAbrir":
      return <CaixaAbrirModal />;
    case "caixaMov":
      return <CaixaMovModal tipo={m.tipo} />;
    case "caixaFechar":
      return <CaixaFecharModal />;
    case "caixaDetalhe": {
      const caixa = s.caixasFechados.find((c) => c.id === m.id);
      return caixa ? <CaixaDetalheModal caixa={caixa} /> : null;
    }
    case "funcionario":
      return <FuncionarioModal />;
    case "papel":
      return <PapelModal />;
    case "novoChamado":
      return <NovoChamadoModal />;
  }
}
