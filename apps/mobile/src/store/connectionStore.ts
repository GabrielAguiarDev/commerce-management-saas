import { create } from 'zustand';

/**
 * Connectivity and syncing.
 *
 * Ephemeral on purpose: the real network state is read from NetInfo at startup
 * (see `hooks/useConnectionMonitor`). Persisting "offline" would make the app
 * open showing the amber banner even with Wi-Fi on.
 */

interface ConnectionState {
  online: boolean;
  /**
   * A sincronização da fila está EM CURSO NESTE MOMENTO.
   *
   * Até a fase offline, isto era teatro: voltar a conexão ligava a flag e um
   * `setTimeout` de 2,4s a desligava, sem nada subir. Vinha do protótipo, que
   * simulava a sincronia. Agora quem liga e desliga é o caso de uso que envia
   * as vendas de verdade — o banner teal passa a ser uma AFIRMAÇÃO sobre o que
   * está acontecendo, não uma animação. Um banner que diz "sincronizando" sem
   * sincronizar é pior que banner nenhum: ensina o vendedor a não acreditar
   * nele justamente quando ele importa.
   */
  syncing: boolean;

  setOnline: (online: boolean) => void;
  startSync: () => void;
  finishSync: () => void;
}

export const useConnectionStore = create<ConnectionState>()((set, get) => ({
  online: true,
  syncing: false,

  /**
   * Ignora o evento repetido. O NetInfo emite várias vezes o mesmo estado ao
   * trocar de rede, e sem esta guarda cada emissão faria re-render de toda
   * tela que observa `online`.
   */
  setOnline: (online) => {
    if (get().online === online) return;
    set({ online });
  },

  startSync: () => set({ syncing: true }),
  finishSync: () => set({ syncing: false }),
}));
