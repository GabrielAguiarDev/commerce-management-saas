/**
 * AS VARIÁVEIS DE AMBIENTE, lidas e conferidas em UM lugar só.
 *
 * O que entra aqui é público de propósito: a URL do projeto e a chave
 * **publishable/anon**. Quem protege os dados é o RLS, que filtra tudo pelo
 * tenant do usuário logado — a chave sozinha não abre nada. A `service_role`
 * NUNCA entra neste app: ela ignora o RLS e administra o Auth, e pertence só ao
 * portal-admin. Um app é um binário na mão do cliente; tudo que vai nele deve
 * ser tratado como já vazado.
 *
 * ⚠️ `process.env.EXPO_PUBLIC_*` precisa ser escrito com ACESSO LITERAL. O
 * Metro faz substituição de texto no bundle, não uma leitura em tempo de
 * execução: `process.env[nome]` com nome variável não é substituído e chega
 * como `undefined` no aparelho. É por isso que as duas linhas abaixo repetem o
 * nome inteiro em vez de passarem por uma função.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Falta credencial? O app não sobe.
 *
 * Falhar aqui, no boot, é MUITO melhor do que deixar o cliente Supabase nascer
 * com `undefined` e cada tela morrer com um erro de rede diferente meia hora
 * depois. A mensagem diz o que fazer, porque quem vai lê-la é um desenvolvedor
 * com o `.env` errado — não o dono do comércio.
 */
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[config] Falta a variável ${name}. Copie o .env.example para .env, ` +
        'preencha os dois valores e reinicie o servidor do Expo ' +
        '(variáveis EXPO_PUBLIC_ só são lidas na inicialização do bundler).',
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
} as const;
