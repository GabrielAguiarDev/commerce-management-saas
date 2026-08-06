const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    rules: {
      /**
       * DESLIGADA por incompatibilidade conhecida, não por conveniência.
       *
       * `react-hooks/immutability` (das regras novas alinhadas ao React
       * Compiler) trata qualquer atribuição a algo devolvido por um hook como
       * mutação proibida. Só que `useSharedValue().value = x` é EXATAMENTE a
       * API do Reanimated: o shared value existe para ser escrito, inclusive
       * dentro de worklet na thread de UI, onde `setState` não vale.
       *
       * Não há como marcar a exceção no código sem espalhar
       * `eslint-disable-next-line` por toda animação. Se um dia a regra passar
       * a entender shared values, é para religar.
       */
      'react-hooks/immutability': 'off',

      // Cor solta é proibida: o tema é a única fonte de cor (ver DEVELOPMENT.md
      // › Convenções). A regra não pega tudo, mas pega o caso comum de alguém
      // escrever `color: '#0e7c86'` direto no componente.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'Hex solto não entra em componente. Use um token do tema (src/theme) ou, se ele não existir, crie o token.',
        },
      ],
    },
  },
  {
    // A paleta é justamente o lugar onde o hex mora.
    files: ['src/theme/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
