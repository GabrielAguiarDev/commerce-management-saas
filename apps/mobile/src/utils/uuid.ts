/**
 * UUID v4 gerado NO APARELHO.
 *
 * Existe por causa da fila offline: uma venda registrada sem internet precisa
 * de identidade ANTES de existir no servidor. E não é um id qualquer — é um
 * uuid porque ele é enviado como o `sales.id` da venda quando ela sobe. Isso é
 * o que impede a venda de entrar duas vezes: se a resposta do INSERT se perder
 * no caminho e a fila tentar de novo, o Postgres recusa a chave duplicada em
 * vez de criar uma segunda venda. A garantia fica no BANCO, que é o único lugar
 * onde ela vale mesmo com o aparelho desligando no meio.
 *
 * Feito à mão em vez de `expo-crypto`/`uuid` de propósito: são 4 linhas sobre
 * `crypto.getRandomValues`, que o app já carrega (via
 * `react-native-get-random-values`, importado em `secureSessionStorage`), e
 * cada módulo nativo a mais é mais um rebuild obrigatório.
 *
 * ⚠️ `Math.random()` NÃO serviria. Ele é previsível e colide: dois aparelhos do
 * mesmo negócio vendendo no mesmo segundo poderiam gerar o mesmo id, e aí a
 * proteção contra duplicata viraria a causa de uma venda REJEITADA.
 */

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export function uuidV4(): string {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error(
      'Sem `crypto.getRandomValues`: o módulo nativo ' +
        '`react-native-get-random-values` não está no binário. Reconstrua o app ' +
        'com `pnpm ios` (ou `pnpm android`) — recarregar o Metro não basta.',
    );
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Os dois carimbos que fazem disto um v4 de verdade (RFC 4122 §4.4): a versão
  // nos 4 bits altos do byte 6, e a variante nos 2 bits altos do byte 8. Sem
  // eles é só um número aleatório com hífens, e o Postgres é rigoroso ao
  // receber a string numa coluna `uuid`.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const h = Array.from(bytes, (b) => HEX[b]!);

  return (
    h.slice(0, 4).join('') +
    '-' +
    h.slice(4, 6).join('') +
    '-' +
    h.slice(6, 8).join('') +
    '-' +
    h.slice(8, 10).join('') +
    '-' +
    h.slice(10, 16).join('')
  );
}
