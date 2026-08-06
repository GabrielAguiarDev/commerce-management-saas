import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../supportService';
import type { NovoChamado } from '../supportTypes';

export const suporteKeys = {
  all: ['suporte'] as const,
  chamados: (tenantId: string) => [...suporteKeys.all, 'chamados', tenantId] as const,
  mensagens: (chamadoId: string) => [...suporteKeys.all, 'mensagens', chamadoId] as const,
};

export function useChamados() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: suporteKeys.chamados(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listarChamados(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 60 * 1000,
  });
}

export function useMensagensDoChamado(chamadoId: string | undefined) {
  return useQuery({
    queryKey: suporteKeys.mensagens(chamadoId ?? 'sem-chamado'),
    queryFn: () => service.listarMensagens(chamadoId as string),
    enabled: Boolean(chamadoId),
    staleTime: 30 * 1000,
  });
}

/** Abrir o chamado marca como lido, o que apaga o badge da tela "Mais". */
export function useMarcarComoLido() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (chamadoId: string) => service.marcarComoLido(tenantId as string, chamadoId),
    onSuccess: () => cliente.invalidateQueries({ queryKey: suporteKeys.all }),
  });
}

export function useAbrirChamado() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (novo: NovoChamado) => service.abrirChamado(tenantId as string, novo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: suporteKeys.all }),
  });
}

export function useResponderChamado(chamadoId: string | undefined) {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (texto: string) => service.responder(chamadoId as string, texto),
    onSuccess: () =>
      cliente.invalidateQueries({ queryKey: suporteKeys.mensagens(chamadoId ?? '') }),
  });
}
