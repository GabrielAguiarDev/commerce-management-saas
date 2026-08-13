import { create } from 'zustand';

import { Toast } from '@components/ui/toast';
import { palette } from '@theme';

import { usePreferencesStore } from './preferencesStore';

/**
 * Estado da CHROME do app: toast, confirmação e bottom sheet.
 *
 * Um de cada por vez, exatamente como no protótipo (`sheet`, `confirm`,
 * `toast` são campos únicos no estado). Manter a restrição no tipo é o que
 * impede dois sheets empilhados ou dois toasts brigando pelo mesmo canto.
 *
 * O toast é a exceção: o ESTADO dele não mora mais aqui. Quem guarda a fila e
 * desenha é o sistema do Reactix (`@components/ui/toast`), e `showToast`
 * virou uma fachada — traduz o vocabulário do produto (tom, Desfazer) para as
 * opções de lá. As ~30 telas que chamam `useUIStore().showToast` continuam
 * iguais; foi por isso que a fachada ficou.
 *
 * Nada aqui é persistido: um diálogo de confirmação gravado no disco
 * reapareceria na abertura seguinte, sem contexto nenhum.
 */

/**
 * Os TRÊS tons do produto, que o toast traduz em ícone (e o erro, em cor):
 * `neutral` mostra o "i", `sucesso` o visto, `erro` o ✕.
 *
 * `sucesso` existe porque "salvo", "venda registrada" e "caixa fechado" não são
 * recado: são confirmação, e um visto verde-branco fecha o gesto que o
 * balconista acabou de fazer. Sai no MESMO petrol do neutro de propósito — o
 * fundo é identidade do toast (ver `palette.toast`), e o que muda entre um
 * recado e uma confirmação é o ícone, não a cor da caixa.
 */
export type ToastTone = 'neutral' | 'sucesso' | 'erro';

export interface ToastOptions {
  tone: ToastTone;
  /** Mostra o botão Desfazer e liga o callback `onUndo`. */
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
  /** Sem `productId` é cadastro rápido; com ele, edição do mesmo formulário. */
  | { type: 'product'; productId?: string }
  | { type: 'closeOut' }
  | { type: 'ticket' }
  | { type: 'withdrawal' }
  | { type: 'topUp' }
  | { type: 'movement'; productId?: string; productName?: string }
  | { type: 'cost' };

export type SheetType = Sheet['type'];

interface UIState {
  confirm: Confirm | null;
  sheet: Sheet | null;

  showToast: (text: string, options?: Partial<ToastOptions> & { onUndo?: () => void }) => void;
  closeToast: () => void;
  requestConfirm: (c: Confirm) => void;
  closeConfirm: () => void;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
}

/** Tempo que o toast fica na tela — inclusive a janela do Desfazer. */
export const TOAST_DURATION_MS = 4200;

/**
 * O fundo é petrol fixo nos dois temas — decisão do design, registrada em
 * `palette.toast`. Toast de erro vira vermelho, e esse SIM segue o tema, como
 * o token `danger` já fazia.
 */
function corDeFundo(tone: ToastTone): string {
  if (tone !== 'erro') return palette.toast;
  return usePreferencesStore.getState().darkTheme ? palette.redDark : palette.redLight;
}

/**
 * Um toast por vez, como no protótipo: o novo derruba o anterior. O sistema
 * do Reactix EMPILHA por padrão, então a restrição precisa ser aplicada aqui —
 * sem isso, dois erros seguidos ficariam um em cima do outro.
 */
let toastAtual: string | null = null;

export const useUIStore = create<UIState>()((set) => ({
  confirm: null,
  sheet: null,

  showToast: (text, options) => {
    if (toastAtual) Toast.dismiss(toastAtual);

    const tone = options?.tone ?? 'neutral';
    const onUndo = options?.onUndo;
    const withUndo = (options?.withUndo ?? false) && !!onUndo;

    // `id` é lido pelo `onClose` abaixo, que só roda depois desta atribuição.
    // A comparação NÃO é zelo: o toast derrubado deixa para trás um timer de
    // saída que ainda vai chamar o `onClose` dele. Sem o guarda, esse eco
    // zeraria o `toastAtual` do toast NOVO — e a partir daí o próximo
    // `showToast` não teria mais quem derrubar, voltando a empilhar.
    let id = '';
    id = Toast.show(text, {
      duration: TOAST_DURATION_MS,
      position: 'top',
      // `type` só desenha o ÍCONE do canto esquerdo; a cor vem do
      // `backgroundColor`, logo abaixo. Nenhum toast do app é `'default'` (o
      // tipo sem ícone do Reactix): recado sem estado nenhum ainda é informação,
      // e o "i" é o que faz o balconista reconhecer a caixa de longe.
      type: tone === 'erro' ? 'error' : tone === 'sucesso' ? 'success' : 'info',
      backgroundColor: corDeFundo(tone),
      action: withUndo && onUndo ? { label: 'Desfazer', onPress: onUndo } : null,
      onClose: () => {
        if (toastAtual === id) toastAtual = null;
      },
    });
    toastAtual = id;
  },

  closeToast: () => {
    if (toastAtual) Toast.dismiss(toastAtual);
    toastAtual = null;
  },

  requestConfirm: (c) => set({ confirm: c }),
  closeConfirm: () => set({ confirm: null }),

  openSheet: (s) => set({ sheet: s }),
  closeSheet: () => set({ sheet: null }),
}));
