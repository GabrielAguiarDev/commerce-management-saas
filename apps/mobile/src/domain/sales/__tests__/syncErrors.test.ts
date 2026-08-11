import { classifySyncError, isDuplicate } from '../syncErrors';

/**
 * Estes testes valem por um motivo específico: o catálogo de erros do banco NÃO
 * está documentado (a baixa de estoque é um trigger que ninguém escreveu em
 * lugar nenhum), então a classificação aqui é a nossa leitura dele. Quando o
 * banco mudar, é este arquivo que precisa mudar junto — e é ele que diz o que
 * estávamos supondo.
 */

describe('isDuplicate', () => {
  it('reconhece a violação de chave única pelo código', () => {
    expect(isDuplicate({ code: '23505', message: 'duplicate key value' })).toBe(true);
  });

  it('reconhece pela mensagem quando o código não vem', () => {
    expect(isDuplicate({ message: 'duplicate key value violates unique constraint' })).toBe(
      true,
    );
    expect(isDuplicate({ message: 'Sale already exists' })).toBe(true);
  });

  it('não confunde outros erros com duplicata', () => {
    expect(isDuplicate({ code: '23503', message: 'foreign key violation' })).toBe(false);
    expect(isDuplicate(new Error('Network request failed'))).toBe(false);
    expect(isDuplicate(null)).toBe(false);
  });
});

describe('classifySyncError', () => {
  it('trata falha de rede como `offline`, sem código do Postgres', () => {
    expect(classifySyncError(new Error('Network request failed')).code).toBe('offline');
    expect(classifySyncError(new Error('TypeError: Failed to fetch')).code).toBe('offline');
  });

  it('não chama de rede um erro do banco que fale de conexão', () => {
    // Tem código do Postgres: a requisição CHEGOU. O texto ali é sobre outra
    // coisa, e marcar como `offline` mandaria o usuário "tentar de novo" para
    // sempre.
    const failure = classifySyncError({
      code: 'P0001',
      message: 'connection pool exhausted',
    });
    expect(failure.code).toBe('unknown');
  });

  it('reconhece estoque insuficiente pelo trigger', () => {
    const failure = classifySyncError({
      code: 'P0001',
      message: 'Estoque insuficiente para o produto Ração Premium',
    });

    expect(failure.code).toBe('insufficient_stock');
    // O texto do servidor é preservado: é ele que nomeia o produto.
    expect(failure.detail).toContain('Ração Premium');
  });

  it('reconhece estoque em inglês também', () => {
    expect(
      classifySyncError({ code: '23514', message: 'stock_quantity must be >= 0' }).code,
    ).toBe('insufficient_stock');
  });

  it('não chuta estoque para qualquer exceção de trigger', () => {
    const failure = classifySyncError({
      code: 'P0001',
      message: 'O caixa precisa estar aberto para registrar uma venda',
    });

    // Uma trava futura que nada tem a ver com estoque não pode aparecer na tela
    // como "estoque insuficiente" — o vendedor iria conferir a prateleira à toa.
    expect(failure.code).toBe('unknown');
    expect(failure.detail).toContain('caixa');
  });

  it('mapeia FK quebrada para produto inexistente', () => {
    expect(
      classifySyncError({ code: '23503', message: 'violates foreign key constraint' }).code,
    ).toBe('product_missing');
  });

  it('mapeia RLS para não permitido', () => {
    expect(
      classifySyncError({ code: '42501', message: 'new row violates row-level security' })
        .code,
    ).toBe('not_allowed');
  });

  it('sobrevive a um erro sem forma nenhuma', () => {
    expect(classifySyncError(undefined)).toEqual({ code: 'unknown', detail: null });
    expect(classifySyncError('deu ruim')).toEqual({ code: 'unknown', detail: 'deu ruim' });
  });
});
