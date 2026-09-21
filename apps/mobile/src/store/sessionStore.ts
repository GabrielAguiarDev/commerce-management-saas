import { create } from 'zustand';

import * as sessionService from '@domain/session/sessionService';
import type { Session, User } from '@domain/session/sessionTypes';

/**
 * A SESSÃO — quem está logado e de que negócio.
 *
 * ⚠️ ESTE STORE NÃO É MAIS PERSISTIDO, e a mudança é deliberada.
 *
 * Na fase de mock, ele gravava `user` + `tenantId` no AsyncStorage e o token no
 * SecureStore. Com o Supabase, quem persiste a sessão é o PRÓPRIO CLIENTE
 * SUPABASE, de forma criptografada (ver `services/secureSessionStorage.ts`), e
 * é ele quem renova o token sozinho. Manter uma segunda cópia aqui criaria duas
 * fontes de verdade que divergem no pior momento possível: token revogado no
 * servidor, mas `user` ainda gravado no disco — o app abriria mostrando o nome
 * do dono e todas as consultas voltariam vazias, parecendo "negócio sem dados"
 * em vez de "sessão encerrada".
 *
 * Agora existe UMA fonte: o Supabase. Este store é a projeção dela em memória,
 * reconstruída no boot por `restore()` e mantida em dia por `onAuthStateChange`.
 *
 * Consequência prática: `hydrated` deixou de significar "o AsyncStorage
 * respondeu" e passou a significar "já perguntamos ao Supabase se há sessão".
 * O portão continua esperando por ele exatamente como antes.
 */
interface SessionState {
  user: User | null;
  tenantId: string | null;
  roleId: string | null;
  rolePermissions: string[];
  isOwner: boolean;
  /** Efêmero: o botão de Entrar em carregamento. */
  signingIn: boolean;
  /** `true` depois que a sessão gravada foi verificada (mesmo que não exista). */
  hydrated: boolean;

  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
  /** Chamado uma vez no boot pelo `useSessionSync`. */
  restore: () => Promise<void>;
  /**
   * Relê papel e permissões sem mexer no resto da sessão.
   *
   * Existe para quando o banco recusa uma escrita por permissão: o dono pode
   * ter tirado um módulo do papel deste funcionário. Ao contrário de
   * `restore`, NUNCA encerra a sessão — uma leitura que falha ou volta vazia
   * deixa tudo como estava, em vez de deslogar alguém por um soluço de rede.
   */
  refreshRole: () => Promise<void>;
  /** A sessão sumiu por fora (token revogado, expirado, logout em outro lugar). */
  clear: () => void;
}

const EMPTY = {
  user: null,
  tenantId: null,
  roleId: null,
  rolePermissions: [] as string[],
  isOwner: false,
} as const;

function fromSession(session: Session) {
  return {
    user: session.user,
    tenantId: session.tenantId,
    roleId: session.roleId,
    rolePermissions: session.rolePermissions,
    isOwner: session.isOwner,
  };
}

export const useSessionStore = create<SessionState>()((set) => ({
  ...EMPTY,
  signingIn: false,
  hydrated: false,

  /**
   * Casca fina sobre o service. Deixa o `AuthError` subir para a tela decidir a
   * mensagem — quem traduz código em copy é a UI.
   */
  signIn: async (email, password) => {
    set({ signingIn: true });
    try {
      const session = await sessionService.signIn(email, password);
      set({ ...fromSession(session), signingIn: false });
      return session;
    } catch (error) {
      set({ signingIn: false });
      throw error;
    }
  },

  signOut: async () => {
    await sessionService.signOut();
    set({ ...EMPTY });
  },

  restore: async () => {
    const session = await sessionService.getCurrentSession();
    // `hydrated` é marcado nos DOIS casos. Um erro de leitura que deixasse a
    // flag em `false` prenderia o app na splash para sempre; o pior cenário
    // aceitável é pedir login de novo.
    set(session ? { ...fromSession(session), hydrated: true } : { ...EMPTY, hydrated: true });
  },

  refreshRole: async () => {
    try {
      const session = await sessionService.getCurrentSession();
      if (session) set({ rolePermissions: session.rolePermissions, isOwner: session.isOwner });
    } catch {
      // Fica o papel que já estava; o próximo login ou a próxima recusa relê.
    }
  },

  clear: () => set({ ...EMPTY }),
}));

/** Seletores prontos, para a tela não repetir a mesma lambda em cinco lugares. */
export const selectIsAuthenticated = (s: SessionState) => s.user !== null && s.tenantId !== null;
