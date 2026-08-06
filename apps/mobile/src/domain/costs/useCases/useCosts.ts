import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../costsService';

export const costsKeys = {
  all: ['costs'] as const,
  list: (tenantId: string) => [...costsKeys.all, 'lista', tenantId] as const,
  monthSummary: (tenantId: string) => [...costsKeys.all, 'resumo-mes', tenantId] as const,
};

export function useCosts() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: costsKeys.list(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listCosts(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 60 * 1000,
  });
}

export function useMonthlySummary() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: costsKeys.monthSummary(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getMonthlySummary(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordCost() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; amountCents: number }) =>
      service.recordCost(tenantId as string, data.name, data.amountCents),
    onSuccess: () => client.invalidateQueries({ queryKey: costsKeys.all }),
  });
}
