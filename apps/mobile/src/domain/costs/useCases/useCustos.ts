import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../costsService';

export const custosKeys = {
  all: ['custos'] as const,
  lista: (tenantId: string) => [...custosKeys.all, 'lista', tenantId] as const,
  resumoDoMes: (tenantId: string) => [...custosKeys.all, 'resumo-mes', tenantId] as const,
};

export function useCustos() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: custosKeys.lista(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listarCustos(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 60 * 1000,
  });
}

export function useResumoDoMes() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: custosKeys.resumoDoMes(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterResumoDoMes(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegistrarCusto() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (dados: { nome: string; valorCentavos: number }) =>
      service.registrarCusto(tenantId as string, dados.nome, dados.valorCentavos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: custosKeys.all }),
  });
}
