/**
 * A regra de senha do portal, num lugar só.
 *
 * Vale para os DOIS lados: a tela usa para responder antes de enviar, e a
 * Server Action usa para valer — um formulário é só uma sugestão de como
 * chamar o endpoint, e quem chama o endpoint direto não passa por ele.
 *
 * O portal nunca definiu senha até aqui: o dono do negócio recebe um convite
 * por e-mail e escolhe a dele (ver `apps/portal-admin/app/clientes/actions.ts`).
 * Esta é a primeira regra do app, e ela é mais exigente que o mínimo padrão do
 * Supabase (6) de propósito — se o painel um dia apertar, esta continua
 * valendo; se afrouxar, a nossa é a que a pessoa vê.
 *
 * Comprimento, e não composição: exigir maiúscula, número e símbolo empurra
 * para senhas curtas e decoradas com truque, que são as que caem primeiro.
 */
export const MIN_PASSWORD = 8;

/** O que está errado com o par digitado, ou `null` se está tudo certo. */
export function passwordProblem(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  }

  if (password !== confirmation) {
    return "As duas senhas não são iguais.";
  }

  return null;
}
