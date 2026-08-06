import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as sessionService from '@domain/session/sessionService';
import type { Session, User } from '@domain/session/sessionTypes';
import { secureStorage, STORAGE_KEYS } from '@services/storageAdapter';

interface SessionState {
  user: User | null;
  tenantId: string | null;
  /** Efêmero: NUNCA persistido. Um `entrando: true` gravado trava o app. */
  signingIn: boolean;
  /** `true` depois que o AsyncStorage devolveu (ou falhou). Ver useAppHydrated. */
  hydrated: boolean;

  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      tenantId: null,
      signingIn: false,
      hydrated: false,

      /**
       * Casca fina sobre o service. Deixa o `AuthError` subir para a tela
       * decidir a mensagem — quem traduz código em copy é a UI.
       *
       * FASE BACKEND: vira um `useMutation` em `session/useCases/useEntrar` e
       * o store fica só com a sessão.
       */
      signIn: async (email, password) => {
        set({ signingIn: true });
        try {
          const session = await sessionService.signIn(email, password);
          // Token no SecureStore, não no AsyncStorage: em disco, AsyncStorage
          // é texto puro. Ver services/storageAdapter.ts.
          await secureStorage.write(STORAGE_KEYS.tokenAcesso, session.token);
          set({ user: session.user, tenantId: session.tenantId, signingIn: false });
          return session;
        } catch (error) {
          set({ signingIn: false });
          throw error;
        }
      },

      signOut: async () => {
        await sessionService.signOut();
        await secureStorage.remove(STORAGE_KEYS.tokenAcesso);
        set({ user: null, tenantId: null });
      },
    }),
    {
      name: STORAGE_KEYS.session,
      storage: createJSONStorage(() => AsyncStorage),
      // partialize EXPLÍCITO: só o que precisa sobreviver ao relaunch.
      partialize: (s) => ({ user: s.user, tenantId: s.tenantId }),
      // Marca hidratado mesmo quando a leitura falha: um AsyncStorage corrompido
      // não pode deixar o app preso na splash para sempre — o pior caso é pedir
      // login de novo.
      onRehydrateStorage: () => () => {
        useSessionStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Seletores prontos, para a tela não repetir a mesma lambda em cinco lugares. */
export const selectIsAuthenticated = (s: SessionState) => s.user !== null && s.tenantId !== null;
