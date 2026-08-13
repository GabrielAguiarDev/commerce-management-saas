/** CONTRATO DO BACKEND das vendas. */

export interface SaleItemAPI {
  product_id: string;
  product_name: string;
  qty: number;
  unit_price_cents: number;
}

export interface SaleAPI {
  id: string;
  tenant_id: string;
  /** ISO 8601 em UTC — o adapter é quem transforma em "10:52". */
  created_at: string;
  total_cents: number;
  payment_method: string;
  items: SaleItemAPI[];
  /**
   * `sales.status` cru — `completed` ou `refunded`.
   *
   * Chega até aqui porque o HISTÓRICO mostra a venda estornada riscada, em vez
   * de escondê-la: a linha continua no lugar, fora do faturamento. O resumo do
   * Início e as "últimas vendas" seguem filtrando `completed` na consulta, e é
   * por isso que este campo nasce depois — a primeira leitura de vendas do app
   * nunca via uma venda que não fosse completa.
   */
  status: string | null;
  /** `false` = registrada offline, ainda não confirmada pelo servidor. */
  is_synced: boolean | null;
}

/** O agregado de um recorte do histórico. Ver `fetchSalesTotals`. */
export interface SalesTotalsAPI {
  sale_count: number;
  total_cents: number;
  refunded_count: number;
}

export interface DailySummaryAPI {
  date: string;
  gross_cents: number | null;
  profit_cents: number | null;
  sale_count: number | null;
  item_count: number | null;
  top_product_name: string | null;
  top_product_qty: number | null;
}

export interface SaleCreateAPI {
  tenant_id: string;
  payment_method: string;
  total_cents: number;
  items: SaleItemAPI[];
  /**
   * O id da venda, gerado NO APARELHO. Só a fila offline preenche.
   *
   * Quando vem preenchido, ele é enviado como o `sales.id` do INSERT, e é o que
   * torna a subida REPETÍVEL SEM DUPLICAR: um segundo envio da mesma venda bate
   * na chave primária e o Postgres recusa, em vez de criar uma venda gêmea.
   *
   * A venda ONLINE deixa vazio de propósito, e vale registrar por quê: o
   * caminho online funciona hoje e não depende disto. Se o `sales.id` do banco
   * não aceitasse um uuid vindo de fora, preencher aqui quebraria também a
   * venda comum — o app inteiro pararia de vender para proteger a fila. Uma
   * venda offline que não sobe fica na fila com o motivo à vista e ninguém
   * perde nada; uma venda online que não sobe é o balcão parado.
   */
  id?: string;
  /**
   * Quando a venda ACONTECEU. Só a fila offline preenche — a venda online é
   * carimbada no servidor, no instante do INSERT.
   *
   * É o que faz uma venda das 14h sincronizada às 19h entrar no sistema como
   * 14h. Sem isto, um dia inteiro de vendas offline desabaria todo no minuto da
   * sincronização, e o relatório por hora viraria ficção.
   */
  sold_at?: string;
}

/**
 * Uma venda a caminho da FILA: os dois campos acima deixam de ser opcionais.
 *
 * Existe para que a fila não precise checar em runtime o que o tipo já pode
 * garantir — uma venda offline sem id não teria como ser identificada depois.
 */
export interface QueuedSaleCreate extends SaleCreateAPI {
  id: string;
  sold_at: string;
}
