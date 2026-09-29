import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../cashService';
import type { AdjustmentType } from '../cashTypes';

export const caixaKeys = {
  all: ['cash'] as const,
  shift: (tenantId: string) => [...caixaKeys.all, 'turno', tenantId] as const,
  history: (tenantId: string) => [...caixaKeys.all, 'historico', tenantId] as const,
};

export function useOpenShift() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: caixaKeys.shift(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getOpenShift(tenantId as string),
    enabled: Boolean(tenantId),
    // O caixa é dinheiro em movimento: 15s de janela é o máximo tolerável
    // entre a gaveta real e o que a tela afirma.
    staleTime: 15 * 1000,
  });
}

/**
 * O histórico de turnos, uma página de cada vez — mais ao rolar. O cursor é o
 * offset que o service devolve: quem sabe se acabou é quem leu o banco.
 */
export function useCashHistory() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useInfiniteQuery({
    queryKey: caixaKeys.history(tenantId ?? 'sem-tenant'),
    queryFn: ({ pageParam }) => service.getHistoryPage(tenantId as string, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAbrirCaixa() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => service.openCash(tenantId as string),
    onSuccess: () => client.invalidateQueries({ queryKey: caixaKeys.all }),
  });
}

export function useRecordAdjustment() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      shiftId: string;
      type: AdjustmentType;
      amountCents: number;
      motivo: string;
    }) =>
      service.recordAdjustment(
        tenantId as string,
        data.shiftId,
        data.type,
        data.amountCents,
        data.motivo,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: caixaKeys.all }),
  });
}

export function useFecharCaixa() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      shiftId: string;
      /** O CONTADO em espécie. O banco calcula o esperado e a diferença. */
      contadoEmDinheiroCentavos: number;
      observacao?: string;
    }) =>
      service.closeCash(
        tenantId as string,
        data.shiftId,
        data.contadoEmDinheiroCentavos,
        data.observacao,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: caixaKeys.all }),
  });
}
