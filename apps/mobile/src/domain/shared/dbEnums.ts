/**
 * O VOCABULÁRIO DAS COLUNAS DE ESTADO do banco, em um lugar só.
 *
 * POR QUE ISTO EXISTE, e por que é `shared/` e não de um domínio: as mesmas
 * chaves aparecem em mais de um lugar — `payment_method` é lida pelas vendas e
 * pelo fechamento de caixa; `stock_movements.type` é escrita pelo estoque e
 * lida pelo histórico. Duas grafias da mesma coisa não dão erro: dão um filtro
 * que nunca casa e uma tela que diz "nenhuma venda hoje" num dia cheio.
 *
 * ⚠️ ESTAS CHAVES PRECISAM CONTINUAR IGUAIS ÀS DO PORTAL WEB
 * (`apps/portal-client/lib/dados/*.ts`). Os dois escrevem nas MESMAS colunas.
 * Se o app gravar `'dinheiro'` onde o portal grava `'cash'`, a venda não some —
 * ela aparece com a forma de pagamento errada no relatório do outro, que é bem
 * pior de descobrir.
 *
 * O banco AINDA NÃO TEM CHECK nessas colunas (verificado no levantamento do
 * portal: um `'__x__'` foi aceito em `sales.payment_method`, `sales.status`,
 * `costs.type`, `costs.origin` e `cash_registers.status`). Enquanto não tiver,
 * este arquivo é a única coisa segurando o vocabulário — daí o cuidado.
 */

/* -------------------------------------------------------------------------- */
/* Vendas                                                                      */
/* -------------------------------------------------------------------------- */

/** `sales.payment_method`. */
export const PAYMENT_METHODS = ['cash', 'pix', 'debit', 'credit'] as const;
export type DbPaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Forma desconhecida cai em "dinheiro".
 *
 * Não vale perder a venda de vista por causa de um rótulo que ninguém
 * reconhece: o valor está certo, só o ícone fica genérico.
 */
export function paymentFromDb(value: string | null): DbPaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value ?? '')
    ? (value as DbPaymentMethod)
    : 'cash';
}

/** `sales.status`. Venda estornada continua no histórico, fora do faturamento. */
export const SALE_STATUS = { completed: 'completed', refunded: 'refunded' } as const;

/* -------------------------------------------------------------------------- */
/* Estoque                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `stock_movements.type`.
 *
 * ⚠️ LEIA ANTES DE CHAMAR `apply_stock_movement`: a função do banco IGNORA o
 * `p_type` e simplesmente SOMA o `p_quantity` que recebe — verificado na
 * prática (saldo 10, tipo `out`, quantidade 3 → saldo 13). Quem carrega o
 * significado é o SINAL da quantidade, e quem decide o sinal é o chamador.
 * O tipo serve só para o histórico ler depois.
 *
 * Registrado em `docs/api/portal-client-pendencias.md` §3.2.6 como armadilha
 * "sobretudo para o app mobile".
 */
export const STOCK_MOVEMENT_TYPES = ['in', 'out', 'adjustment', 'sale'] as const;
export type DbStockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export function stockMovementFromDb(value: string | null): DbStockMovementType {
  return (STOCK_MOVEMENT_TYPES as readonly string[]).includes(value ?? '')
    ? (value as DbStockMovementType)
    : 'adjustment';
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

/** `cash_registers.status`. */
export const REGISTER_STATUS = { open: 'open', closed: 'closed' } as const;

/** `cash_movements.type`. Reforço entra na gaveta, sangria sai dela. */
export const REGISTER_MOVEMENT_TYPES = ['withdrawal', 'deposit'] as const;
export type DbRegisterMovementType = (typeof REGISTER_MOVEMENT_TYPES)[number];

export function registerMovementFromDb(value: string | null): DbRegisterMovementType {
  return value === 'deposit' ? 'deposit' : 'withdrawal';
}

/* -------------------------------------------------------------------------- */
/* Custos                                                                      */
/* -------------------------------------------------------------------------- */

/** `costs.type`. */
export const COST_TYPES = { fixed: 'fixed', variable: 'variable' } as const;

export function costTypeFromDb(value: string | null): 'fixed' | 'variable' {
  return value === 'fixed' ? 'fixed' : 'variable';
}

/**
 * `costs.origin` — de onde o lançamento veio.
 *
 * `stock` marca a despesa que a reposição de estoque gerou sozinha. A tela de
 * Custos usa isso para explicar por que aquele custo apareceu sem ninguém
 * digitar.
 */
export const COST_ORIGIN = { manual: 'manual', stock: 'stock' } as const;

/* -------------------------------------------------------------------------- */
/* Suporte                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `support_messages.sender_side`.
 *
 * ⚠️ O lado do cliente grava `'client'`, NÃO `'customer'`. É o que o portal
 * escreve (`AUTHOR_DB` em `lib/dados/chamados.ts`) e o que o painel admin lê.
 * Gravar `'customer'` daqui não daria erro nenhum — a mensagem apareceria no
 * painel do suporte como se fosse do próprio suporte, porque o `authorFromDb`
 * do outro lado só reconhece `'support'`, `'admin'` e `'system'`, e trata o
 * resto como cliente... mas a nossa leitura de "não lida" quebraria em
 * silêncio. Vocabulário divergente entre app e portal é exatamente o tipo de
 * bug que só aparece semanas depois, numa conversa confusa.
 */
export const SENDER_SIDE = { client: 'client', support: 'support' } as const;

/**
 * `support_tickets.status` — as chaves que o portal e o admin usam.
 *
 * `waiting_client` é "o suporte respondeu e a bola está com você". No modelo do
 * app isso é o status `answered`; a tradução acontece no `supportApi`.
 */
export const TICKET_STATUS = {
  open: 'open',
  inProgress: 'in_progress',
  waitingClient: 'waiting_client',
  resolved: 'resolved',
} as const;
