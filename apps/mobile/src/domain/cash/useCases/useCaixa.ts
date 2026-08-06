import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../cashService';
import type { TipoDeAjuste } from '../cashTypes';

export const caixaKeys = {
  all: ['caixa'] as const,
  turno: (tenantId: string) => [...caixaKeys.all, 'turno', tenantId] as const,
  historico: (tenantId: string) => [...caixaKeys.all, 'historico', tenantId] as const,
};

export function useTurnoAberto() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: caixaKeys.turno(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterTurnoAberto(tenantId as string),
    enabled: Boolean(tenantId),
    // O caixa é dinheiro em movimento: 15s de janela é o máximo tolerável
    // entre a gaveta real e o que a tela afirma.
    staleTime: 15 * 1000,
  });
}

export function useHistoricoDeCaixa() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: caixaKeys.historico(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterHistorico(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAbrirCaixa() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: () => service.abrirCaixa(tenantId as string),
    onSuccess: () => cliente.invalidateQueries({ queryKey: caixaKeys.all }),
  });
}

export function useRegistrarAjuste() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (dados: {
      turnoId: string;
      tipo: TipoDeAjuste;
      valorCentavos: number;
      motivo: string;
    }) =>
      service.registrarAjuste(
        tenantId as string,
        dados.turnoId,
        dados.tipo,
        dados.valorCentavos,
        dados.motivo,
      ),
    onSuccess: () => cliente.invalidateQueries({ queryKey: caixaKeys.all }),
  });
}

export function useFecharCaixa() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (diferencaCentavos: number) =>
      service.fecharCaixa(tenantId as string, diferencaCentavos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: caixaKeys.all }),
  });
}
