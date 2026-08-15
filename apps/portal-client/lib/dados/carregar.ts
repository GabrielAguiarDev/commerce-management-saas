import "server-only";

import {
  readRegister,
  readTickets,
  readCosts,
  readTeam,
  readStockMovements,
  readBusiness,
  readProducts,
  readSales,
} from "@/lib/dados/leitura";
import { EMPTY_DATA } from "@/lib/estado";
import { requireCustomer } from "@/lib/sessao";
import type { PortalData } from "@/types/estado";

/**
 * O retrato completo do negócio, montado uma vez por navegação no layout.
 *
 * Fica no layout, e não em cada página, porque as telas precisam concordar
 * entre si: o "vendas de hoje" do topo e o do dashboard não podem sair de duas
 * leituras diferentes. E o menu depende dos módulos, que vêm daqui.
 *
 * As consultas são independentes e vão em paralelo — encadeá-las com um `await`
 * atrás do outro somaria todos os tempos de ida e volta.
 *
 * `lerCaixa` é a única que depende de outra: ela precisa das vendas para dizer
 * quanto entrou em cada turno. Mas precisa delas só no fim, para o cruzamento —
 * a consulta a `cash_registers` não precisa de nada. Por isso recebe a PROMESSA
 * das vendas e entra no mesmo bloco: as oito leituras viajam juntas, em vez de
 * a do caixa esperar todas as outras terminarem para só então começar.
 */
// ⚠️ TEMPORÁRIO — medição do Router Cache. Remover depois.
let MEDICAO = 0;

export async function loadPortal(): Promise<PortalData> {
  // ⚠️ TEMPORÁRIO
  const marca = `[loadPortal] execução #${++MEDICAO}`;
  console.time(marca);
  try {
    return await loadPortalMedido();
  } finally {
    console.timeEnd(marca);
  }
}

async function loadPortalMedido(): Promise<PortalData> {
  const session = await requireCustomer();

  // Sem sessão o middleware já redirecionou; chegar aqui significa ambiente sem
  // credenciais. A casca renderiza vazia em vez de estourar.
  if (!session.ok) return { ...EMPTY_DATA, error: session.message };

  const { supabase, tenantId, name } = session;

  try {
    const salesPromise = readSales(supabase);

    const [{ business, data }, products, sales, movements, costs, team, tickets, register] =
      await Promise.all([
        readBusiness(supabase, tenantId, name),
        readProducts(supabase),
        salesPromise,
        readStockMovements(supabase),
        readCosts(supabase),
        readTeam(supabase),
        readTickets(supabase),
        readRegister(supabase, salesPromise),
      ]);

    return {
      business,
      data,
      products,
      sales,
      movements,
      costs,
      openRegister: register.open,
      caixasFechados: register.closed,
      roles: team.roles,
      team: team.team,
      tickets,
      error: null,
    };
  } catch (e) {
    // Uma tabela sem política de leitura devolve erro, não lista vazia. Dizer
    // "você não tem nada" seria mentira — a tela mostra o aviso.
    return {
      ...EMPTY_DATA,
      error: e instanceof Error ? e.message : "Não foi possível carregar os dados do negócio.",
    };
  }
}
