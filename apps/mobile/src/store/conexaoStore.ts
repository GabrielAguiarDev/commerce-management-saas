import { create } from 'zustand';

/**
 * Conexão e sincronização.
 *
 * Efêmero de propósito: o estado real da rede é lido do NetInfo na abertura
 * (ver `hooks/useMonitorDeConexao`). Persistir "offline" faria o app abrir
 * mostrando banner âmbar mesmo com Wi-Fi ligado.
 */

/** Quanto tempo o banner "sincronizando…" fica na tela. Vem do protótipo. */
export const DURACAO_SINCRONIZACAO_MS = 2400;

interface EstadoConexao {
  online: boolean;
  sincronizando: boolean;

  definirOnline: (online: boolean) => void;
  encerrarSincronizacao: () => void;
}

export const useConexaoStore = create<EstadoConexao>()((set, get) => ({
  online: true,
  sincronizando: false,

  /**
   * Só a TRANSIÇÃO offline → online dispara a sincronização. Chamar com o
   * mesmo valor é no-op: o NetInfo emite eventos repetidos ao trocar de rede,
   * e sem esta guarda o banner reiniciaria sozinho a cada emissão.
   */
  definirOnline: (online) => {
    const anterior = get().online;
    if (anterior === online) return;
    set({ online, sincronizando: online && !anterior });
  },

  encerrarSincronizacao: () => set({ sincronizando: false }),
}));
