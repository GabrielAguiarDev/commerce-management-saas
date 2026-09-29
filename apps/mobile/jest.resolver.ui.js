/**
 * O RESOLVEDOR da suíte `ui` — o do React Native, mais UMA regra.
 *
 * A regra é a que o `react-native-worklets` publica em
 * `react-native-worklets/jest/resolver.js`: dentro daquele pacote, as extensões
 * `.native.*` saem da lista. Sem ela o Jest carrega
 * `WorkletsModule/NativeWorklets.native.ts`, que procura o módulo TurboModule no
 * aparelho, não o encontra e estoura com `Cannot read properties of undefined
 * (reading 'loadUnpackers')` — na IMPORTAÇÃO, antes de qualquer teste. É por aí
 * que o Reanimated 4 entra, e é por isso que o mock oficial dele não funciona
 * sozinho: `react-native-reanimated/mock` importa o índice de verdade.
 *
 * Ele não SUBSTITUI o resolvedor do preset: `jest-expo` usa exatamente o
 * `@react-native/jest-preset/jest/resolver`, e é para ele que tudo é delegado no
 * fim (é quem resolve os subcaminhos de `react-native`). Aqui só se ajusta a
 * lista de extensões antes de passar adiante.
 */
const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

module.exports = (request, options) => {
  const inWorklets =
    request.includes('react-native-worklets') || options.basedir.includes('react-native-worklets');

  if (!inWorklets) return reactNativeResolver(request, options);

  return reactNativeResolver(request, {
    ...options,
    extensions: options.extensions?.filter((extension) => !extension.includes('native')),
  });
};
