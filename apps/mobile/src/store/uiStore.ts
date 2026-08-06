import { create } from 'zustand';

/**
 * Estado da CHROME do app: toast, confirmação e bottom sheet.
 *
 * Um de cada por vez, exatamente como no protótipo (`sheet`, `confirm`,
 * `toast` são campos únicos no estado). Manter a restrição no tipo é o que
 * impede dois sheets empilhados ou dois toasts brigando pelo mesmo canto.
 *
 * Nada aqui é persistido: um diálogo de confirmação gravado no disco
 * reapareceria na abertura seguinte, sem contexto nenhum.
 */

export type TomDoToast = 'neutro' | 'erro';

export interface Toast {
  texto: string;
  tom: TomDoToast;
  /** Mostra o botão Desfazer e liga o callback abaixo. */
  comDesfazer: boolean;
}

export interface Confirmacao {
  titulo: string;
  texto: string;
  rotuloBotao: string;
  /** Destrutivo pinta o botão de vermelho. */
  destrutivo: boolean;
  aoConfirmar: () => void;
}

/** Os cinco sheets do produto. Uma união fechada, não uma string solta. */
export type Sheet =
  | { tipo: 'carrinho' }
  | { tipo: 'produto' }
  | { tipo: 'fechamento' }
  | { tipo: 'chamado' }
  | { tipo: 'sangria' }
  | { tipo: 'reforco' }
  | { tipo: 'movimento'; produtoId?: string; produtoNome?: string }
  | { tipo: 'custo' };

export type TipoDeSheet = Sheet['tipo'];

interface EstadoUI {
  toast: Toast | null;
  confirmacao: Confirmacao | null;
  sheet: Sheet | null;
  /** Callback do "Desfazer"; separado do toast para não entrar em comparação. */
  aoDesfazer: (() => void) | null;

  mostrarToast: (texto: string, opcoes?: Partial<Omit<Toast, 'texto'>> & { aoDesfazer?: () => void }) => void;
  fecharToast: () => void;
  pedirConfirmacao: (c: Confirmacao) => void;
  fecharConfirmacao: () => void;
  abrirSheet: (s: Sheet) => void;
  fecharSheet: () => void;
}

/** Tempo que o toast fica na tela — inclusive a janela do Desfazer. */
export const DURACAO_TOAST_MS = 4200;

let temporizadorToast: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<EstadoUI>()((set) => ({
  toast: null,
  confirmacao: null,
  sheet: null,
  aoDesfazer: null,

  mostrarToast: (texto, opcoes) => {
    // Um toast por vez: o novo cancela o timer do anterior. Sem isso, o timer
    // velho apagaria o toast novo antes da hora — bug clássico de fila de
    // notificação implícita.
    if (temporizadorToast) clearTimeout(temporizadorToast);

    set({
      toast: {
        texto,
        tom: opcoes?.tom ?? 'neutro',
        comDesfazer: opcoes?.comDesfazer ?? false,
      },
      aoDesfazer: opcoes?.aoDesfazer ?? null,
    });

    temporizadorToast = setTimeout(() => {
      set({ toast: null, aoDesfazer: null });
      temporizadorToast = null;
    }, DURACAO_TOAST_MS);
  },

  fecharToast: () => {
    if (temporizadorToast) clearTimeout(temporizadorToast);
    temporizadorToast = null;
    set({ toast: null, aoDesfazer: null });
  },

  pedirConfirmacao: (c) => set({ confirmacao: c }),
  fecharConfirmacao: () => set({ confirmacao: null }),

  abrirSheet: (s) => set({ sheet: s }),
  fecharSheet: () => set({ sheet: null }),
}));
