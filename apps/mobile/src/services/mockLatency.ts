/**
 * Latência artificial das camadas Api enquanto o backend não existe.
 *
 * Existe para que a UI seja escrita já convivendo com estado de carregamento —
 * é o que impede a surpresa clássica de "ficou lindo com mock, piscou feio com
 * rede". Fica em `services/` porque é infra transversal, não regra de domínio.
 *
 * Nos testes o valor cai para 0: `jest` não deve esperar por nada.
 */
const EM_TESTE = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const LATENCIA_MOCK_MS = EM_TESTE ? 0 : 220;

export function esperar(ms: number = LATENCIA_MOCK_MS): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
