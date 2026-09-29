import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { renderSheet } from '@components/__tests__/renderUI';
import { CloseOutSheet } from '@components/sheets/CloseOutSheet';
import { CashError } from '@domain/cash/cashTypes';
import type { OpenShift } from '@domain/cash/cashTypes';
import { ptBR } from '@i18n/pt-BR';
import { useUIStore } from '@store/uiStore';
import { formatBRL, formatSignedBRL } from '@utils/money';

/**
 * FECHAR O CAIXA — o sheet que carimba dinheiro.
 *
 * Por que este é o teste de componente mais importante do app: o que sai daqui
 * vai para `close_cash_register`, e o banco calcula a diferença a partir do
 * CONTADO EM DINHEIRO que este sheet enviar. Um número errado neste caminho não
 * quebra a tela — ele grava um furo de caixa que alguém vai ter de explicar.
 *
 * `computeDifference`, `countRows` e `countedCashCents` são puros e já têm teste
 * em `domain/cash/__tests__`. Aqui eles NÃO são dublados: o que se verifica é a
 * ligação entre o que se digita, o que a tela mostra e o que o botão envia — que
 * é exatamente o que nenhum teste de função pura alcança.
 */

/** O que o `mutate` recebeu, para o teste conduzir sucesso e erro. */
interface CloseCall {
  vars: { shiftId: string; contadoEmDinheiroCentavos: number };
  callbacks: { onSuccess: () => void; onError: (e: unknown) => void };
}

const mockCloseCalls: CloseCall[] = [];
const mockShift: { current: OpenShift | undefined } = { current: undefined };

jest.mock('@domain/cash', () => ({
  // Os adapters puros continuam sendo os DE VERDADE: dublá-los transformaria
  // "a diferença que a tela mostra" numa tautologia.
  ...jest.requireActual('@domain/cash'),
  useOpenShift: () => ({ data: mockShift.current }),
  useFecharCaixa: () => ({
    mutate: (vars: CloseCall['vars'], callbacks: CloseCall['callbacks']) => {
      mockCloseCalls.push({ vars, callbacks });
    },
    isPending: false,
  }),
}));

const t = ptBR.closeOut;
const label = {
  cash: t.countedIn(ptBR.paymentMethods.cash),
  pix: t.countedIn(ptBR.paymentMethods.pix),
  card: t.countedIn(ptBR.cash.card),
};

/** Um turno aberto: R$ 300,00 na gaveta, R$ 120,00 em Pix, R$ 50,00 em cartão. */
function openShift(overrides: Partial<OpenShift> = {}): OpenShift {
  return {
    id: 'shift_1',
    openedAt: '08:12',
    aberturaCentavos: 10_000,
    gavetaCentavos: 30_000,
    cashSalesCents: 20_000,
    receipts: [
      { method: 'cash', label: ptBR.paymentMethods.cash, amountCents: 20_000 },
      { method: 'pix', label: ptBR.paymentMethods.pix, amountCents: 12_000 },
      { method: 'debit', label: ptBR.paymentMethods.debit, amountCents: 5_000 },
    ],
    ...overrides,
  };
}

let closeSheet: jest.Mock;
let showToast: jest.Mock;

beforeEach(() => {
  mockCloseCalls.length = 0;
  mockShift.current = openShift();

  // A CHROME é dublada na store, e só ela: é a fronteira do sheet com o resto
  // do app ("fecha isto", "avisa aquilo"), e é o que o teste quer ler. O
  // `showToast` de verdade empurraria para o sistema de toast, que precisa de um
  // viewport montado — e o assunto aqui não é onde o aviso aparece, é qual é.
  closeSheet = jest.fn();
  showToast = jest.fn();
  useUIStore.setState({ closeSheet, showToast, confirm: null });
});

/** O diálogo que o sheet pediu — `requestConfirm` é o de verdade. */
function pendingConfirm() {
  const confirm = useUIStore.getState().confirm;
  if (!confirm) throw new Error('nenhuma confirmação foi pedida');
  return confirm;
}

describe('as linhas de conferência', () => {
  it('mostra o esperado de cada forma que o turno teve', async () => {
    await renderSheet(<CloseOutSheet />);

    // Dinheiro é o que está na GAVETA (abertura + vendas em espécie), não o
    // total vendido em dinheiro.
    expect(screen.getByText(t.system(formatBRL(30_000)))).toBeOnTheScreen();
    expect(screen.getByText(t.system(formatBRL(12_000)))).toBeOnTheScreen();
    expect(screen.getByText(t.system(formatBRL(5_000)))).toBeOnTheScreen();
    expect(screen.getByLabelText(label.cash)).toBeOnTheScreen();
    expect(screen.getByLabelText(label.pix)).toBeOnTheScreen();
    expect(screen.getByLabelText(label.card)).toBeOnTheScreen();
  });

  it('turno só com dinheiro não desenha linha de Pix nem de cartão', async () => {
    mockShift.current = openShift({
      receipts: [{ method: 'cash', label: ptBR.paymentMethods.cash, amountCents: 20_000 }],
    });
    await renderSheet(<CloseOutSheet />);

    expect(screen.getByLabelText(label.cash)).toBeOnTheScreen();
    expect(screen.queryByLabelText(label.pix)).toBeNull();
    expect(screen.queryByLabelText(label.card)).toBeNull();
  });
});

describe('a diferença, a cada tecla', () => {
  it('começa neutra: nada digitado não é "faltam R$ 470,00"', async () => {
    await renderSheet(<CloseOutSheet />);

    expect(screen.getByText(formatBRL(0))).toBeOnTheScreen();
  });

  it('só a linha PREENCHIDA entra na conta', async () => {
    await renderSheet(<CloseOutSheet />);

    // Conferiu o Pix e nada mais: a diferença é a do Pix, e não a falta do
    // dinheiro e do cartão que ninguém contou ainda.
    await fireEvent.changeText(screen.getByLabelText(label.pix), '110,00');

    expect(screen.getByText(formatSignedBRL(-1_000))).toBeOnTheScreen();
  });

  it('soma as linhas conferidas, com sinal', async () => {
    await renderSheet(<CloseOutSheet />);

    await fireEvent.changeText(screen.getByLabelText(label.cash), '310,00');
    await fireEvent.changeText(screen.getByLabelText(label.pix), '110,00');

    // +10,00 na gaveta, −10,00 no Pix.
    expect(screen.getByText(formatSignedBRL(0))).toBeOnTheScreen();
  });

  it('apagar a linha a tira da conta de novo', async () => {
    await renderSheet(<CloseOutSheet />);

    await fireEvent.changeText(screen.getByLabelText(label.cash), '310,00');
    expect(screen.getByText(formatSignedBRL(1_000))).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText(label.cash), '');
    expect(screen.getByText(formatBRL(0))).toBeOnTheScreen();
  });
});

describe('o envio', () => {
  it('PERGUNTA antes: nada é enviado no primeiro toque', async () => {
    await renderSheet(<CloseOutSheet />);
    await fireEvent.changeText(screen.getByLabelText(label.cash), '310,00');

    await userEvent.press(screen.getByText(t.submit));

    expect(mockCloseCalls).toHaveLength(0);
    expect(pendingConfirm().title).toBe(ptBR.confirms.closeCash.title);
  });

  it('confirmado, manda o CONTADO EM DINHEIRO em centavos — e só ele', async () => {
    await renderSheet(<CloseOutSheet />);
    await fireEvent.changeText(screen.getByLabelText(label.cash), '310,00');
    await fireEvent.changeText(screen.getByLabelText(label.pix), '110,00');

    await userEvent.press(screen.getByText(t.submit));
    pendingConfirm().onConfirm();

    // Pix e cartão NÃO viajam: eles caem na conta, não na gaveta. E a diferença
    // que a tela mostrava também não — quem a calcula é o banco.
    expect(mockCloseCalls).toHaveLength(1);
    expect(mockCloseCalls[0]?.vars).toEqual({
      shiftId: 'shift_1',
      contadoEmDinheiroCentavos: 31_000,
    });
  });

  it('linha do dinheiro em branco vale ZERO ao fechar — afirmar nada não é opção', async () => {
    await renderSheet(<CloseOutSheet />);
    await fireEvent.changeText(screen.getByLabelText(label.pix), '120,00');

    await userEvent.press(screen.getByText(t.submit));
    pendingConfirm().onConfirm();

    expect(mockCloseCalls[0]?.vars.contadoEmDinheiroCentavos).toBe(0);
  });

  it('fechado: o sheet sai e o aviso é de sucesso', async () => {
    await renderSheet(<CloseOutSheet />);
    await userEvent.press(screen.getByText(t.submit));
    pendingConfirm().onConfirm();

    mockCloseCalls[0]?.callbacks.onSuccess();

    expect(closeSheet).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(ptBR.toasts.cashClosed, { tone: 'sucesso' });
  });

  it('recusado pelo banco: o sheet FICA, com o motivo daquele código', async () => {
    await renderSheet(<CloseOutSheet />);
    await userEvent.press(screen.getByText(t.submit));
    pendingConfirm().onConfirm();

    mockCloseCalls[0]?.callbacks.onError(new CashError('cash_closed'));

    expect(closeSheet).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(ptBR.errors.cash.cash_closed, { tone: 'erro' });
  });

  it('erro sem código conhecido cai no texto genérico, não em branco', async () => {
    await renderSheet(<CloseOutSheet />);
    await userEvent.press(screen.getByText(t.submit));
    pendingConfirm().onConfirm();

    mockCloseCalls[0]?.callbacks.onError(new Error('socket hung up'));

    expect(showToast).toHaveBeenCalledWith(ptBR.errors.cash.unknown, { tone: 'erro' });
  });

  it('sem turno aberto o botão não fecha nada', async () => {
    mockShift.current = undefined;
    await renderSheet(<CloseOutSheet />);

    expect(screen.getByText(t.submit)).toBeDisabled();

    await userEvent.press(screen.getByText(t.submit));

    expect(useUIStore.getState().confirm).toBeNull();
    expect(mockCloseCalls).toHaveLength(0);
  });
});
