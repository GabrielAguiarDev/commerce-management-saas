/**
 * babel-preset-expo (SDK 57) já configura por dentro o plugin do
 * react-native-worklets exigido pelo Reanimated 4 — por isso ele NÃO é
 * declarado aqui. Declará-lo manualmente duplica a transformação e quebra
 * as worklets com "Cannot find function __workletUnpack".
 *
 * O module-resolver dá os aliases (@components, @domain, ...) ao runtime.
 * Os mesmos aliases estão em tsconfig.json (para o tsc) e em jest.config.js
 * (para o projeto node de testes puros). Os três precisam andar juntos.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@app': './app',
            '@components': './src/components',
            '@config': './src/config',
            '@data': './src/data',
            '@domain': './src/domain',
            '@hooks': './src/hooks',
            '@i18n': './src/i18n',
            '@services': './src/services',
            '@store': './src/store',
            '@theme': './src/theme',
            '@utils': './src/utils',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
