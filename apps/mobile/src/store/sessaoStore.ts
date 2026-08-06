import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as sessionService from '@domain/session/sessionService';
import type { Sessao, Usuario } from '@domain/session/sessionTypes';
import { armazenamentoSeguro, CHAVES_ARMAZENAMENTO } from '@services/storageAdapter';

interface EstadoSessao {
  usuario: Usuario | null;
  tenantId: string | null;
  /** Efêmero: NUNCA persistido. Um `entrando: true` gravado trava o app. */
  entrando: boolean;
  /** `true` depois que o AsyncStorage devolveu (ou falhou). Ver useAppHydrated. */
  hidratado: boolean;

  entrar: (email: string, senha: string) => Promise<Sessao>;
  sair: () => Promise<void>;
}

export const useSessaoStore = create<EstadoSessao>()(
  persist(
    (set) => ({
      usuario: null,
      tenantId: null,
      entrando: false,
      hidratado: false,

      /**
       * Casca fina sobre o service. Deixa o `AuthError` subir para a tela
       * decidir a mensagem — quem traduz código em copy é a UI.
       *
       * FASE BACKEND: vira um `useMutation` em `session/useCases/useEntrar` e
       * o store fica só com a sessão.
       */
      entrar: async (email, senha) => {
        set({ entrando: true });
        try {
          const sessao = await sessionService.entrar(email, senha);
          // Token no SecureStore, não no AsyncStorage: em disco, AsyncStorage
          // é texto puro. Ver services/storageAdapter.ts.
          await armazenamentoSeguro.gravar(CHAVES_ARMAZENAMENTO.tokenAcesso, sessao.token);
          set({ usuario: sessao.usuario, tenantId: sessao.tenantId, entrando: false });
          return sessao;
        } catch (erro) {
          set({ entrando: false });
          throw erro;
        }
      },

      sair: async () => {
        await sessionService.sair();
        await armazenamentoSeguro.remover(CHAVES_ARMAZENAMENTO.tokenAcesso);
        set({ usuario: null, tenantId: null });
      },
    }),
    {
      name: CHAVES_ARMAZENAMENTO.sessao,
      storage: createJSONStorage(() => AsyncStorage),
      // partialize EXPLÍCITO: só o que precisa sobreviver ao relaunch.
      partialize: (s) => ({ usuario: s.usuario, tenantId: s.tenantId }),
      // Marca hidratado mesmo quando a leitura falha: um AsyncStorage corrompido
      // não pode deixar o app preso na splash para sempre — o pior caso é pedir
      // login de novo.
      onRehydrateStorage: () => () => {
        useSessaoStore.setState({ hidratado: true });
      },
    },
  ),
);

/** Seletores prontos, para a tela não repetir a mesma lambda em cinco lugares. */
export const selecionarAutenticado = (s: EstadoSessao) => s.usuario !== null && s.tenantId !== null;
