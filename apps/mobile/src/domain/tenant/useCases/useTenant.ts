import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import {
  PAYMENT_METHODS,
  usePreferencesStore,
  type PaymentMethod,
} from '@store/preferencesStore';
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
  paymentPreferences: (id: string) => [...tenantKeys.all, 'formas-pagamento', id] as const,
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

/** Mantém o seletor do carrinho alinhado à configuração compartilhada. */
export function usePaymentPreferencesSync() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const setAcceptedMethods = usePreferencesStore((s) => s.setAcceptedMethods);
  const query = useQuery({
    queryKey: tenantKeys.paymentPreferences(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getAcceptedPaymentMethods(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: CINCO_MINUTOS,
  });

  useEffect(() => {
    if (query.data) setAcceptedMethods(query.data);
  }, [query.data, setAcceptedMethods]);

  return query;
}

export function useSaveAcceptedPaymentMethods() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();
  const setAcceptedMethods = usePreferencesStore((s) => s.setAcceptedMethods);

  return useMutation({
    mutationFn: (methods: readonly PaymentMethod[]) =>
      service.saveAcceptedPaymentMethods(tenantId as string, methods),
    onMutate: (methods) => {
      const previous = usePreferencesStore.getState().acceptedMethods;
      setAcceptedMethods(methods);
      return { previous };
    },
    onError: (_error, _methods, context) => {
      if (context?.previous) {
        const previous = PAYMENT_METHODS.filter((method) => context.previous[method]);
        setAcceptedMethods(previous);
      }
    },
    onSuccess: (methods) => setAcceptedMethods(methods),
    onSettled: () =>
      client.invalidateQueries({
        queryKey: tenantKeys.paymentPreferences(tenantId ?? 'sem-tenant'),
      }),
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
  const rolePermissions = useSessionStore((s) => s.rolePermissions);
  const isOwner = useSessionStore((s) => s.isOwner);

  return useMemo(
    () => ({
      capabilities: data
        ? deriveCapabilities(data.modules, rolePermissions, isOwner)
        : NO_CAPABILITIES,
      loading: isPending,
    }),
    [data, isPending, rolePermissions, isOwner],
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
