/**
 * Nome PRÓPRIO do cookie de sessão deste portal.
 *
 * Os dois portais falam com o mesmo projeto Supabase, e o nome padrão do
 * cookie (`sb-<projeto>-auth-token`) sai igual nos dois. Em desenvolvimento
 * eles rodam em `localhost:3000` e `localhost:3001`, e cookie não separa por
 * porta: entrar ou sair em o Portal do Cliente trocava ou apagava a sessão daqui, e a
 * próxima ação respondia "Sessão expirada" minutos depois do login.
 *
 * Os três clientes (navegador, servidor e proxy) precisam usar o MESMO nome,
 * senão um grava a sessão onde o outro não procura.
 */
export const AUTH_COOKIE_OPTIONS = { name: "sb-aguiar-admin-auth" } as const;
