// O polyfill de URL precisa ser o PRIMEIRO import do módulo.
//
// O `supabase-js` monta os endereços das requisições com a API `URL`/
// `URLSearchParams`. A implementação que vem no Hermes é incompleta: ela existe,
// mas ignora a query string — então o cliente sobe sem erro e as consultas
// chegam ao PostgREST SEM o `select`, o `eq` e o `order`. O sintoma é sutil (a
// consulta "funciona" e devolve o conjunto errado), e é por isso que este import
// vem antes de qualquer outro e sem nada entre ele e o `createClient`.
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@config';

import { LargeSecureStore } from './secureSessionStorage';

/**
 * O CLIENTE SUPABASE — a única instância do app.
 *
 * Precisa ser único: cada cliente mantém o seu próprio timer de renovação de
 * token e a sua própria inscrição em `onAuthStateChange`. Dois clientes
 * disputariam o mesmo refresh token, e o perdedor derrubaria a sessão do
 * ganhador. Por isso é uma constante de módulo, criada uma vez, e nunca uma
 * função `createClient()` como no portal web (lá o ciclo de vida é o da
 * requisição; aqui é o do processo).
 *
 * SEGURANÇA: só a chave publishable/anon. O RLS filtra tudo pelo tenant do
 * usuário logado — nenhuma consulta deste app passa `tenant_id`. Ver `@config`.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    // Sessão criptografada no aparelho. Ver `secureSessionStorage.ts` para o
    // porquê de não ser o AsyncStorage direto.
    storage: new LargeSecureStore(),

    // O access token dura ~1h; sem isto o app quebraria sozinho no meio do
    // expediente e o dono levaria a culpa para o suporte.
    autoRefreshToken: true,

    // Entrar uma vez e continuar entrado entre relaunches. É o comportamento
    // que um app de balcão precisa ter.
    persistSession: true,

    // Isto é a WEB: o Supabase leria o token do fragmento da URL depois de um
    // redirect de OAuth/magic link. Em React Native não existe essa URL, e
    // deixar ligado faz o cliente procurar por um `window.location` que não
    // existe. Se um dia entrar login por link mágico, a captura será via
    // `expo-linking` + `setSession`, não por aqui.
    detectSessionInUrl: false,
  },
});

/**
 * Renovação de token atrelada ao ciclo de vida do APP, não ao do JavaScript.
 *
 * O `autoRefreshToken` é um `setInterval`, e o sistema operacional congela os
 * timers do app em segundo plano. Um app de balcão passa horas assim — a tela
 * apaga entre um cliente e outro. Sem este bloco, o timer não dispara enquanto
 * congelado, o token vence, e a primeira ação ao voltar (justamente uma venda)
 * falha com 401.
 *
 * `startAutoRefresh` renova IMEDIATAMENTE ao voltar para o primeiro plano, além
 * de reprogramar o timer. Parar em background evita gastar bateria e rede com
 * uma renovação que ninguém está esperando.
 *
 * Fica no módulo do cliente, e não num hook, porque o assinante precisa ser o
 * mesmo e único — um hook em componente montado duas vezes registraria dois.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
