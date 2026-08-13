import * as React from 'react';

import { ToastViewport } from './ToastViewPort';
import type { ToastOptions, ToastProps } from './Toast.types';
import { ToastProvider, useToast } from './context/ToastContext';

/**
 * Toast do Reactix — https://www.reacticx.com/docs/components/toast
 *
 * Código de terceiro, copiado da doc (o pacote é "copy & paste", não uma
 * dependência npm). Os desvios do original, todos comentados no arquivo em
 * que moram:
 *
 *  1. `position` nasce em `'top'` e não `'bottom'` (`context/ToastContext`);
 *  2. o afastamento do topo virou constante e foi a zero (`Toast.tsx`);
 *  3. a largura é o gutter da tela (`left`/`right` = `spacing.screen`) no lugar
 *     de `width: '90%'` + `maxWidth: 400` (`Toast.tsx`);
 *  4. `Toast.types.ts` é nosso — a doc não publica esse arquivo.
 *
 * A porta de entrada do app NÃO é esta: as telas continuam chamando
 * `useUIStore().showToast`, que traduz o vocabulário do produto (tom, Desfazer)
 * para as opções daqui. Ver `@store/uiStore`.
 */

type ToastRef = {
  show?: (content: React.ReactNode | string, options?: ToastOptions) => string;
  update?: (id: string, content: React.ReactNode | string, options?: ToastOptions) => void;
  dismiss?: (id: string) => void;
  dismissAll?: () => void;
};

const toastRef: ToastRef = {};

const ToastController: React.FC = () => {
  const toast = useToast();
  toastRef.show = toast.show;
  toastRef.update = toast.update;
  toastRef.dismiss = toast.dismiss;
  toastRef.dismissAll = toast.dismissAll;
  return null;
};

export const ToastProviderWithViewport: React.FC<ToastProps> = ({ children }) => {
  return (
    <ToastProvider>
      <ToastController />
      {children}
      <ToastViewport />
    </ToastProvider>
  );
};

export const Toast = {
  show: (content: React.ReactNode | string, options?: ToastOptions): string => {
    if (!toastRef.show) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      );
      return '';
    }
    return toastRef.show(content, options);
  },

  update: (id: string, content: React.ReactNode | string, options?: ToastOptions): void => {
    if (!toastRef.update) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      );
      return;
    }
    return toastRef.update(id, content, options);
  },

  dismiss: (id: string): void => {
    if (!toastRef.dismiss) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      );
      return;
    }
    return toastRef.dismiss(id);
  },

  dismissAll: (): void => {
    if (!toastRef.dismissAll) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      );
      return;
    }
    return toastRef.dismissAll();
  },
};

export { ToastProvider, useToast } from './context/ToastContext';
export type { ToastOptions, ToastType, ToastPosition } from './Toast.types';
