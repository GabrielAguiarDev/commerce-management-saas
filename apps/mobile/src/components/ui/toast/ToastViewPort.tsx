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

/**
 * A ALTURA de cada faixa. Eram 200, do original.
 *
 * Não é decoração: no Android o pai recorta o filho que passa da borda. Com o
 * toast pousando abaixo do header (safe area + 57 + 8 ≈ 124pt num iPhone com
 * ilha), 200 deixava ~76pt para o toast — o bastante para duas linhas, e um erro
 * de três linhas teria a última cortada.
 *
 * 340 cabe a faixa inteira sem alcançar o conteúdo útil de aparelho nenhum, e
 * `pointerEvents: 'box-none'` garante que a área sobrando não intercepta toque.
 */
const ALTURA_FAIXA = 340;

export const ToastViewport: React.FC = () => {
  const { toasts } = useToast();

  const topToasts = toasts.filter((toast) => toast.options.position === 'top');
  const bottomToasts = toasts.filter((toast) => toast.options.position === 'bottom');

  return (
    <>
      <View style={[styles.viewport, styles.topViewport, { height: ALTURA_FAIXA }]}>
        {topToasts.map((toast, arrayIndex) => {
          const displayIndex = topToasts.length - 1 - arrayIndex;
          return <Toast key={toast.id} toast={toast} index={displayIndex} />;
        })}
      </View>

      <View style={[styles.viewport, styles.bottomViewport, { height: ALTURA_FAIXA }]}>
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
