const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

/**
 * Configuração de monorepo do Metro.
 *
 * Com `nodeLinker: hoisted` (ver pnpm-workspace.yaml na raiz), as dependências
 * ficam achatadas em `<raiz>/node_modules`. O Metro precisa de duas coisas:
 *
 *  - `watchFolders` incluindo a raiz, senão editar um pacote de `packages/*`
 *    não recarrega o app;
 *  - `nodeModulesPaths` com os DOIS diretórios, porque parte das dependências
 *    diretas do app fica em `apps/mobile/node_modules` e o resto na raiz.
 *
 * `disableHierarchicalLookup` desligado do padrão: sem ele o Metro sobe a
 * árvore por conta própria e pode achar uma segunda cópia de `react` ou
 * `react-native` — o que produz o erro de dois Reacts, difícil de diagnosticar.
 */
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
