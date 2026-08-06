import {
  adicionar,
  decrementar,
  incrementar,
  quantidadeTotal,
  remover,
  resumirItens,
  rotuloDoCarrinho,
  subtotalCentavos,
  totalCentavos,
} from '../carrinho';
import type { ItemCarrinho } from '../salesTypes';

const ACARAJE = { id: 'p1', nome: 'Acarajé completo', precoCentavos: 1200 };
const AGUA = { id: 'p2', nome: 'Água mineral', precoCentavos: 300 };

describe('adicionar', () => {
  it('insere o primeiro item com quantidade 1', () => {
    const itens = adicionar([], ACARAJE);
    expect(itens).toEqual<ItemCarrinho[]>([
      { produtoId: 'p1', nome: 'Acarajé completo', precoUnitarioCentavos: 1200, quantidade: 1 },
    ]);
  });

  it('incrementa em vez de duplicar quando o produto já está no carrinho', () => {
    const itens = adicionar(adicionar([], ACARAJE), ACARAJE);
    expect(itens).toHaveLength(1);
    expect(itens[0]?.quantidade).toBe(2);
  });

  it('não muta a lista recebida', () => {
    const original: ItemCarrinho[] = [];
    adicionar(original, ACARAJE);
    expect(original).toHaveLength(0);
  });

  it('preserva a ordem de entrada dos produtos', () => {
    const itens = adicionar(adicionar(adicionar([], ACARAJE), AGUA), ACARAJE);
    expect(itens.map((i) => i.produtoId)).toEqual(['p1', 'p2']);
  });
});

describe('decrementar', () => {
  it('remove o item ao chegar em zero — carrinho não guarda quantidade 0', () => {
    const itens = decrementar(adicionar([], ACARAJE), 'p1');
    expect(itens).toHaveLength(0);
  });

  it('só mexe no produto pedido', () => {
    const cheio = adicionar(adicionar(adicionar([], ACARAJE), ACARAJE), AGUA);
    const itens = decrementar(cheio, 'p1');
    expect(itens.find((i) => i.produtoId === 'p1')?.quantidade).toBe(1);
    expect(itens.find((i) => i.produtoId === 'p2')?.quantidade).toBe(1);
  });

  it('é inofensivo para id inexistente', () => {
    const cheio = adicionar([], ACARAJE);
    expect(decrementar(cheio, 'nao-existe')).toEqual(cheio);
  });
});

describe('incrementar e remover', () => {
  it('incrementa o item certo', () => {
    const itens = incrementar(adicionar(adicionar([], ACARAJE), AGUA), 'p2');
    expect(itens.find((i) => i.produtoId === 'p2')?.quantidade).toBe(2);
  });

  it('remove independentemente da quantidade', () => {
    const cheio = incrementar(incrementar(adicionar([], ACARAJE), 'p1'), 'p1');
    expect(remover(cheio, 'p1')).toHaveLength(0);
  });
});

describe('totais', () => {
  const carrinho = incrementar(adicionar(adicionar([], ACARAJE), AGUA), 'p1');

  it('soma preço × quantidade em centavos, sem erro de float', () => {
    // 2 × 12,00 + 1 × 3,00 = 27,00
    expect(totalCentavos(carrinho)).toBe(2700);
  });

  it('conta itens, não linhas', () => {
    expect(quantidadeTotal(carrinho)).toBe(3);
    expect(carrinho).toHaveLength(2);
  });

  it('não acumula erro de ponto flutuante em preços quebrados', () => {
    const centavos = [
      { id: 'a', nome: 'a', precoCentavos: 10 },
      { id: 'b', nome: 'b', precoCentavos: 20 },
    ].reduce<ItemCarrinho[]>((acc, p) => adicionar(acc, p), []);
    // 0,10 + 0,20 em float daria 0,30000000000000004.
    expect(totalCentavos(centavos)).toBe(30);
  });

  it('calcula o subtotal da linha', () => {
    expect(subtotalCentavos(carrinho[0] as ItemCarrinho)).toBe(2400);
  });

  it('carrinho vazio soma zero', () => {
    expect(totalCentavos([])).toBe(0);
    expect(quantidadeTotal([])).toBe(0);
  });
});

describe('rótulos', () => {
  it('concorda em número, como no protótipo', () => {
    expect(rotuloDoCarrinho(adicionar([], ACARAJE))).toBe('1 item no carrinho');
    expect(rotuloDoCarrinho(adicionar(adicionar([], ACARAJE), ACARAJE))).toBe(
      '2 itens no carrinho',
    );
  });

  it('resume os itens no formato "2× Nome · 1× Nome"', () => {
    const carrinho = incrementar(adicionar(adicionar([], ACARAJE), AGUA), 'p1');
    expect(resumirItens(carrinho)).toBe('2× Acarajé completo · 1× Água mineral');
  });
});
