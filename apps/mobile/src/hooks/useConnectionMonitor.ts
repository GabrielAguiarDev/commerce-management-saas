import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { useTranslation } from '@i18n';
import { SYNC_DURATION_MS, useConnectionStore } from '@store/connectionStore';
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
export function useConnectionMonitor(): void {
  const t = useTranslation();
  const setOnline = useConnectionStore((s) => s.setOnline);
  const finishSync = useConnectionStore((s) => s.finishSync);
  const syncing = useConnectionStore((s) => s.syncing);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    const cancel = NetInfo.addEventListener((state) => {
      setOnline(state.isInternetReachable ?? state.isConnected ?? true);
    });
    return cancel;
  }, [setOnline]);

  useEffect(() => {
    if (!syncing) return;

    const timer = setTimeout(() => {
      finishSync();
      showToast(t.toasts.synced);
    }, SYNC_DURATION_MS);

    return () => clearTimeout(timer);
  }, [syncing, finishSync, showToast, t]);
}
