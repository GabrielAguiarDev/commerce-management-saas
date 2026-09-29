/**
 * O que precisa existir ANTES de qualquer módulo do app ser carregado, na
 * suíte `ui`. Roda em `setupFiles`, e não em `setupFilesAfterEnv`, porque o
 * alvo aqui são leituras que acontecem em TEMPO DE IMPORTAÇÃO.
 */

/**
 * As credenciais.
 *
 * `src/config/env.ts` LANÇA no import quando `EXPO_PUBLIC_SUPABASE_*` não está
 * no ambiente — de propósito, para o app não subir com um cliente Supabase
 * nascido `undefined`. Como um teste de componente chega a esse import pela
 * cadeia de um domínio, sem estes dois valores a suíte quebraria na carga do
 * módulo, antes de qualquer expectativa. São valores de mentira: nenhum teste
 * daqui vai à rede.
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-de-teste';
