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
 * NÃO ligue `disableHierarchicalLookup`. Hoisted não quer dizer plano: quando
 * duas versões de um pacote são exigidas, o pnpm ainda cria um `node_modules`
 * ANINHADO para a perdedora. É o caso do `pretty-format` — a raiz fica com a
 * v30 (do jest) e o `react-native` guarda a v29 que ele exige em
 * `node_modules/react-native/node_modules`. Com o lookup hierárquico
 * desligado, o Metro não enxerga esse aninhado, o `HMRClient` importa a v30
 * (que não expõe `.default` no require CJS) e o app morre no boot com
 * "[runtime not ready] TypeError: Cannot read property 'default' of undefined",
 * ANTES de renderizar qualquer tela. O bundle compila normalmente — só quebra
 * em runtime, então `expo export` passa e esconde o problema.
 *
 * O risco de "dois Reacts" que justificaria desligá-lo não existe aqui: não há
 * nenhuma cópia aninhada de `react` nem de `react-native` no grafo (confira com
 * `find node_modules -path '*\/node_modules\/react\/package.json'`).
 */
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
