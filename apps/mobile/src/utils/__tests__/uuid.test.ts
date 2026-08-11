import { uuidV4 } from '@utils/uuid';

/**
 * O formato importa de verdade aqui: este id é enviado como o `sales.id` de uma
 * coluna `uuid` do Postgres, que recusa a string ao menor desvio. Um id
 * malformado só apareceria na sincronização — depois da venda já estar feita.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV4', () => {
  it('gera no formato que o Postgres aceita, com versão e variante', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(uuidV4()).toMatch(UUID_V4);
    }
  });

  it('não repete', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidV4()));
    expect(ids.size).toBe(1000);
  });
});
