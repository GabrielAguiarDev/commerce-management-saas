import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Toast } from './Toast';
import { useToast } from './context/ToastContext';

/**
 * As duas faixas onde os toasts se empilham — uma no topo, uma no rodapé.
 *
 * ⚠️ A safe area saiu daqui (o Reactix aplica `paddingTop: insets.top + 10` e
 * `marginBottom: insets.bottom`), e o `paddingHorizontal: 16` também. Os toasts
 * são `position: 'absolute'` e não herdam padding do pai, então nenhum dos dois
 * chegava neles: quem aplica os dois agora é o próprio `Toast`, em `top`/
 * `bottom` e em `left`/`right`. Devolver qualquer um deles para cá não conserta
 * nada e, se o Yoga um dia passar a respeitá-los em filho absoluto, passam a
 * contar em dobro.
 */

export const ToastViewport: React.FC = () => {
  const { toasts } = useToast();

  const topToasts = toasts.filter((toast) => toast.options.position === 'top');
  const bottomToasts = toasts.filter((toast) => toast.options.position === 'bottom');

  return (
    <>
      <View style={[styles.viewport, styles.topViewport, { height: 200 }]}>
        {topToasts.map((toast, arrayIndex) => {
          const displayIndex = topToasts.length - 1 - arrayIndex;
          return <Toast key={toast.id} toast={toast} index={displayIndex} />;
        })}
      </View>

      <View style={[styles.viewport, styles.bottomViewport, { height: 200 }]}>
        {bottomToasts.map((toast, arrayIndex) => {
          const displayIndex = bottomToasts.length - 1 - arrayIndex;
          return <Toast key={toast.id} toast={toast} index={displayIndex} />;
        })}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  topViewport: {
    top: 0,
    justifyContent: 'flex-start',
  },
  bottomViewport: {
    bottom: 0,
    justifyContent: 'flex-end',
  },
});
