import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSessaoStore } from '@store/sessaoStore';

import { derivarCapacidades } from '../tenantAdapter';
import * as service from '../tenantService';
import type { Capacidades } from '../tenantTypes';

/**
 * Query key factory do domínio.
 *
 * Existe para que invalidar "o tenant" seja `invalidateQueries({ queryKey:
 * tenantKeys.all })` num lugar só, em vez de arrays literais espalhados que um
 * dia divergem por um caractere.
 */
export const tenantKeys = {
  all: ['tenant'] as const,
  detalhe: (id: string) => [...tenantKeys.all, 'detalhe', id] as const,
  equipe: (id: string) => [...tenantKeys.all, 'equipe', id] as const,
  atividades: (id: string) => [...tenantKeys.all, 'atividades', id] as const,
};

/** O tenant muda pouco (plano, nome); 5 min sem refetch é folgado e seguro. */
const CINCO_MINUTOS = 5 * 60 * 1000;

export function useTenantAtual() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: tenantKeys.detalhe(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterTenant(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: CINCO_MINUTOS,
  });
}

const SEM_CAPACIDADES: Capacidades = derivarCapacidades([]);

/**
 * AS CAPACIDADES DO PLANO — o hook que praticamente toda tela consome.
 *
 * `carregando` importa: enquanto o plano não chegou, as capacidades são TODAS
 * falsas. Uma tela que renderizar a grade nesse instante mostraria o plano
 * mais pobre por uma fração de segundo. Quem monta grade ou tab bar deve
 * esperar `carregando === false`.
 */
export function useCapacidades(): { capacidades: Capacidades; carregando: boolean } {
  const { data, isPending } = useTenantAtual();

  return useMemo(
    () => ({
      capacidades: data ? derivarCapacidades(data.modulos) : SEM_CAPACIDADES,
      carregando: isPending,
    }),
    [data, isPending],
  );
}

export function useEquipe() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: tenantKeys.equipe(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterEquipe(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: CINCO_MINUTOS,
  });
}

export function useAtividades() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: tenantKeys.atividades(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterAtividades(tenantId as string),
    enabled: Boolean(tenantId),
    // Feed de atividade envelhece rápido: 30s.
    staleTime: 30 * 1000,
  });
}

export function useSalvarDadosDoNegocio() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (dados: { nome: string; telefone: string }) =>
      service.salvarDadosDoNegocio(tenantId as string, dados.nome, dados.telefone),
    onSuccess: () => cliente.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}
