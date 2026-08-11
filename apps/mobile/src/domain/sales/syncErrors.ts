import type { SyncFailure } from './salesTypes';

/**
 * POR QUE ESTA VENDA NÃO SUBIU — em linguagem de domínio.
 *
 * Função pura sobre o erro que voltou do Supabase. Vive separada porque é a
 * peça que o vendedor mais vai ler: quando a fila trava, é este texto que diz
 * se ele precisa conferir o estoque, ligar para o suporte ou só tentar de novo.
 *
 * O DETALHE CRU NUNCA É DESCARTADO. Traduzimos o que reconhecemos e guardamos a
 * mensagem original do servidor junto — inclusive nos casos traduzidos. O
 * catálogo de erros do banco vai mudar sem nos avisar (a baixa de estoque é um
 * trigger que ninguém documentou), e um "algo deu errado" sem detalhe deixa
 * quem está com a venda travada sem nada para relatar.
 */

interface PostgresLikeError {
  message?: unknown;
  code?: unknown;
  details?: unknown;
}

function readError(error: unknown): { message: string | null; code: string | null } {
  if (typeof error === 'string') return { message: error, code: null };

  if (error && typeof error === 'object') {
    const e = error as PostgresLikeError;
    const message =
      typeof e.message === 'string' && e.message.trim() ? e.message.trim() : null;
    const code = typeof e.code === 'string' && e.code.trim() ? e.code.trim() : null;
    return { message, code };
  }

  return { message: null, code: null };
}

/**
 * A venda já está lá?
 *
 * `23505` é a violação de chave única do Postgres. Como a fila envia a venda com
 * o `sales.id` que ela mesma gerou, este erro tem UM significado só: esta venda
 * já entrou no sistema numa tentativa anterior cuja resposta se perdeu (rede
 * caindo no exato instante do INSERT, app fechado no meio). Não é falha — é a
 * proteção contra duplicata fazendo o trabalho dela.
 */
export function isDuplicate(error: unknown): boolean {
  const { code, message } = readError(error);
  if (code === '23505') return true;
  return message !== null && /duplicate key|already exists/i.test(message);
}

/**
 * Sem rede.
 *
 * Não vem com código do Postgres: o pedido nem chegou lá. Merece código próprio
 * porque é o único erro que NÃO pede ação nenhuma do usuário — é só tentar
 * outra hora, e dizer "erro ao registrar a venda" aqui assustaria à toa.
 */
function isNetwork(message: string | null, code: string | null): boolean {
  if (code !== null) return false;
  if (message === null) return false;
  return /network|fetch|timeout|connection|failed to fetch/i.test(message);
}

export function classifySyncError(error: unknown): SyncFailure {
  const { message, code } = readError(error);

  if (isNetwork(message, code)) return { code: 'offline', detail: message };

  // `P0001` é o `raise exception` de um trigger e `23514` uma CHECK — é por um
  // desses que a baixa de estoque recusa a venda. O texto entra na decisão
  // porque o mesmo P0001 serve a qualquer regra que o banco queira impor: sem
  // olhar a mensagem, uma trava futura de caixa fechado apareceria na tela como
  // "estoque insuficiente".
  if ((code === 'P0001' || code === '23514') && message) {
    if (/estoque|stock|quantity|quantidade/i.test(message)) {
      return { code: 'insufficient_stock', detail: message };
    }
    return { code: 'unknown', detail: message };
  }

  // `23503` é violação de chave estrangeira: o `product_id` da venda não existe
  // mais. Acontece de verdade — o produto foi apagado no portal enquanto o
  // aparelho estava offline vendendo.
  if (code === '23503') return { code: 'product_missing', detail: message };

  // `42501` é RLS/permissão. Para quem vende, isso não é "acesso negado": é uma
  // venda que o sistema não aceita e que ninguém no balcão consegue resolver.
  if (code === '42501') return { code: 'not_allowed', detail: message };

  return { code: 'unknown', detail: message };
}
