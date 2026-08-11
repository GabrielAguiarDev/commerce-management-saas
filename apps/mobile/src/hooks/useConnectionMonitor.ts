import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useConnectionStore } from '@store/connectionStore';

/**
 * A ÚNICA fonte do estado de conexão do app.
 *
 * Montado uma vez, no `app/_layout`. Escreve no `connectionStore`, e é dali
 * que todo o resto lê — nenhuma tela fala com o NetInfo direto.
 *
 * `isInternetReachable` é preferido a `isConnected`: estar num Wi-Fi de
 * cafeteria com portal cativo é "conectado" e mesmo assim nada sobe. Quando
 * ele vem `null` (o NetInfo ainda não sondou), caímos em `isConnected` para
 * não declarar o app offline na primeira fração de segundo — e, na dúvida,
 * assumimos ONLINE: errar para offline mandaria uma venda para a fila sem
 * necessidade, e uma venda enfileirada só entra no sistema quando alguém
 * apertar um botão.
 *
 * O `AppState` existe aqui por um motivo prático: o aparelho fica horas no
 * bolso com o app suspenso, e ao voltar o estado que o NetInfo tem em memória
 * pode ser o de antes de dormir. `refresh()` força uma sondagem nova na
 * volta ao primeiro plano — que é exatamente o instante em que o vendedor
 * abre o app para vender.
 */
export function useConnectionMonitor(): void {
  const setOnline = useConnectionStore((s) => s.setOnline);

  useEffect(() => {
    // `addEventListener` já dispara com o estado atual na inscrição — não
    // existe janela em que o app não saiba onde está.
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isInternetReachable ?? state.isConnected ?? true);
    });

    const appStateSubscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void NetInfo.refresh();
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [setOnline]);
}
