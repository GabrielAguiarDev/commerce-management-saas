import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogoKeys } from '@domain/catalog/useCases/useCatalog';
import { useConnectionStore } from '@store/connectionStore';
import { useSessionStore } from '@store/sessionStore';

import { HISTORY_PAGE_SIZE, rangeKey, type SalesRange } from '../salesHistory';
import * as service from '../salesService';
import { SaleError, type CartItem } from '../salesTypes';

import { pendingSalesKeys, salesKeys } from './queryKeys';

export { salesKeys };

/**
 * As últimas vendas do dia — o card do Início.
 *
 * Dez, e não três: o card mostra a fita do dia, e três linhas num balcão
 * movimentado já estão vencidas antes do café. Além de dez, a resposta é o
 * HISTÓRICO, que tem cabeçalho por dia e paginação — ver `useSalesHistory`.
 */
export function useRecentSales(limit = 10) {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: [...salesKeys.doDia(tenantId ?? 'sem-tenant'), limit] as const,
    queryFn: () => service.listDailySales(tenantId as string, limit),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

/**
 * O HISTÓRICO INTEIRO, uma página de cada vez.
 *
 * `useInfiniteQuery` e não uma lista que cresce no estado da tela: é ele quem
 * guarda as páginas já carregadas no cache. Sair para o detalhe de uma venda e
 * voltar não recomeça a rolagem do zero — o que, numa lista onde a pessoa
 * estava procurando a venda de três semanas atrás, seria perder o trabalho
 * inteiro dela.
 *
 * O cursor é o OFFSET devolvido pelo service, não um contador da tela: quem
 * sabe se a página acabou é quem leu o banco.
 */
export function useSalesHistory(range: SalesRange = { from: null, to: null }) {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useInfiniteQuery({
    // O RECORTE entra na chave: sem ele, trocar de filtro devolveria as páginas
    // do filtro anterior enquanto a consulta nova não chega — a lista mostraria
    // "mês atual" sob o rótulo "hoje" por um instante.
    queryKey: [...salesKeys.history(tenantId ?? 'sem-tenant'), rangeKey(range)] as const,
    queryFn: ({ pageParam }) =>
      service.listSalesPage(tenantId as string, pageParam, range, HISTORY_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

/**
 * O total do recorte — a linha que muda junto com o filtro.
 *
 * Consulta SEPARADA da lista, e não derivada dela, porque a resposta é sobre o
 * período inteiro enquanto a lista é sobre a primeira página. Ver
 * `salesApi.fetchSalesTotals`.
 */
export function useSalesTotals(range: SalesRange = { from: null, to: null }) {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: [...salesKeys.totals(tenantId ?? 'sem-tenant'), rangeKey(range)] as const,
    queryFn: () => service.getSalesTotals(tenantId as string, range),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

/** Uma venda pelo id — a tela de detalhe, alcançável por deep link. */
export function useSale(saleId: string | undefined) {
  return useQuery({
    queryKey: salesKeys.detail(saleId ?? 'sem-venda'),
    queryFn: () => service.getSale(saleId as string),
    enabled: Boolean(saleId),
  });
}

export function useDailySummary() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: salesKeys.summary(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getDailySummary(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

/**
 * Finalizar venda.
 *
 * O estado da conexão é LIDO AQUI e passado ao service: quem conhece store é
 * o useCase, nunca o service — é o que mantém `checkoutSale` testável no
 * jest node, sem mock de zustand.
 *
 * Invalida também o catálogo porque a venda baixa estoque: sem isso, o badge
 * "3 em estoque" continuaria mentindo até o próximo refetch.
 */
export function useCheckoutSale() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const online = useConnectionStore((s) => s.online);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: { items: readonly CartItem[]; paymentMethod: string }) =>
      service.checkoutSale(tenantId as string, data.items, data.paymentMethod, online),

    onSuccess: (result) => {
      if (result.queued) {
        // A venda ficou no aparelho: o que mudou foi a FILA. O faturamento do
        // dia e o estoque continuam exatamente como estavam — invalidá-los
        // aqui provocaria uma ida à rede que, offline, só serve para falhar.
        void client.invalidateQueries({ queryKey: pendingSalesKeys.all });
        return;
      }

      void client.invalidateQueries({ queryKey: salesKeys.all });
      void client.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}

/**
 * ESTORNAR e DESFAZER O ESTORNO.
 *
 * Os dois invalidam vendas E catálogo, pelo mesmo motivo do checkout: o saldo
 * dos produtos mudou. `salesKeys.all` cobre de uma vez o resumo do Início, as
 * últimas vendas, o histórico e o detalhe da própria venda — que é a tela onde
 * a pessoa está parada esperando o selo "Estornada" aparecer.
 *
 * A CONEXÃO É BARRADA AQUI, e não no service: estornar não tem caminho
 * offline (ver `refundSale`), e é o useCase que conhece a store. Sem esta
 * verificação o pedido sairia para o Supabase e ficaria dezenas de segundos
 * pendurado até desistir — com o dono do negócio olhando um botão girando.
 */
function useRefundMutation(direction: 'refund' | 'undo') {
  const online = useConnectionStore((s) => s.online);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (saleId: string) => {
      if (!online) throw new SaleError('network');
      return direction === 'refund' ? service.refundSale(saleId) : service.undoRefund(saleId);
    },

    onSuccess: () => {
      void client.invalidateQueries({ queryKey: salesKeys.all });
      void client.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}

export function useRefundSale() {
  return useRefundMutation('refund');
}

export function useUndoRefund() {
  return useRefundMutation('undo');
}

/**
 * EDITAR — estorna a antiga e registra a nova, numa mutação só.
 *
 * Separada do `useCheckoutSale` de propósito, embora o fim das duas seja uma
 * venda registrada: esta NÃO tem caminho de fila. Enfileirar a venda nova de
 * uma edição deixaria a antiga estornada no servidor e a substituta dormindo
 * no aparelho — o dia fecharia com o dinheiro faltando até alguém sincronizar.
 * Offline, esta mutação falha e diz por quê.
 */
export function useEditSale() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const online = useConnectionStore((s) => s.online);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: { saleId: string; items: readonly CartItem[]; paymentMethod: string }) =>
      service.editSale(tenantId as string, data.saleId, data.items, data.paymentMethod, online),

    onSuccess: () => {
      void client.invalidateQueries({ queryKey: salesKeys.all });
      void client.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}
