"use client";

import { CaixaAbrirModal, CaixaDetalheModal, CaixaFecharModal, CaixaMovModal } from "@/components/modais/CaixaModais";
import { CustoModal } from "@/components/modais/CustoModal";
import { EmployeeModal, RoleModal } from "@/components/modais/EquipeModais";
import { MovEstoqueModal } from "@/components/modais/MovEstoqueModal";
import { ProdutoModal } from "@/components/modais/ProdutoModal";
import { NewTicketModal } from "@/components/modais/SuporteModal";
import { VendaDetalheModal } from "@/components/modais/VendaDetalhe";
import { usePortal } from "@/components/PortalProvider";

/**
 * Um modal de cada vez. O estado guarda qual, e este componente escolhe o
 * corpo — assim nenhuma tela precisa carregar formulário que não é dela.
 */
export function Modais() {
  const { s, d } = usePortal();
  const m = s.modal;
  if (!m) return null;

  switch (m.k) {
    case "saleDetail": {
      const sale = d.sales.find((v) => v.id === m.id);
      return sale ? <VendaDetalheModal sale={sale} /> : null;
    }
    case "product":
      return <ProdutoModal />;
    case "stockMovement":
      return <MovEstoqueModal />;
    case "cost":
      return <CustoModal />;
    case "openRegister":
      return <CaixaAbrirModal />;
    case "registerMovement":
      return <CaixaMovModal type={m.type} />;
    case "closeRegister":
      return <CaixaFecharModal />;
    case "registerDetail": {
      const register = d.caixasFechados.find((c) => c.id === m.id);
      return register ? <CaixaDetalheModal register={register} /> : null;
    }
    case "employee":
      return <EmployeeModal id={m.id} />;
    case "role":
      return <RoleModal />;
    case "newTicket":
      return <NewTicketModal />;
  }
}
