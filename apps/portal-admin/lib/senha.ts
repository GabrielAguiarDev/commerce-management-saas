/**
 * A regra de senha do console admin, num lugar só.
 *
 * Vale para os DOIS lados: a tela usa para responder antes de enviar, e a
 * Server Action usa para valer — um formulário é só uma sugestão de como
 * chamar o endpoint, e quem chama o endpoint direto não passa por ele.
 *
 * O MÍNIMO AQUI É MAIOR QUE O DO PORTAL DO CLIENTE (8, em
 * `apps/portal-client/lib/senha.ts`), e a diferença é proposital: uma conta do
 * console enxerga todos os tenants da plataforma. O estrago de uma senha
 * adivinhada aqui não se compara ao de uma conta de um único comércio.
 *
 * Comprimento, e não composição: exigir maiúscula, número e símbolo empurra
 * para senhas curtas e decoradas com truque, que são as que caem primeiro.
 */
export const MIN_PASSWORD = 10;

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
