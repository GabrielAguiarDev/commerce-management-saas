import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Tipos do sistema de toast do Reactix (https://www.reacticx.com/docs/components/toast).
 *
 * A doc publica os quatro arquivos de implementação mas NÃO publica este —
 * ele é inferido das assinaturas usadas pelos outros três. Se um dia o pacote
 * publicar o arquivo oficial, este aqui é o que deve ser trocado.
 */

export type ToastType = 'info' | 'warning' | 'error' | 'success' | 'default';

export type ToastPosition = 'bottom' | 'top';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export type ToastExpandedContent =
  | ReactNode
  | ((ctx: { dismiss: () => void }) => ReactNode);

export interface ToastOptions {
  /** Milissegundos na tela. `0` (ou menos) deixa o toast fixo até o dismiss. */
  duration?: number;
  type?: ToastType;
  position?: ToastPosition;
  onClose?: () => void;
  action?: ToastAction | null;
  /** Conteúdo revelado ao tocar no toast. */
  expandedContent?: ToastExpandedContent;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export interface Toast {
  id: string;
  content: ReactNode | string;
  options: Required<ToastOptions>;
}

export interface ToastContextValue {
  toasts: Toast[];
  show: (content: ReactNode | string, options?: ToastOptions) => string;
  update: (id: string, content: ReactNode | string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  expandedToasts: Set<string>;
  expandToast: (id: string) => void;
  collapseToast: (id: string) => void;
}

export interface ToastProps {
  children?: ReactNode;
}
