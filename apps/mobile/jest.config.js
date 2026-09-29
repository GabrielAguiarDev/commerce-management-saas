/**
 * Duas suítes, de propósito (padrão `projects` do Jest):
 *
 *  - `logica`  → testEnvironment node, sem preset de React Native. Roda em
 *                segundos e cobre tudo que é função pura: adapters, services,
 *                seletores, formatadores, gates. É a suíte que se roda o dia
 *                inteiro.
 *  - `ui`      → preset jest-expo + @testing-library/react-native, só para os
 *                componentes onde o comportamento vale um teste.
 *
 * Por que separar: carregar o preset RN custa vários segundos por execução, e
 * arrastar `react-native` para dentro dos testes de domínio esconde vazamento
 * de camada — se um teste de adapter passa a precisar do preset, a camada
 * vazou. Ver DEVELOPMENT.md › Notas.
 */
const jestExpoPreset = require('jest-expo/jest-preset');

const aliases = {
  '^@components$': '<rootDir>/src/components/index.ts',
  '^@components/(.*)$': '<rootDir>/src/components/$1',
  '^@config$': '<rootDir>/src/config/index.ts',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
  '^@data$': '<rootDir>/src/data/index.ts',
  '^@data/(.*)$': '<rootDir>/src/data/$1',
  '^@domain/(.*)$': '<rootDir>/src/domain/$1',
  '^@hooks$': '<rootDir>/src/hooks/index.ts',
  '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
  '^@i18n$': '<rootDir>/src/i18n/index.ts',
  '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
  '^@services$': '<rootDir>/src/services/index.ts',
  '^@services/(.*)$': '<rootDir>/src/services/$1',
  '^@store$': '<rootDir>/src/store/index.ts',
  '^@store/(.*)$': '<rootDir>/src/store/$1',
  '^@theme$': '<rootDir>/src/theme/index.ts',
  '^@theme/(.*)$': '<rootDir>/src/theme/$1',
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
};

module.exports = {
  projects: [
    {
      displayName: 'logica',
      testEnvironment: 'node',
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.test.js' }],
      },
      moduleNameMapper: aliases,
      testMatch: [
        '<rootDir>/src/domain/**/__tests__/**/*.test.ts',
        '<rootDir>/src/utils/__tests__/**/*.test.ts',
        '<rootDir>/src/data/__tests__/**/*.test.ts',
        '<rootDir>/src/store/__tests__/**/*.test.ts',
      ],
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      /**
       * `.tsx` no `testMatch`, e só dentro de `src/components`: é a fronteira
       * entre as duas suítes. Um teste de domínio que precisasse do preset RN
       * teria de virar `.tsx` e mudar de pasta — o que torna o vazamento de
       * camada visível na revisão, em vez de silencioso.
       */
      testMatch: ['<rootDir>/src/components/**/__tests__/**/*.test.tsx'],
      /**
       * O `moduleNameMapper` do jest-expo é PRESERVADO (ele redireciona
       * `react-native` e os ícones); os aliases entram por cima. Substituí-lo
       * quebraria a resolução do próprio preset.
       */
      moduleNameMapper: { ...jestExpoPreset.moduleNameMapper, ...aliases },
      setupFiles: [...jestExpoPreset.setupFiles, '<rootDir>/jest.setup.ui.js'],
      /** O do RN mais a regra do `react-native-worklets`. Ver o arquivo. */
      resolver: '<rootDir>/jest.resolver.ui.js',
      setupFilesAfterEnv: ['<rootDir>/jest.after-env.ui.js'],
    },
  ],
};
