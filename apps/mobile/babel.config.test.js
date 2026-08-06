/**
 * Babel só para a suíte `logica` do Jest.
 *
 * Não usa babel-preset-expo de propósito: o preset arrasta as transformações
 * de React Native (JSX runtime do RN, plugin de worklets, resolução de
 * plataforma) que a suíte pura não precisa e que custam segundos por execução.
 * Aqui basta TypeScript + módulos CommonJS para o Node.
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
};
