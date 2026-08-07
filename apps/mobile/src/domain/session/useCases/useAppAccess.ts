import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../sessionService';

export const sessionKeys = {
  all: ['session'] as const,
  appAccess: (tenantId: string) => [...sessionKeys.all, 'acesso-app', tenantId] as const,
};

/**
 * O PLANO DESTE CLIENTE INCLUI O APLICATIVO?
 *
 * Pergunta direta ao banco, via `has_module('app')`. O módulo `app` é de ACESSO
 * (`is_access = true`): não é uma tela, é a permissão de abrir este aplicativo.
 *
 * POR QUE UMA CONSULTA PRÓPRIA, e não derivar de `useCapabilities` (que já traz
 * a lista de módulos): esta resposta é a que decide entre ENTRAR e a TELA DE
 * BLOQUEIO, e por isso precisa ser a mais barata e a mais confiável do app.
 * `has_module` é uma função do banco que devolve um booleano — não depende de a
 * consulta do tenant ter dado certo, nem de a view de módulos ter vindo
 * completa. Um erro de rede na carga do tenant não pode deslogar ninguém para a
 * tela de bloqueio.
 *
 * Três estados, e os três importam:
 *   `true`  → entra;
 *   `false` → bloqueio (o plano realmente não inclui);
 *   `null`  → ainda não sei (carregando ou sem rede) → o portão SEGURA.
 *
 * Confundir o terceiro com o segundo é o bug clássico aqui: manda para a tela
 * de bloqueio quem só está sem sinal, dizendo que o plano dele mudou.
 */
export interface AppAccess {
  /** `null` = ainda não sei. NÃO confundir com `false` (o plano não inclui). */
  hasAppAccess: boolean | null;
  loading: boolean;
  /**
   * A consulta falhou de vez, depois das tentativas.
   *
   * Existe para que o portão possa mostrar uma tela com "tentar de novo" em vez
   * de ficar em branco. Sem este terceiro estado, "falhou" fica indistinguível
   * de "carregando" e o app trava sem dizer nada.
   */
  failed: boolean;
  retry: () => void;
}

export function useAppAccess(): AppAccess {
  const tenantId = useSessionStore((s) => s.tenantId);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: sessionKeys.appAccess(tenantId ?? 'sem-tenant'),
    queryFn: () => service.checkAppAccess(),
    enabled: Boolean(tenantId),
    // Esta resposta destranca o app inteiro: vale insistir mais que o padrão
    // antes de desistir e mostrar erro.
    retry: 3,
    // O entitlement muda quando o cliente troca de plano — raro, e sempre por
    // fora do app. 5 minutos evita repetir a chamada a cada navegação.
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasAppAccess: data ?? null,
    loading: isPending,
    failed: isError,
    retry: () => void refetch(),
  };
}
