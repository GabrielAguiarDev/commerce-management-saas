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

export type ToastTone = 'neutral' | 'erro';

export interface Toast {
  text: string;
  tone: ToastTone;
  /** Mostra o botão Desfazer e liga o callback abaixo. */
  withUndo: boolean;
}

export interface Confirm {
  title: string;
  text: string;
  buttonLabel: string;
  /** Destrutivo pinta o botão de vermelho. */
  destructive: boolean;
  onConfirm: () => void;
}

/** Os cinco sheets do produto. Uma união fechada, não uma string solta. */
export type Sheet =
  | { type: 'cart' }
  | { type: 'product' }
  | { type: 'closeOut' }
  | { type: 'ticket' }
  | { type: 'withdrawal' }
  | { type: 'topUp' }
  | { type: 'movement'; productId?: string; productName?: string }
  | { type: 'cost' };

export type SheetType = Sheet['type'];

interface UIState {
  toast: Toast | null;
  confirm: Confirm | null;
  sheet: Sheet | null;
  /** Callback do "Desfazer"; separado do toast para não entrar em comparação. */
  onUndo: (() => void) | null;

  showToast: (text: string, options?: Partial<Omit<Toast, 'text'>> & { onUndo?: () => void }) => void;
  closeToast: () => void;
  requestConfirm: (c: Confirm) => void;
  closeConfirm: () => void;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
}

/** Tempo que o toast fica na tela — inclusive a janela do Desfazer. */
export const TOAST_DURATION_MS = 4200;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIState>()((set) => ({
  toast: null,
  confirm: null,
  sheet: null,
  onUndo: null,

  showToast: (text, options) => {
    // Um toast por vez: o novo cancela o timer do anterior. Sem isso, o timer
    // velho apagaria o toast novo antes da hora — bug clássico de fila de
    // notificação implícita.
    if (toastTimer) clearTimeout(toastTimer);

    set({
      toast: {
        text,
        tone: options?.tone ?? 'neutral',
        withUndo: options?.withUndo ?? false,
      },
      onUndo: options?.onUndo ?? null,
    });

    toastTimer = setTimeout(() => {
      set({ toast: null, onUndo: null });
      toastTimer = null;
    }, TOAST_DURATION_MS);
  },

  closeToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set({ toast: null, onUndo: null });
  },

  requestConfirm: (c) => set({ confirm: c }),
  closeConfirm: () => set({ confirm: null }),

  openSheet: (s) => set({ sheet: s }),
  closeSheet: () => set({ sheet: null }),
}));
