/**
 * Os DUBLÊS NATIVOS da suíte `ui` — o que não existe fora de um aparelho.
 *
 * Fica num arquivo só, e não repetido em cada teste, porque não é assunto do
 * teste: é o ambiente. O que cada teste dubla é o que ele está DECIDINDO (o
 * plano, o turno aberto, a mutação), e isso continua no próprio arquivo, à
 * vista de quem lê a expectativa.
 */

/**
 * Reanimated: a implementação oficial de mentira da lib.
 *
 * Sem ela, o `useSharedValue` cai numa ponte nativa que não existe no Node e o
 * `require` do módulo explode antes de renderizar qualquer coisa. Nada que a
 * suíte `ui` verifica depende de animação — as animações do app são visuais, e
 * o que está sob teste aqui é quem chama o quê.
 */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

/**
 * `@gorhom/bottom-sheet`: o mock que a própria lib publica.
 *
 * Ele troca o `BottomSheetModal` por uma `View` que renderiza os filhos
 * IMEDIATAMENTE. No app de verdade o conteúdo só aparece depois do
 * `present()` e de 260 ms de animação — esperar isso num teste transformaria
 * "o botão de fechar o caixa manda o contado certo" numa disputa com o
 * cronômetro.
 */
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

/**
 * O gesto raiz: em teste ele é só um contêiner.
 *
 * O `GestureHandlerRootView` de verdade quer uma view nativa; aqui a árvore de
 * teste é montada sem raiz de gesto nenhuma, e o que sobra é a `View`.
 */
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const actual = jest.requireActual('react-native-gesture-handler');
  return { ...actual, GestureHandlerRootView: View };
});

/**
 * Safe area: o mock oficial da lib (insets zerados, provider transparente).
 *
 * As medidas do aparelho não são o assunto de nenhum teste daqui — o que se
 * verifica é quem aparece na barra e o que o toque dispara. Sem o mock, o
 * provider fica esperando a medida nativa e a árvore nunca renderiza.
 */
jest.mock('react-native-safe-area-context', () =>
  // O arquivo da lib exporta por DEFAULT; sem o `.default` o módulo dublado
  // ficaria sem `useSafeAreaInsets` e o erro apareceria dentro do componente.
  require('react-native-safe-area-context/jest/mock').default,
);

/**
 * AsyncStorage: o mock que a própria lib publica.
 *
 * O `preferencesStore` é persistido, e `persist` grava a cada mudança. Contra o
 * módulo nativo real isso viraria um erro de ponte no meio do teste.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
