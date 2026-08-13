import React, { useEffect, useRef } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useAppTheme } from '@hooks/useAppTheme';
import { palette } from '@theme';

import type { Toast as ToastType, ToastType as ToastVariant } from './Toast.types';
import { useToast } from './context/ToastContext';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

/**
 * A folga entre a área segura e o toast. ⬅️ MEXA AQUI para descer o toast.
 *
 * ⚠️ A safe area é somada AQUI, e não no `ToastViewport` como faz o Reactix.
 * O original põe `paddingTop: insets.top + 10` no viewport e `top: 80` no
 * toast — mas o toast é `position: 'absolute'`, e **filho absoluto não herda
 * o padding do pai**. O padding do viewport nunca valeu nada: o que segurava o
 * toast fora da barra de status eram os 80 fixos, que num iPhone com Dynamic
 * Island ficam CURTOS (a ilha ocupa ~59pt e o toast entrava por baixo dela) e
 * num aparelho sem entalhe ficam longos demais.
 *
 * Medir a safe area de verdade resolve os dois casos com um número só.
 */
const AFASTAMENTO = 10;

/**
 * ARRASTAR PARA FECHAR — não vem do Reactix, é acréscimo nosso.
 *
 * O sentido do gesto segue a posição do toast: no topo fecha para CIMA, no
 * rodapé para BAIXO. Puxar para o lado errado não fecha, mas também não trava:
 * o toast anda um pouco e volta, que é o que diz "dá para arrastar, só não
 * para cá".
 */

/** Distância percorrida no sentido da saída que já fecha o toast, em pt. */
const DISTANCIA_FECHAR = 48;

/**
 * ...ou este empurrão, em pt/s. É o que faz o **flick** curto funcionar: um
 * peteleco rápido de 20pt fecha, porque a intenção está na velocidade e não no
 * quanto o dedo andou.
 */
const VELOCIDADE_FECHAR = 700;

/** Quanto o toast ainda anda para fora da tela depois de solto. */
const ALTURA_SAIDA = 220;

/** Duração da saída pelo gesto. Curta de propósito: o dedo já foi embora. */
const DURACAO_SAIDA = 180;

/** Quanto o arrasto no sentido CONTRÁRIO acompanha o dedo (rubber band). */
const RESISTENCIA = 0.2;

/**
 * A partir de quantos pt o gesto vira arrasto do toast.
 *
 * Existe para o TOQUE continuar funcionando: sem essa margem, o pan reivindica
 * o toque no primeiro pixel e o `onPress` do conteúdo expansível nunca dispara.
 */
const FOLGA_ATIVACAO = 10;

interface ToastProps {
  toast: ToastType;
  index: number;
  onHeightChange?: (id: string, height: number) => void;
}

const getBackgroundColor = (type: ToastVariant) => {
  switch (type) {
    case 'success':
      return palette.toastSuccess;
    case 'error':
      return palette.toastError;
    case 'warning':
      return palette.toastWarning;
    case 'info':
      return palette.toastInfo;
    default:
      return palette.toastNeutral;
  }
};

const getIconForType = (type: ToastVariant) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return '';
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, index }) => {
  const prevIndexRef = useRef<number>(-1);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { dismiss, expandedToasts, expandToast, collapseToast } = useToast();

  const opacity = useSharedValue<number>(1);
  const translateY = useSharedValue<number>(toast.options.position === 'top' ? -100 : 100);
  const scale = useSharedValue<number>(0.9);
  const rotateZ = useSharedValue<number>(0);
  const expandHeight = useSharedValue<number>(0);

  /**
   * O deslocamento do DEDO, separado do `translateY` de propósito.
   *
   * O `translateY` está ocupado: entrada, reposicionamento na pilha e saída
   * por tempo escrevem nele o tempo todo. Se o gesto escrevesse no mesmo
   * valor, uma spring de pilha disparada no meio do arrasto arrancaria o toast
   * de baixo do dedo. Os dois são somados no transform, e cada um responde por
   * uma coisa só.
   */
  const dragY = useSharedValue<number>(0);

  const isExpanded = expandedToasts.has(toast.id);
  const hasExpandedContent = !!toast.options.expandedContent;

  const getStackOffset = () => {
    const baseOffset = 4;
    const maxOffset = 12;
    const offset = Math.min(index * baseOffset, maxOffset);
    return toast.options.position === 'top' ? offset : -offset;
  };

  const getStackScale = () => {
    const scaleReduction = 0.02;
    const minScale = 0.92;
    return Math.max(1 - index * scaleReduction, minScale);
  };

  useEffect(() => {
    if (prevIndexRef.current !== index && opacity.value > 0) {
      const soonerOffset = toast.options.position === 'top' ? 2 : -2;
      translateY.value = withTiming(getStackOffset() + soonerOffset, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });
      scale.value = withTiming(getStackScale() * 0.98, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });

      setTimeout(() => {
        translateY.value = withSpring(getStackOffset(), {
          damping: 25,
          stiffness: 120,
          mass: 0.8,
          velocity: 0,
        });
        scale.value = withSpring(getStackScale(), {
          damping: 25,
          stiffness: 120,
          mass: 0.8,
          velocity: 0,
        });
      }, 200);
    }
    prevIndexRef.current = index;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, toast.options.position, translateY, scale, opacity]);

  const handleDismiss = () => {
    dismiss(toast.id);
    toast.options.onClose?.();
  };

  const animatedDismiss = () => {
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    });
    translateY.value = withTiming(toast.options.position === 'top' ? -50 : 50, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    });
    scale.value = withTiming(0.85, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    });

    setTimeout(() => {
      handleDismiss();
    }, 300);
  };

  useEffect(() => {
    const delay = index * 50;

    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    setTimeout(() => {
      translateY.value = withSpring(getStackOffset(), {
        damping: 28,
        stiffness: 140,
        mass: 0.8,
        velocity: 0,
      });
      scale.value = withSpring(getStackScale(), {
        damping: 28,
        stiffness: 140,
        mass: 0.8,
        velocity: 0,
      });
      rotateZ.value = withTiming(0, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });
    }, delay);

    if (toast.options.duration > 0) {
      const exitDelay = Math.max(0, toast.options.duration - 500);

      const exitAnimations = () => {
        opacity.value = withTiming(0, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        translateY.value = withTiming(toast.options.position === 'top' ? 20 : 20, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        scale.value = withTiming(0.95, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        setTimeout(() => {
          scheduleOnRN(handleDismiss);
        }, 400);
      };

      setTimeout(exitAnimations, exitDelay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, opacity, translateY, scale, rotateZ, index]);

  // Animate expansion
  useEffect(() => {
    if (isExpanded && hasExpandedContent) {
      expandHeight.value = withSpring(1, {
        damping: 20,
        stiffness: 100,
      });
    } else {
      expandHeight.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
      });
    }
  }, [isExpanded, hasExpandedContent, expandHeight]);

  /** `-1` fecha para cima (toast no topo), `+1` para baixo (toast no rodapé). */
  const direcaoSaida = toast.options.position === 'top' ? -1 : 1;

  const arrastar = Gesture.Pan()
    // Só no eixo Y, e só depois da folga: sem isso o pan engole o toque.
    .activeOffsetY([-FOLGA_ATIVACAO, FOLGA_ATIVACAO])
    .onUpdate((e) => {
      const noSentidoDaSaida = e.translationY * direcaoSaida > 0;
      dragY.value = noSentidoDaSaida ? e.translationY : e.translationY * RESISTENCIA;
    })
    .onEnd((e) => {
      // Projetados no sentido da saída, os dois viram "para frente é positivo",
      // e a regra fica a mesma para o toast do topo e o do rodapé.
      const percorrido = dragY.value * direcaoSaida;
      const velocidade = e.velocityY * direcaoSaida;

      if (percorrido > DISTANCIA_FECHAR || velocidade > VELOCIDADE_FECHAR) {
        opacity.value = withTiming(0, { duration: DURACAO_SAIDA });
        dragY.value = withTiming(
          direcaoSaida * ALTURA_SAIDA,
          { duration: DURACAO_SAIDA, easing: Easing.out(Easing.quad) },
          // Desmontar só no fim: dismiss durante a animação tira o toast da
          // árvore e o que se vê é ele SUMINDO, não saindo.
          (concluida) => {
            if (concluida) scheduleOnRN(handleDismiss);
          },
        );
        return;
      }

      // Não passou do ponto: volta para o lugar. Spring, e não timing, porque
      // o gesto tem velocidade e descartá-la faria a volta parecer presa.
      dragY.value = withSpring(0, {
        damping: 22,
        stiffness: 220,
        mass: 0.6,
        velocity: e.velocityY,
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    // O toast vai apagando conforme se afasta — o retorno visual de que soltar
    // ali fecha. Nunca zera sozinho: quem zera é a saída, no `onEnd`.
    const percorrido = dragY.value * direcaoSaida;
    const opacidadeDoArrasto = interpolate(
      percorrido,
      [0, DISTANCIA_FECHAR * 2],
      [1, 0.35],
      Extrapolation.CLAMP,
    );

    return {
      opacity: opacity.value * opacidadeDoArrasto,
      transform: [
        { translateY: translateY.value + dragY.value },
        { scale: scale.value },
        { rotateZ: `${rotateZ.value}deg` },
      ],
      zIndex: 1000 - index,
    };
  });

  const expandedContentStyle = useAnimatedStyle(() => {
    return {
      maxHeight: expandHeight.value * 300,
      opacity: expandHeight.value,
    };
  });

  const handlePress = () => {
    if (!hasExpandedContent) {
      return;
    }
    if (isExpanded) {
      collapseToast(toast.id);
    } else {
      expandToast(toast.id);
    }
  };

  const backgroundColor = toast.options.backgroundColor ?? getBackgroundColor(toast.options.type);
  const _styles = toast.options?.style || {};
  const icon = getIconForType(toast.options.type);

  const renderExpandedContent = () => {
    if (!hasExpandedContent) return null;
    const content = toast.options.expandedContent;
    if (typeof content === 'function') {
      return content({ dismiss: animatedDismiss });
    }
    return content;
  };

  return (
    <GestureDetector gesture={arrastar}>
      <Animated.View
        style={[
          styles.toastContainer,
          animatedStyle,
          {
            marginTop: 0,
            marginBottom: 0,
            position: 'absolute',
            // A LARGURA vem daqui, e é o gutter da tela nos dois lados — o
            // toast fica no mesmo prumo dos cartões que ele cobre. Pelo mesmo
            // motivo do afastamento vertical: filho absoluto não herda o
            // padding do viewport, então o `paddingHorizontal` de lá nunca
            // valeu nada e o que sobrava era o `width: '90%'` do Reactix, uma
            // largura que não conversa com margem nenhuma do app.
            left: theme.spacing.screen,
            right: theme.spacing.screen,
            top: toast.options.position === 'top' ? insets.top + AFASTAMENTO : undefined,
            bottom: toast.options.position === 'bottom' ? insets.bottom + AFASTAMENTO : undefined,
          },
          _styles,
        ]}
        accessibilityLiveRegion="polite"
      >
        <Pressable
          style={[styles.toast, { backgroundColor }]}
          onPress={handlePress}
          android_ripple={{ color: palette.toastRipple }}
        >
          <View style={styles.mainContent}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <View style={styles.contentContainer}>
              {typeof toast.content === 'string' ? (
                <Text style={styles.text}>{toast.content}</Text>
              ) : (
                toast.content
              )}
            </View>
            {toast.options.action && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  toast?.options?.action?.onPress();
                  animatedDismiss();
                }}
              >
                <Text style={styles.actionText}>{toast.options.action.label}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Expanded Content */}
          {hasExpandedContent && (
            <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
              {renderExpandedContent()}
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    marginVertical: 4,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: palette.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toast: {
    flexDirection: 'column',
    borderRadius: 12,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    color: palette.white,
    fontSize: 20,
    marginRight: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 24,
  },
  contentContainer: {
    flex: 1,
  },
  text: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: palette.pillGhost,
    marginLeft: 12,
  },
  actionText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '600',
  },
  expandedContent: {
    overflow: 'hidden',
  },
});
