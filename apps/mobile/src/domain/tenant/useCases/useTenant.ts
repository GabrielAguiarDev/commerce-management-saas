import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSessionStore } from '@store/sessionStore';

import { deriveCapabilities } from '../tenantAdapter';
import * as service from '../tenantService';
import type { Capabilities } from '../tenantTypes';

/**
 * Query key factory do domínio.
 *
 * Existe para que invalidar "o tenant" seja `invalidateQueries({ queryKey:
 * tenantKeys.all })` num lugar só, em vez de arrays literais espalhados que um
 * dia divergem por um caractere.
 */
export const tenantKeys = {
  all: ['tenant'] as const,
  detail: (id: string) => [...tenantKeys.all, 'detalhe', id] as const,
  team: (id: string) => [...tenantKeys.all, 'equipe', id] as const,
  activities: (id: string) => [...tenantKeys.all, 'atividades', id] as const,
};

/** O tenant muda pouco (plano, nome); 5 min sem refetch é folgado e seguro. */
const CINCO_MINUTOS = 5 * 60 * 1000;

export function useCurrentTenant() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: tenantKeys.detail(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getTenant(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: CINCO_MINUTOS,
  });
}

const NO_CAPABILITIES: Capabilities = deriveCapabilities([]);

/**
 * AS CAPACIDADES DO PLANO — o hook que praticamente toda tela consome.
 *
 * `carregando` importa: enquanto o plano não chegou, as capacidades são TODAS
 * falsas. Uma tela que renderizar a grade nesse instante mostraria o plano
 * mais pobre por uma fração de segundo. Quem monta grade ou tab bar deve
 * esperar `carregando === false`.
 */
export function useCapabilities(): { capabilities: Capabilities; loading: boolean } {
  const { data, isPending } = useCurrentTenant();

  return useMemo(
    () => ({
      capabilities: data ? deriveCapabilities(data.modules) : NO_CAPABILITIES,
      loading: isPending,
    }),
    [data, isPending],
  );
}

export function useTeam() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: tenantKeys.team(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getTeam(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: CINCO_MINUTOS,
  });
}

export function useActivities() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: tenantKeys.activities(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getActivities(tenantId as string),
    enabled: Boolean(tenantId),
    // Feed de atividade envelhece rápido: 30s.
    staleTime: 30 * 1000,
  });
}

export function useSaveBusinessDetails() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      service.saveBusinessDetails(tenantId as string, data.name, data.phone),
    onSuccess: () => client.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}
