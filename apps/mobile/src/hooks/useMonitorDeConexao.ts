import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { TOASTS } from '@i18n';
import { DURACAO_SINCRONIZACAO_MS, useConexaoStore } from '@store/conexaoStore';
import { useUIStore } from '@store/uiStore';

/**
 * Liga o NetInfo ao `conexaoStore` e reproduz o ciclo do protótipo:
 * offline → banner âmbar; volta a conexão → banner teal "sincronizando…" por
 * ~2,4s → toast "Tudo sincronizado".
 *
 * O protótipo alternava a conexão por um chip flutuante. Aqui a fonte é o
 * NetInfo de verdade — o chip estava fora de escopo, o comportamento não.
 *
 * `isInternetReachable` é preferido a `isConnected`: estar num Wi-Fi de
 * cafeteria com portal cativo é "conectado" e mesmo assim nada sobe. Quando
 * ele vem `null` (o NetInfo ainda não sondou), caímos em `isConnected` para
 * não declarar o app offline na primeira fração de segundo.
 */
export function useMonitorDeConexao(): void {
  const definirOnline = useConexaoStore((s) => s.definirOnline);
  const encerrarSincronizacao = useConexaoStore((s) => s.encerrarSincronizacao);
  const sincronizando = useConexaoStore((s) => s.sincronizando);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  useEffect(() => {
    const cancelar = NetInfo.addEventListener((estado) => {
      definirOnline(estado.isInternetReachable ?? estado.isConnected ?? true);
    });
    return cancelar;
  }, [definirOnline]);

  useEffect(() => {
    if (!sincronizando) return;

    const t = setTimeout(() => {
      encerrarSincronizacao();
      mostrarToast(TOASTS.sincronizado);
    }, DURACAO_SINCRONIZACAO_MS);

    return () => clearTimeout(t);
  }, [sincronizando, encerrarSincronizacao, mostrarToast]);
}
