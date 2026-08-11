import * as SQLite from 'expo-sqlite';

/**
 * O BANCO LOCAL do aparelho.
 *
 * ⚠️ ÚNICO ARQUIVO DO APP QUE ABRE O SQLITE. Quem precisa de dados locais fala
 * com uma `*Api` de domínio (hoje só `offlineQueueApi`), nunca com este módulo
 * direto.
 *
 * POR QUE SQLITE E NÃO ASYNCSTORAGE. A fila de vendas offline tem um requisito
 * que o AsyncStorage não atende: uma venda registrada não pode se perder.
 * Guardar a fila como um JSON no AsyncStorage significa, para CADA venda, ler o
 * array inteiro, dar push e regravar tudo. Isso tem dois modos de falha reais
 * no balcão:
 *
 *  1. duas escritas ao mesmo tempo (fechar uma venda enquanto a sincronização
 *     marca outra) — a última a gravar sobrescreve a outra, e a venda somiu;
 *  2. o app morre no meio da regravação — o blob fica truncado e se perde a
 *     FILA INTEIRA, não uma venda.
 *
 * No SQLite cada venda é uma linha, cada gravação é uma transação, e marcar uma
 * venda com erro é um UPDATE numa linha em vez da regravação de tudo.
 *
 * `openDatabaseSync` na carga do módulo é deliberado: a fila precisa estar
 * pronta antes da primeira venda, e abrir um banco local é operação de
 * microssegundos, não de rede.
 */

export const DATABASE_NAME = 'aguiarone.db';

/**
 * O schema, aplicado a cada abertura.
 *
 * Tudo é `IF NOT EXISTS`: rodar isto na abertura do app é barato e mantém o
 * aparelho que atualizou de versão no mesmo formato de quem instalou agora.
 * Quando uma coluna precisar mudar, é aqui que entra o versionamento por
 * `PRAGMA user_version` — não existe ainda porque não há segunda versão.
 *
 * `journal_mode = WAL` é o que permite ler a fila (a tela de pendentes) sem
 * bloquear a gravação de uma venda nova que chegue no mesmo instante.
 *
 * `foreign_keys = ON` não é decorativo: é o que faz apagar uma venda da fila
 * levar junto os itens dela (`ON DELETE CASCADE`). Sem esse pragma — e o SQLite
 * o deixa DESLIGADO por padrão — a remoção da Etapa 6 deixaria itens órfãos
 * acumulando no aparelho para sempre.
 */
const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS offline_sales (
    local_id       TEXT PRIMARY KEY NOT NULL,
    tenant_id      TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    total_cents    INTEGER NOT NULL,
    sold_at        TEXT NOT NULL,
    status         TEXT NOT NULL,
    error_message  TEXT
  );

  CREATE TABLE IF NOT EXISTS offline_sale_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    local_id         TEXT NOT NULL,
    product_id       TEXT,
    product_name     TEXT NOT NULL,
    qty              INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    FOREIGN KEY (local_id) REFERENCES offline_sales (local_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_offline_sale_items_local_id
    ON offline_sale_items (local_id);

  CREATE INDEX IF NOT EXISTS idx_offline_sales_tenant
    ON offline_sales (tenant_id, sold_at);
`;

let db: SQLite.SQLiteDatabase | null = null;

/**
 * O banco, já com o schema aplicado.
 *
 * Memoizado: a segunda chamada devolve a mesma conexão. Abrir o mesmo arquivo
 * duas vezes daria dois handles concorrendo pelo mesmo WAL.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db) return db;

  db = SQLite.openDatabaseSync(DATABASE_NAME);
  db.execSync(SCHEMA);
  return db;
}

/**
 * Fecha e esquece a conexão. Existe para os testes e para o logout — não é
 * chamado no fluxo normal do app, que mantém o banco aberto enquanto vive.
 */
export function closeDatabase(): void {
  if (!db) return;
  db.closeSync();
  db = null;
}
