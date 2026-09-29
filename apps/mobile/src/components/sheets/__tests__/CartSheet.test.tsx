import { act, screen, userEvent } from '@testing-library/react-native';

import { renderSheet } from '@components/__tests__/renderUI';
import { CartSheet } from '@components/sheets/CartSheet';
import { ROUTES } from '@domain/navigation/routes';
import { SaleError } from '@domain/sales/salesTypes';
import { ptBR } from '@i18n/pt-BR';
import { useCartStore } from '@store/cartStore';
import { usePreferencesStore, type PaymentMethod } from '@store/preferencesStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * SUA VENDA — o sheet que fecha a venda.
 *
 * O carrinho em si é função pura e já tem teste (`domain/sales/__tests__`). O
 * que só se alcança daqui:
 *
 *  - a FORMA DE PAGAMENTO que viaja para o banco. Ela vem das Preferências, e o
 *    carrinho pode estar guardando uma que o negócio desligou depois. Gravar a
 *    forma errada não quebra nada na hora: ela some do relatório, e o caixa
 *    fecha com falta no fim do dia;
 *  - os DOIS desfechos do checkout (subiu / ficou na fila do aparelho), que são
 *    avisos diferentes e saem do RESULTADO, não de reler a conexão;
 *  - o carrinho NÃO ser esvaziado quando a venda falha;
 *  - o modo EDIÇÃO, que substitui uma venda existente e por isso termina em
 *    outro lugar.
 */

interface MutationCall<V> {
  vars: V;
  callbacks: {
    onSuccess: (result: { queued: boolean }) => void;
    onError: (error: unknown) => void;
  };
}

type CheckoutVars = { items: unknown[]; paymentMethod: string };
type EditVars = { saleId: string; items: unknown[]; paymentMethod: string };

const mockCheckoutCalls: MutationCall<CheckoutVars>[] = [];
const mockEditCalls: MutationCall<EditVars>[] = [];

jest.mock('@domain/sales', () => ({
  ...jest.requireActual('@domain/sales'),
  useCheckoutSale: () => ({
    mutate: (vars: CheckoutVars, callbacks: MutationCall<CheckoutVars>['callbacks']) => {
      mockCheckoutCalls.push({ vars, callbacks });
    },
    isPending: false,
  }),
  useEditSale: () => ({
    mutate: (vars: EditVars, callbacks: MutationCall<EditVars>['callbacks']) => {
      mockEditCalls.push({ vars, callbacks });
    },
    isPending: false,
  }),
}));

const mockGoToRoot = jest.fn();
jest.mock('@hooks/navigation', () => ({ goToRoot: (route: string) => mockGoToRoot(route) }));

let mockPath: string = ROUTES.sell;
jest.mock('expo-router', () => ({ usePathname: () => mockPath }));

const t = ptBR.cart;
const method = ptBR.paymentMethods;

/** Duas latas de R$ 12,50 e um saco de R$ 89,00 — R$ 114,00 no total. */
const ITEMS = [
  { productId: 'p1', name: 'Lata de leite', unitPriceCents: 1_250, quantity: 2 },
  { productId: 'p2', name: 'Ração Golden', unitPriceCents: 8_900, quantity: 1 },
];
const TOTAL = 11_400;

let closeSheet: jest.Mock;
let showToast: jest.Mock;

/** Só as formas passadas ficam aceitas — o resto é desligado. */
function accept(...aceitas: PaymentMethod[]) {
  usePreferencesStore.setState({
    acceptedMethods: {
      cash: aceitas.includes('cash'),
      pix: aceitas.includes('pix'),
      debit: aceitas.includes('debit'),
      credit: aceitas.includes('credit'),
    },
  });
}

beforeEach(() => {
  mockCheckoutCalls.length = 0;
  mockEditCalls.length = 0;
  mockGoToRoot.mockClear();
  mockPath = ROUTES.sell;

  useCartStore.setState({ items: ITEMS, paymentMethod: 'cash', editingSaleId: null });
  accept('cash', 'pix', 'debit', 'credit');

  // Só a CHROME é dublada: o carrinho e as preferências são as stores de
  // verdade, porque metade do que este sheet faz é mexer nelas.
  closeSheet = jest.fn();
  showToast = jest.fn();
  useUIStore.setState({ closeSheet, showToast, confirm: null });
});

function selectTrigger(label: string) {
  return screen.getByLabelText(`${t.paymentMethod}: ${label}`);
}

/**
 * Entrega um callback da mutação (ou do diálogo) como o app o entregaria: de
 * FORA do render, e por isso dentro de `act`.
 *
 * `onSuccess` esvazia o carrinho e `onConfirm` o descarta — as duas coisas são
 * escrita em store, e o React precisa reprocessar antes da expectativa. Sem o
 * `act` o teste até passa, mas passa sobre uma árvore que o React ainda não
 * atualizou, e o aviso no console é exatamente esse.
 */
async function deliver(action: () => void) {
  await act(async () => {
    action();
  });
}

describe('os itens', () => {
  it('desenha linha, subtotal e total', async () => {
    await renderSheet(<CartSheet />);

    expect(screen.getByText('Lata de leite')).toBeOnTheScreen();
    // Subtotal da linha (2 × 12,50) e total do carrinho.
    expect(screen.getByText(formatBRL(2_500))).toBeOnTheScreen();
    expect(screen.getByText(formatBRL(TOTAL))).toBeOnTheScreen();
  });

  it('o + soma no carrinho e o total acompanha', async () => {
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByLabelText(t.increase('Lata de leite')));

    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
    expect(screen.getByText(formatBRL(TOTAL + 1_250))).toBeOnTheScreen();
  });

  it('o − tira do carrinho', async () => {
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByLabelText(t.decrease('Lata de leite')));

    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
    expect(screen.getByText(formatBRL(TOTAL - 1_250))).toBeOnTheScreen();
  });

  it('carrinho vazio não finaliza nada', async () => {
    useCartStore.setState({ items: [] });
    await renderSheet(<CartSheet />);

    expect(screen.getByText(t.finish(formatBRL(0)))).toBeDisabled();
  });
});

describe('a forma de pagamento', () => {
  it('só oferece o que as Preferências aceitam', async () => {
    accept('cash', 'pix');
    await renderSheet(<CartSheet />);

    await userEvent.press(selectTrigger(method.cash));

    expect(screen.getByLabelText(method.pix)).toBeOnTheScreen();
    expect(screen.queryByLabelText(method.debit)).toBeNull();
    expect(screen.queryByLabelText(method.credit)).toBeNull();
  });

  it('a forma guardada que foi DESLIGADA cai na primeira aceita', async () => {
    // O carrinho ficou com `credit` de uma venda anterior e o negócio deixou de
    // aceitar cartão de crédito desde então.
    useCartStore.setState({ paymentMethod: 'credit' });
    accept('pix', 'debit');
    await renderSheet(<CartSheet />);

    expect(selectTrigger(method.pix)).toBeOnTheScreen();
  });

  it('e é ESSA forma que vai para o banco — não a que ninguém aceita mais', async () => {
    useCartStore.setState({ paymentMethod: 'credit' });
    accept('pix', 'debit');
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    expect(mockCheckoutCalls[0]?.vars.paymentMethod).toBe('pix');
  });

  it('escolher no seletor troca a forma enviada', async () => {
    await renderSheet(<CartSheet />);

    await userEvent.press(selectTrigger(method.cash));
    await userEvent.press(screen.getByLabelText(method.debit));
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    expect(mockCheckoutCalls[0]?.vars.paymentMethod).toBe('debit');
  });

  it('nenhuma forma aceita: o botão não deixa registrar venda sem forma', async () => {
    accept();
    await renderSheet(<CartSheet />);

    expect(screen.getByText(t.finish(formatBRL(TOTAL)))).toBeDisabled();
  });
});

describe('finalizar', () => {
  it('manda os itens do carrinho, sem pedir confirmação', async () => {
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    expect(useUIStore.getState().confirm).toBeNull();
    expect(mockCheckoutCalls).toHaveLength(1);
    expect(mockCheckoutCalls[0]?.vars.items).toEqual(ITEMS);
  });

  it('venda que SUBIU: visto, carrinho limpo, sheet fechado', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    await deliver(() => mockCheckoutCalls[0]?.callbacks.onSuccess({ queued: false }));

    expect(useCartStore.getState().items).toEqual([]);
    expect(closeSheet).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(ptBR.toasts.saleRecorded(formatBRL(TOTAL)), {
      tone: 'sucesso',
    });
  });

  it('venda que ficou NO APARELHO: recado neutro, não visto de concluído', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    await deliver(() => mockCheckoutCalls[0]?.callbacks.onSuccess({ queued: true }));

    expect(showToast).toHaveBeenCalledWith(ptBR.toasts.saleSavedOffline(formatBRL(TOTAL)), {
      tone: 'neutral',
    });
  });

  it('fora de Vender, volta para Vender — é onde a próxima venda começa', async () => {
    mockPath = ROUTES.stock;
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    await deliver(() => mockCheckoutCalls[0]?.callbacks.onSuccess({ queued: false }));

    expect(mockGoToRoot).toHaveBeenCalledWith(ROUTES.sell);
  });

  it('já em Vender, não navega — zerar a pilha ali seria um passo inventado', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    await deliver(() => mockCheckoutCalls[0]?.callbacks.onSuccess({ queued: false }));

    expect(mockGoToRoot).not.toHaveBeenCalled();
  });

  it('venda RECUSADA: o carrinho FICA de pé, com o motivo na tela', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    await deliver(() => mockCheckoutCalls[0]?.callbacks.onError(new SaleError('empty_cart')));

    // Perder o carrinho montado por causa de uma falha de rede é o pior
    // desfecho possível: quem digitou tudo teria de digitar de novo.
    expect(useCartStore.getState().items).toEqual(ITEMS);
    expect(closeSheet).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(ptBR.errors.sale.empty_cart, { tone: 'erro' });
  });

  it('erro sem código conhecido cai no texto genérico', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.finish(formatBRL(TOTAL))));

    await deliver(() => mockCheckoutCalls[0]?.callbacks.onError(new Error('socket hung up')));

    expect(showToast).toHaveBeenCalledWith(ptBR.errors.sale.unknown, { tone: 'erro' });
  });
});

describe('editando uma venda', () => {
  beforeEach(() => {
    useCartStore.setState({ editingSaleId: 'sale_9' });
  });

  it('avisa que salvar estorna a original', async () => {
    await renderSheet(<CartSheet />);

    expect(screen.getByText(t.editHint)).toBeOnTheScreen();
    expect(screen.getByText(t.saveEdit(formatBRL(TOTAL)))).toBeOnTheScreen();
    expect(screen.queryByText(t.finish(formatBRL(TOTAL)))).toBeNull();
  });

  it('salva SUBSTITUINDO a venda de onde os itens vieram', async () => {
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByText(t.saveEdit(formatBRL(TOTAL))));

    expect(mockCheckoutCalls).toHaveLength(0);
    expect(mockEditCalls[0]?.vars).toEqual({
      saleId: 'sale_9',
      items: ITEMS,
      paymentMethod: 'cash',
    });
  });

  it('salvo: volta para o HISTÓRICO, não para Vender', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.saveEdit(formatBRL(TOTAL))));

    await deliver(() => mockEditCalls[0]?.callbacks.onSuccess({ queued: false }));

    // Quem editava veio do histórico e quer ver o resultado.
    expect(mockGoToRoot).toHaveBeenCalledWith(ROUTES.sales);
    expect(mockGoToRoot).not.toHaveBeenCalledWith(ROUTES.sell);
    expect(useCartStore.getState().editingSaleId).toBeNull();
    expect(showToast).toHaveBeenCalledWith(ptBR.toasts.saleUpdated(formatBRL(TOTAL)), {
      tone: 'sucesso',
    });
  });
});

describe('cancelar', () => {
  it('PERGUNTA antes de descartar o carrinho', async () => {
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByText(t.cancel));

    const confirm = useUIStore.getState().confirm;
    expect(confirm?.title).toBe(ptBR.confirms.cancelSale.title);
    expect(confirm?.destructive).toBe(true);
    // Nada foi descartado ainda.
    expect(useCartStore.getState().items).toEqual(ITEMS);
  });

  it('confirmado, descarta e fecha — sem toast, porque nada foi registrado', async () => {
    await renderSheet(<CartSheet />);
    await userEvent.press(screen.getByText(t.cancel));

    await deliver(() => useUIStore.getState().confirm?.onConfirm());

    expect(useCartStore.getState().items).toEqual([]);
    expect(closeSheet).toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('sair da EDIÇÃO é outra pergunta: a venda original não foi tocada', async () => {
    useCartStore.setState({ editingSaleId: 'sale_9' });
    await renderSheet(<CartSheet />);

    await userEvent.press(screen.getByText(t.cancelEdit));

    expect(useUIStore.getState().confirm?.title).toBe(ptBR.confirms.cancelEdit.title);
  });
});
